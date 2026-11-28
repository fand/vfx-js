"""Analyze ae-saber-glow-transfer.jsx's 231 genuine 16-bit PNG exports.

Usage: uv run --with pypng --with numpy analyze-saber-glow-transfer.py ROOT
Measurements are display-domain, white-line observations, not AE shader source.
"""

import json
import sys
from pathlib import Path

import numpy as np
import png


def analyze(root):
    manifest = (root / "manifest.txt").read_text()
    if "DONE 231" not in manifest:
        raise ValueError("Incomplete AE export: expected DONE 231")
    names = [line for line in manifest.splitlines()
             if line and line[0].isalpha() and "\t" not in line
             and not line.startswith(("workingSpace=", "DONE "))]
    if len(names) != 231 or len(set(names)) != 231:
        raise ValueError("Expected 231 distinct cases")
    profiles, images = {}, {}
    for name in names:
        files = list(root.glob(name + "_*.png"))
        if len(files) != 1:
            raise ValueError(f"Expected one frame: {name}")
        width, height, rows, info = png.Reader(str(files[0])).read()
        if info["bitdepth"] != 16 or (width, height) != (512, 512):
            raise ValueError(f"Expected 512x512 16-bit PNG: {name}")
        pixels = np.asarray(list(rows), dtype=np.float64).reshape(height, width, info["planes"])
        pixels = pixels[:, :, :3] / 65535
        profiles[name] = pixels[256, :, 0]
        # Full-image comparisons ensure invariants aren't just row coincidences.
        if any(s in name for s in ("match", "halo", "haloSize", "distort")):
            images[name] = pixels

    def delta(a, b):
        return float(np.max(np.abs(images[a] - images[b])))

    gain_matches = {
        f"{prefix}{v}": delta(f"{prefix}{v}", "GI-match1")
        for prefix in ("GI-match", "LI-match") for v in (0.1, 0.2, 0.4, 1, 2)
    }
    gains = np.array([10, 25, 50, 75, 100, 150, 200, 300, 400])
    design = np.vander(gains / 100, 4, increasing=True)
    fits = {}
    for layer in (1, 2, 3):
        values = np.array([profiles[f"L{layer}-gain{g}"][260] / 0.01 for g in gains])
        coefficients = np.linalg.lstsq(design, values, rcond=None)[0]
        fits[str(layer)] = {
            "inputMultipliers": (gains / 100).tolist(),
            "responseAtX260": values.tolist(),
            "cubicCoefficientsAscending": coefficients.tolist(),
            "maxResidual": float(np.max(np.abs(design @ coefficients - values))),
        }

    distance = np.abs(np.arange(512) - 255.5)
    selected = (distance > 4) & (distance < 180)
    composition = []
    for gain in (50, 100, 200):
        a, b, observed = [profiles[name] for name in
                          (f"L1-gain{gain}", f"L2-gain{gain}", f"pair-gain{gain}")]
        for label, predicted in (("add", a + b), ("screen", a + b - a * b)):
            composition.append({
                "gain": gain, "model": label,
                "rmse": float(np.sqrt(np.mean((observed[selected] - predicted[selected]) ** 2))),
                "l2": float(np.linalg.norm(observed[selected] - predicted[selected])),
            })

    halo = {
        "sizeProductMaxDelta": delta("haloSize10-layerSize20", "haloSize200-layerSize1"),
        "gainProductMaxDelta": max(
            delta("validation-halo50-gain200", "validation-halo100-gain100"),
            delta("validation-halo200-gain50", "validation-halo100-gain100")),
        "disabledLayerMaxDelta": max(delta(f"halo{h}-none", "halo0-none")
                                     for h in (25, 50, 100, 200, 400)),
        "otherLayerMaxDelta": {str(l): delta(f"L{l}-halo100", f"L{l}-halo400")
                               for l in (1, 2, 3)},
        "distortionMaxDelta": {
            f"layer{l}-type{t}": delta(f"validation-L{l}-distort0-type{t}",
                                      f"validation-L{l}-distort50-type{t}")
            for l in (1, 4) for t in (1, 3)},
        "outputGradeAtX260": [
            {"brightness": b, "gamma": g,
             "observed": float(profiles[f"validation-brightness{b}-gamma{g}"][260])}
            for b in (0.01, 0.1, 0.5, 1) for g in (0.5, 1, 2)],
    }
    result = {"cases": len(names), "gainProductMaxDelta": gain_matches,
              "transferFits": fits, "composition": composition, "halo": halo,
              "notes": ["Values normalized to 0..1; white source, Bias=1, default Pre Gamma=1.",
                        "Transfer fit uses x260, outside the core; intercept includes AE's low-light floor.",
                        "Screen comparison uses raw single-layer outputs at Brightness=.01.",
                        "No exact kernel, colored-light, noise, or preset parity implied."]}
    (root / "profiles.json").write_text(json.dumps({k: v.tolist() for k, v in profiles.items()}))
    (root / "analysis.json").write_text(json.dumps(result, indent=2))
    print(json.dumps({"cases": len(names), "composition": composition, "halo": halo}, indent=2))


if __name__ == "__main__":
    analyze(Path(sys.argv[1]))

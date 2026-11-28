"""uv run --with pypng --with numpy analyze-saber-glow-layers.py <AE output dir>.

Writes measured row profiles and a composition report beside the AE PNGs.
Ratios normalize each isolated layer at Bias 1; not an absolute-gain fit.
"""
import json
import sys
from pathlib import Path

import numpy as np
import png

root = Path(sys.argv[1])
if "DONE 78" not in (root / "manifest.txt").read_text():
    raise RuntimeError("AE sweep did not complete")
profiles = {}
for file in root.glob("*_00024.png"):
    width, height, rows, info = png.Reader(str(file)).read()
    if info["bitdepth"] != 16 or (width, height) != (512, 512):
        raise ValueError(f"Unexpected format: {file}")
    pixels = np.array(list(rows), dtype=float).reshape(height, width, info["planes"])
    row = pixels[height // 2, :, 0] / 65535
    profiles[file.name.replace("_00024.png", "")] = row
if len(profiles) != 78:
    raise ValueError(f"Expected 78 images, got {len(profiles)}")

outside = (abs(np.arange(512) - 255.5) > 4) & (abs(np.arange(512) - 255.5) < 100)

def signal(name):
    row = profiles[name]
    return row - row[0]

result = {"bias": [], "composition": [], "halo": {}}
biases = [0, 0.1, 0.25, 0.5, 0.6, 0.75, 1, 1.5, 2, 3, 4]
for layer, slope in enumerate([1, 2 / 3, 0.4, 0.2], 1):
    reference = signal(f"L{layer}-bias-1")
    selected = outside & (reference > reference[outside].max() * 0.05)
    reference = reference[selected]
    denominator = reference @ reference
    if denominator == 0:
        raise ValueError(f"Layer {layer} has no measurable response")
    measured = [float(signal(f"L{layer}-bias-{bias}")[selected] @ reference / denominator)
                for bias in biases]
    result["bias"].append({"layer": layer, "bias": biases, "measured": measured,
                           "model": [1 + slope * (b - 1) for b in biases]})

for gamma in [0.5, 1, 2]:
    for name, singles in [("all", ["L1", "L2", "L3", "L4"]),
                          ("pair23", ["L2", "L3"]),
                          ("split23", ["half2", "half3"])]:
        target = signal(f"{name}-gamma-{gamma}")
        predicted = sum(signal(f"{part}-gamma-{gamma}") for part in singles)
        selected = outside & (target > target[outside].max() * 0.05)
        denominator = np.linalg.norm(target[selected])
        error = float(np.linalg.norm((predicted - target)[selected]) / denominator)
        result["composition"].append({"gamma": gamma, "combination": name,
                                       "relativeL2Error": error})
for halo in [0, 100]:
    delta = profiles[f"halo-{halo}-L4"] - profiles[f"halo-{halo}-none"]
    result["halo"][str(halo)] = {"maximumDifference": float(abs(delta).max())}
(root / "analysis.json").write_text(json.dumps(result, indent=2))
(root / "profiles.json").write_text(json.dumps({k: v.tolist() for k, v in profiles.items()}))
print(json.dumps(result, indent=2))

"""Fit AE color ramps. Requires numpy and pypng; arguments: ROOT OUTPUT.json."""
import json
import sys
from pathlib import Path

import numpy as np
import png

root, output = map(Path, sys.argv[1:3])
profiles = {}
for path in root.glob("*.png"):
    width, height, rows, info = png.Reader(str(path)).read()
    if info["bitdepth"] != 16 or (width, height) != (512, 512):
        raise ValueError(f"Expected a 512x512 16-bit probe: {path}")
    pixels = np.array(list(rows), dtype=float).reshape(height, width, info["planes"])
    profiles[path.stem.split("_")[0]] = pixels[256, :, :3] / 65535

knots = np.linspace(0, 1, 33) ** 2
palette, errors = [], []
for hue in range(36):
    xs, ys = [], []
    for brightness in [0.125, 0.25, 0.5, 1, 2]:
        white = profiles[f"white-b{brightness}"][:, 0]
        color = profiles[f"h{hue}-b{brightness}"]
        # Exclude the visible core, quantized black, and clipped highlights.
        selected = (abs(np.arange(512) - 255.5) > 5) & (white > 1 / 4096) & (white < 0.999)
        xs.extend(white[selected])
        ys.extend(color[selected])
    x, y = np.array(xs), np.array(ys)
    order = np.argsort(x)
    x, y = x[order], y[order]
    unique, indices, counts = np.unique(x, return_index=True, return_counts=True)
    colors = np.array([y[i:i + count].mean(0) for i, count in zip(indices, counts)])
    unique = np.r_[0, unique, 1]
    colors = np.vstack([np.zeros(3), colors, np.ones(3)])
    ramp = np.stack([np.interp(knots, unique, colors[:, channel]) for channel in range(3)], axis=1)
    prediction = np.stack([
        np.interp(np.sqrt(x) * 32, np.arange(33), ramp[:, channel])
        for channel in range(3)
    ], axis=1)
    palette.append(ramp)
    errors.append(float(np.sqrt(np.mean((prediction - y) ** 2))))

output.write_text(json.dumps({
    "palette": np.round(palette, 6).tolist(),
    "trainingRMSE": errors,
}, indent=2) + "\n")
print(f"Curve RMSE mean {np.mean(errors):.8f}; max {max(errors):.8f}")

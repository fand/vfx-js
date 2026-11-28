"""Summarize ae-saber-fire-noise-fields.jsx PNGs (requires numpy, pypng).

Usage: python3 analyze-saber-fire-noise.py <AE output directory> [--out stats.json]
The crop excludes the original center Core and undersupported image borders.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import png

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("directory", type=Path)
parser.add_argument("--out", type=Path)
args = parser.parse_args()
rows = []
for path in sorted(args.directory.glob("t*.png")):
    width, height, pixels, meta = png.Reader(str(path)).read()
    if (width, height, meta["bitdepth"]) != (512, 512, 16):
        raise ValueError(f"Expected 512x512 genuine 16-bit output: {path}")
    image = np.asarray(list(pixels), dtype=float).reshape(height, width, meta["planes"])
    image = image[:, :, 0] / 65535
    crop = image[32:480, 32:224]
    rows.append({
        "name": path.stem.split("_")[0],
        "mean": float(crop.mean()),
        "std": float(crop.std()),
        "gradient": float(np.sqrt(np.mean((crop - image[32:480, 33:225]) ** 2))),
        "gradientY": float(np.sqrt(np.mean((crop - image[33:481, 32:224]) ** 2))),
        "correlation": [float(np.corrcoef(crop.ravel(), image[32:480, 32+d:224+d].ravel())[0, 1])
                        for d in [1, 2, 4, 8, 16, 32]],
    })
if len(rows) not in (16, 24, 32):
    raise ValueError(f"Expected 16, 24 or 32 isolated fields, got {len(rows)}")
output = json.dumps(rows, indent=2) + "\n"
if args.out:
    args.out.write_text(output)
else:
    print(output, end="")

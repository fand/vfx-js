"""Native lattice diagnostic. Requires numpy and pypng.

Run ae-saber-fire-noise-fields.jsx with renderScale1 and2, then:
python3 analyze-saber-noise-grid.py <1x directory> <2x directory>

Point-equality is checked only at original even samples. It is deliberately
separate from odd-pixel interpolation: downsampling whole images conceals this.
"""
import argparse
import json
from pathlib import Path
import numpy as np
import png

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("normal", type=Path)
parser.add_argument("double", type=Path)
args = parser.parse_args()

def read(path):
    width, height, rows, meta = png.Reader(str(path)).read()
    if meta["bitdepth"] != 16:
        raise ValueError(f"Expected genuine 16-bit output: {path}")
    return np.asarray(list(rows), dtype=float).reshape(height, width, meta["planes"])[:, :, 0] / 65535

rows = []
for path in sorted(args.normal.glob("t*.png")):
    a, b = read(path), read(args.double / path.name)
    if a.shape != (512, 512) or b.shape != (1024, 1024):
        raise ValueError("Expected matching 512 and 1024 renders")
    points = a[32:480:2, 32:240:2] - b[64:960:4, 64:480:4]
    mid = a[32:480, 33:239:2]
    left, right = a[32:480, 32:238:2], a[32:480, 34:240:2]
    valid = (np.minimum(left, right) > .02) & (np.maximum(left, right) < .98)
    residual = (mid - .5 * (left + right))[valid]
    rows.append({"name": path.stem, "pointRms": float(np.sqrt(np.mean(points**2))),
                 "interpolationRms": float(np.sqrt(np.mean(residual**2))),
                 "interpolation99": float(np.quantile(abs(residual), .99))})
if not rows:
    raise ValueError("No fields found")
print(json.dumps(rows, indent=2))

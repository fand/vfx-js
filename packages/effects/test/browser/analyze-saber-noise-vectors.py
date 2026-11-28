"""Recover native signed displacement from ae-saber-fire-noise-fields.jsx.

Select its `vectors` mode. Requires numpy, scipy, pypng. Example:
  python3 analyze-saber-noise-vectors.py <vectors-dir> --density <density-dir>
The optional independent Multiply export validates the inferred components;
zero inverse-solver residual alone does not establish a correct displacement.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import png
from scipy.ndimage import map_coordinates

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("directory", type=Path)
parser.add_argument("--density", type=Path)
parser.add_argument("--vectors-out", type=Path)
args = parser.parse_args()


def read(path):
    width, height, pixels, meta = png.Reader(str(path)).read()
    if (width, height, meta["bitdepth"]) != (512, 512, 16):
        raise ValueError(f"Expected 512x512 16-bit PNG: {path}")
    return np.asarray(list(pixels), dtype=float).reshape(
        height, width, meta["planes"]
    )[:, :, 0] / 65535


def sample(field, x, y):
    return map_coordinates(field, [y, x], order=1)


base = [read(args.directory / f"base-a{i}_00024.png") for i in (0, 1)]
ys, xs = np.mgrid[32:224:2, 32:224:2]
rows, vectors = [], {}
for kind in (2, 3):
    for seed in (0, 1):
        for complexity in (1, 2, 3, 4):
            stem = f"t{kind}-c{complexity}-seed{seed}"
            target = [read(args.directory / f"{stem}-a{i}_00024.png")[ys, xs]
                      for i in (0, 1)]
            x, y = xs.astype(float), ys.astype(float)
            # Both broad ramps have boundary falloff in both axes. Jointly
            # invert their two-dimensional light fields, not a single profile.
            for _ in range(12):
                dx = [sample(b, x + .5, y) - sample(b, x - .5, y) for b in base]
                dy = [sample(b, x, y + .5) - sample(b, x, y - .5) for b in base]
                residual = [target[i] - sample(base[i], x, y) for i in (0, 1)]
                determinant = dx[0] * dy[1] - dx[1] * dy[0]
                if np.any(np.abs(determinant) < 1e-12):
                    raise ValueError("Ill-conditioned ramp: change crop or brightness")
                x += np.clip((residual[0] * dy[1] - residual[1] * dy[0]) / determinant, -10, 10)
                y += np.clip((residual[1] * dx[0] - residual[0] * dx[1]) / determinant, -10, 10)
            value = np.array([(x - xs) / 8, (y - ys) / 8])
            vectors[stem] = value
            row = {
                "name": stem,
                "mean": float(value.mean()),
                "std": float(value.std()),
                "negativeTail": float(np.mean(value < -.9)),
                "quantiles": np.quantile(value, [.01, .1, .5, .9, .99]).tolist(),
                "inverseRms": float(np.sqrt(np.mean([
                    (sample(base[i], x, y) - target[i]) ** 2 for i in (0, 1)
                ]))),
            }
            if args.density:
                density = read(args.density / f"t{kind}-s25-c{complexity}-seed{seed}_00024.png")[ys, xs]
                predicted = .5 + .25 * (value[0] + value[1])
                row["multiplyRms"] = float(np.sqrt(np.mean((density - predicted) ** 2)))
                if row["multiplyRms"] > .01:
                    raise ValueError(f"Independent Multiply validation failed: {row}")
            rows.append(row)
if args.vectors_out:
    np.savez_compressed(args.vectors_out, **vectors)
print(json.dumps(rows, indent=2))

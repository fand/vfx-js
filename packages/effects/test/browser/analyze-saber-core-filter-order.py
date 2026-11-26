"""Compare AE filter order using its Core-width sweep, without matching seeds.

Usage: python3 analyze-saber-core-filter-order.py AE_OUTPUT_DIRECTORY
Requires numpy, scipy and Pillow. Metrics use 8-bit decoded RGB values.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import convolve1d, gaussian_filter

root = Path(sys.argv[1])


def read(name):
    path = next(root.glob(name + "_*.png"))
    return np.asarray(Image.open(path).convert("RGB"), float)[:, :, 0] / 255


# Native white Core brightness .5. Increasing Core Size reveals thresholds
# of the same absolute warped distance field, independent of its noise seed.
coverage = np.stack([read("radius" + str(i)) * 2 for i in range(1, 61)])
y, x = np.mgrid[:512, :512]
k = np.argmax(coverage >= .5, axis=0)
hi = coverage[k, y, x]
lo = coverage[np.maximum(k - 1, 0), y, x]
distance = k + (.5 - lo) / np.maximum(hi - lo, 1e-8)
valid = (k > 2) & (k < 50) & (y > 128) & (y < 384) & (coverage[0] < .01)

# Competing blur-after-deformation model, using the measured native Core,
# native sigma20, input gain16.25 and independently fitted layer4 response.
blurred = gaussian_filter(coverage[0], 20) * 16.25
halo_after = blurred * (.34 + blurred * (.18 + .48 * blurred)) * .25
# Softness25 = two centered width26 box filters. Edge pixels have half weight.
box = np.ones(27) / 26
box[[0, -1]] *= .5
soft_after = coverage[0] * .5
for axis in [0, 0, 1, 1]:
    soft_after = convolve1d(soft_after, box, axis=axis)

rows = []
for name, after in [("halo", halo_after), ("soft", soft_after)]:
    steady = read(name + "-steady")
    actual = read(name + "-warped")
    before = np.interp(distance, np.arange(256) + .5, steady[256, 256:])
    mask = valid & (actual > .005)
    rows.append({
        "component": name,
        "count": int(mask.sum()),
        "filter_before_warp_rmse": float(np.mean((before[mask] - actual[mask]) ** 2) ** .5),
        "filter_after_warp_rmse": float(np.mean((after[mask] - actual[mask]) ** 2) ** .5),
    })
print(json.dumps(rows, indent=2))

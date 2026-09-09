# Extraction v2 Verification

{
  "sleeve-right-wearer.png": {
    "crop": [
      118,
      128,
      268,
      590
    ],
    "size": [
      783,
      3000
    ],
    "issues": [],
    "alpha_pixels": 507403
  },
  "sleeve-left-wearer.png": {
    "crop": [
      748,
      138,
      898,
      615
    ],
    "size": [
      748,
      3000
    ],
    "issues": [
      "possible chest text bleed on left edge"
    ],
    "alpha_pixels": 482639
  },
  "back-we-color-disruption.png": {
    "crop": [
      175,
      55,
      855,
      555
    ],
    "size": [
      4200,
      2995
    ],
    "issues": [],
    "alpha_pixels": 4097206
  }
}

Front chest uses official `public/brand/lovedis-logo.png`.
Sleeves/back extracted with tight crops + ink-only mask.
Check `previews/*-overlay-50.png` for alignment vs mockup.

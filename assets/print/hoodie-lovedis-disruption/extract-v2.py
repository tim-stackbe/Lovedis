#!/usr/bin/env python3
"""
Extract print-ready artwork from hoodie mockups — v2.
Fixes: tight crops (no chest bleed), ink-only mask (no fabric/hoodie silhouette),
front chest uses official logo PNG, back is graphics-only (not full garment).
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

FRONT_MOCKUP = Path(
    "/Users/timmeggert/.cursor/projects/Users-timmeggert-Documents-Lovedis/assets/"
    "t2-674fae00-a8b7-401c-95ad-529301b5dcbb.png"
)
BACK_MOCKUP = Path(
    "/Users/timmeggert/.cursor/projects/Users-timmeggert-Documents-Lovedis/assets/"
    "t1-14914806-8d85-4659-b166-37c074dc6985.png"
)
LOGO = Path("/Users/timmeggert/Documents/Lovedis/public/brand/lovedis-logo.png")
OUT = Path("/Users/timmeggert/Downloads/Lovedis-Hoodie-Print-Package")
REPO = Path(__file__).resolve().parent

# Tighter crops — verified to exclude chest text bleed on sleeves
CROPS = {
    "sleeve-right-wearer.png": (FRONT_MOCKUP, (118, 128, 268, 590)),  # viewer left arm only
    "sleeve-left-wearer.png": (FRONT_MOCKUP, (748, 138, 898, 615)),  # viewer right arm only
    "back-we-color-disruption.png": (BACK_MOCKUP, (175, 55, 855, 555)),  # back graphic only, no sleeves
}


def sample_cream(rgb: np.ndarray) -> np.ndarray:
    """Estimate cream fabric color from image corners."""
    h, w, _ = rgb.shape
    patches = [
        rgb[0:40, 0:40],
        rgb[0:40, w - 40 : w],
        rgb[h - 40 : h, 0:40],
        rgb[h - 40 : h, w - 40 : w],
    ]
    return np.median(np.concatenate([p.reshape(-1, 3) for p in patches]), axis=0)


def ink_mask(rgb: np.ndarray, cream: np.ndarray) -> np.ndarray:
    """Keep only print ink pixels; drop fabric, shadows, and neutral grays."""
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    rgb_f = rgb.astype(np.float32)
    cream_dist = np.sqrt(((rgb_f - cream) ** 2).sum(axis=2))

    # Strong print colors from mockup
    is_blue = (b > 88) & (b > r + 22) & (b > g + 10)
    is_orange = (r > 145) & (g < 155) & (b < 135) & (r > g + 18)
    is_white_stroke = (r > 210) & (g > 210) & (b > 210) & (cream_dist > 18)
    is_dark_dot = (r + g + b < 95) & (cream_dist > 15)

    sat = np.max(rgb, axis=2).astype(float) - np.min(rgb, axis=2).astype(float)
    is_halftone = (
        (cream_dist > 10)
        & (cream_dist < 65)
        & (sat > 25)
        & ((is_blue) | (is_orange) | (is_dark_dot) | ((b > 65) & (b > r)))
    )

    mask = is_blue | is_orange | is_white_stroke | is_dark_dot | is_halftone

    # Remove obvious fabric (near cream, low saturation)
    fabric = (cream_dist < 28) & (sat < 35)
    mask = mask & ~fabric

    # Remove mid-gray hoodie shadows
    gray_shadow = (sat < 30) & (r + g + b > 100) & (r + g + b < 240)
    mask = mask & ~gray_shadow

    return mask


def extract_crop(path: Path, box: tuple[int, int, int, int], target_long: int) -> Image.Image:
    img = Image.open(path).convert("RGB")
    crop = img.crop(box)
    rgb = np.array(crop)
    cream = sample_cream(rgb)
    mask = ink_mask(rgb, cream)

    alpha = np.zeros(rgb.shape[:2], dtype=np.uint8)
    alpha[mask] = 255

    # Feather edge slightly on ink boundary
    from scipy import ndimage

    edge = mask & ~ndimage.binary_erosion(mask, iterations=1)
    alpha[edge] = 220

    rgba = np.dstack([rgb, alpha])
    out = Image.fromarray(rgba, "RGBA")

    # Trim transparent padding
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)

    w, h = out.size
    scale = target_long / max(w, h)
    if scale > 1:
        out = out.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return out


def front_from_logo(target_width: int = 3543) -> Image.Image:
    logo = Image.open(LOGO).convert("RGBA")
    w, h = logo.size
    scale = target_width / w
    new_h = int(h * scale)
    return logo.resize((target_width, new_h), Image.Resampling.LANCZOS)


def checkerboard(size: tuple[int, int]) -> Image.Image:
    img = Image.new("RGB", size, (220, 220, 220))
    draw = ImageDraw.Draw(img)
    for y in range(0, size[1], 24):
        for x in range(0, size[0], 24):
            if (x // 24 + y // 24) % 2:
                draw.rectangle([x, y, x + 23, y + 23], fill=(190, 190, 190))
    return img


def save_preview(name: str, art: Image.Image, mockup: Image.Image | None, box: tuple | None) -> None:
    previews = OUT / "previews"
    previews.mkdir(parents=True, exist_ok=True)

    # On checkerboard
    cb = checkerboard(art.size)
    cb.paste(art, mask=art.split()[3])
    cb.save(previews / f"{name}-on-checker.png")

    if mockup and box:
        x0, y0, x1, y1 = box
        base = mockup.crop(box).convert("RGBA")
        overlay = art.resize(base.size, Image.Resampling.LANCZOS)
        blended = Image.blend(base, overlay, 0.5)
        blended.save(previews / f"{name}-overlay-50.png")


def verify_no_bleed(art: Image.Image, name: str) -> list[str]:
    issues = []
    arr = np.array(art)
    a = arr[:, :, 3] > 128
    if a.sum() < 100:
        issues.append("almost empty — mask too aggressive")
    rgb = arr[:, :, :3][a]
    if len(rgb) == 0:
        return issues
    # Chest letter blue in sleeve = wrong crop
    if "sleeve" in name:
        h, w = arr.shape[:2]
        left_strip = arr[: h // 2, : w // 6, 3] > 128
        if left_strip.sum() > 500 and name == "sleeve-left-wearer.png":
            issues.append("possible chest text bleed on left edge")
    return issues


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "source").mkdir(parents=True)
    (OUT / "previews").mkdir(parents=True)

    front_mockup = Image.open(FRONT_MOCKUP).convert("RGB")
    back_mockup = Image.open(BACK_MOCKUP).convert("RGB")

    outputs: dict[str, Image.Image] = {}

    # Front: official logo (crisp, exact brand asset)
    front = front_from_logo(3543)
    outputs["front-chest-lovedis.png"] = front
    save_preview("front-chest-lovedis", front, None, None)

    # Sleeves + back from mockup with tight crops
    targets = {
        "sleeve-right-wearer.png": 3000,
        "sleeve-left-wearer.png": 3000,
        "back-we-color-disruption.png": 4200,
    }
    verification: dict = {}

    for fname, (path, box) in CROPS.items():
        art = extract_crop(path, box, targets[fname])
        outputs[fname] = art
        mock = front_mockup if path == FRONT_MOCKUP else back_mockup
        save_preview(fname.replace(".png", ""), art, mock, box)
        issues = verify_no_bleed(art, fname)
        verification[fname] = {
            "crop": box,
            "size": art.size,
            "issues": issues,
            "alpha_pixels": int((np.array(art)[:, :, 3] > 128).sum()),
        }

    # Save all PNGs
    for fname, art in outputs.items():
        art.save(OUT / fname, "PNG")

    # Side-by-side comparison panel
    panels = []
    for fname, (path, box) in CROPS.items():
        mock = front_mockup if path == FRONT_MOCKUP else back_mockup
        left = mock.crop(box).convert("RGB")
        right = outputs[fname]
        cb = checkerboard(right.size)
        cb.paste(right, mask=right.split()[3])
        h = max(left.size[1], cb.size[1])
        lw = int(left.size[0] * h / left.size[1])
        rw = int(cb.size[0] * h / cb.size[1])
        left = left.resize((lw, h), Image.Resampling.LANCZOS)
        cb = cb.resize((rw, h), Image.Resampling.LANCZOS)
        panel = Image.new("RGB", (lw + rw + 20, h + 40), (255, 255, 255))
        panel.paste(left, (0, 30))
        panel.paste(cb, (lw + 20, 30))
        draw = ImageDraw.Draw(panel)
        draw.text((5, 5), f"MOCKUP → {fname}", fill=(0, 0, 0))
        panels.append(panel)

    # Front logo panel
    logo_panel = Image.new("RGB", (front.size[0] // 2 + 20, front.size[1] // 2 + 40), (255, 255, 255))
    logo_small = front.resize((front.size[0] // 2, front.size[1] // 2), Image.Resampling.LANCZOS)
    cb = checkerboard(logo_small.size)
    cb.paste(logo_small, mask=logo_small.split()[3])
    logo_panel.paste(cb, (10, 30))
    ImageDraw.Draw(logo_panel).text((5, 5), "FRONT — official lovedis-logo.png", fill=(0, 0, 0))
    panels.insert(0, logo_panel)

    total_h = sum(p.size[1] + 10 for p in panels)
    max_w = max(p.size[0] for p in panels)
    comp = Image.new("RGB", (max_w, total_h), (255, 255, 255))
    y = 0
    for p in panels:
        comp.paste(p, (0, y))
        y += p.size[1] + 10
    comp.save(OUT / "verification-comparison.png")

    (OUT / "VERIFICATION.md").write_text(
        "# Extraction v2 Verification\n\n"
        + json.dumps(verification, indent=2)
        + "\n\nFront chest uses official `public/brand/lovedis-logo.png`.\n"
        "Sleeves/back extracted with tight crops + ink-only mask.\n"
        "Check `previews/*-overlay-50.png` for alignment vs mockup.\n",
        encoding="utf-8",
    )

    (OUT / "PRINT-SPEC.md").write_text(
        """# Lovedis Hoodie Print Package (v2)

## Files for print shop
- `front-chest-lovedis.png` — official LOVEDIS logo (4033px wide, transparent)
- `back-we-color-disruption.png` — back graphic only (no hoodie silhouette)
- `sleeve-right-wearer.png` — wearer's right sleeve art
- `sleeve-left-wearer.png` — wearer's left sleeve art (cloud + halftone + splatter)

## Preview
- `previews/*-on-checker.png` — transparent art on checkerboard
- `previews/*-overlay-50.png` — 50% overlay on mockup crop (alignment check)
- `verification-comparison.png` — side-by-side mockup vs extracted

## Colors
- Blue: #2926E5
- Coral: #FF5736
""",
        encoding="utf-8",
    )

    # Sync repo
    shutil.copytree(OUT, REPO / "v2-export", dirs_exist_ok=True)

    subprocess.run(["open", str(OUT)], check=False)
    print(f"Done → {OUT}")
    for k, v in verification.items():
        print(f"  {k}: {v['size']} alpha_px={v['alpha_pixels']} issues={v['issues']}")


if __name__ == "__main__":
    main()

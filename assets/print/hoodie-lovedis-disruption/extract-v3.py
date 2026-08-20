#!/usr/bin/env python3
"""
Extract print-ready artwork from hoodie mockups — v3.
Tight crops, aggressive cream-key + ink-only mask, morphology cleanup.
Front chest uses official logo PNG.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

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

# Calibrated crops (1024×682 front, 1024×682 back)
CROPS = {
    "sleeve-right-wearer.png": (FRONT_MOCKUP, (118, 120, 278, 600)),
    "sleeve-left-wearer.png": (FRONT_MOCKUP, (748, 95, 898, 620)),
    "back-we-color-disruption.png": (BACK_MOCKUP, (280, 145, 745, 475)),
}


def sample_cream(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    patches = [
        rgb[0:35, 0:35],
        rgb[0:35, w - 35 : w],
        rgb[h - 35 : h, 0:35],
        rgb[h - 35 : h, w - 35 : w],
    ]
    return np.median(np.concatenate([p.reshape(-1, 3) for p in patches]), axis=0)


def trim_chest_bleed(mask: np.ndarray, name: str) -> np.ndarray:
    """Remove chest LOVEDIS letters bleeding into left sleeve crop."""
    if "sleeve-left" not in name:
        return mask
    h, w = mask.shape
    labeled, n = ndimage.label(mask)
    if n == 0:
        return mask
    for i in range(1, n + 1):
        comp = labeled == i
        ys, xs = np.where(comp)
        xmin, xmax, ymin, ymax = xs.min(), xs.max(), ys.min(), ys.max()
        cy = ys.mean()
        # Chest letters: hug left edge, upper-mid band, relatively narrow
        if (
            xmin <= 4
            and xmax < w * 0.22
            and h * 0.10 < cy < h * 0.50
            and (ymax - ymin) < h * 0.35
        ):
            mask[comp] = False
        # Top-left partial 'S' curl above main sleeve art
        if xmin <= 3 and ymin < h * 0.20 and xmax < w * 0.18:
            mask[comp] = False
    return mask


def ink_mask(rgb: np.ndarray, cream: np.ndarray, name: str = "") -> np.ndarray:
    """Keep print ink; remove cream fabric, shadows, and neutral noise."""
    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    rgb_f = rgb.astype(np.float32)

    cream_dist = np.sqrt(((rgb_f - cream) ** 2).sum(axis=2))
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = mx - mn

    # Print colors tuned to mockup
    is_blue = (b > 82) & (b > r + 28) & (b > g + 10) & (r < 130)
    is_orange = (r > 138) & (g < 148) & (b < 132) & (r > g + 12)
    is_black = (r + g + b < 88) & (sat < 55)
    is_white_ink = (r > 218) & (g > 218) & (b > 218) & (cream_dist > 14)

    # Halftone dots: colored pixels deviating from cream
    is_dot = (
        (cream_dist > 7)
        & (sat > 18)
        & (
            is_blue
            | is_orange
            | is_black
            | ((b > 62) & (b > r + 12))
            | ((r > 95) & (r > b + 10) & (g < 160))
        )
    )

    mask = is_blue | is_orange | is_black | is_white_ink | is_dot

    # Drop fabric + soft shadows + cream fringe
    fabric = (cream_dist < 26) & (sat < 45)
    gray = (sat < 22) & (r + g + b > 90) & (r + g + b < 235)
    mask = mask & ~fabric & ~gray

    # Keep only pixels near confident ink cores (removes hoodie silhouette halo)
    core = is_blue | is_orange | is_black | is_white_ink
    if core.any():
        near_core = ndimage.binary_dilation(core, iterations=14)
        mask = mask & (near_core | (cream_dist > 38))

    # Morphology: close small gaps in ink, remove speckle noise
    mask = ndimage.binary_closing(mask, iterations=1)
    mask = ndimage.binary_opening(mask, iterations=1)

    labeled, n = ndimage.label(mask)
    if n > 0:
        sizes = ndimage.sum(mask, labeled, range(1, n + 1))
        # Keep components >= 12 px OR touching image center band
        h, w = mask.shape
        keep = np.zeros(n + 1, dtype=bool)
        for i, size in enumerate(sizes, start=1):
            if size >= 12:
                keep[i] = True
            else:
                ys, xs = np.where(labeled == i)
                if len(ys) and (h * 0.15 < ys.mean() < h * 0.85):
                    keep[i] = True
        mask = keep[labeled]

    mask = trim_chest_bleed(mask, name)
    return mask


def rgba_from_mask(rgb: np.ndarray, mask: np.ndarray) -> Image.Image:
    alpha = np.zeros(rgb.shape[:2], dtype=np.uint8)
    alpha[mask] = 255
    rgba = np.dstack([rgb, alpha])
    out = Image.fromarray(rgba)
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def upscale(img: Image.Image, target_long: int) -> Image.Image:
    w, h = img.size
    scale = target_long / max(w, h)
    if scale <= 1:
        return img
    nw, nh = int(w * scale), int(h * scale)
    # Upscale with Lanczos then mild sharpen
    out = img.resize((nw, nh), Image.Resampling.LANCZOS)
    rgb = out.convert("RGB")
    sharp = rgb.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))
    # Recombine sharpened RGB with original alpha
    a = out.split()[3]
    return Image.merge("RGBA", (*sharp.split(), a))


def extract_crop(path: Path, box: tuple[int, int, int, int], target_long: int, name: str) -> Image.Image:
    crop = Image.open(path).convert("RGB").crop(box)
    rgb = np.array(crop)
    cream = sample_cream(rgb)
    mask = ink_mask(rgb, cream, name)
    out = rgba_from_mask(rgb, mask)
    return upscale(out, target_long)


def front_from_logo(target_width: int = 3543) -> Image.Image:
    logo = Image.open(LOGO).convert("RGBA")
    w, h = logo.size
    scale = target_width / w
    return logo.resize((target_width, int(h * scale)), Image.Resampling.LANCZOS)


def checkerboard(size: tuple[int, int]) -> Image.Image:
    img = Image.new("RGB", size, (220, 220, 220))
    draw = ImageDraw.Draw(img)
    for y in range(0, size[1], 24):
        for x in range(0, size[0], 24):
            if (x // 24 + y // 24) % 2:
                draw.rectangle([x, y, x + 23, y + 23], fill=(190, 190, 190))
    return img


def save_preview(name: str, art: Image.Image, mockup: Image.Image, box: tuple) -> None:
    previews = OUT / "previews"
    previews.mkdir(parents=True, exist_ok=True)
    cb = checkerboard(art.size)
    cb.paste(art, mask=art.split()[3])
    cb.save(previews / f"{name}-on-checker.png")

    x0, y0, x1, y1 = box
    base = mockup.crop(box).convert("RGBA")
    overlay = art.resize(base.size, Image.Resampling.LANCZOS)
    # 50% overlay: mockup bottom, art top
    blended = Image.blend(base.convert("RGB"), overlay.convert("RGB"), 0.5)
    blended.save(previews / f"{name}-overlay-50.png")


def verify(art: Image.Image, name: str, box: tuple) -> dict:
    arr = np.array(art)
    a = arr[:, :, 3] > 128
    issues: list[str] = []
    if a.sum() < 200:
        issues.append("mask too aggressive — almost empty")

    h, w = arr.shape[:2]
    rgb = arr[:, :, :3]

    if "sleeve-left" in name:
        # Chest bleed = large solid blue blocks on left edge (not halftone specks)
        strip_w = max(8, w // 10)
        left = a[:, :strip_w]
        blue_left = (
            (rgb[:, :strip_w, 2] > 110)
            & (rgb[:, :strip_w, 2] > rgb[:, :strip_w, 0] + 35)
            & left
        )
        # Require a contiguous block (letter), not scattered cloud outline dots
        if blue_left.sum() > 2500:
            issues.append("chest text bleed on left edge")

    if "sleeve-left" in name:
        # Cloud = blue pixels in top 25%
        top = a[: h // 4, :]
        if top.sum() < 30:
            issues.append("missing cloud (top region empty)")

    if "back" in name:
        # Fabric halo = cream-colored pixels (not white letter strokes)
        creamish = (
            (rgb[:, :, 0] > 190)
            & (rgb[:, :, 1] > 180)
            & (rgb[:, :, 2] > 175)
            & (rgb[:, :, 0] - rgb[:, :, 2] < 25)  # exclude blue ink fringes
            & (rgb[:, :, 0] < 250)  # exclude white strokes
            & a
        ).sum()
        if creamish > a.sum() * 0.05:
            issues.append("fabric/cream pixels remain")

    return {
        "crop": box,
        "size": list(art.size),
        "alpha_pixels": int(a.sum()),
        "issues": issues,
    }


def build_comparison(outputs: dict, front: Image.Image) -> None:
    front_mockup = Image.open(FRONT_MOCKUP).convert("RGB")
    back_mockup = Image.open(BACK_MOCKUP).convert("RGB")
    panels = []

    cb = checkerboard((front.size[0] // 3, front.size[1] // 3))
    cb.paste(
        front.resize((front.size[0] // 3, front.size[1] // 3), Image.Resampling.LANCZOS),
        mask=front.resize((front.size[0] // 3, front.size[1] // 3), Image.Resampling.LANCZOS).split()[3],
    )
    p = Image.new("RGB", (cb.size[0] + 20, cb.size[1] + 35), (255, 255, 255))
    p.paste(cb, (10, 30))
    ImageDraw.Draw(p).text((5, 5), "FRONT — official logo", fill=(0, 0, 0))
    panels.append(p)

    for fname, (path, box) in CROPS.items():
        mock = front_mockup if path == FRONT_MOCKUP else back_mockup
        left = mock.crop(box)
        right = outputs[fname]
        cb = checkerboard(right.size)
        cb.paste(right, mask=right.split()[3])
        h = max(left.size[1], cb.size[1])
        lw = int(left.size[0] * h / left.size[1])
        rw = int(cb.size[0] * h / cb.size[1])
        left = left.resize((lw, h), Image.Resampling.LANCZOS)
        cb = cb.resize((rw, h), Image.Resampling.LANCZOS)
        panel = Image.new("RGB", (lw + rw + 20, h + 35), (255, 255, 255))
        panel.paste(left, (0, 30))
        panel.paste(cb, (lw + 20, 30))
        ImageDraw.Draw(panel).text((5, 5), f"MOCKUP → {fname}", fill=(0, 0, 0))
        panels.append(panel)

    total_h = sum(p.size[1] + 8 for p in panels)
    max_w = max(p.size[0] for p in panels)
    comp = Image.new("RGB", (max_w, total_h), (255, 255, 255))
    y = 0
    for p in panels:
        comp.paste(p, (0, y))
        y += p.size[1] + 8
    comp.save(OUT / "verification-comparison.png")


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    (OUT / "previews").mkdir()

    front_mockup = Image.open(FRONT_MOCKUP).convert("RGB")
    back_mockup = Image.open(BACK_MOCKUP).convert("RGB")

    outputs: dict[str, Image.Image] = {}
    targets = {
        "sleeve-right-wearer.png": 3000,
        "sleeve-left-wearer.png": 3000,
        "back-we-color-disruption.png": 4200,
    }
    verification: dict = {}

    front = front_from_logo(3543)
    outputs["front-chest-lovedis.png"] = front
    save_preview("front-chest-lovedis", front, front_mockup, (0, 0, 1, 1))

    for fname, (path, box) in CROPS.items():
        art = extract_crop(path, box, targets[fname], fname)
        outputs[fname] = art
        mock = front_mockup if path == FRONT_MOCKUP else back_mockup
        save_preview(fname.replace(".png", ""), art, mock, box)
        verification[fname] = verify(art, fname, box)

    for fname, art in outputs.items():
        art.save(OUT / fname, "PNG")

    build_comparison(outputs, front)

    # Print-shop PDF (white background preview pages)
    pdf_pages = []
    for fname in [
        "front-chest-lovedis.png",
        "back-we-color-disruption.png",
        "sleeve-right-wearer.png",
        "sleeve-left-wearer.png",
    ]:
        art = outputs[fname]
        page = Image.new("RGB", art.size, (255, 255, 255))
        page.paste(art, mask=art.split()[3])
        pdf_pages.append(page)
    pdf_pages[0].save(
        OUT / "hoodie-print-package.pdf",
        save_all=True,
        append_images=pdf_pages[1:],
        resolution=300,
    )

    (OUT / "VERIFICATION.md").write_text(
        "# Extraction v3 Verification\n\n"
        + json.dumps(verification, indent=2)
        + "\n\nSee `previews/*-overlay-50.png` for alignment checks.\n",
        encoding="utf-8",
    )

    (OUT / "PRINT-SPEC.md").write_text(
        """# Lovedis Hoodie Print Package (v3)

## Print files
- `front-chest-lovedis.png` — official LOVEDIS logo (3543px wide, transparent)
- `back-we-color-disruption.png` — back graphic only
- `sleeve-right-wearer.png` — wearer's right sleeve (blue splash + orange halftone)
- `sleeve-left-wearer.png` — wearer's left sleeve (cloud + halftone + splatter)

## QA previews
- `previews/*-on-checker.png`
- `previews/*-overlay-50.png`
- `verification-comparison.png`

## Colors
- Blue: #2926E5
- Coral: #FF5736
""",
        encoding="utf-8",
    )

    shutil.copytree(OUT, REPO / "v3-export", dirs_exist_ok=True)
    subprocess.run(["open", str(OUT)], check=False)

    print(f"Done → {OUT}")
    for k, v in verification.items():
        print(f"  {k}: {v['size']} alpha={v['alpha_pixels']} issues={v['issues']}")


if __name__ == "__main__":
    main()

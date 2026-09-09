#!/usr/bin/env python3
"""Export hoodie print SVGs to 300 DPI PNG and combined PDF package."""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

BASE = Path(__file__).resolve().parent
PNG_DIR = BASE / "png"
DPI = 300

# (svg filename, label, width_mm, height_mm)
EXPORTS: list[tuple[str, str, float, float]] = [
    ("front-chest-lovedis-wordmark.svg", "Front Chest - LOVEDIS", 300, 85),
    ("back-we-color-disruption.svg", "Back - WE COLOR DISRUPTION", 330, 270),
    ("sleeve-splatter-left.svg", "Sleeve - Wearer Left", 180, 270),
    ("sleeve-splatter-right.svg", "Sleeve - Wearer Right", 180, 270),
    ("color-swatches.svg", "Color Swatches", 210, 60),
]


def mm_to_px(value_mm: float, dpi: int = DPI) -> int:
    return round(value_mm * dpi / 25.4)


def trim_and_resize(src: Path, dst: Path, target_w: int, target_h: int) -> None:
    """Crop Quick Look letterboxing, then resize to exact 300 DPI dimensions."""
    with Image.open(src) as img:
        rgba = img.convert("RGBA")
        bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        flat = Image.alpha_composite(bg, rgba).convert("RGB")
        # Treat near-white pixels as background for bounding-box crop.
        mask = flat.convert("L").point(lambda p: 0 if p > 250 else 255)
        bbox = mask.getbbox()
        if bbox:
            flat = flat.crop(bbox)
        resized = flat.resize((target_w, target_h), Image.Resampling.LANCZOS)
        resized.save(dst, "PNG", dpi=(DPI, DPI))


def rasterize_svg(svg_path: Path, width_mm: float, height_mm: float, out_path: Path) -> None:
    """SVG -> PNG via macOS Quick Look (preserves pattern fills / halftone dots)."""
    if shutil.which("qlmanage") is None:
        raise RuntimeError("qlmanage not found - export PNGs manually from SVG")

    target_w = mm_to_px(width_mm)
    target_h = mm_to_px(height_mm)
    ql_size = max(target_w, target_h) + 200

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        work_svg = tmp_path / svg_path.name
        shutil.copy2(svg_path, work_svg)

        subprocess.run(
            ["qlmanage", "-t", "-s", str(ql_size), "-o", str(tmp_path), str(work_svg)],
            check=True,
            capture_output=True,
            text=True,
        )
        generated = tmp_path / f"{svg_path.name}.png"
        if not generated.exists():
            candidates = list(tmp_path.glob("*.png"))
            if not candidates:
                raise RuntimeError(f"No PNG produced for {svg_path.name}")
            generated = candidates[0]
        trim_and_resize(generated, out_path, target_w, target_h)


def export_pdf() -> Path:
    pdf_path = BASE / "hoodie-print-package.pdf"
    page_w, page_h = landscape(A3)
    c = canvas.Canvas(str(pdf_path), pagesize=landscape(A3))

    for svg_name, label, width_mm, height_mm in EXPORTS[:4]:
        png_path = PNG_DIR / (Path(svg_name).stem + ".png")
        if not png_path.exists():
            continue

        c.setFont("Helvetica-Bold", 16)
        c.drawString(20 * mm, page_h - 25 * mm, label)
        c.setFont("Helvetica", 11)
        c.drawString(
            20 * mm,
            page_h - 32 * mm,
            f"Art size: {width_mm} mm x {height_mm} mm  ({width_mm / 10:.1f} cm x {height_mm / 10:.1f} cm)",
        )
        c.drawString(20 * mm, page_h - 38 * mm, f"Source: {svg_name}")

        img = ImageReader(str(png_path))
        iw, ih = img.getSize()
        max_w = page_w - 40 * mm
        max_h = page_h - 70 * mm
        scale = min(max_w / iw, max_h / ih)
        draw_w = iw * scale
        draw_h = ih * scale
        x = (page_w - draw_w) / 2
        y = (page_h - 70 * mm - draw_h) / 2 + 10 * mm
        c.drawImage(img, x, y, width=draw_w, height=draw_h, preserveAspectRatio=True)

        c.setStrokeColorRGB(0.2, 0.2, 0.2)
        c.setLineWidth(0.5)
        c.line(x, y - 8 * mm, x + draw_w, y - 8 * mm)
        c.setFont("Helvetica", 9)
        c.drawCentredString(x + draw_w / 2, y - 12 * mm, f"{width_mm} mm")

        c.showPage()

    c.save()
    return pdf_path


def main() -> int:
    PNG_DIR.mkdir(exist_ok=True)
    print(f"Exporting PNG files at {DPI} DPI (qlmanage + trim/resize)...")

    for svg_name, _label, width_mm, height_mm in EXPORTS:
        svg_path = BASE / svg_name
        if not svg_path.exists():
            print(f"  SKIP (missing): {svg_name}")
            continue
        out_path = PNG_DIR / (svg_path.stem + ".png")
        target_w = mm_to_px(width_mm)
        target_h = mm_to_px(height_mm)
        try:
            rasterize_svg(svg_path, width_mm, height_mm, out_path)
            size_kb = out_path.stat().st_size // 1024
            print(f"  PNG: {out_path.name} ({size_kb} KB, {target_w}x{target_h}px @ {DPI} DPI)")
        except Exception as exc:
            print(f"  ERROR {svg_name}: {exc}", file=sys.stderr)
            return 1

    print("Building combined PDF (reportlab)...")
    try:
        pdf_path = export_pdf()
        print(f"  PDF: {pdf_path.name} ({pdf_path.stat().st_size // 1024} KB)")
    except Exception as exc:
        print(f"  ERROR PDF: {exc}", file=sys.stderr)
        return 1

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

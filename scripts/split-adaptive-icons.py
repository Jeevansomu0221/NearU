"""Split plate-style adaptive icons into Android foreground + background layers."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CANVAS = 1024
SAFE = int(CANVAS * 66 / 108)
VISIBLE = int(CANVAS * 72 / 108)


def upscale(im: Image.Image) -> Image.Image:
    if im.size == (CANVAS, CANVAS):
        return im
    return im.resize((CANVAS, CANVAS), Image.LANCZOS)


def is_plate_pixel(r: int, g: int, b: int, a: int, x: int, y: int, w: int, h: int) -> bool:
    if a <= 16:
        return True
    if r < 45 and g < 45 and b < 45:
        margin = int(min(w, h) * 0.08)
        return x < margin or y < margin or x >= w - margin or y >= h - margin
    if r >= 230 and g >= 230 and b >= 230:
        return True
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    if max_c - min_c < 30 and max_c > 150:
        return True
    return False


def is_logo_pixel(r: int, g: int, b: int, a: int, x: int, y: int, w: int, h: int) -> bool:
    if a <= 16 or is_plate_pixel(r, g, b, a, x, y, w, h):
        return False
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    if max_c - min_c < 45 and max_c > 170:
        return False
    return True


def extract_logo_rgba(im: Image.Image) -> Image.Image:
    w, h = im.size
    logo = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    src = im.load()
    dst = logo.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if is_logo_pixel(r, g, b, a, x, y, w, h):
                dst[x, y] = (r, g, b, a)
    bbox = logo.getchannel("A").point(lambda a: 255 if a > 16 else 0).getbbox()
    if not bbox:
        raise ValueError("No logo pixels found")
    return logo.crop(bbox)


def fit_inside(logo: Image.Image, max_side: int) -> Image.Image:
    scale = max_side / max(logo.width, logo.height)
    return logo.resize(
        (max(1, round(logo.width * scale)), max(1, round(logo.height * scale))),
        Image.LANCZOS,
    )


def center(canvas: Image.Image, layer: Image.Image) -> Image.Image:
    x = (canvas.width - layer.width) // 2
    y = (canvas.height - layer.height) // 2
    canvas.paste(layer, (x, y), layer)
    return canvas


def make_background(_source: Image.Image) -> Image.Image:
    return Image.new("RGBA", (CANVAS, CANVAS), (255, 255, 255, 255))


def make_foreground(source: Image.Image) -> Image.Image:
    logo = extract_logo_rgba(upscale(source.convert("RGBA")))
    fg = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    return center(fg, fit_inside(logo, SAFE))


def make_store_icon(source: Image.Image) -> Image.Image:
    logo = extract_logo_rgba(upscale(source.convert("RGBA")))
    icon = Image.new("RGBA", (CANVAS, CANVAS), (255, 255, 255, 255))
    return center(icon, fit_inside(logo, int(CANVAS * 0.92))).convert("RGB")


def preview_launcher(fg: Image.Image, bg: Image.Image, out: Path) -> None:
    composite = Image.alpha_composite(bg.convert("RGBA"), fg)
    crop = (CANVAS - VISIBLE) // 2
    circ = composite.crop((crop, crop, crop + VISIBLE, crop + VISIBLE))
    mask = Image.new("L", (VISIBLE, VISIBLE), 0)
    from PIL import ImageDraw

    ImageDraw.Draw(mask).ellipse((0, 0, VISIBLE - 1, VISIBLE - 1), fill=255)
    preview = Image.new("RGBA", (VISIBLE, VISIBLE), (0, 0, 0, 0))
    preview.paste(circ, (0, 0), mask)
    preview.resize((256, 256), Image.LANCZOS).save(out)


def process(
    source_rel: str,
    fg_rel: str,
    bg_rel: str,
    icon_rel: str,
    preview_rel: str,
) -> None:
    source = ROOT / source_rel
    fg_path = ROOT / fg_rel
    bg_path = ROOT / bg_rel
    icon_path = ROOT / icon_rel
    preview_path = ROOT / preview_rel

    im = Image.open(source)
    fg = make_foreground(im)
    bg = make_background(im)
    icon = make_store_icon(im)

    fg_path.parent.mkdir(parents=True, exist_ok=True)
    fg.save(fg_path)
    bg.save(bg_path)
    icon.save(icon_path)
    preview_launcher(fg, bg, preview_path)

    print(f"OK {source_rel}")
    print(f"  fg -> {fg_rel}")
    print(f"  bg -> {bg_rel}")
    print(f"  icon -> {icon_rel}")


APPS = [
    (
        "apps/customer-app/assets/adaptive-icon.png",
        "apps/customer-app/assets/adaptive-icon-foreground.png",
        "apps/customer-app/assets/adaptive-icon-background.png",
        "apps/customer-app/assets/icon.png",
        "_preview_customer_launcher.png",
    ),
    (
        "apps/partner-app/assets/vyaha-partner-adaptive-icon.png",
        "apps/partner-app/assets/vyaha-partner-adaptive-icon-foreground.png",
        "apps/partner-app/assets/vyaha-partner-adaptive-icon-background.png",
        "apps/partner-app/assets/vyaha-partner-app-icon.png",
        "_preview_partner_launcher.png",
    ),
    (
        "apps/delivery-app/assets/vyaha-delivery-adaptive-icon.png",
        "apps/delivery-app/assets/vyaha-delivery-adaptive-icon-foreground.png",
        "apps/delivery-app/assets/vyaha-delivery-adaptive-icon-background.png",
        "apps/delivery-app/assets/vyaha-delivery-app-icon.png",
        "_preview_delivery_launcher.png",
    ),
]

if __name__ == "__main__":
    for args in APPS:
        process(*args)
    print("done")

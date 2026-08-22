"""Build Android notification icons from each app's brand logo.

Android small icons are alpha-only: every opaque pixel is tinted with the
notification color. A full-color square PNG therefore renders as a dark square
inside a colored circle. This script writes:

  - notification-icon.png: white silhouette on a transparent square
  - notification-large-icon.png: full-color logo (used as largeIcon / FCM image)
  - backend/public/notification-icons/{app}.png: hosted large icons for FCM
  - preview mocks under apps/_notification-icon-previews/
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SMALL_SIZE = 96
LARGE_SIZE = 256
# Keep enough margin for circular OEM crops, but zoom wordmark for legibility.
PAD_RATIO = 0.06
PREVIEW_DIR = ROOT / "apps/_notification-icon-previews"
BACKEND_ICON_DIR = ROOT / "backend/public/notification-icons"

APPS = [
    {
        "name": "customer",
        "small_src": ROOT / "apps/customer-app/assets/vyaha-wordmark.png",
        "large_src": ROOT / "apps/customer-app/assets/icon.png",
        "small_dest": ROOT / "apps/customer-app/assets/notification-icon.png",
        "large_dest": ROOT / "apps/customer-app/assets/notification-large-icon.png",
        # Brand red circle + white glyph (matches FCM / app.json color).
        "preview_color": "#e23744",
        "preview_glyph": "#FFFFFF",
        "y_nudge_ratio": 0.0,
        "sample_title": "Order confirmed",
        "sample_body": "Your order is confirmed. The shop will start preparing it soon.",
        "app_label": "Vyaha",
    },
    {
        "name": "partner",
        "small_src": ROOT / "apps/partner-app/assets/vyaha-partner-text-logo.png",
        "large_src": ROOT / "apps/partner-app/assets/vyaha-partner-app-icon.png",
        "small_dest": ROOT / "apps/partner-app/assets/notification-icon.png",
        "large_dest": ROOT / "apps/partner-app/assets/notification-large-icon.png",
        "preview_color": "#174EA6",
        "preview_glyph": "#FFFFFF",
        # Descenders make the wordmark look high; nudge slightly toward optical middle.
        "y_nudge_ratio": 0.02,
        "sample_title": "New order",
        "sample_body": "You have a new order waiting for acceptance.",
        "app_label": "Vyaha Partner",
    },
    {
        "name": "delivery",
        "small_src": ROOT / "apps/delivery-app/assets/vyaha-delivery-text-logo.png",
        "large_src": ROOT / "apps/delivery-app/assets/vyaha-delivery-app-icon.png",
        "small_dest": ROOT / "apps/delivery-app/assets/notification-icon.png",
        "large_dest": ROOT / "apps/delivery-app/assets/notification-large-icon.png",
        "preview_color": "#0F9D58",
        "preview_glyph": "#FFFFFF",
        "y_nudge_ratio": 0.035,
        "sample_title": "New delivery job",
        "sample_body": "Pickup ready nearby. Accept to start the trip.",
        "app_label": "Vyaha Delivery",
    },
]


def to_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def is_logo_pixel(r: int, g: int, b: int, a: int, white_background: bool) -> bool:
    if a <= 12:
        return False
    if white_background:
        return r < 246 or g < 246 or b < 246
    luminance = 0.299 * r + 0.587 * g + 0.114 * b
    return luminance > 18 or max(r, g, b) - min(r, g, b) > 18


def corners_look_white(im: Image.Image) -> bool:
    w, h = im.size
    samples = [
        im.getpixel((2, 2)),
        im.getpixel((w - 3, 2)),
        im.getpixel((2, h - 3)),
        im.getpixel((w - 3, h - 3)),
        im.getpixel((w // 2, 2)),
        im.getpixel((2, h // 2)),
    ]
    opaque_white = 0
    for r, g, b, a in samples:
        if a > 200 and r >= 245 and g >= 245 and b >= 245:
            opaque_white += 1
    return opaque_white >= 3


def extract_mask(im: Image.Image) -> Image.Image:
    white_background = corners_look_white(im)
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    src = im.load()
    dst = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if not is_logo_pixel(r, g, b, a, white_background):
                continue
            dst[x, y] = a if not white_background else 255
    return mask.filter(ImageFilter.SMOOTH)


def fit_on_square(
    mask: Image.Image,
    size: int,
    pad_ratio: float = PAD_RATIO,
    y_nudge_ratio: float = 0.0,
) -> Image.Image:
    bbox = mask.point(lambda value: 255 if value > 16 else 0).getbbox()
    if not bbox:
        raise ValueError("No logo pixels found for notification icon")
    cropped = mask.crop(bbox)
    pad = int(size * pad_ratio)
    inner = max(1, size - pad * 2)
    scale = min(inner / cropped.width, inner / cropped.height)
    resized = cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.LANCZOS,
    )
    canvas = Image.new("L", (size, size), 0)
    x = (size - resized.width) // 2
    y = (size - resized.height) // 2 + int(round(size * y_nudge_ratio))
    y = max(0, min(size - resized.height, y))
    canvas.paste(resized, (x, y))
    return canvas


def write_small_icon(src: Path, dest: Path, y_nudge_ratio: float = 0.0) -> None:
    mask = fit_on_square(extract_mask(to_rgba(src)), SMALL_SIZE, y_nudge_ratio=y_nudge_ratio)
    out = Image.new("RGBA", (SMALL_SIZE, SMALL_SIZE), (0, 0, 0, 0))
    white = Image.new("RGBA", (SMALL_SIZE, SMALL_SIZE), (255, 255, 255, 255))
    out.paste(white, (0, 0), mask)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "PNG", optimize=True)


def write_large_icon(src: Path, dest: Path, y_nudge_ratio: float = 0.0) -> None:
    im = to_rgba(src)
    pad_ratio = 0.05
    mask = extract_mask(im)
    bbox = mask.point(lambda value: 255 if value > 16 else 0).getbbox()
    logo = im.crop(bbox) if bbox else im
    pad = int(LARGE_SIZE * pad_ratio)
    inner = max(1, LARGE_SIZE - pad * 2)
    scale = min(inner / logo.width, inner / logo.height)
    resized = logo.resize(
        (max(1, round(logo.width * scale)), max(1, round(logo.height * scale))),
        Image.LANCZOS,
    )
    fitted = Image.new("RGBA", (LARGE_SIZE, LARGE_SIZE), (255, 255, 255, 255))
    x = (LARGE_SIZE - resized.width) // 2
    y = (LARGE_SIZE - resized.height) // 2 + int(round(LARGE_SIZE * y_nudge_ratio))
    y = max(0, min(LARGE_SIZE - resized.height, y))
    fitted.paste(resized, (x, y), resized)
    dest.parent.mkdir(parents=True, exist_ok=True)
    fitted.save(dest, "PNG", optimize=True)


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    raw = value.lstrip("#")
    return int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16)


def rounded_rect(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def try_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def write_circle_preview(small_path: Path, app: dict) -> Path:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    size = 256
    bg = Image.new("RGBA", (size, size), (20, 20, 20, 255))
    circle = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(circle)
    draw.ellipse((8, 8, size - 9, size - 9), fill=hex_to_rgb(app["preview_color"]) + (255,))
    bg.alpha_composite(circle)

    small = Image.open(small_path).convert("RGBA")
    mask = small.split()[-1]
    glyph = Image.new("RGBA", small.size, hex_to_rgb(app["preview_glyph"]) + (255,))
    glyph.putalpha(mask)
    scaled = glyph.resize((size - 20, size - 20), Image.LANCZOS)
    bg.paste(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2), scaled)

    name = app["name"]
    if name == "customer":
        out = PREVIEW_DIR / "vyaha-notification-icon.png"
        large_out = PREVIEW_DIR / "vyaha-large-icon.png"
    elif name == "partner":
        out = PREVIEW_DIR / "vyaha-partner-notification-icon.png"
        large_out = PREVIEW_DIR / "vyaha-partner-large-icon.png"
    else:
        out = PREVIEW_DIR / "vyaha-delivery-notification-icon.png"
        large_out = PREVIEW_DIR / "vyaha-delivery-large-icon.png"

    bg.save(out, "PNG", optimize=True)
    Image.open(app["large_dest"]).convert("RGBA").save(large_out, "PNG", optimize=True)
    return out


def write_tray_preview(app: dict, circle_preview: Path) -> Path:
    """Mock Android notification shade row: small tinted icon + color large logo."""
    width, height = 720, 220
    card = Image.new("RGBA", (width, height), (245, 245, 245, 255))
    draw = ImageDraw.Draw(card)
    rounded_rect(draw, (16, 16, width - 17, height - 17), 28, (255, 255, 255, 255))

    # Small tray icon: brand-colored circle + white wordmark (no black preview bg).
    icon_size = 72
    small_circle = Image.new("RGBA", (icon_size, icon_size), (0, 0, 0, 0))
    ImageDraw.Draw(small_circle).ellipse((0, 0, icon_size - 1, icon_size - 1), fill=hex_to_rgb(app["preview_color"]) + (255,))
    glyph_src = Image.open(app["small_dest"]).convert("RGBA")
    mask = glyph_src.split()[-1]
    glyph = Image.new("RGBA", glyph_src.size, hex_to_rgb(app["preview_glyph"]) + (255,))
    glyph.putalpha(mask)
    glyph = glyph.resize((icon_size - 10, icon_size - 10), Image.LANCZOS)
    small_circle.paste(glyph, (5, 5), glyph)
    card.paste(small_circle, (40, 48), small_circle)

    title_font = try_font(28, bold=True)
    body_font = try_font(22, bold=False)
    meta_font = try_font(18, bold=False)

    text_left = 132
    draw.text((text_left, 42), app["app_label"], fill=(100, 100, 100, 255), font=meta_font)
    draw.text((text_left, 72), app["sample_title"], fill=(20, 20, 20, 255), font=title_font)
    draw.text((text_left, 112), app["sample_body"][:62], fill=(90, 90, 90, 255), font=body_font)

    large = Image.open(app["large_dest"]).convert("RGBA").resize((88, 88), Image.LANCZOS)
    # Soft rounded crop for large icon.
    mask = Image.new("L", (88, 88), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 87, 87), radius=18, fill=255)
    large.putalpha(mask)
    card.paste(large, (width - 128, 56), large)

    out = PREVIEW_DIR / f"tray-{app['name']}.png"
    card.save(out, "PNG", optimize=True)
    return out


def sync_backend_large_icon(app: dict) -> Path:
    BACKEND_ICON_DIR.mkdir(parents=True, exist_ok=True)
    dest = BACKEND_ICON_DIR / f"{app['name']}.png"
    shutil.copyfile(app["large_dest"], dest)
    return dest


def main() -> None:
    for app in APPS:
        nudge = float(app.get("y_nudge_ratio") or 0.0)
        write_small_icon(app["small_src"], app["small_dest"], y_nudge_ratio=nudge)
        write_large_icon(app["large_src"], app["large_dest"], y_nudge_ratio=nudge)
        circle = write_circle_preview(app["small_dest"], app)
        tray = write_tray_preview(app, circle)
        hosted = sync_backend_large_icon(app)
        small = Image.open(app["small_dest"])
        print(
            f"{app['name']}: small {small.size} {small.mode} nudge={nudge} -> {app['small_dest'].relative_to(ROOT)}"
        )
        print(f"{app['name']}: large -> {app['large_dest'].relative_to(ROOT)}")
        print(f"{app['name']}: hosted -> {hosted.relative_to(ROOT)}")
        print(f"{app['name']}: tray preview -> {tray.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

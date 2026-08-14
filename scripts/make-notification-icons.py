"""Build Android notification icons from each app's brand logo.

Android small icons are alpha-only: every opaque pixel is tinted with the
notification color. A full-color square PNG therefore renders as a dark square
inside a colored circle. This script writes:

  - notification-icon.png: white silhouette on a transparent square
  - notification-large-icon.png: full-color logo (used as largeIcon)
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SMALL_SIZE = 96
LARGE_SIZE = 256
PAD_RATIO = 0.14

APPS = [
    {
        "name": "customer",
        "small_src": ROOT / "apps/customer-app/assets/vyaha-wordmark.png",
        "large_src": ROOT / "apps/customer-app/assets/icon.png",
        "small_dest": ROOT / "apps/customer-app/assets/notification-icon.png",
        "large_dest": ROOT / "apps/customer-app/assets/notification-large-icon.png",
    },
    {
        "name": "partner",
        "small_src": ROOT / "apps/partner-app/assets/vyaha-partner-text-logo.png",
        "large_src": ROOT / "apps/partner-app/assets/vyaha-partner-app-icon.png",
        "small_dest": ROOT / "apps/partner-app/assets/notification-icon.png",
        "large_dest": ROOT / "apps/partner-app/assets/notification-large-icon.png",
    },
    {
        "name": "delivery",
        "small_src": ROOT / "apps/delivery-app/assets/vyaha-delivery-text-logo.png",
        "large_src": ROOT / "apps/delivery-app/assets/vyaha-delivery-app-icon.png",
        "small_dest": ROOT / "apps/delivery-app/assets/notification-icon.png",
        "large_dest": ROOT / "apps/delivery-app/assets/notification-large-icon.png",
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


def fit_on_square(mask: Image.Image, size: int) -> Image.Image:
    bbox = mask.point(lambda value: 255 if value > 16 else 0).getbbox()
    if not bbox:
        raise ValueError("No logo pixels found for notification icon")
    cropped = mask.crop(bbox)
    pad = int(size * PAD_RATIO)
    inner = max(1, size - pad * 2)
    scale = min(inner / cropped.width, inner / cropped.height)
    resized = cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.LANCZOS,
    )
    canvas = Image.new("L", (size, size), 0)
    canvas.paste(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return canvas


def write_small_icon(src: Path, dest: Path) -> None:
    mask = fit_on_square(extract_mask(to_rgba(src)), SMALL_SIZE)
    out = Image.new("RGBA", (SMALL_SIZE, SMALL_SIZE), (0, 0, 0, 0))
    white = Image.new("RGBA", (SMALL_SIZE, SMALL_SIZE), (255, 255, 255, 255))
    out.paste(white, (0, 0), mask)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "PNG", optimize=True)


def write_large_icon(src: Path, dest: Path) -> None:
    im = to_rgba(src)
    if corners_look_white(im):
        fitted = Image.new("RGBA", (LARGE_SIZE, LARGE_SIZE), (255, 255, 255, 255))
        scaled = im.resize((LARGE_SIZE, LARGE_SIZE), Image.LANCZOS)
        fitted.paste(scaled, (0, 0))
    else:
        mask = extract_mask(im)
        bbox = mask.point(lambda value: 255 if value > 16 else 0).getbbox()
        logo = im.crop(bbox) if bbox else im
        pad = int(LARGE_SIZE * 0.08)
        inner = max(1, LARGE_SIZE - pad * 2)
        scale = min(inner / logo.width, inner / logo.height)
        resized = logo.resize(
            (max(1, round(logo.width * scale)), max(1, round(logo.height * scale))),
            Image.LANCZOS,
        )
        fitted = Image.new("RGBA", (LARGE_SIZE, LARGE_SIZE), (255, 255, 255, 255))
        fitted.paste(
            resized,
            ((LARGE_SIZE - resized.width) // 2, (LARGE_SIZE - resized.height) // 2),
            resized,
        )
    dest.parent.mkdir(parents=True, exist_ok=True)
    fitted.save(dest, "PNG", optimize=True)


def main() -> None:
    for app in APPS:
        write_small_icon(app["small_src"], app["small_dest"])
        write_large_icon(app["large_src"], app["large_dest"])
        small = Image.open(app["small_dest"])
        print(
            f"{app['name']}: small {small.size} {small.mode} -> {app['small_dest'].relative_to(ROOT)}"
        )
        print(f"{app['name']}: large -> {app['large_dest'].relative_to(ROOT)}")


if __name__ == "__main__":
    main()

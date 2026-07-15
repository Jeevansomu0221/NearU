#!/usr/bin/env python3
"""Build Vyaha Customer App YouTube promo videos from the screen recording."""

from __future__ import annotations

import shutil
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
CLIPS = ROOT / "clips"
OUT = ROOT / "out"
SRC = Path(r"C:\Users\jeeva\Downloads\vyaha-partner-development-apk\customer-app promo.mp4")

# Portrait canvas matching source aspect (near 9:16)
W, H = 1080, 1920
PHONE_W, PHONE_H = 718, 1606
ORANGE = (255, 107, 53)
CREAM = (255, 248, 240)
INK = (28, 24, 22)
MUTED = (90, 82, 76)

# Feature beat sheet: (start_sec, end_sec, caption, speed)
# Speed >1 compresses slow demos for a tighter promo.
BEATS: list[tuple[float, float, str, float]] = [
    (0.5, 7.0, "Login in seconds with OTP", 1.15),
    (42.0, 52.0, "Exact GPS delivery address", 1.1),
    (97.0, 106.0, "Nearby kitchens · search · veg mode", 1.0),
    (175.0, 198.0, "Browse menus · best sellers · favorites", 1.2),
    (208.0, 218.0, "Add to cart in one tap", 1.1),
    (236.0, 252.0, "Transparent cart & delivery notes", 1.1),
    (264.0, 279.0, "Tip your rider · COD or UPI", 1.1),
    (296.0, 314.0, "Live order tracking", 1.05),
    (324.0, 338.0, "Genuine prices · GST & fees waived", 1.0),
    (412.0, 426.0, "Rate your order", 1.1),
    (466.0, 480.0, "Reorder · support chat · FAQs", 1.05),
]


def run(cmd: list[str]) -> None:
    print(">", " ".join(cmd[:8]), "..." if len(cmd) > 8 else "")
    subprocess.run(cmd, check=True)


def find_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        r"C:\Windows\Fonts\seguiemj.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        p = Path(path)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font: ImageFont.ImageFont,
    fill: tuple[int, int, int],
    max_width: int = 920,
) -> int:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        wrapped = textwrap.wrap(paragraph, width=28) or [""]
        lines.extend(wrapped)
    cy = y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text(((W - tw) // 2, cy), line, font=font, fill=fill)
        cy += th + 14
    return cy


def make_gradient_bg() -> Image.Image:
    img = Image.new("RGB", (W, H), CREAM)
    hero_path = ASSETS / "vyaha-food-hero.png"
    if hero_path.exists():
        hero = Image.open(hero_path).convert("RGB")
        # Cover crop
        scale = max(W / hero.width, H / hero.height)
        hero = hero.resize((int(hero.width * scale), int(hero.height * scale)), Image.Resampling.LANCZOS)
        left = (hero.width - W) // 2
        top = (hero.height - H) // 2
        hero = hero.crop((left, top, left + W, top + H))
        overlay = Image.new("RGBA", (W, H), (20, 12, 8, 168))
        img = Image.alpha_composite(hero.convert("RGBA"), overlay).convert("RGB")
    else:
        pixels = img.load()
        for y in range(H):
            t = y / H
            r = int(255 - 40 * t)
            g = int(248 - 80 * t)
            b = int(240 - 90 * t)
            for x in range(W):
                pixels[x, y] = (r, g, b)
    return img


def paste_logo(canvas: Image.Image, y: int = 420, max_w: int = 720) -> int:
    logo_path = ASSETS / "vyaha-customer-logo.png"
    if not logo_path.exists():
        logo_path = ASSETS / "vyaha-wordmark.png"
    if not logo_path.exists():
        return y
    logo = Image.open(logo_path).convert("RGBA")
    # Knock out pure/near-black backgrounds from wordmark assets
    datas = logo.getdata()
    new_data = []
    for item in datas:
        if item[0] < 25 and item[1] < 25 and item[2] < 25:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)
    logo.putdata(new_data)
    scale = max_w / logo.width
    logo = logo.resize((int(logo.width * scale), int(logo.height * scale)), Image.Resampling.LANCZOS)
    x = (W - logo.width) // 2
    canvas.paste(logo, (x, y), logo)
    return y + logo.height + 40


def _white_panel(canvas: Image.Image, top: int = 300, bottom: int = H - 340) -> None:
    panel = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(panel)
    pdraw.rounded_rectangle((70, top, W - 70, bottom), radius=48, fill=(255, 255, 255, 235))
    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba = Image.alpha_composite(canvas_rgba, panel)
    canvas.paste(canvas_rgba.convert("RGB"))


def make_intro_card(path: Path) -> None:
    canvas = make_gradient_bg()
    _white_panel(canvas)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((70, 300, W - 70, H - 340), radius=48, outline=ORANGE, width=5)

    y = paste_logo(canvas, y=380, max_w=640)
    title_font = find_font(64, bold=True)
    sub_font = find_font(42)
    small_font = find_font(34)
    y = draw_centered_text(draw, "Good food near you", y + 24, title_font, INK)
    y = draw_centered_text(draw, "We value your money.", y + 12, sub_font, ORANGE)
    draw_centered_text(
        draw,
        "Genuine menu prices\nHyperlocal delivery in Hyderabad",
        y + 36,
        small_font,
        MUTED,
    )
    canvas.save(path, quality=95)


def make_outro_card(path: Path) -> None:
    canvas = make_gradient_bg()
    _white_panel(canvas)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((70, 300, W - 70, H - 340), radius=48, outline=ORANGE, width=5)

    y = paste_logo(canvas, y=400, max_w=640)
    title_font = find_font(56, bold=True)
    sub_font = find_font(36)
    small_font = find_font(32)
    y = draw_centered_text(draw, "Order with Vyaha", y + 16, title_font, INK)
    y = draw_centered_text(draw, "Local kitchens. Fair totals. Faster routes.", y + 14, sub_font, MUTED)
    y = draw_centered_text(draw, "Coming to Google Play", y + 48, find_font(44, bold=True), ORANGE)
    draw_centered_text(draw, "vyaha.com", y + 28, small_font, MUTED)
    canvas.save(path, quality=95)


def ff_escape(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace("%", "\\%")
    )


def render_slide_video(image: Path, seconds: float, out: Path) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(image),
            "-f",
            "lavfi",
            "-i",
            "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-t",
            f"{seconds:.2f}",
            "-c:v",
            "libx264",
            "-tune",
            "stillimage",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            "-r",
            "30",
            str(out),
        ]
    )


def render_app_clip(
    start: float,
    end: float,
    caption: str,
    speed: float,
    out: Path,
) -> None:
    duration = end - start
    out_dur = duration / speed
    # Scale phone UI into 1080x1920 with cream letterbox + caption bar
    caption_esc = ff_escape(caption)
    fontfile = "C\\\\:/Windows/Fonts/segoeuib.ttf"
    vf = (
        f"setpts=PTS/{speed},"
        f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
        f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:0xFFF8F0,"
        f"drawbox=x=0:y=0:w={W}:h=150:color=0xFF6B35@0.92:t=fill,"
        f"drawtext=fontfile={fontfile}:text='{caption_esc}':"
        f"fontsize=42:fontcolor=white:x=(w-text_w)/2:y=52,"
        f"fps=30,format=yuv420p"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-ss",
            f"{start:.2f}",
            "-to",
            f"{end:.2f}",
            "-i",
            str(SRC),
            "-f",
            "lavfi",
            "-i",
            "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-vf",
            vf,
            "-t",
            f"{out_dur:.2f}",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "20",
            "-c:a",
            "aac",
            "-shortest",
            "-r",
            "30",
            str(out),
        ]
    )


def concat_clips(paths: list[Path], out: Path) -> None:
    list_file = CLIPS / "concat.txt"
    lines = [f"file '{p.as_posix()}'" for p in paths]
    list_file.write_text("\n".join(lines), encoding="utf-8")
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "19",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-movflags",
            "+faststart",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            str(out),
        ]
    )


def make_landscape(portrait: Path, out: Path) -> None:
    # 16:9 YouTube: phone-style centered on branded blurred side panels
    vf = (
        f"[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=18:1,eq=brightness=-0.15[bg];"
        f"[0:v]scale=-2:1000[fg];"
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(portrait),
            "-filter_complex",
            vf,
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "19",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            str(out),
        ]
    )


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Source recording not found: {SRC}")

    if CLIPS.exists():
        shutil.rmtree(CLIPS)
    CLIPS.mkdir(parents=True)
    OUT.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)

    intro_img = CLIPS / "intro.jpg"
    outro_img = CLIPS / "outro.jpg"
    make_intro_card(intro_img)
    make_outro_card(outro_img)

    parts: list[Path] = []
    intro_vid = CLIPS / "00_intro.mp4"
    render_slide_video(intro_img, 3.2, intro_vid)
    parts.append(intro_vid)

    for i, (start, end, caption, speed) in enumerate(BEATS, start=1):
        clip = CLIPS / f"{i:02d}_feature.mp4"
        render_app_clip(start, end, caption, speed, clip)
        parts.append(clip)

    outro_vid = CLIPS / "99_outro.mp4"
    render_slide_video(outro_img, 3.8, outro_vid)
    parts.append(outro_vid)

    portrait = OUT / "Vyaha_Customer_App_Promo_Shorts_9x16.mp4"
    landscape = OUT / "Vyaha_Customer_App_Promo_YouTube_16x9.mp4"
    concat_clips(parts, portrait)
    make_landscape(portrait, landscape)

    # Companion metadata for upload
    meta = OUT / "YOUTUBE_UPLOAD.txt"
    meta.write_text(
        textwrap.dedent(
            """\
            TITLE
            Vyaha Customer App — Genuine Menu Prices | Hyperlocal Food Delivery in Hyderabad

            DESCRIPTION
            Vyaha brings nearby kitchens to your door — at the same prices you see on the menu.

            In this walkthrough:
            0:00 — Intro
            • Quick OTP login
            • Nearby shops, search & veg mode
            • Browse menus, best sellers & favorites
            • One-tap add to cart
            • Transparent cart & delivery notes
            • Tip your rider · COD or UPI
            • Live order tracking
            • Genuine prices — GST & platform fee waived
            • Rate your order
            • Reorder, support chat & FAQs

            We value your money.
            Genuine menu prices. Hyperlocal food delivery to our home.

            🌐 https://www.vyaha.com
            📍 Serving Hyderabad, Telangana

            #Vyaha #FoodDelivery #HyderabadFood #Hyperlocal #CustomerApp

            TAGS
            Vyaha, food delivery Hyderabad, hyperlocal delivery, genuine menu prices,
            cloud kitchen, Order food online Hyderabad, COD UPI, veg mode

            FILES
            - Shorts / Reels / mobile: Vyaha_Customer_App_Promo_Shorts_9x16.mp4
            - YouTube landscape: Vyaha_Customer_App_Promo_YouTube_16x9.mp4
            """
        ),
        encoding="utf-8",
    )

    print("\nDone:")
    print(" ", portrait)
    print(" ", landscape)
    print(" ", meta)


if __name__ == "__main__":
    main()

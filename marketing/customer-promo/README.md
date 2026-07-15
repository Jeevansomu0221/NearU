# Vyaha Customer App — YouTube Promo

Built from the app screen recording with branded intro/outro and feature captions.

## Outputs

| File | Format | Use |
|------|--------|-----|
| `out/Vyaha_Customer_App_Promo_Shorts_9x16.mp4` | 1080×1920 | YouTube Shorts, Reels, Stories |
| `out/Vyaha_Customer_App_Promo_YouTube_16x9.mp4` | 1920×1080 | Standard YouTube upload |
| `out/YOUTUBE_UPLOAD.txt` | — | Suggested title, description, tags |

## Rebuild

1. Place/update the source recording at:
   `C:\Users\jeeva\Downloads\vyaha-partner-development-apk\customer-app promo.mp4`
2. Run:

```powershell
python marketing/customer-promo/build_promo.py
```

Requires FFmpeg and Pillow (`pip install pillow`).

"""Launcher icons and splash screens for the Android shell.

Draws the compass mark from public/favicon.svg with PIL so the APK has crisp
icons at every density without an image-generation step:

    python scripts/android-icons.py
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

NAVY = (30, 38, 64, 255)
CREAM = (243, 236, 223, 255)
TERRACOTTA = (224, 122, 90, 255)
NIGHT = (13, 17, 32, 255)

# Adaptive icon layers are 108dp with a 72dp safe zone.
FOREGROUND = [("mdpi", 108), ("hdpi", 162), ("xhdpi", 216), ("xxhdpi", 324), ("xxxhdpi", 432)]
LAUNCHER = [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]
# Matches the sizes of the Capacitor splash template so every qualifier is ours.
SPLASH = [
    ("drawable", 480, 320),
    ("drawable-land-mdpi", 480, 320),
    ("drawable-land-hdpi", 800, 480),
    ("drawable-land-xhdpi", 1280, 720),
    ("drawable-land-xxhdpi", 1600, 960),
    ("drawable-land-xxxhdpi", 1920, 1280),
    ("drawable-port-mdpi", 320, 480),
    ("drawable-port-hdpi", 480, 800),
    ("drawable-port-xhdpi", 720, 1280),
    ("drawable-port-xxhdpi", 960, 1600),
    ("drawable-port-xxxhdpi", 1280, 1920),
]


def mark(size, ss=4):
    """The compass from favicon.svg, drawn at size px (supersampled ss times)."""
    s = size * ss
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    unit = s / 32.0

    # Ring
    d.ellipse(
        [(16 - 11) * unit, (16 - 11) * unit, (16 + 11) * unit, (16 + 11) * unit],
        outline=CREAM,
        width=max(1, round(1.4 * unit)),
    )
    # Needle: lower half cream, upper half terracotta
    d.polygon([(16 * unit, 5 * unit), (18.6 * unit, 16 * unit), (13.4 * unit, 16 * unit), (16 * unit, 27 * unit)], fill=CREAM)
    d.polygon([(16 * unit, 5 * unit), (18.6 * unit, 16 * unit), (13.4 * unit, 16 * unit)], fill=TERRACOTTA)
    # Pivot
    d.ellipse(
        [(16 - 1.5) * unit, (16 - 1.5) * unit, (16 + 1.5) * unit, (16 + 1.5) * unit],
        fill=NAVY,
    )
    return img.resize((size, size), Image.LANCZOS)


def rounded(size, radius_ratio, color):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=color)
    return img


def circle(size, color):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, size - 1, size - 1], fill=color)
    return img


def icon(size, shape):
    base = rounded(size, 0.25, NAVY) if shape == "square" else circle(size, NAVY)
    art = mark(round(size * 0.62))
    base.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return base


def foreground(size):
    art = mark(round(size * 0.56))
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return layer


def splash(w, h):
    img = Image.new("RGBA", (w, h), NIGHT)
    art = mark(round(min(w, h) * 0.22))
    img.alpha_composite(art, ((w - art.width) // 2, (h - art.height) // 2))
    return img.convert("RGB")


def save(img, folder, name):
    path = os.path.join(RES, folder, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)
    print("wrote", os.path.relpath(path, ROOT))


def main():
    if not os.path.isdir(RES):
        raise SystemExit("android/ 工程还不存在，请先运行 npx cap add android")
    for dpi, px in LAUNCHER:
        save(icon(px, "square"), f"mipmap-{dpi}", "ic_launcher.png")
        save(icon(px, "round"), f"mipmap-{dpi}", "ic_launcher_round.png")
    for dpi, px in FOREGROUND:
        save(foreground(px), f"mipmap-{dpi}", "ic_launcher_foreground.png")
    for folder, w, h in SPLASH:
        save(splash(w, h), folder, "splash.png")


if __name__ == "__main__":
    main()

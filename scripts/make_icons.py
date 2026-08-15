"""
Renders the full T3RRI HUB PWA icon set from the source artwork at
assets/brand/source-logo.jpg (the robotic-eagle mark). Run any time
that source file changes.

    pip install pillow
    python3 scripts/make_icons.py

Output goes to public/icons/. The crop box below was picked by hand
to frame just the mark (no wordmark text) - if you swap in a new
source image, preview a crop first before trusting these numbers:

    python3 -c "from PIL import Image; Image.open('assets/brand/source-logo.jpg').crop((489,20,1449,980)).save('/tmp/preview.png')"
"""
from PIL import Image, ImageDraw
import os

SRC = os.path.join(os.path.dirname(__file__), "..", "assets", "brand", "source-logo.jpg")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

# Square crop around just the mark, clear of the "T3RRI HUB" wordmark
# band (which starts around y=1010 in the 1920x1280 source).
MARK_BOX = (489, 20, 1449, 980)

# Sampled from the source's own background so padding blends in
# seamlessly instead of showing a hard edge.
BG_COLOR = (2, 6, 15)


def rounded_corners(img, radius_ratio=0.22):
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255
    )
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def padded(img, total_size, pad_color=BG_COLOR):
    """Centers img on a total_size x total_size canvas of pad_color -
    used for the maskable icon, which needs generous safe-zone margin
    since the OS crops it to a circle/squircle."""
    canvas = Image.new("RGB", (total_size, total_size), pad_color)
    offset = (total_size - img.size[0]) // 2
    canvas.paste(img, (offset, offset))
    return canvas


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)

    mark = Image.open(SRC).convert("RGB").crop(MARK_BOX)  # 960x960

    # Standard icons: soft-rounded corners, resized down from the crop.
    for size in (512, 192):
        art = mark.resize((1024, 1024), Image.LANCZOS).convert("RGBA")
        art = rounded_corners(art, 0.22)
        art = art.resize((size, size), Image.LANCZOS)
        art.save(f"{OUT_DIR}/icon-{size}.png")

    # Maskable: extra padding so the mark stays inside the safe zone
    # once the OS applies its own circular/squircle crop.
    maskable = padded(mark, 1280)
    maskable = maskable.resize((512, 512), Image.LANCZOS)
    maskable.save(f"{OUT_DIR}/icon-maskable-512.png")

    # Apple touch icon: iOS rounds it itself, wants an opaque square.
    apple = mark.resize((180, 180), Image.LANCZOS)
    apple.save(f"{OUT_DIR}/apple-touch-icon.png")

    # Small favicon.
    favicon = mark.resize((256, 256), Image.LANCZOS).convert("RGBA")
    favicon = rounded_corners(favicon, 0.22)
    favicon = favicon.resize((32, 32), Image.LANCZOS)
    favicon.save(f"{OUT_DIR}/favicon-32.png")

    print("Icons written to", OUT_DIR)

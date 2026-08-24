#!/usr/bin/env python3
"""Generate site/public/favicon.ico and site/public/og.png.

One-off design tool, NOT part of the build: it needs Pillow and macOS system fonts.
The outputs are committed. Re-run only when the brand marks change:

    python3 scripts/gen-brand-assets.py

favicon.ico mirrors favicon.svg (the vector is the source of truth for the shape).
"""
from PIL import Image, ImageDraw, ImageFont

OUT = "site/public"

GROUND = "#faf8f4"
SURFACE = "#ffffff"
INK = "#1a1814"
MUTED = "#5c574e"
RULE = "#ddd6c9"
ACCENT = "#c2410c"

GEORGIA = "/Library/Fonts/Georgia.ttf"
GEORGIA_IT = "/Library/Fonts/Georgia Italic.ttf"
MENLO = "/System/Library/Fonts/Menlo.ttc"
HELV = "/System/Library/Fonts/HelveticaNeue.ttc"


def monogram(size: int) -> Image.Image:
    """The favicon.svg mark, rasterised. Supersampled 8x so the strokes stay clean."""
    s = size * 8
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = s / 32  # one SVG user unit
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=6 * u, fill=ACCENT)
    w = int(round(3.2 * u))
    pts = [(9 * u, 23 * u), (9 * u, 10 * u), (16 * u, 18 * u), (23 * u, 10 * u), (23 * u, 23 * u)]
    d.line(pts, fill=GROUND, width=w, joint="curve")
    for x, y in pts:  # round caps
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=GROUND)
    return img.resize((size, size), Image.LANCZOS)


def write_favicon() -> None:
    base = monogram(256)
    base.save(f"{OUT}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    # 180px, opaque: iOS composites touch icons on white and ignores the alpha channel.
    apple = Image.new("RGB", (180, 180), ACCENT)
    apple.paste(monogram(180), (0, 0), monogram(180))
    apple.save(f"{OUT}/apple-touch-icon.png")


def tracked(draw, xy, text, font, fill, tracking):
    """Draw text with letter-spacing — the mono eyebrows are set wide in the site's type."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking
    return x


def write_og() -> None:
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), GROUND)
    d = ImageDraw.Draw(img)

    pad = 84
    d.rectangle([0, 0, W, 10], fill=ACCENT)          # accent band, top edge
    d.rectangle([pad, 150, W - pad, 151], fill=RULE)  # hairline under the eyebrow

    eyebrow = ImageFont.truetype(MENLO, 24)
    display = ImageFont.truetype(GEORGIA, 74)
    display_it = ImageFont.truetype(GEORGIA_IT, 74)
    body = ImageFont.truetype(HELV, 26)
    mono_small = ImageFont.truetype(MENLO, 22)

    tracked(d, (pad, 104), "MOBILE ENGINEERING AGENTS", eyebrow, ACCENT, 3.4)

    y = 214
    d.text((pad, y), "Turn your AI coding agent", font=display, fill=INK)
    y += 96
    x = pad
    d.text((x, y), "into a ", font=display, fill=INK)
    x += d.textlength("into a ", font=display)
    d.text((x, y), "Senior mobile engineer", font=display_it, fill=ACCENT)

    d.text(
        (pad, 430),
        "Architecture, security, testing and standards — so the code your",
        font=body,
        fill=MUTED,
    )
    d.text((pad, 468), "agent generates is production-grade, not just plausible.", font=body, fill=MUTED)

    d.rectangle([pad, 536, W - pad, 537], fill=RULE)
    tracked(d, (pad, 560), "MOBIE.SOKPICH.DEV", mono_small, INK, 2.6)

    mark = monogram(96)
    img.paste(mark, (W - pad - 96, 96), mark)

    img.save(f"{OUT}/og.png")


if __name__ == "__main__":
    write_favicon()
    write_og()
    print("wrote favicon.ico, apple-touch-icon.png, og.png")

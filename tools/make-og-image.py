"""Draw assets/og-image.png, the picture shown when a link to the site is shared (WhatsApp,
Discord, Reddit, X). 1200 x 630, the size those sites expect. Run from the repository root:

    python tools/make-og-image.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
NAVY = (0, 43, 128)
SKY = (77, 171, 247)
SUBJECTS = [('Physics', (0, 86, 179)), ('Chemistry', (11, 110, 85)), ('Biology', (42, 111, 42)), ('Maths', (95, 50, 176))]
FONTS = 'C:/Windows/Fonts/'


def font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(FONTS + n, size)
        except OSError:
            continue
    return ImageFont.load_default()


def logo(size):
    """The favicon's atom: three ellipses at 0, 60 and 120 degrees round a blue dot."""
    s = size * 4
    layer = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    for angle in (0, 60, 120):
        e = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        d = ImageDraw.Draw(e)
        rx, ry = s * 22 / 64, s * 8.5 / 64
        d.ellipse([s / 2 - rx, s / 2 - ry, s / 2 + rx, s / 2 + ry], outline=(255, 255, 255, 255), width=int(s * 3.2 / 64))
        layer.alpha_composite(e.rotate(angle, resample=Image.BICUBIC))
    d = ImageDraw.Draw(layer)
    r = s * 5 / 64
    d.ellipse([s / 2 - r, s / 2 - r, s / 2 + r, s / 2 + r], fill=SKY + (255,))
    return layer.resize((size, size), Image.LANCZOS)


img = Image.new('RGBA', (W, H), NAVY + (255,))
d = ImageDraw.Draw(img)
img.alpha_composite(logo(150), (80, 92))

bold = ['segoeuib.ttf', 'arialbd.ttf']
regular = ['segoeui.ttf', 'arial.ttf']
d.text((260, 104), 'IAL Prep', font=font(bold, 104), fill='white')
d.text((84, 286), 'Edexcel International AS and A Level', font=font(bold, 50), fill='white')
d.text((84, 356), 'Past-paper questions by topic, real mark schemes,', font=font(regular, 36), fill=(214, 226, 255))
d.text((84, 402), 'every past paper and notes. Free.', font=font(regular, 36), fill=(214, 226, 255))

chip = font(bold, 32)
x = 84
for name, colour in SUBJECTS:
    w = d.textlength(name, font=chip) + 48
    d.rounded_rectangle([x, 494, x + w, 556], radius=31, fill=colour, outline=(255, 255, 255), width=2)
    d.text((x + 24, 504), name, font=chip, fill='white')
    x += w + 18

d.text((W - 84, 560), 'ialprep.com', font=font(bold, 30), fill=SKY, anchor='rs')

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'og-image.png')
img.convert('RGB').save(out, optimize=True)
print('wrote', out, os.path.getsize(out), 'bytes')

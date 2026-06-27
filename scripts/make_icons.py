import math
from PIL import Image, ImageDraw

def lerp(a, b, t):
    return a + (b - a) * t

def draw_flower(draw, cx, cy, r, petal_color, center_color):
    petals = 5
    petal_r = r * 0.62
    for i in range(petals):
        angle = -math.pi / 2 + i * (2 * math.pi / petals)
        px = cx + math.cos(angle) * r * 0.42
        py = cy + math.sin(angle) * r * 0.42
        bbox = [px - petal_r, py - petal_r, px + petal_r, py + petal_r]
        draw.ellipse(bbox, fill=petal_color)
    cr = r * 0.40
    draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=center_color)

def make_icon(size, with_shadow=True):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = size * 0.08
    note_box = [pad, pad, size - pad, size - pad]
    radius = size * 0.22

    # soft drop shadow
    if with_shadow:
        shadow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        off = size * 0.035
        sd.rounded_rectangle(
            [note_box[0] + off, note_box[1] + off * 1.6, note_box[2] + off, note_box[3] + off * 1.6],
            radius=radius, fill=(120, 70, 55, 90)
        )
        shadow = shadow.filter(__import__('PIL.ImageFilter', fromlist=['GaussianBlur']).GaussianBlur(size * 0.025))
        img = Image.alpha_composite(img, shadow)
        draw = ImageDraw.Draw(img)

    # note body — soft pink with a slight gradient feel via two-tone fill
    body_color = (247, 184, 208, 255)   # pink border tone
    fill_color = (251, 220, 232, 255)   # pink bg tone
    draw.rounded_rectangle(note_box, radius=radius, fill=fill_color, outline=body_color, width=max(2, int(size*0.012)))

    # folded corner (dog-ear) top-right, deeper pink
    fold = size * 0.30
    x0, y0, x1, y1 = note_box[2], note_box[1], note_box[2] - fold, note_box[1] + fold
    # clip fold to rounded corner area using a triangle + small rounded patch
    fold_color = (232, 127, 174, 255)
    draw.polygon([(note_box[2] - fold, note_box[1]), (note_box[2], note_box[1]), (note_box[2], note_box[1] + fold)], fill=fold_color)
    # re-draw rounded corner over the fold polygon edge so it still looks rounded at the outer corner
    corner_patch = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    cp = ImageDraw.Draw(corner_patch)
    cp.rounded_rectangle(note_box, radius=radius, outline=(0,0,0,0))
    img = Image.alpha_composite(img, corner_patch)
    draw = ImageDraw.Draw(img)

    # crease line on the fold
    draw.line([(note_box[2] - fold, note_box[1] + fold*0.02), (note_box[2]-fold*0.02, note_box[1]+fold)],
               fill=(196, 95, 140, 255), width=max(2, int(size*0.012)))

    # little kawaii flower centered slightly lower
    cx = (note_box[0] + note_box[2]) / 2
    cy = (note_box[1] + note_box[3]) / 2 + size * 0.02
    draw_flower(draw, cx, cy, size * 0.16, (255, 255, 255, 255), (247, 184, 208, 255))

    return img

for size, name in [(1024, 'icon_1024'), (256, 'icon_256'), (64, 'tray_64'), (32, 'tray_32')]:
    icon = make_icon(size, with_shadow=(size >= 128))
    icon.save(f'/home/claude/kawaii-sticky-notes/build/{name}.png')

print('done')

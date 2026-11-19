from PIL import Image, ImageDraw
import sys, math

def make(size, out):
    k = size / 512
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(96 * k), fill=(31, 42, 68, 255))
    for y in (150, 210, 270, 330, 390):
        d.line([(80 * k, y * k), (432 * k, y * k)], fill=(245, 242, 234, 255), width=max(1, int(10 * k)))
    # rotated ellipse note head
    cx, cy, rx, ry, a = 290 * k, 300 * k, 62 * k, 45 * k, math.radians(-20)
    pts = []
    for i in range(120):
        t = i / 120 * 2 * math.pi
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)))
    d.polygon(pts, fill=(255, 184, 77, 255))
    d.line([(344 * k, 288 * k), (344 * k, 110 * k)], fill=(255, 184, 77, 255), width=max(1, int(14 * k)))
    im.save(out)

make(192, sys.argv[1] + "/icon-192.png")
make(512, sys.argv[1] + "/icon-512.png")
print("ok")

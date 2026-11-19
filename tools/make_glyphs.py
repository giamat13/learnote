import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

font = TTFont(sys.argv[1])
cmap = font.getBestCmap()
gs = font.getGlyphSet()
out = {}
for name, cp in (("bass", 0x1D122), ("treble", 0x1D11E)):
    gn = cmap[cp]
    p = SVGPathPen(gs, ntos=lambda v: ("%.1f" % v).rstrip("0").rstrip("."))
    gs[gn].draw(p)
    b = BoundsPen(gs)
    gs[gn].draw(b)
    out[name] = {"d": p.getCommands(), "b": list(b.bounds)}
    print(name, gn, b.bounds, len(out[name]["d"]))
with open(sys.argv[2], "w", encoding="utf-8") as f:
    f.write("window.GLYPH=" + json.dumps(out) + ";\n")

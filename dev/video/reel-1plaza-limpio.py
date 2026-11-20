# Reel 1 plaza, estilo actual (20/11/2026): fotos a pantalla completa, movimiento lento y parejo,
# cortes secos y texto blanco limpio sobre un degradado oscuro (sin cajas ni giros: el dueño pidió
# que no parezca "de los 90"). Sin sonido (la música se pone en Instagram; los cortes caen cada ~2-4 s).
# Uso: python3 dev/video/reel-1plaza-limpio.py <salida.mp4> <foto_asiento> <foto_detalle> <foto_puerta>
import subprocess, sys
from PIL import Image, ImageOps, ImageDraw, ImageFilter, ImageFont, ImageEnhance

W, H, FPS = 1080, 1920, 30
OUT = sys.argv[1]
FB = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FS = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"

def carga(p, contraste=False):
    f = ImageOps.exif_transpose(Image.open(p)).convert("RGB")
    if contraste: f = ImageOps.autocontrast(f, cutoff=(1, 0.5))
    return f
A, D, P = carga(sys.argv[2]), carga(sys.argv[3]), carga(sys.argv[4], True)

# tomas: (foto, duración, (centro_x, centro_y, ancho) inicio, ... fin) — en proporción de la foto
TOMAS = [(A, 4.2, (0.50, 0.50, 1.00), (0.50, 0.47, 0.88)),
         (D, 2.3, (0.48, 0.36, 0.46), (0.52, 0.34, 0.41)),
         (D, 2.2, (0.64, 0.22, 0.42), (0.63, 0.24, 0.38)),
         (P, 4.4, (0.50, 0.42, 0.80), (0.50, 0.45, 0.90)),
         (A, 3.4, (0.50, 0.48, 0.92), (0.50, 0.48, 0.86))]
DUR = sum(t[1] for t in TOMAS)

TEXTOS = [(0.3, 4.0, "Funda de 1 plaza para llevar a tu perrito sin perder espacio en el asiento trasero."),
          (4.5, 8.5, "Impermeable, antidesgarro y acolchada."),
          (9.0, 12.9, "Podés llevarla en 3 cuotas sin interés o 10% off si elegís pagar con transferencia.")]

def caja(f, cx, cy, w):
    fw, fh = f.size; cw = w * fw; ch = cw * H / W
    if ch > fh: ch = fh; cw = ch * W / H
    x0 = min(max(cx * fw - cw / 2, 0), fw - cw); y0 = min(max(cy * fh - ch / 2, 0), fh - ch)
    return (x0, y0, x0 + cw, y0 + ch)

def bloque(txt, tam, ancho=900):
    font = ImageFont.truetype(FB, tam); d = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    lineas, cur = [], ""
    for w in txt.split():
        pr = (cur + " " + w).strip()
        if d.textlength(pr, font=font) > ancho and cur: lineas.append(cur); cur = w
        else: cur = pr
    lineas.append(cur)
    lh = round(tam * 1.25)
    im = Image.new("RGBA", (W, lh * len(lineas) + 40)); dd = ImageDraw.Draw(im)
    for i, l in enumerate(lineas):
        dd.text((90, 10 + i * lh), l, font=font, fill="white")
    sombra = Image.new("RGBA", im.size, (0, 0, 0, 0)); sombra.putalpha(im.getchannel("A").point(lambda v: v * 0.55))
    sombra = sombra.filter(ImageFilter.GaussianBlur(8))
    out = Image.new("RGBA", im.size); out.alpha_composite(sombra, (0, 3)); out.alpha_composite(im)
    return out
PLACAS = [(a, b, bloque(t, 62)) for a, b, t in TEXTOS]

grad = Image.new("L", (1, H))
for y in range(H): grad.putpixel((0, y), int(175 * max(0, (y - 1050) / (H - 1050)) ** 1.4))
DEGRADE = Image.new("RGBA", (W, H), (0, 0, 0, 255)); DEGRADE.putalpha(grad.resize((W, H)))

# placa final: la foto oscurecida, la web y el logo
LOGO = Image.open("logo.png").convert("RGBA"); LOGO = LOGO.resize((170, round(170 * LOGO.height / LOGO.width)), Image.LANCZOS)
def final(img, k):
    o = Image.new("RGBA", (W, H), (0, 0, 0, int(140 * k))); img.alpha_composite(o)
    d = ImageDraw.Draw(img)
    for txt, font, y, col in [("Visitá nuestra web", ImageFont.truetype(FS, 52), 820, (255, 255, 255)),
                              ("losperrines.com.ar", ImageFont.truetype(FB, 84), 900, (217, 225, 90))]:
        tw = d.textlength(txt, font=font)
        d.text(((W - tw) / 2, y + 20 * (1 - k)), txt, font=font, fill=col + (int(255 * k),))
    lg = LOGO.copy(); lg.putalpha(lg.getchannel("A").point(lambda v: v * k))
    img.alpha_composite(lg, ((W - lg.width) // 2, 1060))

def ease_out(x): x = min(1, max(0, x)); return 1 - (1 - x) ** 3

enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                        "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
t0 = 0.0
for n_toma, (f, dur, ini, fin) in enumerate(TOMAS):
    nf = round(dur * FPS)
    for n in range(nf):
        k = n / max(1, nf - 1); t = t0 + n / FPS
        c = tuple(a + (b - a) * k for a, b in zip(ini, fin))   # movimiento parejo, sin aceleraciones
        img = f.resize((W, H), Image.LANCZOS, box=caja(f, *c)).convert("RGBA")
        if n_toma < len(TOMAS) - 1:
            img.alpha_composite(DEGRADE)
            for a, b, pl in PLACAS:
                if a <= t <= b:
                    v = min(ease_out((t - a) / 0.4), ease_out((b - t) / 0.2))
                    p = pl.copy(); p.putalpha(p.getchannel("A").point(lambda x: x * v))
                    img.alpha_composite(p, (0, round(1720 - pl.height + 24 * (1 - v))))
        else:
            final(img, ease_out((t - t0) / 0.5))
        enc.stdin.write(img.convert("RGB").tobytes())
    t0 += dur
enc.stdin.close(); enc.wait()
print("listo:", OUT)

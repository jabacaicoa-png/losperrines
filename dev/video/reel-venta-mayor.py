# Reel "Venta por mayor" (20/11/2026): fotos reales de las fundas + la grabación de la web con el formulario
# mayorista (ya editada con zoom y manito por reel-mayorista.py) + placa final. Estilo limpio: tomas a pantalla
# completa, movimiento lento, cortes secos y texto blanco sobre degradado. Sin sonido (música en Instagram).
# Uso: python3 dev/video/reel-venta-mayor.py <salida.mp4> <foto_2plazas> <foto_1plaza> <foto_puerta> <foto_detalle> <reel_web.mp4>
import subprocess, sys
from PIL import Image, ImageOps, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
OUT, F2, F1, FP, FD, WEB = sys.argv[1:7]
FB = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FX = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FS = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
AMA, OLIVA = (217, 225, 90), (47, 56, 34)

def carga(p, contraste=False):
    f = ImageOps.exif_transpose(Image.open(p)).convert("RGB")
    return ImageOps.autocontrast(f, cutoff=(1, 0.5)) if contraste else f
A2, A1, AP, AD = carga(F2), carga(F1), carga(FP, True), carga(FD)

# tomas de foto: (foto, duración, (cx, cy, ancho) inicio, fin) en proporción de la foto
FOTOS = [(A2, 2.6, (0.50, 0.55, 1.00), (0.50, 0.55, 0.90)),
         (A1, 2.2, (0.55, 0.50, 0.95), (0.55, 0.52, 0.85)),
         (AD, 2.0, (0.50, 0.34, 0.42), (0.53, 0.32, 0.37)),
         (AP, 2.2, (0.50, 0.42, 0.80), (0.50, 0.45, 0.90))]
WEB_TRAMOS = [(6.95, 11.4)]   # segundos del reel de la web: solo la carga del formulario (antes sale la foto del golden, que es una hamaca, no la funda)
FIN = 3.4
DUR_FOTOS = sum(x[1] for x in FOTOS); DUR_WEB = sum(b - a for a, b in WEB_TRAMOS); T_WEB = DUR_FOTOS; T_FIN = T_WEB + DUR_WEB
TEXTOS = [(0.1, 2.6, "¿Tenés pet shop, veterinaria o tienda?", "abajo"),
          (2.6, 4.8, "Sumá a tu local las fundas canasto para el auto", "abajo"),
          (4.8, 6.8, "Impermeables, acolchadas y antidesgarro", "abajo"),
          (6.8, 9.0, "2 plazas y 1 plaza · Fabricación propia", "abajo"),
          (T_WEB, T_FIN, "Pedí la propuesta en la web: precios por cantidad y envío incluido", "arriba")]

def caja(f, cx, cy, w):
    fw, fh = f.size; cw = w * fw; ch = cw * H / W
    if ch > fh: ch = fh; cw = ch * W / H
    x0 = min(max(cx * fw - cw / 2, 0), fw - cw); y0 = min(max(cy * fh - ch / 2, 0), fh - ch)
    return (x0, y0, x0 + cw, y0 + ch)
def ease_out(x): x = min(1, max(0, x)); return 1 - (1 - x) ** 3
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
    for i, l in enumerate(lineas): dd.text((90, 10 + i * lh), l, font=font, fill="white")
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0)); sh.putalpha(im.getchannel("A").point(lambda v: v * 0.6))
    out = Image.new("RGBA", im.size); out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)), (0, 3)); out.alpha_composite(im)
    return out
PLACAS = [(a, b, bloque(t, 64), pos) for a, b, t, pos in TEXTOS]
def degrade(arriba):
    g = Image.new("L", (1, H))
    for y in range(H):
        r = (620 - y) / 620 if arriba else (y - 1050) / (H - 1050)
        g.putpixel((0, y), int(190 * max(0, r) ** 1.3))
    d = Image.new("RGBA", (W, H), (0, 0, 0, 255)); d.putalpha(g.resize((W, H))); return d
DEG_AB, DEG_AR = degrade(False), degrade(True)
BANDA_H = 700
BANDA = Image.new("RGBA", (W, H)); ImageDraw.Draw(BANDA).rectangle((0, 0, W, BANDA_H), fill=OLIVA + (255,))
for _y in range(40): ImageDraw.Draw(BANDA).line((0, BANDA_H + _y, W, BANDA_H + _y), fill=OLIVA + (int(255 * (1 - _y / 40)),))
# etiqueta "VENTA POR MAYOR" fija arriba en las fotos
ETQ = Image.new("RGBA", (520, 84)); _d = ImageDraw.Draw(ETQ); _d.rounded_rectangle((0, 0, 519, 83), 42, fill=AMA + (255,))
_f = ImageFont.truetype(FX, 40); _d.text(((520 - _d.textlength("VENTA POR MAYOR", font=_f)) / 2, 18), "VENTA POR MAYOR", font=_f, fill=(30, 34, 20))
LOGO = Image.open("logo.png").convert("RGBA")

def textos(img, t):
    for a, b, pl, pos in PLACAS:
        if a <= t < b:
            v = min(ease_out((t - a) / 0.35), ease_out((b - t) / 0.2))
            p = pl.copy(); p.putalpha(p.getchannel("A").point(lambda x: x * v))
            if pos == "abajo":
                img.alpha_composite(DEG_AB); img.alpha_composite(p, (0, round(1700 - pl.height + 24 * (1 - v))))
            else:   # franja oliva arriba: tapa el texto viejo de la grabación ("desde 10 unidades", ya no va)
                img.alpha_composite(BANDA); img.alpha_composite(p, (0, round(BANDA_H / 2 - pl.height / 2 + 30 + 24 * (1 - v))))

def final(k, t):
    img = Image.new("RGBA", (W, H), OLIVA + (255,))
    lg = LOGO.resize((230, round(230 * LOGO.height / LOGO.width)), Image.LANCZOS); lg.putalpha(lg.getchannel("A").point(lambda v: v * k))
    img.alpha_composite(lg, ((W - lg.width) // 2, 470))
    d = ImageDraw.Draw(img)
    def centro(txt, font, y, col, kk=k):
        tw = d.textlength(txt, font=font); d.text(((W - tw) / 2, y + 24 * (1 - kk)), txt, font=font, fill=col + (int(255 * kk),))
    centro("Los Perrines", ImageFont.truetype(FX, 72), 730, (255, 255, 255))
    k2 = ease_out((t - 0.25) / 0.5)
    e = ETQ.copy(); e.putalpha(e.getchannel("A").point(lambda v: v * k2)); img.alpha_composite(e, ((W - ETQ.width) // 2, round(870 + 24 * (1 - k2))))
    centro("Precios por cantidad · Envío incluido", ImageFont.truetype(FS, 48), 1010, (235, 237, 228), k2)
    k3 = ease_out((t - 0.55) / 0.5)
    box = Image.new("RGBA", (920, 190)); bd = ImageDraw.Draw(box); bd.rounded_rectangle((0, 0, 919, 189), 36, fill=(242, 243, 236, 255))
    f1, f2 = ImageFont.truetype(FS, 42), ImageFont.truetype(FX, 56)
    bd.text(((920 - bd.textlength("Pedí la propuesta en", font=f1)) / 2, 22), "Pedí la propuesta en", font=f1, fill=(70, 78, 60))
    bd.text(((920 - bd.textlength("losperrines.com.ar/mayorista", font=f2)) / 2, 88), "losperrines.com.ar/mayorista", font=f2, fill=(30, 34, 20))
    box.putalpha(box.getchannel("A").point(lambda v: v * k3)); img.alpha_composite(box, ((W - 920) // 2, round(1130 + 24 * (1 - k3))))
    return img

enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
t0 = 0.0
for f, dur, ini, fin in FOTOS:
    n = round(dur * FPS)
    for i in range(n):
        k = i / max(1, n - 1); c = tuple(a + (b - a) * k for a, b in zip(ini, fin))
        img = f.resize((W, H), Image.LANCZOS, box=caja(f, *c)).convert("RGBA")
        img.alpha_composite(ETQ, ((W - ETQ.width) // 2, 90)); textos(img, t0 + i / FPS)
        enc.stdin.write(img.convert("RGB").tobytes())
    t0 += dur
for a, b in WEB_TRAMOS:
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(a), "-t", str(b - a), "-i", WEB, "-vf", f"fps={FPS},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    i = 0
    while True:
        buf = dec.stdout.read(W * H * 3)
        if len(buf) < W * H * 3: break
        img = Image.frombuffer("RGB", (W, H), buf).convert("RGBA"); textos(img, t0 + i / FPS); i += 1
        enc.stdin.write(img.convert("RGB").tobytes())
    t0 += i / FPS
n = round(FIN * FPS)
for j in range(n): enc.stdin.write(final(ease_out(j / FPS / 0.5), j / FPS).convert("RGB").tobytes())
enc.stdin.close(); enc.wait()
print("listo:", OUT)

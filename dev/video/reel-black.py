# Reel del Black Friday (24/11/2026): 1080×1920, ~17,5 s, sin sonido, para que el dueño le grabe la voz encima.
# 5 escenas que siguen el guion de voz (ver GUION abajo). Foto real: img/mail-perro.jpg; logo: logo.png.
# Uso: python3 dev/video/reel-black.py <carpeta_con_bric800.ttf_y_bric600.ttf> <salida.mp4>
# (Bricolage Grotesque de Google Fonts; la misma letra que las placas.)
# Deja libres las zonas que tapa Instagram: arriba ~230 px, abajo ~420 px y la columna de botones a la derecha.
import subprocess, sys, os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

GUION = """
0–3 s    ¡Arrancó el Black Friday en Los Perrines!
3–7 s    La funda canasto: tu perro viaja cómodo y tu auto queda limpio.
7–11 s   Hasta el viernes, diez por ciento de descuento: sesenta y siete mil quinientos por transferencia.
11–14 s  Y el envío es gratis a todo el país: te llega en 2 a 4 días hábiles.
14–17 s  Entrá a losperrines punto com punto ar. ¡Solo hasta el viernes!
"""
FD, OUT = sys.argv[1], sys.argv[2]
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
W, H, FPS, DUR = 1080, 1920, 30, 17.5
YEL, NEG, CREMA = (217, 225, 90), (17, 17, 17), (242, 243, 236)
F = lambda s, w=800: ImageFont.truetype(os.path.join(FD, "bric%d.ttf" % w), s)

foto = ImageOps.exif_transpose(Image.open(os.path.join(RAIZ, "img", "mail-perro.jpg"))).convert("RGB")
logo = Image.open(os.path.join(RAIZ, "logo.png")).convert("RGBA").resize((96, 96), Image.LANCZOS)
lm = Image.new("L", (96, 96), 0); ImageDraw.Draw(lm).ellipse((0, 0, 95, 95), fill=255); logo.putalpha(lm)

def ease(x): x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3
def back(x):  # entra pasándose un poquito
    x = max(0.0, min(1.0, x)); c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
def pr(t, a, d=0.5): return ease((t - a) / d)

def texto(img, xy, s, font, fill, anchor="mm", alpha=1.0, escala=1.0):
    if alpha <= 0: return
    if escala != 1.0: font = ImageFont.truetype(font.path, max(8, int(font.size * escala)))
    capa = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    d.text(xy, s, font=font, fill=fill + (int(255 * alpha),), anchor=anchor)
    img.alpha_composite(capa)

def caja(img, box, fill, r=34, alpha=1.0, borde=None, ancho=0):
    capa = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    d.rounded_rectangle(box, r, fill=fill + (int(255 * alpha),), outline=(borde + (int(255 * alpha),)) if borde else None, width=ancho)
    img.alpha_composite(capa)

def plata(n): return "$" + f"{int(round(n)):,}".replace(",", ".")

def cuadro(t):
    img = Image.new("RGBA", (W, H), NEG + (255,))
    # marca arriba (siempre)
    img.alpha_composite(logo, (70, 250)); texto(img, (184, 298), "Los Perrines", F(44, 600), CREMA, "lm")
    # ---- escena 1: BLACK FRIDAY (0–3)
    if t < 3.2:
        a = 1 - pr(t, 2.9, 0.3)
        x1 = -500 + 1040 * back((t - 0.1) / 0.6); x2 = 1580 - 1040 * back((t - 0.35) / 0.6)
        texto(img, (x1, 700), "BLACK", F(230), (255, 255, 255), alpha=a)
        texto(img, (x2, 920), "FRIDAY", F(230), YEL, alpha=a)
        e = back((t - 1.1) / 0.5)
        if e > 0:
            capa = Image.new("RGBA", (420, 420), (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
            d.ellipse((10, 10, 410, 410), fill=YEL + (255,))
            d.text((210, 180), "10%", font=F(130), fill=NEG + (255,), anchor="mm"); d.text((210, 290), "OFF", font=F(76), fill=NEG + (255,), anchor="mm")
            capa = capa.rotate(-10, resample=Image.BICUBIC).resize((max(1, int(420 * e)),) * 2, Image.BICUBIC)
            if a < 1: capa.putalpha(capa.getchannel("A").point(lambda v: int(v * a)))
            img.alpha_composite(capa, (540 - capa.width // 2, 1290 - capa.height // 2))
    # ---- escena 2: foto real (3–7)
    if 2.9 < t < 7.4:
        a = pr(t, 2.9, 0.4) * (1 - pr(t, 7.1, 0.3))
        z = 1.0 + 0.10 * (t - 3) / 4.4
        fw, fh = 900, 900
        cw, ch = int(foto.width / z), int(foto.height / z)
        cx, cy = foto.width // 2 + int((t - 3) * 8), int(foto.height * 0.47)
        rec = foto.crop((cx - min(cw, ch) // 2, cy - min(cw, ch) // 2, cx + min(cw, ch) // 2, cy + min(cw, ch) // 2)).resize((fw, fh), Image.LANCZOS).convert("RGBA")
        m = Image.new("L", (fw, fh), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, fw - 1, fh - 1), 40, fill=int(255 * a)); rec.putalpha(m)
        y0 = 440 + int(60 * (1 - ease((t - 2.9) / 0.6)))
        caja(img, (86, y0 - 6, 994, y0 + fh + 6), YEL, 46, a)
        img.alpha_composite(rec, (90, y0 - 2))
        texto(img, (540, 1440), "Tu perro viaja cómodo.", F(70), (255, 255, 255), alpha=a * pr(t, 3.6, 0.4))
        texto(img, (540, 1530), "Tu auto queda limpio.", F(70), YEL, alpha=a * pr(t, 4.6, 0.4))
    # ---- escena 3: precio (7–11)
    if 7.0 < t < 11.4:
        a = pr(t, 7.0, 0.35) * (1 - pr(t, 11.1, 0.3))
        dy = int(80 * (1 - ease((t - 7.0) / 0.5)))
        caja(img, (70, 520 + dy, 1010, 1430 + dy), (255, 255, 255), 44, a)
        texto(img, (540, 610 + dy), "Funda canasto 2 plazas", F(52, 600), (70, 70, 70), alpha=a)
        texto(img, (540, 720 + dy), "$75.000", F(80, 600), (140, 140, 140), alpha=a)
        r = pr(t, 7.8, 0.35)  # la raya del tachado
        if r > 0: caja(img, (370, 716 + dy, 370 + int(340 * r), 728 + dy), (200, 40, 40), 4, a)
        v = 75000 - 7500 * ease((t - 8.1) / 0.9)
        texto(img, (540, 900 + dy), plata(round(v / 100) * 100), F(190), NEG, alpha=a * pr(t, 8.0, 0.2))
        texto(img, (540, 1050 + dy), "por transferencia", F(60, 600), NEG, alpha=a * pr(t, 8.4, 0.3))
        e = back((t - 9.2) / 0.45)
        if e > 0:
            caja(img, (190, 1150 + dy, 890, 1300 + dy), NEG, 30, a)
            texto(img, (540, 1226 + dy), "Te ahorrás $7.500", F(int(72 * max(0.3, e))), YEL, alpha=a)
    # ---- escena 4: envío gratis (11–14). Sin cuotas: lo pidió el dueño (24/11), quiere empujar la transferencia.
    if 11.1 < t < 14.4:
        a = 1 - pr(t, 14.1, 0.3)
        e = back((t - 11.2) / 0.5)
        if e > 0:
            x = int(-900 + 990 * e); y = 720
            caja(img, (x, y, x + 900, y + 420), NEG, 44, a, YEL, 8)
            texto(img, (x + 450, y + 160), "Envío gratis", F(124), YEL, alpha=a)
            texto(img, (x + 450, y + 300), "a todo el país", F(70, 600), CREMA, alpha=a)
        texto(img, (540, 1300), "Te llega en 2 a 4 días hábiles", F(50, 600), (190, 190, 190), alpha=a * pr(t, 12.0, 0.4))
    # ---- escena 5: código y web (14–17,5)
    if t > 14.1:
        a = pr(t, 14.1, 0.35)
        texto(img, (540, 560), "Solo hasta el", F(70, 600), CREMA, alpha=a)
        texto(img, (540, 670), "viernes 27", F(120), YEL, alpha=a, escala=1 + 0.04 * math.sin(max(0, t - 14.5) * 5))
        e = back((t - 14.6) / 0.45)
        if e > 0:
            texto(img, (540, 850), "Código", F(56, 600), CREMA, alpha=a)
            caja(img, (250, 900, 830, 1080), (255, 255, 255), 26, a, YEL, 8)
            texto(img, (540, 990), "BLACK", F(int(120 * max(0.3, e))), NEG, alpha=a)
        e = back((t - 15.3) / 0.45)
        if e > 0:
            caja(img, (110, 1200, 970, 1350), YEL, 30, a)
            texto(img, (540, 1275), "losperrines.com.ar", F(int(80 * max(0.3, e))), NEG, alpha=a)
    return img.convert("RGB")

ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest",
                       "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
for i in range(int(DUR * FPS)):
    ff.stdin.write(cuadro(i / FPS).tobytes())
ff.stdin.close(); ff.wait()
print(GUION)

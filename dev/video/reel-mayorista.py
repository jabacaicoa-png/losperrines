# Reel "consultá precios por mayor" (19/11/2026), editado a partir de una grabación de pantalla del celular
# (576 x 1280, 60 fps). Sin textos ni sonido (la música se pone en Instagram).
# Uso: python3 dev/video/reel-mayorista.py <grabacion.mp4> <salida.mp4>
#
# Pasos (pedido del dueño): 1) solo la barra con la dirección web (el resto tapado: ahí se ve el historial),
# 2) la web completa, 3) zoom a "¿Tenés pet shop…?", 4) la pantalla viaja al formulario, 5) carga de datos
# acelerada, 6) al enviar vuelve a pantalla completa, 7) zoom al logo. Una manito acompaña cada toque.
# Nunca se muestra el teclado (la barra de sugerencias muestra mail y teléfonos del dueño): durante la carga
# el encuadre queda por arriba de y=745. Los tiempos y coordenadas son de ESA grabación.
import subprocess, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
SW, SH, SFPS = 576, 1280, 60000 / 1001
W, H, FPS = 1080, 1920, 30
OLIVA = (47, 56, 34)

# --- encuadres (x0, y0, x1, y1) en píxeles de la grabación ---
BAR = (10, 62, 420, 122)        # barra de direcciones
FULL = (0, 56, 576, 1222)       # pantalla sin la barra de estado (hora, grabación)
LINE = (20, 120, 556, 360)      # "¿Tenés pet shop o veterinaria?"
FORM = (30, 128, 546, 745)      # formulario, siempre por arriba del teclado
LOGO = (0, 208, 320, 279)       # logo arriba de todo

# --- tiempo de salida -> tiempo de la grabación (tramos lineales) ---
TRAMOS = [(0.0, 2.5, 0.0, 2.5), (2.5, 3.5, 7.7, 8.7), (3.5, 4.4, 8.7, 9.25), (4.4, 5.7, 9.25, 11.0),
          (5.7, 13.2, 11.0, 58.4), (13.2, 15.4, 58.4, 64.8), (15.4, 16.8, 64.8, 67.6), (16.8, 19.0, 67.6, 69.3)]
DUR = 19.0
def src_t(t):
    for a, b, sa, sb in TRAMOS:
        if t <= b: return sa + (sb - sa) * max(0, t - a) / (b - a)
    return TRAMOS[-1][3]
def out_t(s):   # inversa dentro del tramo del formulario
    a, b, sa, sb = TRAMOS[4]; return a + (s - sa) * (b - a) / (sb - sa)

# --- cámara: (tiempo, encuadre); entre puntos se mueve con suavidad ---
CAM = [(0, BAR), (2.5, BAR), (3.1, FULL), (3.5, FULL), (4.3, LINE), (4.5, LINE), (5.6, FORM),
       (13.4, FORM), (14.05, FULL), (16.9, FULL), (17.8, LOGO), (DUR, LOGO)]
def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def lerp(a, b, k): return tuple(p + (q - p) * k for p, q in zip(a, b))
def cam(t):
    for (t0, r0), (t1, r1) in zip(CAM, CAM[1:]):
        if t <= t1: return lerp(r0, r1, ease((t - t0) / (t1 - t0)) if t1 > t0 else 1)
    return CAM[-1][1]
def fondo_oliva(t): return 1 - ease((t - 2.5) / 0.6)   # 1 = fondo oliva (paso 1), 0 = fondo desenfocado

# --- manito: (tiempo, punto en la grabación, toca?) ---
def ft(s): return out_t(s) - 0.05
DEDO = [(0.0, (330, 300), 0), (0.25, (250, 92), 1), (0.8, (330, 160), 0), (1.9, (330, 160), 0), (2.3, (205, 92), 1),
        (3.0, (380, 700), 0), (3.5, (380, 560), 0), (4.35, (268, 188), 1), (4.7, (268, 188), 0),
        (ft(11.2), (168, 617), 1), (ft(14.4), (408, 617), 1), (ft(18.8), (168, 490), 1), (ft(23.6), (408, 490), 1),
        (ft(28.0), (168, 594), 1), (ft(35.2), (408, 594), 1), (ft(45.2), (168, 700), 1), (ft(46.8), (408, 700), 1),
        (ft(48.9), (288, 578), 1), (13.2, (240, 700), 1), (14.3, (330, 820), 0), (15.9, (330, 600), 0),
        (16.4, (150, 163), 1), (17.6, (200, 330), 0), (18.3, (92, 250), 1), (DUR, (92, 250), 0)]
def dedo(t):
    for (t0, p0, _), (t1, p1, _) in zip(DEDO, DEDO[1:]):
        if t <= t1:
            mv = min(0.35, (t1 - t0) * 0.7)
            return lerp(p0, p1, ease((t - (t1 - mv)) / mv))
    return DEDO[-1][1]
def toque(t):   # 0..1, cuánto está apretando; y edad del último toque para la onda
    pr, edad = 0.0, None
    for tk, _, tap in DEDO:
        if not tap: continue
        d = t - tk
        pr = max(pr, max(0, 1 - abs(d) / 0.12))
        if 0 <= d < 0.45: edad = d
    return pr, edad

# manito: emoji 👆 de Noto
f = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
im = Image.new("RGBA", (160, 160)); ImageDraw.Draw(im).text((10, 10), "👆", font=f, embedded_color=True)
MANO = im.crop(im.getbbox())
k = 150 / MANO.width; MANO = MANO.resize((150, round(MANO.height * k)), Image.LANCZOS)
a = np.array(MANO)[..., 3]; ys, xs = np.nonzero(a > 128)
PUNTA = (int(xs[ys == ys.min()].mean()), int(ys.min()))   # la punta del dedo
SOMBRA = Image.new("RGBA", MANO.size, (0, 0, 0, 0)); SOMBRA.putalpha(MANO.getchannel("A").point(lambda v: v * 0.35))
SOMBRA = SOMBRA.filter(ImageFilter.GaussianBlur(6))

def proyecta(r):
    rw, rh = r[2] - r[0], r[3] - r[1]; s = min(W / rw, H / rh)
    return s, (W - rw * s) / 2 - r[0] * s, (H - rh * s) / 2 - r[1] * s

def cuadro(src, t):
    r = cam(t); s, ox, oy = proyecta(r)
    x0, y0, x1, y1 = r
    crop = src.crop((round(x0), round(y0), round(x1), round(y1)))
    dw, dh = round((x1 - x0) * s), round((y1 - y0) * s)
    fg = crop.resize((dw, dh), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
    # fondo: el mismo encuadre agrandado, muy desenfocado y oscurecido (o oliva en el paso 1)
    cs = max(W / crop.width, H / crop.height)
    bg = crop.resize((max(1, round(crop.width * cs / 20)), max(1, round(crop.height * cs / 20))), Image.BILINEAR)
    bg = bg.filter(ImageFilter.GaussianBlur(3)).resize((round(bg.width * 20), round(bg.height * 20)), Image.BILINEAR)
    bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2, (bg.width - W) // 2 + W, (bg.height - H) // 2 + H))
    bg = Image.blend(bg, Image.new("RGB", (W, H), (0, 0, 0)), 0.35)
    k = fondo_oliva(t)
    if k > 0: bg = Image.blend(bg, Image.new("RGB", (W, H), OLIVA), k)
    img = bg.convert("RGBA")
    px, py = round((W - dw) / 2), round((H - dh) / 2)
    if dw < W - 2 or dh < H - 2:   # tarjeta con bordes redondeados y sombra
        sh = Image.new("RGBA", (W, H)); ImageDraw.Draw(sh).rounded_rectangle((px, py + 10, px + dw, py + dh + 10), 28, fill=(0, 0, 0, 110))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
        m = Image.new("L", (dw, dh)); ImageDraw.Draw(m).rounded_rectangle((0, 0, dw - 1, dh - 1), 28, fill=255)
        img.paste(fg, (px, py), m)
    else:
        img.paste(fg, (px, py))
    # manito
    sx, sy = dedo(t); hx, hy = ox + sx * s, oy + sy * s
    pr, edad = toque(t)
    vis = min(1, t / 0.3)
    if edad is not None:   # onda del toque
        rr = 18 + edad * 150; al = int(170 * (1 - edad / 0.45))
        o = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(o)
        d.ellipse((hx - rr, hy - rr, hx + rr, hy + rr), outline=(255, 255, 255, al), width=7)
        d.ellipse((hx - 22, hy - 22, hx + 22, hy + 22), fill=(217, 225, 90, int(al * 0.8)))
        img.alpha_composite(o)
    sc = 1 - 0.12 * pr
    m = MANO.resize((round(MANO.width * sc), round(MANO.height * sc)), Image.LANCZOS)
    so = SOMBRA.resize(m.size)
    lx, ly = round(hx - PUNTA[0] * sc), round(hy - PUNTA[1] * sc + 6 * (1 - pr))
    if vis < 1:
        m = m.copy(); m.putalpha(m.getchannel("A").point(lambda v: v * vis))
    img.alpha_composite(so, (lx + 10, ly + 14)) if -200 < lx < W and -200 < ly < H else None
    img.alpha_composite(m, (lx, ly)) if -200 < lx < W and -200 < ly < H else None
    return img.convert("RGB")

dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                        "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                        "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
idx, actual = -1, None
for n in range(round(DUR * FPS)):
    t = n / FPS; want = round(src_t(t) * SFPS)
    while idx < want:
        b = dec.stdout.read(SW * SH * 3)
        if len(b) < SW * SH * 3: break
        actual = Image.frombuffer("RGB", (SW, SH), b); idx += 1
    enc.stdin.write(cuadro(actual, t).tobytes())
enc.stdin.close(); enc.wait(); dec.kill()
print("listo:", OUT)

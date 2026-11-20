# Reel de la funda de 1 plaza con movimiento a partir de 3 fotos verticales + textos (20/11/2026).
# Efectos: entrada girando, inclinación 3D, zoom a detalles, cambio de foto "dando vuelta la tarjeta",
# vuelta completa y placa final con la web. Sin sonido (la música se pone en Instagram).
# Uso: python3 dev/video/reel-1plaza-fotos.py <salida.mp4> <foto_asiento> <foto_detalle> <foto_puerta>
# Estilo de textos igual que los otros reels: Inter ExtraBold blanco sobre caja oliva #2F3822,
# web en caja amarilla #D9E15A. Los puntos de zoom están en proporción de cada foto (0..1).
import subprocess, sys, math
import numpy as np
from PIL import Image, ImageOps, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
OUT = sys.argv[1]
FB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
OLIVA, AMARILLO = (47, 56, 34), (217, 225, 90)

FOTOS, CARTAS, BASES = [], [], []
for n, p in enumerate(sys.argv[2:5]):
    f = ImageOps.exif_transpose(Image.open(p)).convert("RGB")
    if n == 2:   # foto de la puerta: salió lavada por el sol; se le devuelve el contraste y se corta el piso
        f = ImageOps.autocontrast(f, cutoff=(1, 0.5)).crop((0, 0, f.width, round(f.height * 0.78)))
    f = f.resize((2160, round(2160 * f.height / f.width)), Image.LANCZOS)
    m = Image.new("L", f.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, f.width - 1, f.height - 1), 70, fill=255)
    c = f.copy(); c.putalpha(m)
    FOTOS.append(f); CARTAS.append(c); BASES.append(min(0.80 * W / f.width, 0.80 * H / f.height))
FONDOS = []
for f in FOTOS:
    b = f.resize((W // 10, H // 10)).filter(ImageFilter.GaussianBlur(4)).resize((W, H), Image.BICUBIC)
    FONDOS.append(Image.blend(b, Image.new("RGB", (W, H), (20, 24, 16)), 0.55).convert("RGBA"))

A, D, P = 0, 1, 2   # asiento (1 plaza vista de frente), detalle (acolchado y cierres), puerta
def full(i, z=1.0, ty=0, ry=0, rz=0): return (i, BASES[i] * z, 0, ty, ry, rz)
def zoom(i, p, z, rz=0):
    f = FOTOS[i]; s = BASES[i] * z
    return (i, s, (0.5 - p[0]) * f.width * s, (0.5 - p[1]) * f.height * s, 0, rz)
def flip(t, de, a):   # la tarjeta gira 90°, cambia de foto y termina de girar
    return [(t, full(de, 1, 0, 0)), (t + 0.22, full(de, 1, 0, 90)), (t + 0.22, full(a, 1, 0, -90)), (t + 0.44, full(a))]

K = ([(0.0, full(A, 0.35, 250, -70, -12)), (0.9, full(A, 1.04, 0, 0, 2)), (1.2, full(A)),
      (1.8, full(A, 1, 0, 18)), (2.5, full(A, 1, 0, -18)), (3.0, full(A)),
      (3.8, zoom(A, (0.55, 0.42), 1.7, -2)), (4.3, zoom(A, (0.55, 0.42), 1.8, -2)), (4.6, full(A))]
     + flip(4.6, A, D) +
     [(5.9, zoom(D, (0.50, 0.33), 3.0)), (6.5, zoom(D, (0.50, 0.33), 3.2)),
      (7.3, zoom(D, (0.64, 0.09), 2.6, -3)), (7.9, zoom(D, (0.64, 0.09), 2.8, -3)),
      (8.6, zoom(D, (0.52, 0.76), 2.0, 3)), (9.1, zoom(D, (0.52, 0.76), 2.1, 3)), (9.6, full(D))]
     + flip(9.6, D, P) +
     [(10.6, full(P, 1, 0, -16)), (11.3, full(P, 1, 0, 14)), (11.8, full(P)),
      (12.7, zoom(P, (0.55, 0.60), 1.7, 2)), (13.4, zoom(P, (0.55, 0.60), 1.8, 2)), (14.0, full(P)),
      (15.2, full(P, 1, 0, 360)), (16.0, full(P, 0.72, -230, 360)), (19.0, full(P, 0.76, -230, 360))])
DUR = K[-1][0]

def ease(x): x = min(1, max(0, x)); return x * x * x * (x * (6 * x - 15) + 10)
def params(t):
    for (t0, a), (t1, b) in zip(K, K[1:]):
        if t < t1 or (t1 == DUR and t <= t1):
            if t1 <= t0: continue
            k = ease((t - t0) / (t1 - t0))
            s = math.exp(math.log(a[1]) + (math.log(b[1]) - math.log(a[1])) * k)
            return (a[0], s) + tuple(p + (q - p) * k for p, q in zip(a[2:], b[2:]))
    return K[-1][1]

def esquinas(fw, fh, s, tx, ty, ry, rz):
    f = 2600.0
    cy, sy, cz, sz = math.cos(math.radians(ry)), math.sin(math.radians(ry)), math.cos(math.radians(rz)), math.sin(math.radians(rz))
    out = []
    for x, y in [(-fw / 2, -fh / 2), (fw / 2, -fh / 2), (fw / 2, fh / 2), (-fw / 2, fh / 2)]:
        x, y = x * s, y * s
        x, y = x * cz - y * sz, x * sz + y * cz
        x, z = x * cy, x * sy
        k = f / (f + z)
        out.append((W / 2 + (x + tx) * k, H / 2 + (y + ty) * k))
    return out

def coef(dst, src):
    A_, B_ = [], []
    for (x, y), (u, v) in zip(dst, src):
        A_ += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B_ += [u, v]
    return np.linalg.solve(np.array(A_, float), np.array(B_, float)).tolist()

# --- textos: (desde, hasta, texto, centro_y, tamaño, caja, color_letra) ---
TEXTOS = [(0.5, 4.5, "Funda de 1 plaza para llevar a tu perrito sin perder espacio en el asiento trasero.", 1590, 60, OLIVA, "white"),
          (5.1, 9.5, "Impermeable, antidesgarro y acolchada.", 1600, 70, OLIVA, "white"),
          (10.1, 14.6, "Podés llevarla en 3 cuotas sin interés o 10% off si elegís pagar con transferencia.", 1590, 60, OLIVA, "white"),
          (16.0, 19.0, "Visitá nuestra web", 1420, 66, OLIVA, "white"),
          (16.3, 19.0, "www.losperrines.com.ar", 1565, 66, AMARILLO, (30, 34, 20))]
def placa(txt, tam, caja, color):
    font = ImageFont.truetype(FB, tam); d = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    lineas, cur = [], ""
    for w in txt.split():
        prueba = (cur + " " + w).strip()
        if d.textlength(prueba, font=font) > 900 and cur: lineas.append(cur); cur = w
        else: cur = prueba
    lineas.append(cur)
    lh = round(tam * 1.22); tw = max(d.textlength(l, font=font) for l in lineas)
    pad = 30; bw, bh = round(tw + 2 * pad), lh * len(lineas) + 2 * pad - round(tam * 0.22)
    im = Image.new("RGBA", (bw, bh)); dd = ImageDraw.Draw(im)
    dd.rounded_rectangle((0, 0, bw - 1, bh - 1), 26, fill=caja + (238,))
    for i, l in enumerate(lineas):
        dd.text(((bw - d.textlength(l, font=font)) / 2, pad + i * lh - round(tam * 0.1)), l, font=font, fill=color)
    return im
PLACAS = [(a, b, placa(t, s, c, col), y) for a, b, t, y, s, c, col in TEXTOS]
LOGO = Image.open("logo.png").convert("RGBA"); LOGO = LOGO.resize((190, round(190 * LOGO.height / LOGO.width)), Image.LANCZOS)
_c = Image.new("RGBA", (LOGO.width + 16, LOGO.height + 16)); ImageDraw.Draw(_c).ellipse((0, 0, _c.width - 1, _c.height - 1), fill=(255, 255, 255, 235))
_c.alpha_composite(LOGO, (8, 8)); LOGO = _c   # aro blanco para que se vea sobre el fondo oscuro

def cuadro(t):
    i, s, tx, ty, ry, rz = params(t)
    foto, carta = FOTOS[i], CARTAS[i]
    img = FONDOS[i].copy()
    if abs(math.cos(math.radians(ry))) > 0.02:
        dst = esquinas(foto.width, foto.height, s, tx, ty, ry, rz)
        fw, fh = foto.size
        src = [(0, 0), (fw, 0), (fw, fh), (0, fh)]
        if math.cos(math.radians(ry)) < 0: src = [(fw, 0), (0, 0), (0, fh), (fw, fh)]
        sh = Image.new("RGBA", (W, H)); ImageDraw.Draw(sh).polygon([(x + 14, y + 30) for x, y in dst], fill=(0, 0, 0, 150))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28)))
        img.alpha_composite(carta.transform((W, H), Image.PERSPECTIVE, coef(dst, src), Image.BICUBIC))
    for a, b, pl, y in PLACAS:
        if a <= t <= b:
            k = min(ease((t - a) / 0.35), ease((b - t) / 0.25)) if b < DUR else ease((t - a) / 0.35)
            p = pl if k >= 1 else pl.copy()
            if k < 1: p.putalpha(p.getchannel("A").point(lambda v: v * k))
            img.alpha_composite(p, (round((W - pl.width) / 2), round(y - pl.height / 2 + 40 * (1 - k))))
    if t >= 16.6:   # logo arriba de la web, en la placa final
        k = ease((t - 16.6) / 0.4); lg = LOGO.copy(); lg.putalpha(lg.getchannel("A").point(lambda v: v * k))
        img.alpha_composite(lg, ((W - lg.width) // 2, 1655))
    return img.convert("RGB")

enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                        "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
for n in range(round(DUR * FPS)):
    enc.stdin.write(cuadro(n / FPS).tobytes())
enc.stdin.close(); enc.wait()
print("listo:", OUT)

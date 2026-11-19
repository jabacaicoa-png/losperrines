# Reel con movimiento a partir de UNA foto vertical de la funda (20/11/2026).
# La foto entra girando, se inclina en 3D, la cámara recorre detalles (cierres, acolchado, solapa)
# y al final da una vuelta completa. Sin textos ni sonido (la música se pone en Instagram).
# Uso: python3 dev/video/reel-foto-movimiento.py <foto.jpg> <salida.mp4>
# Los puntos de detalle (DET) están en proporción de la foto (0..1), elegidos para la foto del 20/11.
import subprocess, sys, math
import numpy as np
from PIL import Image, ImageOps, ImageDraw, ImageFilter

W, H, FPS = 1080, 1920, 30
foto = ImageOps.exif_transpose(Image.open(sys.argv[1])).convert("RGB")
foto = foto.resize((2160, round(2160 * foto.height / foto.width)), Image.LANCZOS)   # resolución alta para los zooms
FW, FH = foto.size
m = Image.new("L", foto.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, FW - 1, FH - 1), 70, fill=255)
CARTA = foto.copy(); CARTA.putalpha(m)
# fondo: la misma foto muy desenfocada y oscura
FONDO = foto.resize((W // 10, H // 10)).filter(ImageFilter.GaussianBlur(4)).resize((W, H), Image.BICUBIC)
FONDO = Image.blend(FONDO, Image.new("RGB", (W, H), (20, 24, 16)), 0.55).convert("RGBA")

DET = {"cierre": (0.64, 0.09), "hebilla": (0.19, 0.37), "acolchado": (0.50, 0.33),
       "solapa": (0.52, 0.76), "cierre2": (0.80, 0.56)}
BASE = 0.80 * W / FW          # escala con la foto entera (deja margen)

def zoom_a(p, z):   # escala z y traslado para que el punto p quede en el centro
    s = BASE * z
    return s, (0.5 - p[0]) * FW * s, (0.5 - p[1]) * FH * s

# keyframes: (t, escala, tx, ty, giro_y°, giro_z°)
def kf(t, s, tx, ty, ry, rz): return (t, s, tx, ty, ry, rz)
K = [kf(0.0, BASE * 0.35, 0, 250, -70, -12), kf(0.9, BASE * 1.04, 0, 0, 0, 2), kf(1.2, BASE, 0, 0, 0, 0),
     kf(1.9, BASE, 0, 0, 22, 0), kf(2.7, BASE, 0, 0, -22, 0), kf(3.2, BASE, 0, 0, 0, 0),
     kf(4.1, *zoom_a(DET["cierre"], 2.6), 0, -4), kf(4.9, *zoom_a(DET["cierre"], 2.9), 0, -4),
     kf(5.7, *zoom_a(DET["hebilla"], 2.4), 0, 4), kf(6.4, *zoom_a(DET["hebilla"], 2.6), 0, 4),
     kf(7.2, *zoom_a(DET["acolchado"], 3.2), 0, 0), kf(7.9, *zoom_a(DET["acolchado"], 3.4), 0, 0),
     kf(8.7, *zoom_a(DET["cierre2"], 2.6), 0, -3), kf(9.4, *zoom_a(DET["cierre2"], 2.8), 0, -3),
     kf(10.2, *zoom_a(DET["solapa"], 2.0), 0, 3), kf(10.9, *zoom_a(DET["solapa"], 2.1), 0, 3),
     kf(11.8, BASE, 0, 0, 0, 0), kf(12.2, BASE, 0, 0, 0, 0), kf(13.6, BASE, 0, 0, 360, 0),
     kf(14.0, BASE * 1.06, 0, 0, 360, 0), kf(15.0, BASE * 1.1, 0, 0, 360, 0)]
DUR = K[-1][0]

def ease(x): x = min(1, max(0, x)); return x * x * x * (x * (6 * x - 15) + 10)
def params(t):
    for a, b in zip(K, K[1:]):
        if t <= b[0]:
            k = ease((t - a[0]) / (b[0] - a[0]))
            # la escala se interpola en logaritmo (zoom parejo)
            s = math.exp(math.log(a[1]) + (math.log(b[1]) - math.log(a[1])) * k)
            return (s,) + tuple(p + (q - p) * k for p, q in zip(a[2:], b[2:]))
    return K[-1][1:]

def esquinas(s, tx, ty, ry, rz):
    f = 2600.0
    cy, sy, cz, sz = math.cos(math.radians(ry)), math.sin(math.radians(ry)), math.cos(math.radians(rz)), math.sin(math.radians(rz))
    out = []
    for x, y in [(-FW / 2, -FH / 2), (FW / 2, -FH / 2), (FW / 2, FH / 2), (-FW / 2, FH / 2)]:
        x, y = x * s, y * s
        x, y = x * cz - y * sz, x * sz + y * cz          # giro en el plano
        x, z = x * cy, x * sy                               # giro alrededor del eje vertical
        k = f / (f + z)
        out.append((W / 2 + (x + tx) * k, H / 2 + (y + ty) * k))
    return out

def coef(dst, src):   # coeficientes de PIL: punto de salida -> punto de la foto
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()

def cuadro(t):
    s, tx, ty, ry, rz = params(t)
    dst = esquinas(s, tx, ty, ry, rz)
    img = FONDO.copy()
    if abs(math.cos(math.radians(ry))) < 0.02: return img.convert("RGB")
    src = [(0, 0), (FW, 0), (FW, FH), (0, FH)]
    if math.cos(math.radians(ry)) < 0: src = [(FW, 0), (0, 0), (0, FH), (FW, FH)]   # de espaldas: se ve espejada
    sh = Image.new("RGBA", (W, H)); ImageDraw.Draw(sh).polygon([(x + 14, y + 30) for x, y in dst], fill=(0, 0, 0, 150))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28)))
    img.alpha_composite(CARTA.transform((W, H), Image.PERSPECTIVE, coef(dst, src), Image.BICUBIC))
    return img.convert("RGB")

enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                        "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", sys.argv[2]], stdin=subprocess.PIPE)
for n in range(round(DUR * FPS)):
    enc.stdin.write(cuadro(n / FPS).tobytes())
enc.stdin.close(); enc.wait()
print("listo:", sys.argv[2])

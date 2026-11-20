# Reel a partir de un clip de 10 s hecho con Meta AI (perro subiendo al auto) + foto real de la funda (20/11/2026).
# Orden: 2,2 s de la foto real de la funda (acercamiento lento) → el clip de IA → placa final de 3 s con la web
# y la venta mayorista. Texto blanco limpio sobre degradado (estilo de reel-1plaza-limpio.py). Sin sonido:
# la música se pone en Instagram. El texto de gancho arranca en el segundo 0 (los reels se deciden en 1-2 s).
# Uso: python3 dev/video/reel-video-ia.py <salida.mp4> <clip_meta.mp4> <foto_funda.jpg>
import subprocess, sys
from PIL import Image, ImageOps, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
OUT, CLIP, FOTO = sys.argv[1], sys.argv[2], sys.argv[3]
FB = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FS = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
INTRO, FIN = 2.2, 3.0

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
DUR_CLIP = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", CLIP], capture_output=True, text=True).stdout)
T1 = INTRO + DUR_CLIP
TEXTOS = [(0.15, 5.0, "¿Tu perro viaja atrás y deja todo lleno de pelos?"),
          (5.0, 8.4, "Funda canasto: impermeable, acolchada y antidesgarro"),
          (8.4, T1, "2 plazas o 1 plaza · 3 cuotas sin interés")]
PLACAS = [(a, b, bloque(t, 64)) for a, b, t in TEXTOS]
grad = Image.new("L", (1, H))
for y in range(H): grad.putpixel((0, y), int(185 * max(0, (y - 1000) / (H - 1000)) ** 1.3))
DEGRADE = Image.new("RGBA", (W, H), (0, 0, 0, 255)); DEGRADE.putalpha(grad.resize((W, H)))
LOGO = Image.open("logo.png").convert("RGBA"); LOGO = LOGO.resize((180, round(180 * LOGO.height / LOGO.width)), Image.LANCZOS)

def textos(img, t):
    img.alpha_composite(DEGRADE)
    for a, b, pl in PLACAS:
        if a <= t <= b:
            v = min(ease_out((t - a) / 0.35), ease_out((b - t) / 0.2) if b < T1 else 1)
            p = pl.copy(); p.putalpha(p.getchannel("A").point(lambda x: x * v))
            img.alpha_composite(p, (0, round(1700 - pl.height + 24 * (1 - v))))

def final(base, k):
    img = base.filter(ImageFilter.GaussianBlur(10 * k)).convert("RGBA")
    img.alpha_composite(Image.new("RGBA", (W, H), (20, 24, 16, int(170 * k))))
    d = ImageDraw.Draw(img)
    def centro(txt, font, y, col):
        tw = d.textlength(txt, font=font); d.text(((W - tw) / 2, y + 20 * (1 - k)), txt, font=font, fill=col + (int(255 * k),))
    lg = LOGO.copy(); lg.putalpha(lg.getchannel("A").point(lambda v: v * k)); img.alpha_composite(lg, ((W - lg.width) // 2, 560))
    centro("Los Perrines", ImageFont.truetype(FB, 64), 770, (255, 255, 255))
    centro("losperrines.com.ar", ImageFont.truetype(FB, 86), 880, (217, 225, 90))
    centro("¿Tenés pet shop o veterinaria?", ImageFont.truetype(FS, 50), 1110, (255, 255, 255))
    centro("Precios por mayor en", ImageFont.truetype(FS, 46), 1180, (230, 232, 222))
    centro("losperrines.com.ar/mayorista", ImageFont.truetype(FB, 58), 1245, (217, 225, 90))
    return img

enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
# 1) foto real de la funda, acercamiento lento
f = ImageOps.exif_transpose(Image.open(FOTO)).convert("RGB")
fw, fh = f.size; cw0 = min(fw, fh * W / H)
n = round(INTRO * FPS)
for i in range(n):
    k = i / max(1, n - 1); cw = cw0 * (1 - 0.08 * k); ch = cw * H / W
    x0 = (fw - cw) / 2; y0 = min(max(fh * 0.55 - ch / 2, 0), fh - ch)
    img = f.resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + cw, y0 + ch)).convert("RGBA"); textos(img, i / FPS)
    enc.stdin.write(img.convert("RGB").tobytes())
# 2) el clip de IA
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", CLIP, "-vf", f"fps={FPS},scale={W}:{H}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
i, ultimo = 0, None
while True:
    b = dec.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    ultimo = Image.frombuffer("RGB", (W, H), b).copy(); img = ultimo.convert("RGBA"); textos(img, INTRO + i / FPS); i += 1
    enc.stdin.write(img.convert("RGB").tobytes())
# 3) placa final sobre el último cuadro
n = round(FIN * FPS)
for j in range(n): enc.stdin.write(final(ultimo, ease_out(j / FPS / 0.5)).convert("RGB").tobytes())
enc.stdin.close(); enc.wait()
print("listo:", OUT)

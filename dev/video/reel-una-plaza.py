# Reel del Canasto de 1 plaza (18/11/2026), hecho con fotos (sin video).
# Uso: python3 dev/video/reel-una-plaza.py <trabajo> <salida.mp4> <foto1> <texto1> [<foto2> <texto2> ...]
#   Cada foto es vertical; se muestra entera llenando la pantalla, con un zoom lento y su texto abajo.
#   Al final, una placa con el precio de la 1 plaza y la web (cambiar PRECIO si cambia).
#   Sin sonido: la música se le pone en Instagram. Estilo: Inter ExtraBold blanco sobre caja oliva #2F3822,
#   web en caja amarilla #D9E15A, "LOS PERRINES" arriba (igual que los otros reels).
import subprocess, os, sys
W, OUT = sys.argv[1], sys.argv[2]
PARES = list(zip(sys.argv[3::2], sys.argv[4::2]))
FB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FS = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
LOGO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "logo.png")
PRECIO = ["3 cuotas sin interés de $20.300", "o $55.000 por transferencia"]
DUR, FADE, FPS = 2.6, 0.35, 30
COLOR = "eq=contrast=1.05:saturation=1.08:gamma=1.04,unsharp=5:5:0.5"
P = os.path.join(W, "partes"); os.makedirs(P, exist_ok=True)

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-3000:]); sys.exit(1)
def tf(n, s):
    p = os.path.join(P, f"{n}.txt"); open(p, "w").write(s); return p

partes = []
for i, (src, txt) in enumerate(PARES):
    o = os.path.join(P, f"f{i}.mp4"); fr = int(DUR * FPS)
    zin = i % 2 == 0   # alterna acercar y alejar para que no aburra
    z = f"1+0.10*on/{fr}" if zin else f"1.10-0.10*on/{fr}"
    fil = (f"[0:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,{COLOR},"
           f"zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={fr}:s=1080x1920:fps={FPS},"
           f"drawtext=fontfile={FS}:text='LOS PERRINES':fontcolor=0xD9E15A:fontsize=40:x=(w-text_w)/2:y=110:box=1:boxcolor=0x000000@0.35:boxborderw=12,"
           f"drawtext=fontfile={FB}:textfile={tf(i, txt)}:fontcolor=white:fontsize=78:line_spacing=12:x=(w-text_w)/2:y=1560-text_h/2:"
           "box=1:boxcolor=0x2F3822@0.92:boxborderw=28,format=yuv420p[v]")
    run(["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-i", src, "-filter_complex", fil,
         "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-t", f"{DUR}", o])
    partes.append(o)

# placa final
o = os.path.join(P, "fin.mp4"); dfin = 3.4
fil = ("color=c=0x2F3822:s=1080x1920:r=30[bg];[1:v]scale=300:300[lg];[bg][lg]overlay=(W-w)/2:330[a];"
       f"[a]drawtext=fontfile={FB}:text='Canasto de 1 plaza':fontcolor=white:fontsize=82:x=(w-text_w)/2:y=740,"
       f"drawtext=fontfile={FS}:text='Impermeable · Acolchada · Antidesgarro':fontcolor=0xF2F3EC:fontsize=44:x=(w-text_w)/2:y=860,"
       f"drawtext=fontfile={FB}:textfile={tf('p1', PRECIO[0])}:fontcolor=white:fontsize=58:x=(w-text_w)/2:y=1010,"
       f"drawtext=fontfile={FB}:textfile={tf('p2', PRECIO[1])}:fontcolor=0xD9E15A:fontsize=58:x=(w-text_w)/2:y=1095,"
       f"drawtext=fontfile={FS}:text='Envío gratis a todo el país · Industria argentina':fontcolor=0xF2F3EC:fontsize=40:x=(w-text_w)/2:y=1220,"
       f"drawtext=fontfile={FB}:text='losperrines.com.ar':fontcolor=0x2F3822:fontsize=66:x=(w-text_w)/2:y=1420:box=1:boxcolor=0xD9E15A:boxborderw=26,"
       "format=yuv420p[v]")
run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc", "-loop", "1", "-i", LOGO, "-filter_complex", fil,
     "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-t", f"{dfin}", o])
partes.append(o)

# unir con fundidos cortos
ins, fil, last, off = [], "", "0:v", 0.0
for k, pth in enumerate(partes):
    ins += ["-i", pth]
for k in range(1, len(partes)):
    off += (DUR if k - 1 < len(PARES) else dfin) - FADE
    lab = f"x{k}"
    fil += f"[{last}][{k}:v]xfade=transition=fade:duration={FADE}:offset={off:.2f}[{lab}];"
    last = lab
run(["ffmpeg", "-loglevel", "error", "-y"] + ins + ["-filter_complex", fil.rstrip(";"), "-map", f"[{last}]",
     "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT])
print("listo:", OUT)

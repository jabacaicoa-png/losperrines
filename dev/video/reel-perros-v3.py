# Reel v3 (15/11/2026): el video de los perros es la base (sin congelar cuadros: al dueño no le gusta), con las imágenes que eligió en el medio.
# Uso: python3 dev/video/reel-perros-v3.py <trabajo> <perros.mp4> <cap-doblada.png> <cap-estirando.png> <cap-abierta.png> <funda-puesta.png> <placa-golden.png>
#   cap-*: capturas de pantalla del video de cómo se pone (con franjas negras, se recortan con CAP); placa-golden: la portada del carrusel (se usa solo la foto de arriba).
# - perros.mp4: "perros en funda.mp4" de FOTOS REDES (vertical 1080x1920, 3,8 s).
# - captura: una captura de pantalla del video de cómo se pone (con franjas negras; se recorta con CAP).
# Arranca con los perros en cámara lenta (cuadros intermedios inventados con minterpolate para que no se vea a saltos),
# congela la cara del perrito con un zoom, muestra la funda en 3 tomas cortas y cierra otra vez con los perros.
import subprocess, os, sys
W, PERROS, CAP1, CAP2, CAP3, PUESTA, PLACA = sys.argv[1:8]
FB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FS = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
LOGO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "logo.png")
P = os.path.join(W, "partes"); os.makedirs(P, exist_ok=True)
COLOR = "eq=contrast=1.06:saturation=1.12:gamma=1.05,unsharp=5:5:0.6"
CAP = "1220:686:0:1012"
partes = []

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-3000:]); sys.exit(1)
def tf(n, s):
    p = os.path.join(P, f"{n}.txt"); open(p, "w").write(s); return p
def textos(n, t, ty=1500, web=True):
    s = (f"drawtext=fontfile={FS}:text='LOS PERRINES':fontcolor=0xD9E15A:fontsize=40:x=(w-text_w)/2:y=110:box=1:boxcolor=0x000000@0.35:boxborderw=12,"
         f"drawtext=fontfile={FB}:textfile={tf(n, t)}:fontcolor=white:fontsize=88:line_spacing=14:x=(w-text_w)/2:y={ty}-text_h/2:"
         "box=1:boxcolor=0x2F3822@0.92:boxborderw=30")
    if web:
        s += (f",drawtext=fontfile={FB}:text='losperrines.com.ar':fontcolor=0x2F3822:fontsize=50:x=(w-text_w)/2:y=1730:"
              "box=1:boxcolor=0xD9E15A:boxborderw=18")
    return s
def enc(o, dur):
    return ["-map", "[v]", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-t", f"{dur:.2f}", o]

def lento(n, a, b, vel, t, ty=380, zoom=1.0):
    """Tramo del video de los perros en cámara lenta y suave. El texto va arriba para no tapar a los perros."""
    o = os.path.join(P, f"{n}.mp4"); dur = (b - a) / vel
    fil = (f"[0:v]trim={a}:{b},setpts=(PTS-STARTPTS)/{vel},minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1,"
           f"scale=1080:1920," + (f"scale={int(1080*zoom)//2*2}:{int(1920*zoom)//2*2},crop=1080:1920:(iw-1080)/2:min(ih-1920\\,ih*0.66-960)," if zoom > 1 else "") + f"{COLOR}," + textos(n, t, ty, web=False) + ",format=yuv420p[v]")
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", PERROS, "-filter_complex", fil] + enc(o, dur))
    partes.append(o)

def congelar(n, seg, cx, cy, dur, t, ty=380):
    """Congela un cuadro del video y se acerca despacio a (cx, cy) (proporción del cuadro)."""
    png = os.path.join(P, f"{n}.png")
    run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(seg), "-i", PERROS, "-frames:v", "1", png])
    o = os.path.join(P, f"{n}.mp4"); fr = int(dur * 30)
    fil = (f"[0:v]scale=2160:3840,{COLOR},zoompan=z='min(1+0.35*on/{fr},1.35)':"
           f"x='iw*{cx}-iw/zoom/2':y='ih*{cy}-ih/zoom/2':d={fr}:s=1080x1920:fps=30,"
           + textos(n, t, ty, web=False) + ",format=yuv420p[v]")
    run(["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-i", png, "-filter_complex", fil] + enc(o, dur))
    partes.append(o)

def foto(n, src, dur, t, crop=None, vertical=True):
    o = os.path.join(P, f"{n}.mp4"); fr = int(dur * 30)
    pre = f"crop={crop}," if crop else ""
    if vertical:
        base = f"[0:v]{pre}scale=1188:2112:force_original_aspect_ratio=increase,crop=1188:2112,{COLOR}[b];"
    else:
        base = (f"[0:v]{pre}split[x][y];[x]scale=1188:2112:force_original_aspect_ratio=increase,crop=1188:2112,boxblur=30:2,eq=brightness=-0.2[f];"
                f"[y]scale=1188:-2,{COLOR}[g];[f][g]overlay=0:(H-h)/2-120[b];")
    fil = (base + f"[b]zoompan=z='min(zoom+0.0012,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={fr}:s=1080x1920:fps=30,"
           + textos(n, t) + ",format=yuv420p[v]")
    run(["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-i", src, "-filter_complex", fil] + enc(o, dur))
    partes.append(o)

lento("01", 0.25, 1.85, 0.6, "¿Viajás con ellos?")
lento("02", 1.85, 2.90, 0.6, "Pelos, barro\ny rayones…\nnunca más")
foto("03", CAP1, 1.5, "Llega doblada.\nOcupa poco.", crop=CAP, vertical=False)
foto("04", CAP2, 1.4, "Se despliega\nen segundos", crop=CAP, vertical=False)
foto("05", CAP3, 1.5, "Forma de canasto,\ncon laterales", crop=CAP, vertical=False)
foto("06", PUESTA, 1.8, "Cubre todo\nel asiento trasero")
foto("07", PLACA, 1.6, "Acolchada e\nimpermeable", crop="1080:700:0:180")
lento("08", 0.40, 1.80, 0.7, "Ellos cómodos.\nTu auto limpio.", zoom=1.3)

fin = os.path.join(P, "99.mp4")
run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=0x2F3822:s=1080x1920:d=3:r=30", "-i", LOGO,
     "-filter_complex",
     "[1:v]scale=440:-1[l];[0:v][l]overlay=(W-w)/2:420,"
     f"drawtext=fontfile={FB}:text='losperrines.com.ar':fontcolor=0xD9E15A:fontsize=72:x=(w-text_w)/2:y=1000,"
     f"drawtext=fontfile={FS}:textfile={tf('f1', 'Envío gratis a todo el país')}:fontcolor=white:fontsize=52:x=(w-text_w)/2:y=1110,"
     f"drawtext=fontfile={FS}:text='Hecha en San Luis':fontcolor=white@0.8:fontsize=44:x=(w-text_w)/2:y=1190,"
     "fade=t=in:st=0:d=0.3,format=yuv420p[v]"] + enc(fin, 3))
partes.append(fin)

lista = os.path.join(P, "lista.txt")
open(lista, "w").write("".join(f"file '{p}'\n" for p in partes))
out = os.path.join(W, "reel-perros-v3.mp4")
run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista,
     "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "6M", "-bufsize", "12M", "-movflags", "+faststart", out])
print(out)

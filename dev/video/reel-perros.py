# Reel "perros + cómo se pone": video real de los perros al principio y al final, fotos reales y capturas en el medio.
import subprocess, os, sys
D = os.path.dirname(os.path.abspath(__file__))
U = "/root/.claude/uploads/ecf47b4b-4b1b-57b4-b799-06c4422734ac/"
T = "/root/.claude/projects/-home-user-losperrines/ecf47b4b-4b1b-57b4-b799-06c4422734ac/tool-results/"
FB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FS = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
LOGO = "/home/user/losperrines/logo.png"
P = os.path.join(D, "partes"); os.makedirs(P, exist_ok=True)
PERROS = os.path.join(D, "perros.mp4")

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-3000:]); sys.exit(1)
def tf(n, s):
    p = os.path.join(P, f"{n}.txt"); open(p, "w").write(s); return p

def textos(n, t, ty=1500):
    return (f"drawtext=fontfile={FS}:text='LOS PERRINES':fontcolor=0xD9E15A:fontsize=40:x=(w-text_w)/2:y=110:box=1:boxcolor=0x000000@0.35:boxborderw=12,"
            f"drawtext=fontfile={FB}:textfile={tf(n, t)}:fontcolor=white:fontsize=84:line_spacing=14:x=(w-text_w)/2:y={ty}-text_h/2:"
            "box=1:boxcolor=0x2F3822@0.92:boxborderw=30,"
            f"drawtext=fontfile={FB}:text='losperrines.com.ar':fontcolor=0x2F3822:fontsize=50:x=(w-text_w)/2:y=1730:box=1:boxcolor=0xD9E15A:boxborderw=18")

COLOR = "eq=contrast=1.06:saturation=1.12:gamma=1.05,unsharp=5:5:0.6"
partes = []

def video(n, a, b, vel, t):
    dur = (b - a) / vel
    o = os.path.join(P, f"{n}.mp4")
    fil = (f"[0:v]trim={a}:{b},setpts=(PTS-STARTPTS)/{vel},crop=400:711:40:143,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,{COLOR},"
           + textos(n, t, 420) + ",fps=30,format=yuv420p[v]")
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", PERROS, "-filter_complex", fil, "-map", "[v]", "-an",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-t", f"{dur:.2f}", o])
    partes.append(o)

def foto(n, src, dur, t, crop=None, vertical=True):
    o = os.path.join(P, f"{n}.mp4"); fr = int(dur * 30)
    pre = f"crop={crop}," if crop else ""
    if vertical:   # llena la pantalla, con un zoom lento
        base = f"[0:v]{pre}scale=1188:2112:force_original_aspect_ratio=increase,crop=1188:2112,{COLOR}[b];"
    else:          # horizontal: fondo desenfocado + foto entera al centro
        base = (f"[0:v]{pre}split[x][y];[x]scale=1188:2112:force_original_aspect_ratio=increase,crop=1188:2112,boxblur=30:2,eq=brightness=-0.2[f];"
                f"[y]scale=1188:-2,{COLOR}[g];[f][g]overlay=0:(H-h)/2-120[b];")
    fil = (base + f"[b]zoompan=z='min(zoom+0.0009,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={fr}:s=1080x1920:fps=30,"
           + textos(n, t) + ",format=yuv420p[v]")
    run(["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-i", src, "-filter_complex", fil, "-map", "[v]",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-t", f"{dur}", o])
    partes.append(o)

CAP = "1220:686:0:1012"   # recorte de las capturas de pantalla (sin franjas negras)
video("01", 2.0, 3.3, 0.8, "¿Viajás con ellos?")
foto("02", T + "mcp-Google_Drive-blob-1794703996662-mm8vbn.png", 2.2, "Llega doblada.\nOcupa poco.", crop=CAP, vertical=False)
foto("03", U + "f2b4b692-image.jpg", 2.4, "Se despliega:\nforma de canasto", vertical=False)
foto("04", T + "mcp-Google_Drive-blob-1794703996678-xyw48n.png", 2.2, "Se engancha a los\napoyacabezas", crop=CAP, vertical=False)
foto("05", U + "d3615c85-image.jpg", 2.2, "Acolchada e\nimpermeable")
foto("06", U + "8985b185-image.png", 2.4, "Cubre todo\nel asiento trasero")
video("07", 3.3, 4.6, 0.75, "Ellos cómodos.\nTu auto limpio.")

fin = os.path.join(P, "99.mp4")
run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=0x2F3822:s=1080x1920:d=3:r=30", "-i", LOGO,
     "-filter_complex",
     "[1:v]scale=440:-1[l];[0:v][l]overlay=(W-w)/2:420,"
     f"drawtext=fontfile={FB}:text='losperrines.com.ar':fontcolor=0xD9E15A:fontsize=72:x=(w-text_w)/2:y=1000,"
     f"drawtext=fontfile={FS}:textfile={tf('f1', 'Envío gratis a todo el país')}:fontcolor=white:fontsize=52:x=(w-text_w)/2:y=1110,"
     f"drawtext=fontfile={FS}:text='Hecha en San Luis':fontcolor=white@0.8:fontsize=44:x=(w-text_w)/2:y=1190,"
     "fade=t=in:st=0:d=0.3,format=yuv420p[v]",
     "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-t", "3", fin])
partes.append(fin)

lista = os.path.join(P, "lista.txt")
open(lista, "w").write("".join(f"file '{p}'\n" for p in partes))
out = os.path.join(D, "reel-perros.mp4")
run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista,
     "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart", out])
print(out)

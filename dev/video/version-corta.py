# Versión corta (~28 s) de la edición del dueño: las mejores partes, mismo diseño que la larga.
import subprocess, os, sys
F = "/root/.claude/uploads/ecf47b4b-4b1b-57b4-b799-06c4422734ac/0a86b2c5-Proyecto_de_video.mp4"
D = os.path.dirname(os.path.abspath(__file__))
FB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FS = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
P = os.path.join(D, "corto"); os.makedirs(P, exist_ok=True)

# (desde, hasta, texto) en el video del dueño
TOMAS = [
    (0.0, 2.5, "¿Tu perro viaja atrás?"),
    (3.5, 5.7, "Llega doblada.\nOcupa poco."),
    (10.0, 12.5, "Se despliega"),
    (20.0, 22.5, "La apoyás en el\nasiento trasero"),
    (30.0, 32.5, "Se engancha a los\napoyacabezas"),
    (41.0, 44.0, "Subís los cierres\nlaterales"),
    (44.0, 46.5, "Forma de canasto:\ncubre todo"),
    (56.5, 59.0, "El cinturón pasa\npor la abertura"),
    (62.3, 65.8, "Cerrada de los\ndos lados"),
    (71.0, 73.5, "Acolchada e\nimpermeable"),
]
def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-3000:]); sys.exit(1)
def tfile(n, s):
    p = os.path.join(P, f"{n}.txt"); open(p, "w").write(s); return p
env = tfile("env", "Envío gratis a todo el país")

partes = []
for i, (a, b, t) in enumerate(TOMAS):
    fil = (
        "[0:v]crop=540:296:0:106,crop=500:280,"
        "eq=gamma=1.12:contrast=1.08:saturation=1.18:brightness=0.02,unsharp=5:5:0.7,split[a][b];"
        "[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:2,eq=brightness=-0.22[fondo];"
        "[b]scale=1080:605:flags=lanczos[frente];"
        "[fondo][frente]overlay=0:660,"
        f"drawtext=fontfile={FS}:text='LOS PERRINES':fontcolor=0xD9E15A:fontsize=40:x=(w-text_w)/2:y=150:box=1:boxcolor=0x000000@0.35:boxborderw=12,"
        f"drawtext=fontfile={FB}:textfile={tfile(i, t)}:fontcolor=white:fontsize=84:line_spacing=14:"
        "x=(w-text_w)/2:y=560-text_h:box=1:boxcolor=0x2F3822@0.92:boxborderw=30,"
        f"drawtext=fontfile={FB}:text='losperrines.com.ar':fontcolor=0x2F3822:fontsize=56:x=(w-text_w)/2:y=1420:"
        "box=1:boxcolor=0xD9E15A:boxborderw=22,"
        f"drawtext=fontfile={FS}:textfile={env}:fontcolor=white:fontsize=44:x=(w-text_w)/2:y=1530,"
        "fps=30,format=yuv420p[v]"
    )
    o = os.path.join(P, f"p{i:02d}.mp4")
    run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(a), "-t", str(b - a), "-i", F,
         "-filter_complex", fil, "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", o])
    partes.append(o)
partes.append(os.path.join(D, "fin.mp4"))   # misma placa final de la versión larga

lista = os.path.join(P, "lista.txt")
open(lista, "w").write("".join(f"file '{p}'\n" for p in partes))
out = os.path.join(D, "reel-corto.mp4")
run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista,
     "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-movflags", "+faststart", out])
print(out)

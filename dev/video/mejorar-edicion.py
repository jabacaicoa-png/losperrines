# Mejora la edición del dueño: saca las franjas, pasa a vertical 1080x1920, corrige luz/color,
# agrega textos por tramo, marca arriba, web abajo y placa final.
import subprocess, os, sys
F = "/root/.claude/uploads/ecf47b4b-4b1b-57b4-b799-06c4422734ac/0a86b2c5-Proyecto_de_video.mp4"
D = os.path.dirname(os.path.abspath(__file__))
FB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FS = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
LOGO = "/home/user/losperrines/logo.png"
DUR = 78.43

# (desde, hasta, texto) — tiempos del video del dueño
TEXTOS = [
    (0.0, 3.0, "¿Tu perro viaja atrás?"),
    (3.0, 9.0, "Llega doblada.\nOcupa poco."),
    (9.0, 17.0, "La desplegás:\ngrande y acolchada"),
    (17.0, 28.0, "La apoyás en el\nasiento trasero"),
    (28.0, 40.0, "Se engancha a los\napoyacabezas"),
    (40.0, 44.0, "Laterales que\ncierran los costados"),
    (44.0, 47.0, "Forma de canasto:\ncubre todo"),
    (47.0, 50.0, "Clic. Queda firme."),
    (50.0, 56.0, "Se estira\ny se ajusta"),
    (56.0, 61.0, "El cinturón pasa\npor la abertura"),
    (61.0, 66.0, "Se acomoda\nen segundos"),
    (66.0, 70.0, "Lista para viajar"),
    (70.0, 76.0, "Acolchada e\nimpermeable"),
    (76.0, DUR, "Y se guarda\nen cualquier lado"),
]
TD = os.path.join(D, "txt"); os.makedirs(TD, exist_ok=True)
def tfile(n, s):
    p = os.path.join(TD, f"{n}.txt"); open(p, "w").write(s); return p
def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-3000:]); sys.exit(1)

capt = ",".join(
    f"drawtext=fontfile={FB}:textfile={tfile(i, t)}:fontcolor=white:fontsize=80:line_spacing=14:"
    f"x=(w-text_w)/2:y=560-text_h:box=1:boxcolor=0x2F3822@0.92:boxborderw=30:"
    f"enable='between(t,{a},{b - 0.001})'"
    for i, (a, b, t) in enumerate(TEXTOS))

fil = (
    # sin franjas, con algo de zoom para ganar tamaño
    "[0:v]crop=540:296:0:106,crop=500:280,"
    # luz y color: levanta sombras (interior del auto), más contraste y color, un poco de nitidez
    "eq=gamma=1.12:contrast=1.08:saturation=1.18:brightness=0.02,unsharp=5:5:0.7,split[a][b];"
    "[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:2,eq=brightness=-0.22[fondo];"
    "[b]scale=1080:605:flags=lanczos[frente];"
    "[fondo][frente]overlay=0:660,"
    # marca arriba
    f"drawtext=fontfile={FS}:text='LOS PERRINES':fontcolor=0xD9E15A:fontsize=40:x=(w-text_w)/2:y=150,"
    + capt + ","
    # web y envío abajo
    f"drawtext=fontfile={FB}:text='losperrines.com.ar':fontcolor=0x2F3822:fontsize=56:x=(w-text_w)/2:y=1420:"
    "box=1:boxcolor=0xD9E15A:boxborderw=22,"
    f"drawtext=fontfile={FS}:textfile={tfile('env', 'Envío gratis a todo el país')}:fontcolor=white:fontsize=44:x=(w-text_w)/2:y=1530,"
    # barrita de avance
    f"drawbox=x=0:y=1912:w=1080:h=8:color=0xFFFFFF@0.15:t=fill,"
    "fps=30,format=yuv420p[v]"
)
cuerpo = os.path.join(D, "cuerpo.mp4")
run(["ffmpeg", "-loglevel", "error", "-y", "-i", F, "-filter_complex", fil, "-map", "[v]", "-an",
     "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", cuerpo])

fin = os.path.join(D, "fin.mp4")
run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=0x2F3822:s=1080x1920:d=3.5:r=30", "-i", LOGO,
     "-filter_complex",
     "[1:v]scale=440:-1[l];[0:v][l]overlay=(W-w)/2:330,"
     f"drawtext=fontfile={FB}:textfile={tfile('fin1', 'Tu perro cómodo.' + chr(10) + 'Tu auto limpio.')}:fontcolor=white:fontsize=82:line_spacing=14:x=(w-text_w)/2:y=860,"
     f"drawtext=fontfile={FB}:text='losperrines.com.ar':fontcolor=0xD9E15A:fontsize=70:x=(w-text_w)/2:y=1180,"
     f"drawtext=fontfile={FS}:textfile={tfile('fin2', 'Envío gratis · Hecha en San Luis')}:fontcolor=white:fontsize=48:x=(w-text_w)/2:y=1290,"
     "fade=t=in:st=0:d=0.4,format=yuv420p[v]",
     "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-t", "3.5", fin])

lista = os.path.join(D, "lista.txt")
open(lista, "w").write(f"file '{cuerpo}'\nfile '{fin}'\n")
out = os.path.join(D, "reel-mejorado.mp4")
run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", "-movflags", "+faststart", out])
print(out)

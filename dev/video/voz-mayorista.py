# Voz para el reel mayorista (19/11/2026): voz "Daniela" (español de Argentina, piper) con sherpa-onnx.
# Instalar: pip install "sherpa-onnx<2" soundfile  (la 2.x no lee el texto sin diccionario)
# Voz: https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-es_AR-daniela-high.tar.bz2
# Uso: python3 dev/video/voz-mayorista.py <carpeta-de-la-voz> <carpeta-salida> 1.05
# Después se mezcla con ffmpeg (adelay 200 / 2650 / 6300 / 13250 / 15950 ms, loudnorm I=-14) y el video
# se estira 0,6 s congelando el último cuadro (tpad) para que entre la última frase: total 19,6 s.
# Las palabras en inglés van escritas como suenan ("guasap", "meil", "punto a erre").
import sherpa_onnx, soundfile as sf, sys
M=sys.argv[1]; O=sys.argv[2]; spd=float(sys.argv[3])
cfg=sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(
  model=f"{M}/es_AR-daniela-high.onnx",tokens=f"{M}/tokens.txt",data_dir=f"{M}/espeak-ng-data"),num_threads=4))
tts=sherpa_onnx.OfflineTts(cfg)
F=["¿Tenés pet shop o veterinaria?",
   "Entrá a Los Perrines punto com punto a erre, y tocá: precios por mayor.",
   "Dejá tus datos y cuántas fundas querés. Desde diez unidades, combinando tamaños, con envío incluido.",
   "Te mandamos la propuesta por guasap o por meil.",
   "Los Perrines. Fundas canasto para el auto. Industria argentina."]
for i,t in enumerate(F):
    a=tts.generate(t,sid=0,speed=spd); sf.write(f"{O}/f{i}.wav",a.samples,a.sample_rate)
    print(i, round(len(a.samples)/a.sample_rate,2))

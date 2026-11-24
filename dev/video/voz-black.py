# Voz para el reel del Black Friday (24/11/2026): "Daniela" (español de Argentina, piper) con sherpa-onnx, como voz-mayorista.py.
# Uso: python3 dev/video/voz-black.py <carpeta-de-la-voz> <carpeta-salida> 1.0  → f0.wav … f5.wav (una por escena)
import sherpa_onnx, soundfile as sf, sys
M=sys.argv[1]; O=sys.argv[2]; spd=float(sys.argv[3])
cfg=sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(
  model=f"{M}/es_AR-daniela-high.onnx",tokens=f"{M}/tokens.txt",data_dir=f"{M}/espeak-ng-data"),num_threads=4))
tts=sherpa_onnx.OfflineTts(cfg)
F=["¡Arrancó el bláck fráidei en Los Perrines!",
   "La funda canasto: tu perro viaja cómodo, y tu auto queda limpio.",
   "Cubre todo el asiento, y los costados.",
   "Hasta el viernes, diez por ciento de descuento: sesenta y siete mil quinientos, por transferencia.",
   "Y el envío es gratis a todo el país.",
   "Entrá a Los Perrines punto com punto a erre. ¡Solo hasta el viernes!"]
for i,t in enumerate(F):
  a=tts.generate(t,sid=0,speed=spd); sf.write(f"{O}/f{i}.wav",a.samples,a.sample_rate)
  print(i, round(len(a.samples)/a.sample_rate,2), t)

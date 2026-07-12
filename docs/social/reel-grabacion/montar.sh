#!/usr/bin/env bash
# Monta el reel final combinando las grabaciones [REC] con los estáticos PNG de
# Claude Design (portada, franjas de contexto con alfa, tarjeta 112 y cierre),
# según el guion de docs/social/reel-lanzamiento.md §5. Requiere ffmpeg.
#
# Uso:  bash montar.sh   (ejecútalo desde docs/social/reel-grabacion/)
set -e
REC="$(cd "$(dirname "$0")" && pwd)"
PNG="$REC/reel_estaticos_png"
SEG="$REC/.seg-tmp"
mkdir -p "$SEG"

# Ajustes de codificación idénticos en todos los segmentos → concat limpio.
ENC="-r 30 -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -level 4.0 -x264-params keyint=60:min-keyint=60:scenecut=0 -an -video_track_timescale 15360"

# 1) Portada (still 3s) con fundido de entrada.
ffmpeg -y -v error -loop 1 -t 3.0 -i "$PNG/A-portada.png" \
  -vf "fps=30,format=yuv420p,fade=t=in:st=0:d=0.2" $ENC "$SEG/1.mp4"

# 2) Mapa + franja C1 (rec-01 4.0→9.5: península → flyTo → detalle).
ffmpeg -y -v error -ss 4.0 -t 5.5 -i "$REC/rec-01-mapa.mp4" -i "$PNG/C1-franja-mapa.png" \
  -filter_complex "[0:v]fps=30[v];[v][1:v]overlay=0:0:format=auto,format=yuv420p" $ENC "$SEG/2.mp4"

# 3) Ficha + franja C2 (rec-02 0.8→5.8: hero → scroll a medios/evolución).
ffmpeg -y -v error -ss 0.8 -t 5.0 -i "$REC/rec-02-ficha.mp4" -i "$PNG/C2-franja-ficha.png" \
  -filter_complex "[0:v]fps=30[v];[v][1:v]overlay=0:0:format=auto,format=yuv420p" $ENC "$SEG/3.mp4"

# 4) Informe + franja C3 (rec-03 0.5→5.0: KPIs → tabla → filtros país).
ffmpeg -y -v error -ss 0.5 -t 4.5 -i "$REC/rec-03-informe.mp4" -i "$PNG/C3-franja-informe.png" \
  -filter_complex "[0:v]fps=30[v];[v][1:v]overlay=0:0:format=auto,format=yuv420p" $ENC "$SEG/4.mp4"

# 5) Tarjeta 112 (still 3s).
ffmpeg -y -v error -loop 1 -t 3.0 -i "$PNG/D-112.png" \
  -vf "fps=30,format=yuv420p,fade=t=in:st=0:d=0.2" $ENC "$SEG/5.mp4"

# 6) Cierre (still 2.6s) con fundido de salida.
ffmpeg -y -v error -loop 1 -t 2.6 -i "$PNG/E-cierre.png" \
  -vf "fps=30,format=yuv420p,fade=t=out:st=2.3:d=0.3" $ENC "$SEG/6.mp4"

# Concatenar.
printf "file '%s/1.mp4'\nfile '%s/2.mp4'\nfile '%s/3.mp4'\nfile '%s/4.mp4'\nfile '%s/5.mp4'\nfile '%s/6.mp4'\n" \
  "$SEG" "$SEG" "$SEG" "$SEG" "$SEG" "$SEG" > "$SEG/list.txt"
ffmpeg -y -v error -f concat -safe 0 -i "$SEG/list.txt" -c copy "$REC/reel-lanzamiento.mp4"
rm -rf "$SEG"
echo "OK → reel-lanzamiento.mp4"

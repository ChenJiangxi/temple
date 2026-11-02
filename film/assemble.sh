#!/bin/bash
# Joins the rendered shots (Motion-JPEG parts in parts/) with 0.8 s dissolves, fades in from and
# out to black, adds the score (music.wav, raised to about -16 LUFS with a peak limiter) and
# encodes H.264 1080p30. Usage: ./assemble.sh  ->  temple-promo-1080p.mp4
set -euo pipefail
cd "$(dirname "$0")"
SHOTS=(open day sutra buddha seasons section night)
SECS=(6 16 14 12 18 8 15)
X=0.8
inputs=(); for s in "${SHOTS[@]}"; do cat $(ls parts/film-$s-*.mjpeg | sort) > shots/$s.mjpeg; inputs+=(-f mjpeg -framerate 30 -i shots/$s.mjpeg); done
filter=""; prev="[0:v]"; offset=0
for i in $(seq 1 $((${#SHOTS[@]}-1))); do
  offset=$(echo "$offset + ${SECS[$((i-1))]} - $X" | bc)
  filter+="${prev}[$i:v]xfade=transition=fade:duration=$X:offset=$offset[v$i];"; prev="[v$i]"
done
total=$(echo "$offset + ${SECS[-1]}" | bc)
filter+="${prev}fade=t=in:st=0:d=1.2,fade=t=out:st=$(echo "$total - 1.8" | bc):d=1.8,format=yuv420p[v];"
filter+="[${#SHOTS[@]}:a]volume=1.2dB,alimiter=limit=0.84:level=false,afade=t=out:st=$(echo "$total - 2" | bc):d=2[a]"
ffmpeg -loglevel error -y "${inputs[@]}" -i music.wav -filter_complex "$filter" -map "[v]" -map "[a]" \
  -c:v libx264 -preset slow -crf 18 -r 30 -c:a aac -b:a 192k -t "$total" -movflags +faststart temple-promo-1080p.mp4
echo "total ${total}s"

#!/bin/bash
# Third cut: joins the shots (parts/) with 0.4 s dissolves, fades in and out, and encodes
# H.264 1080p30. Shot lengths come from the frames actually rendered.
#   ./assemble3.sh            -> cut3-video.mp4 (no sound) for the preview page
#   ./assemble3.sh a|b|c      -> cut3-<x>.mp4 with music-<x>.wav at about -16 LUFS
set -euo pipefail
cd "$(dirname "$0")"
SHOTS=(open sunrise grille column sutra floor buddha upper roof day golden seasons section dusk plan ground gate)
X=0.4
inputs=(); secs=()
for s in "${SHOTS[@]}"; do
  cat $(ls parts/film-$s-*.mjpeg | sort) > shots/$s.mjpeg
  n=$(ffprobe -v error -f mjpeg -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 shots/$s.mjpeg)
  secs+=($(echo "scale=4; $n / 30" | bc)); inputs+=(-f mjpeg -framerate 30 -i shots/$s.mjpeg)
done
filter=""; prev="[0:v]"; offset=0
for i in $(seq 1 $((${#SHOTS[@]}-1))); do
  offset=$(echo "$offset + ${secs[$((i-1))]} - $X" | bc)
  filter+="${prev}[$i:v]xfade=transition=fade:duration=$X:offset=$offset[v$i];"; prev="[v$i]"
done
total=$(echo "$offset + ${secs[$((${#secs[@]}-1))]}" | bc)
filter+="${prev}fade=t=in:st=0:d=1,fade=t=out:st=$(echo "$total - 1.6" | bc):d=1.6,format=yuv420p[v]"
if [ $# -eq 0 ]; then
  ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "$filter" -map "[v]" -c:v libx264 -preset slow -crf 18 -r 30 -t "$total" -movflags +faststart cut3-video.mp4
else
  I=$(ffmpeg -hide_banner -i music-$1.wav -af ebur128 -f null - 2>&1 | grep -E '^\s+I:' | tail -1 | grep -oE '[-0-9.]+')
  gain=$(echo "-16 - ($I)" | bc)
  filter+=";[${#SHOTS[@]}:a]volume=${gain}dB,alimiter=limit=0.84:level=false,afade=t=out:st=$(echo "$total - 2" | bc):d=2[a]"
  ffmpeg -loglevel error -y "${inputs[@]}" -i music-$1.wav -filter_complex "$filter" -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 18 -r 30 -c:a aac -b:a 192k -t "$total" -movflags +faststart cut3-$1.mp4
fi
echo "total ${total}s"

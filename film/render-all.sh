#!/bin/bash
# Renders every part of the film through the shared browser (hermit-browser), in runs short
# enough for its 5-minute limit and downloads under its ~100 MB cap, into parts/.
cd /Users/macmini003/writing
# A static server for dist/ (python3 -m http.server 4191 --bind 127.0.0.1 -d dist).
URL=${FILM_URL:-http://127.0.0.1:4191/}
run(){ # name count items-json
  for attempt in 1 2; do
    hermit-browser test projects/temple-walkthrough/scripts/v10/film.js --timeout 300000 --expect-downloads $2 --download-timeout 280000 \
      --environment '{"width":1920,"height":1080,"deviceScaleFactor":1}' --args "{\"url\":\"$URL\",\"wait\":150000,\"items\":$3}" > /tmp/film-$1.json 2>&1
    python3 - /tmp/film-$1.json $2 <<'PY'
import json,sys,shutil,os,re
raw=open(sys.argv[1]).read()
try: d=json.loads(raw[raw.find('{'):])
except Exception: print(sys.argv[1],'unreadable'); sys.exit(1)
ok=[t for t in d.get('transfers',[]) if t['status']=='completed']
for a in d.get('artifacts',[]): shutil.copy(a['path'],'/Users/macmini003/writing/projects/temple-walkthrough/film/parts/'+re.sub(r'.*-film-','film-',os.path.basename(a['path'])))
print(sys.argv[1],d.get('outcome'),d.get('error') or '',f"{len(ok)}/{sys.argv[2]} downloads")
sys.exit(0 if len(ok)==int(sys.argv[2]) else 1)
PY
    [ $? -eq 0 ] && return 0; hermit-browser stop >/dev/null 2>&1
  done; echo "RUN $1 FAILED"
}
run r1 4 '["film=open","film=morning&from=0&to=135","film=morning&from=135&to=270","film=column&from=0&to=90"]'
run r2 4 '["film=column&from=90&to=180","film=afternoon&from=0&to=135","film=afternoon&from=135&to=270","film=upper"]'
run r3 4 '["film=sutra&from=0&to=135","film=sutra&from=135&to=270","film=buddha&from=0&to=135","film=buddha&from=135&to=270"]'
run r4 2 '["film=seasons&from=0&to=130","film=seasons&from=130&to=260"]'
run r5 2 '["film=seasons&from=260&to=390","film=seasons&from=390&to=510"]'
run r6 4 '["film=section&from=0&to=120","film=section&from=120&to=240","film=dusk&from=0&to=135","film=dusk&from=135&to=270"]'
run r7 2 '["film=plan","film=ground"]'
run r8 2 '["film=gate&from=0&to=180","film=gate&from=180&to=360"]'
echo ALL-RUNS-FINISHED

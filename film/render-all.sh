#!/bin/bash
# Renders every part of the film through the shared browser (hermit-browser), in runs short
# enough for its 5-minute limit and downloads under its ~100 MB cap, into parts/.
cd /Users/macmini003/writing
URL=https://hermit-preview-macmini003.zhinan.tech/p/pv__fCrs87aNEKK6xOBi_pX-Q/
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
run r1 3 '["film=open","film=day&from=0&to=240","film=day&from=240&to=480"]'
run r2 4 '["film=buddha&from=0&to=180","film=buddha&from=180&to=360","film=section&from=0&to=120","film=section&from=120&to=240"]'
run r3 4 '["film=sutra&from=0&to=105","film=sutra&from=105&to=210","film=sutra&from=210&to=315","film=sutra&from=315&to=420"]'
run r4 2 '["film=seasons&from=0&to=150","film=seasons&from=150&to=300"]'
run r5 2 '["film=seasons&from=300&to=450","film=seasons&from=450&to=540"]'
run r6 3 '["film=night&from=0&to=150","film=night&from=150&to=300","film=night&from=300&to=450"]'
echo ALL-RUNS-FINISHED

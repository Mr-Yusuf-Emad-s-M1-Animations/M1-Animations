"""Make one QR code (SVG) per preset.  Usage:  python make_qr.py https://your-site.com"""
import pathlib, sys
from urllib.parse import urlencode
import segno
from solvers import SCENES

base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5000").rstrip("/")
out = pathlib.Path("qr")
out.mkdir(exist_ok=True)
for scene in SCENES.values():
    for i, preset in enumerate(scene["presets"], 1):
        url = f"{base}/m1/{scene['id']}?{urlencode(preset['params'])}"
        segno.make(url, error="m").save(out / f"{scene['id']}-{i}.svg", scale=10, border=4)
        print(f"{scene['id']}-{i}.svg  ({len(url)} chars)  {url}")

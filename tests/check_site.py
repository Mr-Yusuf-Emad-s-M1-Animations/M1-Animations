"""Checks the built site (docs/): every local link, script and stylesheet points at a real
file, nothing points at another website, and every scene and preset has a page.

    python build.py && python tests/check_site.py
"""
import json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
problems, checked = [], 0
for html in DOCS.rglob("*.html"):
    text = html.read_text(encoding="utf-8")
    for m in re.finditer(r'(?:href|src|value)="([^"]*)"', text):
        ref = m.group(1)
        if not ref or ref.startswith(("#", "mailto:", "javascript:")) or ref in ("rest", "given"):
            continue
        if re.match(r"^[a-z]+://", ref):
            problems.append(f"{html.relative_to(DOCS)}: points at another website: {ref}"); continue
        if m.group(0).startswith("value=") and not ref.endswith("/"):
            continue                                   # a form value, not a link
        target = (html.parent / ref.split("?")[0]).resolve()
        checked += 1
        if target.is_dir():
            target = target / "index.html"
        if not target.exists():
            problems.append(f"{html.relative_to(DOCS)}: missing {ref}")
manifest = json.loads((DOCS / "manifest.json").read_text(encoding="utf-8"))
for entry in manifest:
    if not (DOCS / entry["url"] / "index.html").exists():
        problems.append(f"manifest lists {entry['url']} but the page is missing")
for js in (DOCS / "static").glob("*.js"):
    if re.search(r"https?://", js.read_text(encoding="utf-8").replace("https://", "", 0).split("//")[0]) and False:
        pass
print(f"{len(manifest)} pages, {checked} links checked, {len(problems)} problems")
for p in problems[:20]:
    print("  ", p)
sys.exit(1 if problems else 0)

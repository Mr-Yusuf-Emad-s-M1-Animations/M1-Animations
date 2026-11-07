"""Build the static website into docs/.   Usage:  python build.py

Everything the site needs is plain files: HTML pages, one CSS file and four JS files.
No server runs anywhere, so there is nothing to keep alive. Upload docs/ to GitHub Pages.

Pages made:
  docs/index.html                  the home page (all scenes, with search)
  docs/m1/<scene>/index.html       one page per scene, with its default numbers
  docs/e/<scene>-<n>/index.html    one page per preset (the n-th example of that scene)
  docs/e/<id>/index.html           one page per entry in examples.json (short ids for the notes)
  docs/manifest.json               a list of every page, for other tools (e.g. the QR codes later)
"""
import json, os, pathlib, shutil, stat, sys, time
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))
from solvers import SCENES

OUT = ROOT / "docs"
CHAPTER_COLORS = ["#2f6690", "#0f766e", "#b45309", "#6d28d9", "#b91c1c", "#15803d", "#0e7490", "#a21caf"]

# One-line descriptions for the home page cards (the scene pages keep their longer text).
HOME_LINES = {
    "suvat-journey": "A car speeds up, cruises, then brakes, with the speed-time graph drawn as it moves.",
    "stages": "One or two vehicles moving in stages of constant acceleration.",
    "overtaking": "A cyclist sets off from rest and speeds up to catch a car moving at constant speed.",
    "vertical-projection": "A stone thrown straight up and falling back, with its velocity-time graph.",
    "bouncing-ball": "A ball falls and bounces, with each bounce shown on the velocity-time graph.",
    "vertical-meeting": "Two particles moving vertically meet in mid-air.",
    "parachutist": "A parachutist falls freely, opens the parachute, then falls at a steady speed.",
    "hanging-strings": "A particle hangs in equilibrium from two strings, or from a string and a force.",
    "slope-limiting": "A growing force P makes a particle about to slide down, then up, a rough slope.",
    "rough-surface": "A growing force at any angle acts on a particle on a rough surface until it is about to slide.",
    "inclined-plane": "A block slides down a rough slope, with the forces W, N and F shown.",
    "slope-up-and-back": "A particle is projected up a rough slope and slides back, with friction changing direction.",
    "towing": "A car pulls a trailer with a rod (tension or thrust) or a string that can go slack.",
    "lift": "A person in a lift that speeds up, moves steadily, then slows, with the floor force R.",
    "pulley-hanging": "Two particles over a pulley: A lands, the string goes slack and B keeps rising.",
    "pulley-table": "A hanging particle pulls another along a rough table, then lands and bounces.",
    "pulley-slope": "A particle on a rough slope is joined over a pulley to a hanging particle.",
    "pulley-extra-mass": "An extra mass falls away from A, so the acceleration changes part-way.",
    "collision": "Two particles collide directly on a smooth line.",
    "wall-bounce": "A ball hits a wall at right angles and rebounds, with its change in momentum.",
    "soft-ground": "An object falls onto soft ground and is stopped by a constant resistance R.",
    "plank": "A package moves along a plank on two supports while the reactions change.",
    "beam": "A beam on supports, ropes or a bolt with up to three loads, one of them movable.",
    "vectors": "Two particles move with constant velocity from given position vectors, to find the closest approach.",
    "vector-acceleration": "A particle's velocity turns as v = u + at.",
}

env = Environment(loader=FileSystemLoader(ROOT / "templates"), autoescape=select_autoescape(["html"]))
env.filters["num"] = lambda v: v if isinstance(v, str) else f"{v:g}"


def public(scene):
    """The scene without its Python function (what the browser needs)."""
    return {k: v for k, v in scene.items() if k != "solve"}


def clear_folder(path):
    """Empty a folder. On Windows a folder can be locked (open in Explorer, a running server,
    OneDrive, antivirus...). Then we retry, and if an item still cannot be removed we carry on:
    every file we need is written again afterwards anyway. Returns the items that are stuck."""
    stuck = []
    for p in sorted(path.rglob("*"), key=lambda q: len(q.parts), reverse=True):
        for _ in range(5):
            try:
                os.chmod(p, stat.S_IWRITE)
                p.rmdir() if p.is_dir() else p.unlink()
                break
            except OSError:
                time.sleep(0.2)
        else:
            stuck.append(p)
    return stuck


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def main():
    stuck = clear_folder(OUT) if OUT.exists() else []
    (OUT / "static").mkdir(parents=True, exist_ok=True)

    # ---- static files
    for name in ("style.css", "scenes.js", "app.js"):
        shutil.copy(ROOT / "static" / name, OUT / "static" / name)
    shutil.copy(ROOT / "js" / "solvers.js", OUT / "static" / "solvers.js")
    catalog = {sid: public(sc) for sid, sc in SCENES.items()}
    write(OUT / "static" / "catalog.js", "window.CATALOG = " + json.dumps(catalog, ensure_ascii=False) + ";\n")
    write(OUT / ".nojekyll", "")
    write(OUT / "404.html", "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
          "<title>Page not found</title><body style='font-family:sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem'>"
          "<h1>Page not found</h1><p>Check the address, or go back to the home page of this site.</p></body>")

    manifest = []

    # ---- home page
    chapters = {}
    missing = set(SCENES) - set(HOME_LINES)
    if missing:
        raise SystemExit(f"build.py: add a one-line description to HOME_LINES for {sorted(missing)}")
    for scene in SCENES.values():
        ch = chapters.setdefault(scene["chapter"], {"name": scene["chapter"], "scenes": [],
                                                    "color": CHAPTER_COLORS[len(chapters) % len(CHAPTER_COLORS)]})
        ch["scenes"].append(scene)
    write(OUT / "index.html", env.get_template("index.html").render(root="", chapters=chapters.values(), home_lines=HOME_LINES))

    scene_tpl = env.get_template("scene.html")

    def page(path_parts, scene, values, example=None):
        root = "../" * len(path_parts)
        html = scene_tpl.render(root=root, scene=scene, values=values, example=example)
        write(OUT.joinpath(*path_parts, "index.html"), html)

    for sid, scene in SCENES.items():
        defaults = {p["key"]: p["default"] for p in scene["params"]}
        page(["m1", sid], scene, defaults)
        manifest.append({"id": sid, "url": f"m1/{sid}/", "scene": sid, "title": scene["title"], "kind": "scene"})
        for n, preset in enumerate(scene["presets"], 1):
            eid = f"{sid}-{n}"
            page(["e", eid], scene, preset["params"], {"label": preset["label"]})
            manifest.append({"id": eid, "url": f"e/{eid}/", "scene": sid, "title": preset["label"],
                             "kind": "preset", "params": preset["params"]})

    # ---- optional: short ids / custom numbers for the notes (examples.json)
    ex_file = ROOT / "examples.json"
    if ex_file.exists():
        for eid, ex in json.loads(ex_file.read_text(encoding="utf-8")).items():
            if eid.startswith("_"):
                continue                                  # comment keys
            scene = SCENES[ex["scene"]]
            base = scene["presets"][ex["preset"] - 1]["params"] if "preset" in ex else {p["key"]: p["default"] for p in scene["params"]}
            values = {**base, **ex.get("params", {})}
            unknown = set(values) - {p["key"] for p in scene["params"]}
            if unknown:
                raise SystemExit(f"examples.json: {eid} has unknown numbers {sorted(unknown)} for {ex['scene']}")
            label = ex.get("title") or ex.get("label") or scene["title"]
            page(["e", eid], scene, values, {"label": label})
            manifest.append({"id": eid, "url": f"e/{eid}/", "scene": ex["scene"], "title": label, "kind": "example", "params": values})

    write(OUT / "manifest.json", json.dumps(manifest, indent=1, ensure_ascii=False))
    print(f"Built {len(manifest)} pages in {OUT}")
    if stuck:
        print(f"Note: {len(stuck)} old items could not be deleted (they are open in another program, such as "
              "Explorer, a running server or OneDrive). The new files were still written. "
              "Close that program and run build.py again if you removed an example and want its old page gone.")


if __name__ == "__main__":
    main()

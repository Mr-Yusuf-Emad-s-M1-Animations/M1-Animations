# M1 mechanics animations (static website)

A website of animated mechanics scenes. **There is no server.** The physics runs in the
student's browser, so the site is only files. It can sit on GitHub Pages for free with nothing to
keep running or renew.

## What is in this folder

| Folder / file | What it is |
|---|---|
| `docs/` | **The finished website.** This is what you publish. Made by `build.py`; do not edit by hand. |
| `build.py` | Makes `docs/` from the files below. |
| `solvers/` | The physics in Python. It gives each scene its name, numbers and examples, and it is the reference the tests compare the JavaScript against. |
| `js/solvers.js` | The same physics in JavaScript. This is what the website runs. |
| `static/scenes.js` | One drawing function per scene (the picture). `graph()` draws the live graphs. |
| `static/app.js`, `static/style.css` | The page: buttons, sliders, playing the frames. |
| `templates/` | The two page layouts. |
| `examples.json` | Short permanent ids for examples in the notes (empty for now). |
| `tests/` | Checks (see below). |
| `previews/` | Pictures of every scene, made by the test script. |

## Make the site and look at it

    pip install -r requirements.txt
    python build.py
    python -m http.server -d docs 8000      # then open http://localhost:8000

(Opening `docs/index.html` directly from the disk also works.)

## Publish on GitHub Pages

1. Make a GitHub **organization** with a neutral name, for example `m1-mechanics`. The name goes into every
   printed address and cannot change later without breaking them.
2. In the organization, make a **public** repository called `<organization>.github.io`.
3. Put this whole folder in it and push.
4. Settings, Pages, "Deploy from a branch", branch `main`, folder `/docs`.
5. The site is at `https://<organization>.github.io/`.

Do not rename the organization or repository. Turn on two-factor sign-in and add a second owner.

## Addresses (these never change once printed)

- Scene with its default numbers: `m1/<scene>/`  for example `m1/overtaking/`
- One preset: `e/<scene>-<n>/`  for example `e/overtaking-1/`
- Your own short id from `examples.json`: `e/<id>/`
- `docs/manifest.json` lists every page with its numbers. The QR codes will be made from this file.

Numbers can also be added to any address: `m1/overtaking/?u=8&a=2.5&v=20`.

## Tests

    python tests/parity.py          # JavaScript and Python give the same numbers (1,456 cases) - needs Node.js
    python tests/check_site.py      # every link and file in docs/ exists, nothing points to another website

Optional, in `tests/browser/` (`npm install` first): `node e2e_pages.js` opens every page in a simulated browser
and presses the buttons; `node e2e_more.js` tries bad input and numbers in the address;
`node render_check.js 720 ../../previews` draws every scene to PNG files.

## Change or add things

- **Change an example's numbers or add a new example:** edit `presets` in the scene's file in `solvers/`
  (add new ones at the **end** so the existing `e/<scene>-<n>/` addresses stay the same), run `python build.py`.
- **New scene:** (1) write the Python file in `solvers/` and list it in `solvers/__init__.py`; (2) write the same
  `solve` in `js/solvers.js` under the same id; (3) write its drawing function in `static/scenes.js`;
  (4) run `python tests/parity.py`, then `python build.py`.
  Whenever you change a solver, change it in **both** languages; the parity test tells you if they drift apart.
- A drawing function is `draw(g, frame, meta, data)`; `data.frames` is every frame, which `graph()` uses.

## Changes from the Flask version

- No Flask, no server, no `/api`. `app.py` and `make_qr.py` are gone; the QR step will read `docs/manifest.json`.
- All 23 solvers are ported to JavaScript and tested against the Python versions.
- 12 scenes had a solver but no drawing: suvat-journey, bouncing-ball, vertical-meeting, parachutist, slope-limiting,
  slope-up-and-back, lift, pulley-extra-mass, string-jerk, wall-bounce, soft-ground, vector-acceleration.
  They now have one, with live graphs (the README of the old version mentioned `graph()`, but it was missing).
- One page for every preset, so each example has its own permanent address.
- Sliders and number boxes now stay in step; Space, R and the arrow keys work as the page says.
- On a phone, scenes with a picture and a graph get a taller canvas.
- Numbers typed into the page appear in the address (`?u=8&...`) only after the person changes them.

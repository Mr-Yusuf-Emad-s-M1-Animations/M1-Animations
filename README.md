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
| `examples.json` | **One entry for each example in the notes that has an animation** (90 now). Key = permanent id such as `3-12-2`. |
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
- An example in the notes (from `examples.json`): `e/<chapter>-<section>-<number>/`  for example `e/1-4-1/` (chapter 1, section 1.4, first example)
- `docs/manifest.json` lists every page with its numbers. The QR codes will be made from this file.

Numbers can also be added to any address: `m1/overtaking/?u=8&a=2.5&v=20`.

## Tests

    python tests/parity.py          # JavaScript and Python give the same numbers (1,456 cases) - needs Node.js
    python tests/check_site.py      # every link and file in docs/ exists, nothing points to another website
    python tests/check_examples.py  # every example's numbers are valid, and the animation's own results match the answers in the notes

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
- All 27 solvers are ported to JavaScript and tested against the Python versions.
- 12 scenes had a solver but no drawing: suvat-journey, bouncing-ball, vertical-meeting, parachutist, slope-limiting,
  slope-up-and-back, lift, pulley-extra-mass, wall-bounce, soft-ground, vector-acceleration.
  They now have one, with live graphs (the README of the old version mentioned `graph()`, but it was missing).
- One page for every preset, so each example has its own permanent address.
- Sliders and number boxes now stay in step; Space, R and the arrow keys work as the page says.
- On a phone, scenes with a picture and a graph get a taller canvas.
- Numbers typed into the page appear in the address (`?u=8&...`) only after the person changes them.

## Examples for the notes (QR data)

`examples.json` links each example in `M1_Master.tex` to a scene and the numbers from the question.
The id is `<chapter>-<section>-<number>`: the number counts every example in that section, Level 1 ones too,
so `3-12-2` is the second example in section 3.12. **Ids never change after printing.** If the notes are
re-ordered, use each entry's `anchor` (the start of the question) and `tex_line` to find the example again.

Each entry has a `status`:
- `exact`: the animation's own results include an answer printed in the notes. `tests/check_examples.py` checks them.
- `illustration`: same set-up and numbers, but no printed answer is one of the animation's results. Read the `note`.

A long journey (over 30 s) is played as a time-lapse so it lasts at most 30 s on screen. The readout still shows the true time.

## Scenes added for the QR examples

- **stages** (Chapter 1): one or two vehicles, each in stages written as `duration:acceleration`, for example `5:2, 15:0, 4:-2.5`.
  Speed-time or acceleration-time graph; finds overtaking, turning round, equal speeds, a marked speed or time.
- **rough-surface** (Chapter 2): a particle on flat or sloping rough ground with one or two forces at any angle
  (angle measured from up the surface, anticlockwise). Sweeps the first force and finds the smallest and greatest values for equilibrium.
- **hanging-strings** (Chapter 2): was already in the project but not on the site. Now it can show a string and a force.
- **beam** (Chapter 5): up to two supports, ropes or a bolt (also at the ends), a non-uniform beam, three loads (one moves),
  a force limit for ropes and bolts, and moments about any point.

Text inputs (like the stages) are a new kind of input: `text(...)` in `solvers/common.py`.

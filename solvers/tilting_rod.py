"""Chapter 5: a rod resting on a single support that tips over when a package
placed on the rod unbalances it."""
from math import cos, radians
from .common import codes, FPS, check, num, r, result

SCENE = {
    "id": "tilting-rod",
    "chapter": "Chapter 5: Moments",
    "title": "Rod that tips over",
    "blurb": "A rod rests on a single support. Move the package along the rod and it "
             "tips one way or the other about the support.",
    "covers": codes("5.7-5.10"),
    "params": [
        num("L", "Length of rod AB", 8, "m"),
        num("M", "Mass of rod", 20, "kg"),
        num("P", "Distance AP (support)", 3, "m"),
        num("m", "Mass of package", 30, "kg"),
        num("x", "Package position (from A)", 8, "m"),
        num("maxang", "Stop the tilt at", 20, "°"),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "Heavy package at end B: rod tips towards B",
         "params": {"L": 8, "M": 20, "P": 3, "m": 30, "x": 8, "maxang": 20, "g": 9.8}},
        {"label": "Heavy package at end A: rod tips towards A",
         "params": {"L": 8, "M": 20, "P": 5, "m": 30, "x": 0, "maxang": 20, "g": 9.8}},
    ],
}
MAX_SIM = 20.0     # seconds of simulated time before giving up


def solve(p):
    L, M, P, m, x, g, maxang = p["L"], p["M"], p["P"], p["m"], p["x"], p["g"], p["maxang"]
    check(L > 0 and M > 0 and m > 0 and g > 0, "L, both masses and g must be greater than 0.")
    check(0 < P < L, "The support must be on the rod, strictly between A and B.")
    check(0 <= x <= L, "The package must stay on the rod (0 to L).")
    check(0 < maxang <= 40, "Stop the tilt at an angle between 0° and 40°.")

    R = (M + m) * g                             # the single support carries the whole weight
    tau = m * (x - P) + M * (L / 2 - P)         # moment about P of the weights (per g)
    meta = {"L": L, "M": M, "m": m, "x": x, "pivot": r(P), "maxang": maxang}

    if abs(tau) < 1e-9:
        meta.update(mode="level", R=r(R, 2))
        res = [result("Reaction at P", r(R, 2), "N"),
               result("Rod stays level", "yes (exactly balanced)")]
        return {"dt": 1 / FPS, "frames": [{"t": 0, "phi": 0, "w": 0}], "results": res, "meta": meta}

    mode = "B" if tau > 0 else "A"              # which end goes down
    sign = 1 if mode == "B" else -1
    tau = abs(tau)
    I = M * L * L / 12 + M * (L / 2 - P) ** 2 + m * (x - P) ** 2
    a0 = g * tau / I                            # angular acceleration at the start (rad/s²)
    lim = radians(maxang)

    dt, phi, w, t, out, next_out = 1 / 1200, 0.0, 0.0, 0.0, [], 0.0
    while phi < lim and t < MAX_SIM:
        if t >= next_out:
            out.append((t, phi, w)); next_out += 1 / FPS
        acc = a0 * cos(phi)                     # weights' moment arm shrinks as cos(phi)
        w += acc * dt / 2
        phi += w * dt
        w += a0 * cos(phi) * dt / 2
        t += dt
    check(phi >= lim, "The rod is almost balanced: it would take over 20 s to tip. Move the package further out.")
    out.append((t, lim, w))
    slow = max(1.0, 3.0 / t)
    frames = [{"t": r(tt), "phi": r(sign * ph), "w": r(sign * ww)} for tt, ph, ww in out]
    res = [result("Rod tips towards", mode),
           result("Reaction at P", r(R, 2), "N"),
           result("Angular acceleration at the start", r(a0, 3), "rad/s²"),
           result(f"Time to tilt {maxang:g}°", r(t, 3), "s"),
           result("Angular speed at the end", r(w, 3), "rad/s")]
    if slow > 1:
        res.append(result("Shown in slow motion", f"×{r(slow, 1)}"))
    res.append(result("Note", "the turning motion uses rotation physics beyond M1; the package is fixed to the rod"))
    meta.update(mode=mode, R=r(R, 2))
    return {"dt": slow / FPS, "frames": frames, "results": res, "meta": meta}

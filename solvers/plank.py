"""Chapter 5: a uniform plank on two supports with a package on it (moments)."""
from .common import codes, check, num, r, result

SCENE = {
    "id": "plank",
    "chapter": "Chapter 5: Moments",
    "title": "Plank on two supports",
    "blurb": "A package moves along a uniform plank. Watch the reactions at C and D change.",
    "covers": codes("5.7-5.10"),
    "params": [
        num("L", "Length of plank AB", 8, "m"),
        num("M", "Mass of plank", 20, "kg"),
        num("AC", "Distance AC", 1.5, "m"),
        num("DB", "Distance DB", 2, "m"),
        num("m", "Mass of package", 8, "kg"),
        num("x_from", "Package starts at (from A)", 1.5, "m"),
        num("x_to", "Package ends at (from A)", 4, "m"),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "Plank AB, supports at C and D",
         "params": {"L": 8, "M": 20, "AC": 1.5, "DB": 2, "m": 8,
                    "x_from": 1.5, "x_to": 4, "g": 9.8}},
    ],
}
N_FRAMES = 150


def solve(p):
    L, M, m, g = p["L"], p["M"], p["m"], p["g"]
    xc, xd = p["AC"], L - p["DB"]
    a, b = p["x_from"], p["x_to"]
    check(L > 0 and M > 0 and m > 0 and g > 0, "L, both masses and g must be greater than 0.")
    check(p["AC"] > 0 and p["DB"] > 0 and xc < xd,
          "C and D must both be on the plank, with C closer to A than D.")
    check(0 <= a <= L and 0 <= b <= L, "The package must stay on the plank (0 to L).")
    gap = xd - xc

    def reactions(x):
        # Moments about C:  Rd * gap = M g (L/2 - xc) + m g (x - xc)
        rd = (M * g * (L / 2 - xc) + m * g * (x - xc)) / gap
        rc = (M + m) * g - rd                      # forces up = forces down
        if rc < 0:                                 # package beyond D: lifts off at C
            return 0.0, (M + m) * g, "D"
        if rd < 0:                                 # package too near A: lifts off at D
            return (M + m) * g, 0.0, "C"
        return rc, rd, ""

    frames = []
    for i in range(N_FRAMES + 1):
        x = a + (b - a) * i / N_FRAMES
        rc, rd, tip = reactions(x)
        frames.append({"x": r(x), "Rc": r(max(rc, 0)), "Rd": r(max(rd, 0)), "tip": tip})

    rc, rd, tip = reactions(b)
    lo = xc - M * (L / 2 - xc) / m                              # Rd = 0
    hi = xc + ((M + m) * gap - M * (L / 2 - xc)) / m            # Rc = 0
    res = [result("Reaction at C", r(max(rc, 0), 2), "N"),
           result("Reaction at D", r(max(rd, 0), 2), "N")]
    if tip:
        res.append(result("Final position", f"plank tips about {tip}"))
    if lo <= 0 and hi >= L:
        res.append(result("Tipping", "the package cannot tip the plank anywhere on it"))
    else:
        res.append(result("Plank stays level for x between",
                          f"{r(max(lo, 0), 2)} m and {r(min(hi, L), 2)} m"))
    return {"dt": 1 / 60, "frames": frames, "results": res,
            "meta": {"L": L, "M": M, "m": m, "g": g, "xc": xc, "xd": r(xd)}}

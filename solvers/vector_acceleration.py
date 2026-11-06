"""Chapter 6: a particle with constant acceleration in i, j form - v = u + at, r = r0 + ut + at²/2."""
from math import atan2, degrees, hypot
from .common import check, codes, num, r, result, sample

SCENE = {
    "id": "vector-acceleration",
    "chapter": "Chapter 6: Vectors",
    "title": "Velocity changing with constant acceleration",
    "blurb": "A particle starts with velocity u and has a constant acceleration a. The velocity "
             "arrow (red) turns as v = u + at; the path is a curve.",
    "covers": codes("6.9", "6.10"),
    "params": [
        num("x0", "Start position x0", 0, "m"),
        num("y0", "Start position y0", 0, "m"),
        num("ux", "Initial velocity: i part", 4, "m/s"),
        num("uy", "Initial velocity: j part", -3, "m/s"),
        num("ax", "Acceleration: i part", -0.5, "m/s²"),
        num("ay", "Acceleration: j part", 1, "m/s²"),
        num("T", "Time to show", 6, "s"),
    ],
    "presets": [
        {"label": "u = 4i − 3j, a = −0.5i + j",
         "params": {"x0": 0, "y0": 0, "ux": 4, "uy": -3, "ax": -0.5, "ay": 1, "T": 6}},
        {"label": "Starts moving east, turns north-east",
         "params": {"x0": 2, "y0": 1, "ux": 3, "uy": 0, "ax": 0, "ay": 1.5, "T": 4}},
    ],
}


def solve(p):
    x0, y0, ux, uy, ax, ay, T = (p[k] for k in ("x0", "y0", "ux", "uy", "ax", "ay", "T"))
    check(T > 0, "The time must be greater than 0.")
    check(hypot(ax, ay) > 0 or hypot(ux, uy) > 0, "The particle must move.")

    def frame(t):
        return {"t": r(t), "x": r(x0 + ux * t + 0.5 * ax * t * t), "y": r(y0 + uy * t + 0.5 * ay * t * t),
                "vx": r(ux + ax * t), "vy": r(uy + ay * t)}

    frames, dt = sample(T, frame)
    vx, vy = ux + ax * T, uy + ay * T
    res = [result("Velocity at the end", f"({r(vx, 3)}i + {r(vy, 3)}j) m/s"),
           result("Speed at the end", r(hypot(vx, vy), 3), "m/s"),
           result("Position at the end", f"({frames[-1]['x']}i + {frames[-1]['y']}j) m"),
           result("Distance from start", r(hypot(frames[-1]["x"] - x0, frames[-1]["y"] - y0), 3), "m")]
    if ay != 0 and 0 < -uy / ay <= T:
        res.append(result("Moving parallel to i at", r(-uy / ay, 3), "s"))
    if ax != 0 and 0 < -ux / ax <= T:
        res.append(result("Moving parallel to j at", r(-ux / ax, 3), "s"))
    bearing = (90 - degrees(atan2(vy, vx))) % 360
    res.append(result("Bearing of motion at the end", r(bearing, 1), "°"))
    return {"dt": dt, "frames": frames, "results": res,
            "meta": {"ax": ax, "ay": ay, "x0": x0, "y0": y0}}

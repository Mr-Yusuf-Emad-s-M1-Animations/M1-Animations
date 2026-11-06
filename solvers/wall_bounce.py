"""Chapter 4: a ball hits a vertical wall and rebounds."""
from .common import check, codes, choice, num, r, result

SCENE = {
    "id": "wall-bounce",
    "chapter": "Chapter 4: Momentum",
    "title": "Ball bounces off a wall",
    "blurb": "A ball moves along a smooth floor, hits a wall at right angles and rebounds. The "
             "velocity changes sign, so the change in momentum is m(u + v), not m(u − v).",
    "covers": codes("4.9", "4.11", "4.13"),
    "params": [
        num("m", "Mass of the ball", 0.4, "kg"),
        num("u", "Speed towards the wall", 6, "m/s"),
        choice("mode", "Rebound given as", "speed",
               [["speed", "Rebound speed"], ["impulse", "Impulse from the wall"]]),
        num("v", "Rebound speed (if given)", 4, "m/s", 0, 10, 0.1),
        num("I", "Impulse from the wall (if given)", 3, "N s"),
    ],
    "presets": [
        {"label": "0.4 kg at 6 m/s, rebounds at 4 m/s",
         "params": {"m": 0.4, "u": 6, "mode": "speed", "v": 4, "I": 3}},
        {"label": "Impulse of 3 N s given, find the rebound speed",
         "params": {"m": 0.25, "u": 8, "mode": "impulse", "v": 0, "I": 3}},
    ],
}
N = 200


def solve(p):
    m, u = p["m"], p["u"]
    check(m > 0 and u > 0, "m and u must be greater than 0.")
    v = p["v"] if p["mode"] == "speed" else p["I"] / m - u     # I = m(v + u)
    check(v >= 0, "With that impulse the ball would not rebound. Use a bigger impulse.")
    check(v <= u + 1e-9, "The rebound speed cannot be more than the impact speed.")
    frames = []
    for i in range(N + 1):
        tau = -1 + 2 * i / N                                 # -1 .. 0 before, 0 .. 1 after
        d = -u * tau if tau < 0 else v * tau                  # distance from the wall (scene units)
        frames.append({"x": r(d * (5 / u)), "after": tau >= 0})
    I = m * (u + v)
    res = [result("Rebound speed", r(v, 3), "m/s"),
           result("Impulse from the wall", r(I, 3), "N s"),
           result("Momentum before (towards wall +)", r(m * u, 3), "kg m/s"),
           result("Momentum after", r(-m * v, 3), "kg m/s"),
           result("Kinetic energy lost", r(0.5 * m * (u * u - v * v), 3), "J"),
           result("e = v ÷ u", r(v / u, 3))]
    return {"dt": 1 / 60, "frames": frames, "results": res, "meta": {"u": u, "v": r(v), "I": r(I)}}

"""Chapter 2: a particle in equilibrium, hanging from two strings."""
from math import sin, cos, radians
from .common import check, num, r, result

SCENE = {
    "id": "hanging-strings",
    "chapter": "Chapter 2: Statics",
    "title": "Particle on two strings",
    "blurb": "A particle hangs in equilibrium from two strings. Watch the tensions grow to balance the weight.",
    "params": [
        num("W", "Weight W", 100, "N"),
        num("alpha", "Angle of AC to the horizontal", 30, "°"),
        num("beta", "Angle of BC to the horizontal", 45, "°"),
    ],
    "presets": [
        {"label": "Strings at 30° and 45°", "params": {"W": 100, "alpha": 30, "beta": 45}},
        {"label": "Symmetric strings at 60°", "params": {"W": 100, "alpha": 60, "beta": 60}},
    ],
}
N_FRAMES = 90


def solve(p):
    W, al, be = p["W"], radians(p["alpha"]), radians(p["beta"])
    check(W > 0, "W must be greater than 0.")
    check(0 < p["alpha"] < 90 and 0 < p["beta"] < 90, "Both angles must be between 0° and 90°.")
    s = sin(al + be)
    T1 = W * cos(be) / s      # horizontal: T1 cos(a) = T2 cos(b);  vertical: T1 sin(a) + T2 sin(b) = W
    T2 = W * cos(al) / s
    frames = [{"k": r(i / (N_FRAMES - 1))} for i in range(N_FRAMES)]
    res = [result("Tension in AC", r(T1, 3), "N"), result("Tension in AC as a multiple of W", r(T1 / W, 4)),
           result("Tension in BC", r(T2, 3), "N"), result("Tension in BC as a multiple of W", r(T2 / W, 4)),
           result("Horizontal parts (equal)", r(T1 * cos(al), 3), "N"),
           result("Vertical parts add up to W", r(T1 * sin(al) + T2 * sin(be), 3), "N")]
    return {"dt": 1 / 45, "frames": frames, "results": res,
            "meta": {"W": W, "alpha": p["alpha"], "beta": p["beta"], "T1": r(T1), "T2": r(T2)}}

"""Chapter 2: a particle in equilibrium, hanging from two strings (or one string and a force)."""
from math import sin, cos, radians
from .common import check, choice, codes, num, r, result

SCENE = {
    "id": "hanging-strings",
    "chapter": "Chapter 2: Statics",
    "title": "Particle on two strings",
    "blurb": "A particle hangs in equilibrium from two strings, or from a string and a force. Watch the pulls grow to balance the weight.",
    "covers": codes("2.1-2.2"),
    "params": [
        num("W", "Weight W", 100, "N"),
        num("alpha", "Angle of AC to the horizontal", 30, "°"),
        num("beta", "Angle of BC (or the force) to the horizontal", 45, "°"),
        choice("second", "The pull on the right is", "string", [["string", "a string BC"], ["force", "a force F"]]),
    ],
    "presets": [
        {"label": "Strings at 30° and 45°", "params": {"W": 100, "alpha": 30, "beta": 45, "second": "string"}},
        {"label": "Symmetric strings at 60°", "params": {"W": 100, "alpha": 60, "beta": 60, "second": "string"}},
        {"label": "String and a force F", "params": {"W": 29.4, "alpha": 60, "beta": 20, "second": "force"}},
    ],
}
N_FRAMES = 90


def solve(p):
    W, al, be = p["W"], radians(p["alpha"]), radians(p["beta"])
    force = p["second"] == "force"
    check(W > 0, "W must be greater than 0.")
    check(0 < p["alpha"] < 90 and 0 < p["beta"] < 90, "Both angles must be between 0° and 90°.")
    s = sin(al + be)
    T1 = W * cos(be) / s      # horizontal: T1 cos(a) = T2 cos(b);  vertical: T1 sin(a) + T2 sin(b) = W
    T2 = W * cos(al) / s
    second = "Force F" if force else "Tension in BC"
    frames = [{"k": r(i / (N_FRAMES - 1))} for i in range(N_FRAMES)]
    res = [result("Tension in AC", r(T1, 3), "N"), result("Tension in AC as a multiple of W", r(T1 / W, 4)),
           result(second, r(T2, 3), "N"), result(second + " as a multiple of W", r(T2 / W, 4)),
           result("Horizontal parts (equal)", r(T1 * cos(al), 3), "N"),
           result("Vertical parts add up to W", r(T1 * sin(al) + T2 * sin(be), 3), "N")]
    return {"dt": 1 / 45, "frames": frames, "results": res,
            "meta": {"W": W, "alpha": p["alpha"], "beta": p["beta"], "T1": r(T1), "T2": r(T2), "second": p["second"]}}

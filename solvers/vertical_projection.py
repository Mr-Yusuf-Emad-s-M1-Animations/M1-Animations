"""Chapter 1: a particle projected vertically upwards from A, which may be above the ground."""
from math import sqrt
from .common import check, codes, num, r, result, sample

SCENE = {
    "id": "vertical-projection",
    "chapter": "Chapter 1: Constant acceleration",
    "title": "Vertical projection",
    "blurb": "A stone is thrown straight up from A. If A is above the ground, it falls past A "
             "down to the ground. The velocity-time graph is a straight line of gradient -g.",
    "covers": codes("1.16-1.21"),
    "params": [
        num("u", "Launch speed u", 17.5, "m/s"),
        num("h", "Height of A above the ground (0 = lands at A)", 0, "m"),
        num("g", "Gravity g", 9.8, "m/s²"),
        num("level", "Marked height above A (0 = none)", 6.6, "m"),
    ],
    "presets": [
        {"label": "Stone thrown up at 17.5 m/s, lands back at A",
         "params": {"u": 17.5, "h": 0, "g": 9.8, "level": 6.6}},
        {"label": "Thrown up at 14 m/s from a 25 m cliff",
         "params": {"u": 14, "h": 25, "g": 9.8, "level": 0}},
        {"label": "Ball thrown up at 4.9 m/s from a 1.5 m high window",
         "params": {"u": 4.9, "h": 1.5, "g": 9.8, "level": 1}},
    ],
}


def solve(p):
    u, h, g, level = p["u"], p["h"], p["g"], p["level"]
    check(u > 0, "u must be greater than 0.")
    check(g > 0, "g must be greater than 0.")
    check(h >= 0 and level >= 0, "Heights cannot be negative.")
    H = u * u / (2 * g)                        # v^2 = u^2 - 2gs with v = 0
    t_top = u / g
    T = (u + sqrt(u * u + 2 * g * h)) / g      # s = -h:  -h = ut - g t^2 / 2
    frames, dt = sample(T, lambda t: {"t": r(t), "y": r(u * t - 0.5 * g * t * t), "v": r(u - g * t)})

    res = [result("Time to greatest height", r(t_top, 3), "s"),
           result("Greatest height above A", r(H, 3), "m")]
    if h > 0:
        res += [result("Greatest height above the ground", r(H + h, 3), "m"),
                result("Back at A after", r(2 * t_top, 3), "s"),
                result("Time to reach the ground", r(T, 3), "s"),
                result("Speed hitting the ground", r(sqrt(u * u + 2 * g * h), 3), "m/s")]
    else:
        res.append(result("Time of flight T", r(T, 3), "s"))
    if level > 0:
        if level < H:
            half = sqrt(u * u - 2 * g * level) / g
            res.append(result(f"Time above {level:g} m", r(2 * half, 3), "s"))
            res.append(result(f"Passes {level:g} m at", f"{r(t_top - half, 3)} s and {r(t_top + half, 3)} s"))
        else:
            res.append(result(f"Height {level:g} m", "never reached"))
    return {"dt": dt, "frames": frames, "results": res,
            "meta": {"H": r(H), "h": h, "u": u, "g": g, "level": level, "T": r(T)}}

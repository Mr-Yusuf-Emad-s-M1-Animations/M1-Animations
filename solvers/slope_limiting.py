"""Chapter 2: a particle on a rough slope held by a force P - friction flips at the limits."""
from math import sin, cos, radians
from .common import check, codes, choice, num, r, result

SCENE = {
    "id": "slope-limiting",
    "chapter": "Chapter 2: Statics",
    "title": "On the point of sliding",
    "blurb": "The force P grows steadily. While P is small the particle is about to slide DOWN and "
             "friction acts up the slope; when P is large it is about to slide UP and friction "
             "flips to act down the slope. Use the scrub bar as a slider for P.",
    "covers": codes("2.5", "2.8-2.10"),
    "params": [
        num("angle", "Slope angle θ", 30, "°", 1, 80, 1),
        num("m", "Mass", 5, "kg"),
        num("mu", "Coefficient of friction μ", 0.3, "", 0, 1.5, 0.01),
        choice("dir", "Direction of P", "parallel",
               [["parallel", "Up the slope (parallel to it)"], ["horizontal", "Horizontal, towards the slope"]]),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "P parallel to a 30° slope, μ = 0.3",
         "params": {"angle": 30, "m": 5, "mu": 0.3, "dir": "parallel", "g": 9.8}},
        {"label": "Horizontal force on a 25° slope, μ = 0.4",
         "params": {"angle": 25, "m": 2, "mu": 0.4, "dir": "horizontal", "g": 9.8}},
        {"label": "Rough enough to rest without P (μ = 0.8)",
         "params": {"angle": 20, "m": 4, "mu": 0.8, "dir": "parallel", "g": 9.8}},
    ],
}
N = 300


def solve(p):
    ang, m, mu, g, horiz = p["angle"], p["m"], p["mu"], p["g"], p["dir"] == "horizontal"
    check(0 < ang < 90, "The angle must be between 0° and 90°.")
    check(m > 0 and g > 0 and mu >= 0, "m and g must be greater than 0, and μ cannot be negative.")
    th = radians(ang)
    W = m * g
    c, s_ = (cos(th), sin(th)) if horiz else (1.0, 0.0)   # P's parts along / into the slope
    p_low = max(0.0, W * (sin(th) - mu * cos(th)) / (c + mu * s_))   # about to slide down
    den = c - mu * s_
    p_high = W * (sin(th) + mu * cos(th)) / den if den > 1e-9 else None   # about to slide up
    p_max = 1.25 * p_high if p_high else 3 * W

    frames = []
    for i in range(N + 1):
        P = p_max * i / N
        R = W * cos(th) + P * s_
        need = W * sin(th) - P * c          # friction needed UP the slope to balance
        lim = mu * R
        if abs(need) <= lim + 1e-9:
            F, state = need, "rest"
        else:
            F, state = (lim if need > 0 else -lim), ("down" if need > 0 else "up")
        frames.append({"P": r(P, 3), "F": r(F, 3), "R": r(R, 3), "lim": r(lim, 3), "state": state})

    res = [result("Weight component down the slope", r(W * sin(th), 3), "N"),
           result("P when about to slide down", r(p_low, 3) if p_low > 0 else "0 (rests without P)", "N" if p_low > 0 else ""),
           result("P when about to slide up", r(p_high, 3) if p_high else "never (too rough)", "N" if p_high else ""),
           result("Friction needed with P = 0", r(W * sin(th), 3), "N"),
           result("Greatest friction with P = 0 (μR)", r(mu * W * cos(th), 3), "N")]
    return {"dt": 6 / N, "frames": frames, "results": res,
            "meta": {"angle": ang, "W": r(W), "pLow": r(p_low), "pHigh": r(p_high) if p_high else None,
                     "pMax": r(p_max), "horiz": horiz}}

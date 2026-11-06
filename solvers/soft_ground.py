"""Chapter 4: an object falls onto soft ground and sinks in against a constant resistance."""
from math import sqrt
from .common import check, codes, num, r, result, sample

SCENE = {
    "id": "soft-ground",
    "chapter": "Chapter 4: Momentum",
    "title": "Sinking into soft ground",
    "blurb": "An object falls freely, hits soft ground and is brought to rest over a short "
             "distance by a constant resistance R. In the ground: weight down, R up, so "
             "R − mg = m × deceleration.",
    "covers": codes("4.12"),
    "params": [
        num("m", "Mass", 2, "kg"),
        num("h", "Height it falls from", 5, "m"),
        num("depth", "Depth it sinks into the ground", 0.15, "m"),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "2 kg falls 5 m and sinks 15 cm",
         "params": {"m": 2, "h": 5, "depth": 0.15, "g": 9.8}},
        {"label": "Pile driver: 500 kg falls 2.5 m, sinks 0.1 m",
         "params": {"m": 500, "h": 2.5, "depth": 0.1, "g": 9.8}},
    ],
}


def solve(p):
    m, h, dd, g = p["m"], p["h"], p["depth"], p["g"]
    check(m > 0 and h > 0 and dd > 0 and g > 0, "Every number must be greater than 0.")
    t1 = sqrt(2 * h / g)
    V = g * t1                                  # v^2 = 2gh
    dec = V * V / (2 * dd)                      # 0 = V^2 - 2 a d
    t2 = V / dec
    R = m * (g + dec)
    # time in the ground is tiny - show it slowed down 25x so you can see it
    slow = 25
    T = t1 + t2 * slow + 0.6

    def frame(t):
        if t <= t1:
            y, v, inside = h - 0.5 * g * t * t, g * t, False
        else:
            tau = min((t - t1) / slow, t2)
            y, v, inside = -(V * tau - 0.5 * dec * tau * tau), V - dec * tau, True
        return {"t": r(t), "y": r(y), "v": r(v), "in": inside}

    frames, dt = sample(T, frame)
    res = [result("Speed hitting the ground", r(V, 3), "m/s"),
           result("Deceleration in the ground", r(dec, 3), "m/s²"),
           result("Resistance R", r(R, 3), "N"),
           result("Time to stop in the ground", r(t2, 4), "s"),
           result("Impulse from the ground", r(m * V, 3), "N s")]
    return {"dt": dt, "frames": frames, "results": res,
            "meta": {"h": h, "depth": dd, "R": r(R), "W": r(m * g), "slow": slow, "V": r(V)}}

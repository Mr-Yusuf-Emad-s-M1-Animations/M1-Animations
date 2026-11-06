"""Chapter 1: two particles moving vertically at the same time, until they meet."""
from .common import check, codes, num, r, result, sample

SCENE = {
    "id": "vertical-meeting",
    "chapter": "Chapter 1: Constant acceleration",
    "title": "Two particles meet in mid-air",
    "blurb": "P is projected up from the ground. Q starts at a height h above, either at the same "
             "time or a little later. Both have acceleration g downwards, so the gap between them "
             "changes at a constant rate.",
    "covers": codes("1.23", "1.26"),
    "params": [
        num("u1", "P: speed projected upwards", 20, "m/s"),
        num("h", "Q: starting height", 30, "m"),
        num("u2", "Q: starting velocity (+ up, − down, 0 = dropped)", 0, "m/s"),
        num("delay", "Q starts this long after P", 0, "s"),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "P thrown up at 20 m/s as Q is dropped from 30 m",
         "params": {"u1": 20, "h": 30, "u2": 0, "delay": 0, "g": 9.8}},
        {"label": "Q thrown down at 5 m/s, 1 s after P",
         "params": {"u1": 25, "h": 40, "u2": -5, "delay": 1, "g": 9.8}},
        {"label": "Both thrown up, Q from a 10 m tower",
         "params": {"u1": 18, "h": 10, "u2": 6, "delay": 0, "g": 9.8}},
    ],
}


def solve(p):
    u1, h, u2, d, g = p["u1"], p["h"], p["u2"], p["delay"], p["g"]
    check(u1 > 0 and h > 0 and g > 0, "u1, h and g must be greater than 0.")
    check(d >= 0, "The delay cannot be negative.")

    def P(t):
        return u1 * t - 0.5 * g * t * t, u1 - g * t

    def Q(t):
        if t < d:
            return h, 0.0
        tau = t - d
        return h + u2 * tau - 0.5 * g * tau * tau, u2 - g * tau

    tP = 2 * u1 / g                                      # P back on the ground
    # Q reaches the ground: h + u2 tau - g tau^2 / 2 = 0
    tQ = d + (u2 + (u2 * u2 + 2 * g * h) ** 0.5) / g
    t_end = min(tP, tQ)
    # first time with yP >= yQ (they meet) - scan then bisect
    meet, steps = None, 4000
    for k in range(1, steps + 1):
        t = t_end * k / steps
        if P(t)[0] >= Q(t)[0]:
            lo, hi = t_end * (k - 1) / steps, t
            for _ in range(60):
                mid = (lo + hi) / 2
                lo, hi = (lo, mid) if P(mid)[0] >= Q(mid)[0] else (mid, hi)
            meet = hi
            break
    T = meet if meet is not None else t_end

    def frame(t):
        (yp, vp), (yq, vq) = P(t), Q(t)
        return {"t": r(t), "yP": r(max(yp, 0)), "vP": r(vp), "yQ": r(max(yq, 0)), "vQ": r(vq)}

    frames, dt = sample(T, frame)
    top = max(h + (u2 * u2 / (2 * g) if u2 > 0 else 0), u1 * u1 / (2 * g))
    if meet is not None:
        (yp, vp), (yq, vq) = P(meet), Q(meet)
        word = lambda v: "upwards" if v > 1e-9 else "downwards" if v < -1e-9 else "at rest"
        res = [result("They meet after", r(meet, 3), "s"),
               result("Height where they meet", r(yp, 3), "m"),
               result("Velocity of P then", f"{r(abs(vp), 3)} m/s {word(vp)}"),
               result("Velocity of Q then", f"{r(abs(vq), 3)} m/s {word(vq)}"),
               result("Closing speed (constant once both move)", r(abs(vp - vq), 3), "m/s")]
    else:
        res = [result("Do they meet?", "no: one reaches the ground first"),
               result("P lands after", r(tP, 3), "s"),
               result("Q lands after", r(tQ, 3), "s")]
    return {"dt": dt, "frames": frames, "results": res,
            "meta": {"top": r(top), "h": h, "meet": r(meet) if meet is not None else None,
                     "yMeet": r(P(meet)[0]) if meet is not None else None, "T": r(T),
                     "vmax": r(max(abs(u1), abs(u2), g * T + abs(u2)))}}

"""Chapter 1: one vehicle speeds up, cruises, then slows down (speed-time graph)."""
from .common import check, codes, num, r, result, sample_lapse

SCENE = {
    "id": "suvat-journey",
    "chapter": "Chapter 1: Constant acceleration",
    "title": "A journey in three stages",
    "blurb": "A car speeds up, travels at constant speed, then slows down. The speed-time graph "
             "draws as it moves; the shaded area is the distance. Watch the mid-point trap: "
             "half the distance is not reached at half the time.",
    "covers": codes("1.1-1.4", "1.6-1.10", "1.15"),
    "params": [
        num("u", "Starting speed u", 0, "m/s"),
        num("a1", "Acceleration in stage 1", 2, "m/s²"),
        num("t1", "Time of stage 1", 5, "s"),
        num("t2", "Time at constant speed", 10, "s"),
        num("a3", "Deceleration in stage 3", 1.5, "m/s²"),
        num("v_end", "Final speed", 0, "m/s"),
    ],
    "presets": [
        {"label": "From rest, cruise, back to rest",
         "params": {"u": 0, "a1": 2, "t1": 5, "t2": 10, "a3": 1.5, "v_end": 0}},
        {"label": "Train passing through: 12 m/s up to 20 m/s, then down to 8 m/s",
         "params": {"u": 12, "a1": 0.8, "t1": 10, "t2": 15, "a3": 1.2, "v_end": 8}},
        {"label": "Speeds up then brakes at once (no cruise)",
         "params": {"u": 0, "a1": 3, "t1": 6, "t2": 0, "a3": 4.5, "v_end": 0}},
    ],
}


def solve(p):
    u, a1, t1, t2, a3, ve = p["u"], p["a1"], p["t1"], p["t2"], p["a3"], p["v_end"]
    check(u >= 0 and ve >= 0, "Speeds cannot be negative.")
    check(t1 > 0 and t2 >= 0, "Stage 1 must last more than 0 s; the constant-speed stage cannot be negative.")
    V = u + a1 * t1                                 # v = u + at
    check(V > 0, "The car must be moving after stage 1. Make a1 larger.")
    check(a3 > 0, "The deceleration must be greater than 0.")
    check(ve <= V, "The final speed must be less than the top speed.")
    t3 = (V - ve) / a3
    s1 = (u + V) / 2 * t1                           # s = (u + v)t / 2
    s2 = V * t2
    s3 = (V + ve) / 2 * t3
    T, D = t1 + t2 + t3, s1 + s2 + s3

    def state(t):
        if t <= t1:
            return u * t + 0.5 * a1 * t * t, u + a1 * t
        if t <= t1 + t2:
            return s1 + V * (t - t1), V
        tau = min(t - t1 - t2, t3)
        return s1 + s2 + V * tau - 0.5 * a3 * tau * tau, V - a3 * tau

    # time at which half the distance is covered (bisection: x(t) is increasing)
    lo, hi = 0.0, T
    for _ in range(60):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if state(mid)[0] < D / 2 else (lo, mid)
    t_half_d = (lo + hi) / 2
    x_half_t = state(T / 2)[0]

    frames, dt, speedup = sample_lapse(T, lambda t: dict(zip(("t", "x", "v"), (r(t), *map(r, state(t))))))
    res = [result("Top speed V", r(V, 3), "m/s"),
           result("Distance in stage 1", r(s1, 3), "m"),
           result("Distance at constant speed", r(s2, 3), "m"),
           result("Time of stage 3", r(t3, 3), "s"),
           result("Distance in stage 3", r(s3, 3), "m"),
           result("Total distance", r(D, 3), "m"),
           result("Total time", r(T, 3), "s"),
           result("Average speed", r(D / T, 3), "m/s"),
           result("Half the distance reached at", r(t_half_d, 3), "s"),
           result("Distance at half the time", r(x_half_t, 3), "m")]
    if speedup > 1:
        res.append(result("Playback", f"time-lapse, {r(speedup, 1)} times faster than real time"))
    return {"dt": dt, "frames": frames, "results": res,
            "meta": {"T": r(T), "D": r(D), "V": r(V), "t1": t1, "t2": t2, "t3": r(t3),
                     "tHalfD": r(t_half_d), "xHalfT": r(x_half_t)}}

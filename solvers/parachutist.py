"""Chapter 1: free fall, then a constant deceleration, then a steady speed (parachutist)."""
from .common import check, codes, num, r, result, sample

SCENE = {
    "id": "parachutist",
    "chapter": "Chapter 1: Constant acceleration",
    "title": "Parachutist",
    "blurb": "A parachutist falls freely, opens the parachute and slows down at a constant rate, "
             "then falls at a steady speed to the ground. Down is positive.",
    "covers": codes("1.25"),
    "params": [
        num("H", "Starting height", 200, "m"),
        num("t1", "Time in free fall", 3, "s"),
        num("d", "Deceleration with the parachute open", 4, "m/s²"),
        num("V", "Steady speed to the ground", 5, "m/s"),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "Free fall for 3 s, slows at 4 m/s² to 5 m/s",
         "params": {"H": 200, "t1": 3, "d": 4, "V": 5, "g": 9.8}},
        {"label": "Free fall for 2 s from 150 m, slows at 6 m/s² to 4 m/s",
         "params": {"H": 150, "t1": 2, "d": 6, "V": 4, "g": 9.8}},
    ],
}


def solve(p):
    H, t1, d, V, g = p["H"], p["t1"], p["d"], p["V"], p["g"]
    check(H > 0 and t1 > 0 and d > 0 and V > 0 and g > 0, "Every number must be greater than 0.")
    v1 = g * t1                                  # v = u + at from rest
    s1 = 0.5 * g * t1 * t1
    check(V < v1, "The steady speed must be less than the speed when the parachute opens "
                  f"({v1:.3g} m/s).")
    t2 = (v1 - V) / d
    s2 = (v1 * v1 - V * V) / (2 * d)             # v^2 = u^2 + 2as
    s3 = H - s1 - s2
    check(s3 >= 0, f"The parachutist hits the ground before reaching the steady speed "
                   f"(needs {s1 + s2:.4g} m). Start higher or open the parachute sooner.")
    t3 = s3 / V
    T = t1 + t2 + t3

    def state(t):
        if t <= t1:
            return 0.5 * g * t * t, g * t
        if t <= t1 + t2:
            tau = t - t1
            return s1 + v1 * tau - 0.5 * d * tau * tau, v1 - d * tau
        return s1 + s2 + V * (t - t1 - t2), V

    def frame(t):
        s, v = state(t)
        return {"t": r(t), "y": r(max(H - s, 0)), "v": r(v)}

    frames, dt = sample(T, frame, fps=30)
    res = [result("Speed when the parachute opens", r(v1, 3), "m/s"),
           result("Distance in free fall", r(s1, 3), "m"),
           result("Time slowing down", r(t2, 3), "s"),
           result("Distance slowing down", r(s2, 3), "m"),
           result("Time at steady speed", r(t3, 3), "s"),
           result("Total time to the ground", r(T, 3), "s")]
    return {"dt": dt, "frames": frames, "results": res,
            "meta": {"H": H, "t1": t1, "t2": r(t2), "v1": r(v1), "V": V, "T": r(T)}}

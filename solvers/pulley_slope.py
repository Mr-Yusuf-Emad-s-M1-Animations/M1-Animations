"""Chapter 3: a particle on a rough slope joined over a pulley to a hanging particle."""
from math import sin, cos, sqrt, radians
from .common import codes, FPS, MAX_SECONDS, check, num, r, result, bounce_hops, bounce_height

SCENE = {
    "id": "pulley-slope",
    "chapter": "Chapter 3: Dynamics",
    "title": "Pulley and rough slope",
    "blurb": "A particle on a rough slope is joined over a pulley to a hanging particle. If the "
             "hanging particle descends, it can land on the ground and bounce.",
    "covers": codes("3.15", "3.17", "3.21"),
    "params": [
        num("angle", "Slope angle θ", 30, "°"),
        num("m1", "Mass on the slope", 3, "kg"),
        num("m2", "Hanging mass", 4, "kg"),
        num("mu", "Coefficient of friction μ", 0.3, ""),
        num("run", "Distance the particles move", 2, "m"),
        num("h", "Height of the hanging mass above the ground (if it descends)", 1.2, "m"),
        num("cor", "Bounciness of the hanging mass (coefficient of restitution)", 0.5, ""),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "Hanging mass pulls the slope particle up (4 kg and 3 kg)",
         "params": {"angle": 30, "m1": 3, "m2": 4, "mu": 0.3, "run": 2, "h": 1.2, "cor": 0.5, "g": 9.8}},
        {"label": "Slope particle slides down (6 kg and 2 kg)",
         "params": {"angle": 30, "m1": 6, "m2": 2, "mu": 0.1, "run": 2, "h": 1.2, "cor": 0.5, "g": 9.8}},
        {"label": "Everything stays still (limiting friction is enough)",
         "params": {"angle": 30, "m1": 4, "m2": 2.5, "mu": 0.4, "run": 2, "h": 1.2, "cor": 0.5, "g": 9.8}},
    ],
}


def solve(p):
    ang, m1, m2, mu, run, h, cor, g = (p["angle"], p["m1"], p["m2"], p["mu"], p["run"],
                                        p["h"], p["cor"], p["g"])
    check(0 < ang < 90, "The angle must be between 0° and 90°.")
    check(m1 > 0 and m2 > 0 and run > 0 and h > 0 and g > 0,
          "Masses, the distance, h and g must be greater than 0.")
    check(mu >= 0, "μ cannot be negative.")
    check(0 <= cor < 1, "Bounciness must be between 0 (no bounce) and just under 1.")
    th = radians(ang)
    N = m1 * g * cos(th)
    drive = m2 * g - m1 * g * sin(th)         # net pull along the string, before friction
    meta = {"angle": ang, "run": run, "m1": m1, "m2": m2}
    if abs(drive) <= mu * N:
        return {"dt": 1 / FPS, "frames": [{"t": 0, "s": 0, "v": 0, "drop": 0, "slack": False}],
                "results": [result("Motion", "stays at rest"),
                            result("Friction needed", r(abs(drive), 3), "N"),
                            result("Greatest friction available μN", r(mu * N, 3), "N"),
                            result("Tension T", r(m2 * g, 3), "N")], "meta": meta}
    up = drive > 0                             # True: hanging mass goes down, slope particle goes up
    a = (abs(drive) - mu * N) / (m1 + m2)
    T = m2 * (g - a) if up else m2 * (g + a)
    landed = up and h < run                    # does the hanging mass reach the ground before 'run'?

    if not landed:
        t_end = sqrt(2 * run / a)
        check(t_end <= MAX_SECONDS, "The motion lasts more than 60 s.")
        sgn = 1 if up else -1
        frames = []
        for i in range(int(t_end * FPS) + 2):
            t = min(i / FPS, t_end)
            s = sgn * 0.5 * a * t * t
            frames.append({"t": r(t), "s": r(s), "v": r(sgn * a * t), "drop": r(s), "slack": False})
        res = [result("Direction", "slope particle moves up, hanging mass moves down" if up
                      else "slope particle moves down, hanging mass moves up"),
               result("Acceleration a", r(a, 3), "m/s²"),
               result("Tension T", r(T, 3), "N"),
               result("Friction force μN", r(mu * N, 3), "N"),
               result(f"Speed after {run:g} m", r(a * t_end, 3), "m/s")]
        meta.update(h=h, cor=cor)
        return {"dt": 1 / FPS, "frames": frames, "results": res, "meta": meta}

    # The hanging mass lands before the slope particle has travelled 'run'. After that the
    # string goes slack: the slope particle continues alone, slowed by both gravity along the
    # slope and friction, while the hanging mass bounces on the ground.
    t1 = sqrt(2 * h / a)
    v1 = a * t1
    dec = g * sin(th) + mu * g * cos(th)      # both now oppose the slope particle's motion
    rem = run - h
    if v1 * v1 / (2 * dec) < rem:
        t2, s_end, v_end = v1 / dec, h + v1 * v1 / (2 * dec), 0.0
        outcome = f"slides {r(v1 * v1 / (2 * dec), 3)} m further, then stops"
    else:
        v_end = sqrt(v1 * v1 - 2 * dec * rem)
        t2, s_end = (v1 - v_end) / dec, run
        outcome = f"reaches {run:g} m at {r(v_end, 3)} m/s"

    hops, hop_rest = bounce_hops(v1, g, cor, t_start=t1)
    total = max(t1 + t2, hop_rest)
    check(total <= MAX_SECONDS, "The motion lasts more than 60 s.")

    frames = []
    for i in range(int(total * FPS) + 2):
        t = min(i / FPS, total)
        if t <= t1:
            s, v, drop = 0.5 * a * t * t, a * t, 0.5 * a * t * t
            slack = False
        else:
            tau = t - t1
            s = min(h + v1 * tau - 0.5 * dec * tau * tau, s_end)
            v = max(v1 - dec * tau, 0)
            height, _ = bounce_height(hops, t, g)
            drop = h - height
            slack = True
        frames.append({"t": r(t), "s": r(s), "v": r(v), "drop": r(max(drop, 0)), "slack": slack})

    res = [result("Direction", "slope particle moves up, hanging mass moves down"),
           result("Acceleration a", r(a, 3), "m/s²"),
           result("Tension T", r(T, 3), "N"),
           result("Friction force μN", r(mu * N, 3), "N"),
           result("Speed when the hanging mass lands", r(v1, 3), "m/s"),
           result("Then the slope particle", outcome)]
    if cor > 0:
        res.append(result("Bounciness of the hanging mass", r(cor, 2)))
    else:
        res.append(result("The hanging mass", "stays on the ground once it lands"))
    meta.update(h=h, cor=cor)
    return {"dt": 1 / FPS, "frames": frames, "results": res, "meta": meta}

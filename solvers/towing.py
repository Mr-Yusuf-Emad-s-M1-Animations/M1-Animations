"""Chapter 3: a car pulling a trailer with a rod or a string (tension and thrust)."""
from .common import codes, FPS, MAX_SECONDS, check, num, choice, r, result

SCENE = {
    "id": "towing",
    "chapter": "Chapter 3: Dynamics",
    "title": "Car and trailer",
    "blurb": "Connected particles on a road. A rod can pull (tension) or push (thrust). A string "
             "can only pull: ask it to push and it goes slack, and the trailer is on its own.",
    "covers": codes("3.7", "3.14"),
    "params": [
        num("M", "Mass of the car", 1000, "kg"),
        num("m", "Mass of the trailer", 400, "kg"),
        num("D", "Driving force on the car", 2400, "N"),
        num("Rc", "Resistance on the car", 400, "N"),
        num("Rt", "Resistance on the trailer", 200, "N"),
        num("u0", "Starting speed", 0, "m/s"),
        num("time", "Time to show", 6, "s"),
        choice("link", "The car and trailer are joined by", "rod",
               [["rod", "a rod"], ["string", "a string"]]),
    ],
    "presets": [
        {"label": "Accelerating: the connection is in tension",
         "params": {"M": 1000, "m": 400, "D": 2400, "Rc": 400, "Rt": 200, "u0": 0, "time": 6, "link": "rod"}},
        {"label": "Slowing down: the rod is in thrust",
         "params": {"M": 1000, "m": 400, "D": 0, "Rc": 1000, "Rt": 150, "u0": 15, "time": 6, "link": "rod"}},
        {"label": "String goes slack: the car stops, the trailer rolls on",
         "params": {"M": 1000, "m": 400, "D": 0, "Rc": 1000, "Rt": 100, "u0": 4, "time": 6, "link": "string"}},
    ],
}


def solve(p):
    M, m, D, Rc, Rt, u0, time = p["M"], p["m"], p["D"], p["Rc"], p["Rt"], p["u0"], p["time"]
    check(M > 0 and m > 0, "Both masses must be greater than 0.")
    check(Rc >= 0 and Rt >= 0 and u0 >= 0, "Resistances and the starting speed cannot be negative.")
    check(0 < time <= MAX_SECONDS, "Time must be between 0 and 60 s.")
    a_joint = (D - Rc - Rt) / (M + m)      # if they stay joined, this is the whole system's acceleration
    T = m * a_joint + Rt                   # trailer alone, joined:  T - Rt = m a  (negative means thrust)
    meta = {"M": M, "m": m, "D": D, "Rc": Rc, "Rt": Rt, "link": p["link"]}

    if p["link"] == "string" and T < 0:
        # A string cannot push, so it goes slack straight away: the car and trailer move
        # independently from the start, each under its own forces alone. Without the rod's
        # thrust to hold it back, the trailer always ends up decelerating less than the car,
        # so it gradually creeps ahead rather than being left behind.
        a_car = (D - Rc) / M
        a_trailer = -Rt / m                # only resistance acts on the free trailer
        t_end = time
        if u0 > 0 and a_car < 0:
            t_end = min(t_end, u0 / -a_car)          # the car itself comes to rest
        check(t_end <= MAX_SECONDS, "The motion lasts more than 60 s.")
        t_stop = (u0 / -a_trailer) if (a_trailer < 0 and u0 > 0) else None

        def trailer_state(t):
            if t_stop is not None and t >= t_stop:
                return (u0 * t_stop + 0.5 * a_trailer * t_stop * t_stop, 0.0)
            return (u0 * t + 0.5 * a_trailer * t * t, u0 + a_trailer * t)

        frames = []
        for i in range(int(t_end * FPS) + 2):
            t = min(i / FPS, t_end)
            xt, vt = trailer_state(t)
            frames.append({"t": r(t), "x": r(u0 * t + 0.5 * a_car * t * t), "v": r(u0 + a_car * t),
                           "xt": r(xt), "vt": r(vt), "separated": True})
        xtE, vtE = trailer_state(t_end)
        xcE = u0 * t_end + 0.5 * a_car * t_end * t_end
        res = [result("The string goes slack", "it can only pull, not push, so the trailer is on its own"),
               result("Car's acceleration", r(a_car, 3), "m/s²"),
               result("Trailer's acceleration (resistance only)", r(a_trailer, 3), "m/s²")]
        if t_stop is not None and t_stop <= t_end + 1e-9:
            res.append(result("Trailer comes to rest after", r(t_stop, 3), "s"))
            xs, _ = trailer_state(t_stop)
            res.append(result("Trailer's stopping distance", r(xs, 3), "m"))
        res.append(result("Without the rod's thrust, the trailer gains on the car by",
                          r(max(xtE - xcE, 0), 3), "m (a rod would be needed here)"))
        meta["T"] = 0
        meta["separated"] = True
        return {"dt": 1 / FPS, "frames": frames, "results": res, "meta": meta}

    meta["separated"] = False
    if u0 == 0 and a_joint <= 0:
        meta["T"] = 0
        return {"dt": 1 / FPS, "frames": [{"t": 0, "x": 0, "v": 0}], "meta": meta,
                "results": [result("Motion", "the car does not move (driving force too small)")]}
    t_end = min(time, u0 / -a_joint) if a_joint < 0 else time
    meta["T"] = r(T)
    frames = []
    for i in range(int(t_end * FPS) + 2):
        t = min(i / FPS, t_end)
        frames.append({"t": r(t), "x": r(u0 * t + 0.5 * a_joint * t * t), "v": r(u0 + a_joint * t)})
    kind = "tension" if T >= 0 else "thrust"
    res = [result("Acceleration a", r(a_joint, 3), "m/s²"),
           result(f"Force in the {p['link']}", f"{r(abs(T), 2)} N ({kind})"),
           result("Speed at the end", r(u0 + a_joint * t_end, 3), "m/s"),
           result("Distance travelled", r(u0 * t_end + 0.5 * a_joint * t_end ** 2, 3), "m")]
    return {"dt": 1 / FPS, "frames": frames, "results": res, "meta": meta}

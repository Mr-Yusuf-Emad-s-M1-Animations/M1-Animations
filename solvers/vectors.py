"""Chapter 6: vectors. Two particles move with constant velocity vectors from
given position vectors. Find their speeds and bearings, and the time and
distance of closest approach (a collision if that distance is ~0)."""
import math
from .common import codes, FPS, MAX_SECONDS, check, num, r, result

SCENE = {
    "id": "vectors",
    "chapter": "Chapter 6: Vectors",
    "title": "Position vectors: closest approach",
    "blurb": "Two particles move with constant velocity from given position vectors "
             "r = (x0 i + y0 j) + t(vx i + vy j). Watch for the moment they are closest.",
    "covers": codes("6.11", "6.13-6.19"),
    "params": [
        num("x0a", "A: initial x0", 0, "m"),
        num("y0a", "A: initial y0", 0, "m"),
        num("vxa", "A: velocity vx", 3, "m/s"),
        num("vya", "A: velocity vy", 4, "m/s"),
        num("x0b", "B: initial x0", 30, "m"),
        num("y0b", "B: initial y0", 0, "m"),
        num("vxb", "B: velocity vx", -2, "m/s"),
        num("vyb", "B: velocity vy", 3, "m/s"),
    ],
    "presets": [
        {"label": "Paths cross but they miss each other",
         "params": {"x0a": 0, "y0a": 0, "vxa": 3, "vya": 4,
                    "x0b": 30, "y0b": 0, "vxb": -2, "vyb": 3}},
        {"label": "The particles collide",
         "params": {"x0a": 0, "y0a": 0, "vxa": 4, "vya": 2,
                    "x0b": 20, "y0b": 20, "vxb": -1, "vyb": -3}},
    ],
}
COLLISION_TOL = 0.4  # m: treat "closest distance" under this as a collision


def bearing(vx, vy):
    return (math.degrees(math.atan2(vx, vy))) % 360


def solve(p):
    x0a, y0a, vxa, vya = p["x0a"], p["y0a"], p["vxa"], p["vya"]
    x0b, y0b, vxb, vyb = p["x0b"], p["y0b"], p["vxb"], p["vyb"]
    speedA = math.hypot(vxa, vya)
    speedB = math.hypot(vxb, vyb)
    check(speedA > 0, "A must be moving: vx and vy cannot both be 0.")
    check(speedB > 0, "B must be moving: vx and vy cannot both be 0.")

    rx, ry = x0b - x0a, y0b - y0a          # B's position vector relative to A, at t = 0
    dvx, dvy = vxb - vxa, vyb - vya        # B's velocity relative to A
    speed2 = dvx * dvx + dvy * dvy

    if speed2 > 1e-9:
        t_star = max(0.0, -(rx * dvx + ry * dvy) / speed2)
    else:
        t_star = 0.0                       # same velocity: the distance never changes

    def dist(t):
        return math.hypot(rx + dvx * t, ry + dvy * t)

    d_min = dist(t_star)
    collide = d_min < COLLISION_TOL

    # if they collide, the motion ends at the collision; otherwise run on past the closest approach
    T = t_star if collide and t_star > 0 else max(t_star * 1.6, 4.0) + 1.0
    check(T <= MAX_SECONDS, "This motion lasts more than 60 s. Try smaller numbers.")

    frames = []
    for i in range(int(T * FPS) + 2):
        t = min(i / FPS, T)
        xa, ya = x0a + vxa * t, y0a + vya * t
        xb, yb = x0b + vxb * t, y0b + vyb * t
        frames.append({"t": r(t), "xa": r(xa), "ya": r(ya), "xb": r(xb), "yb": r(yb),
                       "d": r(math.hypot(xb - xa, yb - ya))})

    res = [result("Speed of A", r(speedA, 3), "m/s"),
           result("Bearing of A", r(bearing(vxa, vya), 1), "°"),
           result("Speed of B", r(speedB, 3), "m/s"),
           result("Bearing of B", r(bearing(vxb, vyb), 1), "°"),
           result("They collide at" if collide else "Time of closest approach", r(t_star, 3), "s")]
    if not collide:
        res.append(result("Least distance apart", r(d_min, 3), "m"))
    return {"dt": 1 / FPS, "frames": frames, "results": res,
            "meta": {"x0a": x0a, "y0a": y0a, "vxa": vxa, "vya": vya,
                     "x0b": x0b, "y0b": y0b, "vxb": vxb, "vyb": vyb,
                     "t_star": r(t_star), "d_min": r(d_min), "collide": collide, "T": r(T)}}

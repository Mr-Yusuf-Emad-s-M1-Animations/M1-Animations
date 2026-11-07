"""Chapter 5: a beam resting on supports, hanging from ropes, or held by a bolt, with weights on it."""
from .common import check, choice, codes, num, r, result

KINDS = [["support", "a support (pushes up)"], ["rope", "a rope (pulls up)"], ["bolt", "a bolt (pulls or pushes)"], ["none", "nothing"]]
NAMES = [[n, n] for n in "ABCDPQ"]

SCENE = {
    "id": "beam",
    "chapter": "Chapter 5: Moments",
    "title": "Beam on supports, ropes or a bolt",
    "blurb": "A beam with up to two supports, ropes or a bolt, a beam that can be non-uniform, and up to three loads. One load can move along the beam. Find the reactions, when the beam tips, and how much force a rope can take.",
    "covers": codes("5.1-5.9"),
    "params": [
        num("L", "Length of beam AB", 6, "m"),
        num("M", "Mass of beam", 40, "kg"),
        num("G", "Centre of mass of the beam, from A (half of L if uniform)", 3, "m"),
        num("g", "Gravity g", 9.8, "m/s²"),
        choice("n1", "First support is called", "C", NAMES),
        num("s1", "First support: distance from A", 1, "m"),
        choice("k1", "First support is", "support", KINDS),
        choice("n2", "Second support is called", "D", NAMES),
        num("s2", "Second support: distance from A", 4, "m"),
        choice("k2", "Second support is", "support", KINDS),
        num("m1", "Moving load: mass (0 = none)", 80, "kg"),
        num("x_from", "Moving load starts at (from A)", 2, "m"),
        num("x_to", "Moving load ends at (from A)", 4.5, "m"),
        num("m2", "Load 2: mass (0 = none, negative = pulls up)", 0, "kg"),
        num("x2", "Load 2: distance from A", 0, "m"),
        num("m3", "Load 3: mass (0 = none, negative = pulls up)", 0, "kg"),
        num("x3", "Load 3: distance from A", 0, "m"),
        num("limit", "Most force a rope or bolt can take (0 = no limit)", 0, "N"),
        num("pivot", "Find moments about this point, from A (-1 = none)", -1, "m"),
    ],
    "presets": [
        {"label": "Man walks along a beam on two supports",
         "params": {"L": 6, "M": 40, "G": 3, "g": 9.8, "n1": "C", "s1": 1, "k1": "support", "n2": "D", "s2": 4, "k2": "support",
                    "m1": 80, "x_from": 2, "x_to": 4.5, "m2": 0, "x2": 0, "m3": 0, "x3": 0, "limit": 0, "pivot": -1}},
        {"label": "Beam hanging from two ropes, man standing on it",
         "params": {"L": 5, "M": 24, "G": 2.5, "g": 9.8, "n1": "C", "s1": 1, "k1": "rope", "n2": "B", "s2": 5, "k2": "rope",
                    "m1": 50, "x_from": 3, "x_to": 3, "m2": 0, "x2": 0, "m3": 0, "x3": 0, "limit": 0, "pivot": -1}},
        {"label": "Platform held down by a bolt at A",
         "params": {"L": 3, "M": 20, "G": 1.5, "g": 9.8, "n1": "A", "s1": 0, "k1": "bolt", "n2": "C", "s2": 0.5, "k2": "support",
                    "m1": 40, "x_from": 3, "x_to": 3, "m2": 0, "x2": 0, "m3": 0, "x3": 0, "limit": 3000, "pivot": -1}},
        {"label": "Non-uniform rod on two strings, particle moves",
         "params": {"L": 5, "M": 10.204, "G": 2, "g": 9.8, "n1": "A", "s1": 0, "k1": "rope", "n2": "B", "s2": 5, "k2": "rope",
                    "m1": 5.102, "x_from": 0, "x_to": 5, "m2": 0, "x2": 0, "m3": 0, "x3": 0, "limit": 80, "pivot": -1}},
    ],
}
N = 150
INF = float("inf")


def leq(cons):
    """Solve a list of  k x + c <= 0  for x. Returns (lo, hi, empty)."""
    lo, hi, empty = -INF, INF, False
    for k, c in cons:
        if abs(k) < 1e-12:
            if c > 1e-9:
                empty = True
        elif k > 0:
            hi = min(hi, -c / k)
        else:
            lo = max(lo, -c / k)
    return lo, hi, empty or lo > hi + 1e-9


def solve(p):
    L, M, G, g = p["L"], p["M"], p["G"], p["g"]
    m1, xa, xb, m2, x2, m3, x3 = p["m1"], p["x_from"], p["x_to"], p["m2"], p["x2"], p["m3"], p["x3"]
    limit, pivot = p["limit"], p["pivot"]
    sup = [{"name": n, "pos": s, "kind": k} for n, s, k in ((p["n1"], p["s1"], p["k1"]), (p["n2"], p["s2"], p["k2"])) if k != "none"]
    check(L > 0 and g > 0, "L and g must be greater than 0.")
    check(M >= 0, "The mass of the beam cannot be negative.")
    check(0 <= G <= L, "The centre of mass of the beam must be on the beam (0 to L).")
    check(all(0 <= s["pos"] <= L for s in sup), "Every support must be on the beam (0 to L).")
    check(all(0 <= x <= L for x in (xa, xb, x2, x3)), "Every load must be on the beam (0 to L).")
    check(limit >= 0, "The most force a rope can take cannot be negative.")
    check(pivot < 0 or pivot <= L, "The point for moments must be on the beam (0 to L), or -1 for none.")
    check(M > 0 or m1 != 0 or m2 != 0 or m3 != 0, "Put at least one weight on the beam.")
    if len(sup) == 2:
        check(sup[0]["pos"] != sup[1]["pos"], "The two supports must be at different places.")
        if sup[0]["pos"] > sup[1]["pos"]:
            sup.reverse()
    n = len(sup)

    def loads(x, moving=True):
        ld = [(M * g, G), (m1 * g if moving else 0.0, x), (m2 * g, x2), (m3 * g, x3)]
        return [(w, pos) for w, pos in ld if w != 0]

    def eq(x):
        ld = loads(x)
        Wt = sum(w for w, _ in ld)
        tol = 1e-9 * max(1.0, abs(Wt))
        if n == 0:
            return {"R": [], "Wt": Wt, "tip": "", "lim": ""}
        if n == 1:
            tau = sum(w * (pos - sup[0]["pos"]) for w, pos in ld)
            tip = "" if abs(tau) <= 1e-9 * max(1.0, abs(Wt) * L) else ("B" if tau > 0 else "A")
            return {"R": [Wt], "Wt": Wt, "tip": tip, "lim": "", "tau": tau}
        s1p, s2p = sup[0]["pos"], sup[1]["pos"]
        R2 = sum(w * (pos - s1p) for w, pos in ld) / (s2p - s1p)
        R1 = Wt - R2
        if abs(R1) <= tol:
            R1 = 0.0
        if abs(R2) <= tol:
            R2 = 0.0
        tip, atlim = "", ""
        if R1 < 0 and sup[0]["kind"] != "bolt":
            tip, R1, R2 = sup[0]["name"], 0.0, Wt
        elif R2 < 0 and sup[1]["kind"] != "bolt":
            tip, R1, R2 = sup[1]["name"], Wt, 0.0
        elif R1 == 0 and sup[0]["kind"] != "bolt":
            atlim = sup[0]["name"]
        elif R2 == 0 and sup[1]["kind"] != "bolt":
            atlim = sup[1]["name"]
        return {"R": [R1, R2], "Wt": Wt, "tip": tip, "lim": atlim}

    frames, fmax = [], 0.0
    for i in range(N + 1):
        x = xa + (xb - xa) * i / N
        e = eq(x)
        R1 = e["R"][0] if n > 0 else 0.0
        R2 = e["R"][1] if n > 1 else 0.0
        over = limit > 0 and any(abs(v) > limit + 1e-9 for v, sp in zip(e["R"], sup) if sp["kind"] != "support")
        fmax = max(fmax, abs(R1), abs(R2), max([abs(w) for w, _ in loads(x)] or [0.0]))
        frames.append({"x": r(x), "R1": r(R1, 3), "R2": r(R2, 3), "tip": e["tip"], "over": over})

    e = eq(xb)
    res = []
    for j, s in enumerate(sup):
        R = e["R"][j]
        if s["kind"] == "rope":
            label = f"Tension in the rope at {s['name']}"
        elif s["kind"] == "bolt":
            label = f"Force at {s['name']} (bolt)"
        else:
            label = f"Reaction at {s['name']}"
        if s["kind"] == "bolt" and R < -1e-9:
            res.append(result(label, f"{r(-R, 2)} N downwards"))
        else:
            res.append(result(label, r(R, 2), "N"))
    if n == 1:
        res.append(result(f"Moments about {sup[0]['name']}", "balanced" if not e["tip"] else f"not balanced: end {e['tip']} goes down"))
    if e["tip"] and n == 2:
        res.append(result("The beam", f"tips: it lifts off at {e['tip']}"))
    elif e["lim"]:
        res.append(result("The beam", f"is on the point of lifting off at {e['lim']}"))
    res.append(result("Total weight on the supports", r(e["Wt"], 2), "N"))

    if pivot >= 0:
        tot = 0.0
        for w, pos in loads(xb):
            mom = w * (pos - pivot)
            tot += mom
            res.append(result(f"Moment of the {r(abs(w), 3):g} N {'downward' if w > 0 else 'upward'} force at {r(pos, 3):g} m", r(mom, 3), "N m"))
        res.append(result(f"Resultant moment about {pivot:g} m from A (clockwise is +)", r(tot, 3), "N m"))

    if m1 != 0 and n == 2:
        s1p, s2p = sup[0]["pos"], sup[1]["pos"]
        others = loads(xb, moving=False)
        W0 = sum(w for w, _ in others)
        F0 = sum(w * (pos - s1p) for w, pos in others)
        W1 = m1 * g
        gap = s2p - s1p

        def constraints(a2, b2, a1, b1):
            """k v + c <= 0 for the supports, where R1 = a1 + b1 v and R2 = a2 + b2 v."""
            out = []
            for (a, b), s in (((a1, b1), sup[0]), ((a2, b2), sup[1])):
                if s["kind"] != "bolt":
                    out.append((-b, -a))
                if limit > 0 and s["kind"] != "support":        # only a rope or a bolt can break
                    out.append((b, a - limit))
                    if s["kind"] == "bolt":
                        out.append((-b, -a - limit))
            return out

        # where on the beam can the moving load be?
        b2 = W1 / gap
        a2 = (F0 - W1 * s1p) / gap
        lo, hi, empty = leq(constraints(a2, b2, W0 + W1 - a2, -b2) + [(1.0, -L), (-1.0, 0.0)])
        res.append(result("Moving load is safe for x between", "never" if empty else f"{r(lo, 3)} m and {r(hi, 3)} m"))
        # how heavy can it be, at its final position?
        if m1 > 0:
            b2 = g * (xb - s1p) / gap
            a2 = F0 / gap
            lo, hi, empty = leq(constraints(a2, b2, W0 - a2, g - b2) + [(-1.0, 0.0)])
            if empty:
                res.append(result("Greatest mass of the moving load", "none"))
            elif hi == INF:
                res.append(result("Greatest mass of the moving load", "no limit"))
            else:
                res.append(result("Greatest mass of the moving load", r(hi, 3), "kg"))

    return {"dt": 1 / 60, "frames": frames, "results": res,
            "meta": {"L": L, "G": G, "M": M, "g": g, "n": n, "limit": limit, "fmax": r(fmax, 3),
                     "sup": [{"name": s["name"], "pos": s["pos"], "kind": s["kind"]} for s in sup],
                     "loads": [{"m": m, "x": x} for m, x in ((m2, x2), (m3, x3)) if m != 0],
                     "m1": m1, "pivot": pivot}}

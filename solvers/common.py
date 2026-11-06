"""Shared helpers for every scene solver."""

FPS = 60            # frames per second of simulated time
MAX_SECONDS = 60    # refuse motions longer than this


class InputError(ValueError):
    """Raised when the numbers a user typed cannot make a valid scene."""


def check(condition, message):
    if not condition:
        raise InputError(message)


def r(x, n=4):
    return round(x + 0.0, n)


def num(key, label, default, unit="", lo=None, hi=None, step=None):
    """A number input. Give lo and hi to also show a slider."""
    d = {"key": key, "label": label, "default": default, "unit": unit}
    if lo is not None and hi is not None:
        d["slider"] = {"lo": lo, "hi": hi, "step": step or (hi - lo) / 100}
    return d


def codes(*parts):
    """codes("1.16-1.21", "2.12") -> ["1.16", "1.17", ..., "1.21", "2.12"]
    The question-type numbers a scene covers (used by the search bar)."""
    out = []
    for p in parts:
        if "-" in p:
            a, b = p.split("-")
            ch, lo = a.split(".")
            hi = b.split(".")[1]
            out += [f"{ch}.{k}" for k in range(int(lo), int(hi) + 1)]
        else:
            out.append(p)
    return out


def sample(T, fn, fps=FPS):
    """Frames at fps from t = 0 to t = T (last frame exactly T). fn(t) -> dict."""
    check(T <= MAX_SECONDS, f"The motion lasts {T:.0f} s, more than {MAX_SECONDS} s. Change the numbers.")
    n = max(1, int(round(T * fps)))
    return [fn(T * i / n) for i in range(n + 1)], T / n


def choice(key, label, default, options):
    return {"key": key, "label": label, "default": default,
            "type": "select", "options": options}


def result(label, value, unit=""):
    return {"label": label, "value": value, "unit": unit}


def bounce_hops(v_impact, g, cor, t_start=0.0, min_v=0.15, max_bounces=6):
    """An object hits the ground (height 0) at time t_start with downward speed
    v_impact (m/s), then bounces with coefficient of restitution cor (0 <= cor < 1),
    each bounce launching it back up slower than the last, until it is effectively
    at rest. Returns (hops, t_rest): hops is a list of (t_start, duration, v_launch)
    for each hop in the air, and t_rest is the time it settles at height 0."""
    hops = []
    t = t_start
    v = v_impact
    for _ in range(max_bounces):
        v = cor * v
        if v < min_v:
            break
        dur = 2 * v / g
        hops.append((t, dur, v))
        t += dur
    return hops, t


def bounce_height(hops, t, g):
    """Height (>= 0) and velocity (+ up) of a bouncing object at time t, given the
    hops from bounce_hops. Returns (0, 0) before the first hop or once it has
    settled at the ground after the last one."""
    for t0, dur, v0 in hops:
        if t0 <= t < t0 + dur:
            tau = t - t0
            return v0 * tau - 0.5 * g * tau * tau, v0 - g * tau
    return 0.0, 0.0

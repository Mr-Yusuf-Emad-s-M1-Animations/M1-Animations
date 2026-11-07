// M1 mechanics animations: the physics, in JavaScript.
// This is a line-by-line port of the Python files in solvers/. It runs in the
// student's browser, so the site needs no server. The Python files stay in the
// project as the reference: tests/parity.py checks that both give the same numbers.
"use strict";

const FPS = 60;            // frames per second of simulated time
const MAX_SECONDS = 60;    // refuse motions longer than this

class InputError extends Error {}
function check(condition, message) { if (!condition) throw new InputError(message); }

// Python-style rounding: the nearest value, and an exact tie goes to the even digit.
function r(x, n = 4) {
  x = x + 0;
  if (!isFinite(x)) return x;
  const ax = Math.abs(x), sign = x < 0 ? -1 : 1;
  const [ip, fp] = ax.toFixed(Math.min(n + 30, 100)).split(".");
  const keep = fp.slice(0, n), tail = fp.slice(n);
  if (/^50*$/.test(tail)) {                       // exactly half way
    const lastDigit = Number((n > 0 ? keep : ip).slice(-1));
    if (lastDigit % 2 === 0) return sign * Number(n > 0 ? ip + "." + keep : ip) + 0;
  }
  return sign * Number(ax.toFixed(n)) + 0;
}
function pyround(x) {   // Python round() to an integer
  const fl = Math.floor(x);
  return x - fl === 0.5 ? (fl % 2 === 0 ? fl : fl + 1) : Math.round(x);
}
// Python prints floats with ".0" (5.0); these two helpers copy Python's f-string formats.
function pyf(x) { return Number.isInteger(x) ? x.toFixed(1) : String(x); }
function fmtg(x, p = 6) {   // Python's "{x:g}" / "{x:.3g}"
  if (x === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(x)));
  const strip = (s) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);
  if (e < -4 || e >= p) {
    const [m, ex] = x.toExponential(p - 1).split("e");
    let d = ex.slice(1); if (d.length < 2) d = "0" + d;
    return strip(m) + "e" + ex[0] + d;
  }
  return strip(x.toPrecision(p));
}
const result = (label, value, unit = "") => ({ label, value, unit });
const hypot = Math.hypot, sqrt = Math.sqrt, sin = Math.sin, cos = Math.cos, tan = Math.tan;
const radians = (d) => (d * Math.PI) / 180;
const degrees = (x) => (x * 180) / Math.PI;
const pymod = (a, n) => ((a % n) + n) % n;

function sample(T, fn, fps = FPS) {   // frames at fps from t = 0 to t = T
  check(T <= MAX_SECONDS, `The motion lasts ${T.toFixed(0)} s, more than ${MAX_SECONDS} s. Change the numbers.`);
  const n = Math.max(1, pyround(T * fps));
  const frames = [];
  for (let i = 0; i <= n; i++) frames.push(fn((T * i) / n));
  return [frames, T / n];
}

const LAPSE_PLAYBACK = 30, LAPSE_MAX = 600;   // a long motion is played as a time-lapse of at most 30 s
function sampleLapse(T, fn) {
  check(T <= LAPSE_MAX, `The motion lasts ${T.toFixed(0)} s, more than ${LAPSE_MAX} s. Change the numbers.`);
  if (T <= LAPSE_PLAYBACK) { const [frames, dt] = sample(T, fn); return [frames, dt, 1.0]; }
  const n = LAPSE_PLAYBACK * FPS, frames = [];
  for (let i = 0; i <= n; i++) frames.push(fn((T * i) / n));
  return [frames, 1 / FPS, T / LAPSE_PLAYBACK];
}

function bounceHops(vImpact, g, cor, tStart = 0.0, minV = 0.15, maxBounces = 6) {
  const hops = [];
  let t = tStart, v = vImpact;
  for (let i = 0; i < maxBounces; i++) {
    v = cor * v;
    if (v < minV) break;
    const dur = (2 * v) / g;
    hops.push([t, dur, v]);
    t += dur;
  }
  return [hops, t];
}
function bounceHeight(hops, t, g) {
  for (const [t0, dur, v0] of hops) {
    if (t0 <= t && t < t0 + dur) {
      const tau = t - t0;
      return [v0 * tau - 0.5 * g * tau * tau, v0 - g * tau];
    }
  }
  return [0.0, 0.0];
}

const SOLVERS = {};

// ---------------------------------------------------------------- Chapter 1
SOLVERS["suvat-journey"] = function (p) {
  const { u, a1, t1, t2, a3, v_end: ve } = p;
  check(u >= 0 && ve >= 0, "Speeds cannot be negative.");
  check(t1 > 0 && t2 >= 0, "Stage 1 must last more than 0 s; the constant-speed stage cannot be negative.");
  const V = u + a1 * t1;
  check(V > 0, "The car must be moving after stage 1. Make a1 larger.");
  check(a3 > 0, "The deceleration must be greater than 0.");
  check(ve <= V, "The final speed must be less than the top speed.");
  const t3 = (V - ve) / a3;
  const s1 = ((u + V) / 2) * t1, s2 = V * t2, s3 = ((V + ve) / 2) * t3;
  const T = t1 + t2 + t3, D = s1 + s2 + s3;
  const state = (t) => {
    if (t <= t1) return [u * t + 0.5 * a1 * t * t, u + a1 * t];
    if (t <= t1 + t2) return [s1 + V * (t - t1), V];
    const tau = Math.min(t - t1 - t2, t3);
    return [s1 + s2 + V * tau - 0.5 * a3 * tau * tau, V - a3 * tau];
  };
  let lo = 0.0, hi = T;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (state(mid)[0] < D / 2) lo = mid; else hi = mid;
  }
  const tHalfD = (lo + hi) / 2, xHalfT = state(T / 2)[0];
  const [frames, dt, speedup] = sampleLapse(T, (t) => { const [x, v] = state(t); return { t: r(t), x: r(x), v: r(v) }; });
  const res = [result("Top speed V", r(V, 3), "m/s"), result("Distance in stage 1", r(s1, 3), "m"),
    result("Distance at constant speed", r(s2, 3), "m"), result("Time of stage 3", r(t3, 3), "s"),
    result("Distance in stage 3", r(s3, 3), "m"), result("Total distance", r(D, 3), "m"),
    result("Total time", r(T, 3), "s"), result("Average speed", r(D / T, 3), "m/s"),
    result("Half the distance reached at", r(tHalfD, 3), "s"), result("Distance at half the time", r(xHalfT, 3), "m")];
  if (speedup > 1) res.push(result("Playback", `time-lapse, ${pyf(r(speedup, 1))} times faster than real time`));
  return { dt, frames, results: res, meta: { T: r(T), D: r(D), V: r(V), t1, t2, t3: r(t3), tHalfD: r(tHalfD), xHalfT: r(xHalfT) } };
};

SOLVERS["overtaking"] = function (p) {
  const { u, a, v } = p;
  check(u > 0, "u must be greater than 0.");
  check(a > 0, "a must be greater than 0.");
  check(v > u, "The cyclist's cruising speed v must be greater than the car's speed u, or the cyclist never catches up.");
  const t1 = v / a, tGap = u / a, gapMax = (0.5 * u * u) / a;
  const tAccCandidate = (2 * u) / a;
  let tCatch, caughtWhile;
  if (tAccCandidate <= t1 + 1e-9) { tCatch = tAccCandidate; caughtWhile = "accelerating"; }
  else { tCatch = (v * v) / (2 * a * (v - u)); caughtWhile = "cruising"; }
  const xCatch = u * tCatch;
  const T = Math.max(tCatch * 1.15, t1 * 1.1) + 0.4;
  check(T <= MAX_SECONDS, "This motion lasts more than 60 s. Try smaller numbers.");
  const frames = [];
  const n = Math.floor(T * FPS) + 2;
  for (let i = 0; i < n; i++) {
    const t = Math.min(i / FPS, T);
    const xP = u * t;
    let vQ, xQ;
    if (t <= t1) { vQ = a * t; xQ = 0.5 * a * t * t; } else { vQ = v; xQ = v * t - (v * v) / (2 * a); }
    frames.push({ t: r(t), xP: r(xP), xQ: r(xQ), vQ: r(vQ) });
  }
  const res = [result("Time to reach cruising speed", r(t1, 3), "s"), result("Greatest distance behind", r(gapMax, 3), "m"),
    result(`Time to catch up (while ${caughtWhile})`, r(tCatch, 3), "s"), result("Distance from O when caught", r(xCatch, 3), "m")];
  return { dt: 1 / FPS, frames, results: res,
    meta: { u, a, v, t1: r(t1), t_catch: r(tCatch), x_catch: r(xCatch), t_gap: r(tGap), gap_max: r(gapMax), T: r(T) } };
};

SOLVERS["vertical-projection"] = function (p) {
  const { u, h, g, level } = p;
  check(u > 0, "u must be greater than 0.");
  check(g > 0, "g must be greater than 0.");
  check(h >= 0 && level >= 0, "Heights cannot be negative.");
  const H = (u * u) / (2 * g), tTop = u / g;
  const T = (u + sqrt(u * u + 2 * g * h)) / g;
  const [frames, dt] = sample(T, (t) => ({ t: r(t), y: r(u * t - 0.5 * g * t * t), v: r(u - g * t) }));
  const res = [result("Time to greatest height", r(tTop, 3), "s"), result("Greatest height above A", r(H, 3), "m")];
  if (h > 0) {
    res.push(result("Greatest height above the ground", r(H + h, 3), "m"), result("Back at A after", r(2 * tTop, 3), "s"),
      result("Time to reach the ground", r(T, 3), "s"), result("Speed hitting the ground", r(sqrt(u * u + 2 * g * h), 3), "m/s"));
  } else res.push(result("Time of flight T", r(T, 3), "s"));
  if (level > 0) {
    if (level < H) {
      const half = sqrt(u * u - 2 * g * level) / g;
      res.push(result(`Time above ${fmtg(level)} m`, r(2 * half, 3), "s"));
      res.push(result(`Passes ${fmtg(level)} m at`, `${pyf(r(tTop - half, 3))} s and ${pyf(r(tTop + half, 3))} s`));
    } else res.push(result(`Height ${fmtg(level)} m`, "never reached"));
  }
  return { dt, frames, results: res, meta: { H: r(H), h, u, g, level, T: r(T) } };
};

SOLVERS["bouncing-ball"] = function (p) {
  const { h, u, e, m, g } = p;
  check(h >= 0 && g > 0 && m > 0, "h cannot be negative; m and g must be greater than 0.");
  check(0 <= e && e < 1, "e must be at least 0 and less than 1.");
  check(h > 0 || u > 0, "The ball must start above the floor or be thrown up.");
  const t1 = (u + sqrt(u * u + 2 * g * h)) / g;
  const vImp = g * t1 - u;
  const [hops, tRest] = bounceHops(vImp, g, e, t1, 0.2, 5);
  const T = tRest + 0.6;
  const state = (t) => (t < t1 ? [h + u * t - 0.5 * g * t * t, u - g * t] : bounceHeight(hops, t, g));
  const [frames, dt] = sample(T, (t) => { const [y, v] = state(t); return { t: r(t), y: r(y), v: r(v) }; });
  const res = [result("Time to first hit the floor", r(t1, 3), "s"), result("Speed hitting the floor", r(vImp, 3), "m/s"),
    result("Rebound speed", r(e * vImp, 3), "m/s"), result("Impulse from the floor", r(m * (1 + e) * vImp, 3), "N s"),
    result("Kinetic energy lost in the bounce", r(0.5 * m * vImp ** 2 * (1 - e * e), 3), "J"),
    result("Height after first bounce", r((e * vImp) ** 2 / (2 * g), 3), "m")];
  if (hops.length) res.push(result("Time between 1st and 2nd impact", r(hops[0][1], 3), "s"));
  return { dt, frames, results: res,
    meta: { top: r(Math.max(h + (u > 0 ? (u * u) / (2 * g) : 0), (e * vImp) ** 2 / (2 * g))),
      vmax: r(Math.max(vImp, Math.abs(u))), impacts: [r(t1)].concat(hops.map(([a, d]) => r(a + d))) } };
};

SOLVERS["vertical-meeting"] = function (p) {
  const { u1, h, u2, delay: d, g } = p;
  check(u1 > 0 && h > 0 && g > 0, "u1, h and g must be greater than 0.");
  check(d >= 0, "The delay cannot be negative.");
  const P = (t) => [u1 * t - 0.5 * g * t * t, u1 - g * t];
  const Q = (t) => {
    if (t < d) return [h, 0.0];
    const tau = t - d;
    return [h + u2 * tau - 0.5 * g * tau * tau, u2 - g * tau];
  };
  const tP = (2 * u1) / g;
  const tQ = d + (u2 + Math.pow(u2 * u2 + 2 * g * h, 0.5)) / g;
  const tEnd = Math.min(tP, tQ);
  let meet = null;
  const steps = 4000;
  for (let k = 1; k <= steps; k++) {
    const t = (tEnd * k) / steps;
    if (P(t)[0] >= Q(t)[0]) {
      let lo = (tEnd * (k - 1)) / steps, hi = t;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (P(mid)[0] >= Q(mid)[0]) hi = mid; else lo = mid;
      }
      meet = hi;
      break;
    }
  }
  const T = meet !== null ? meet : tEnd;
  const frame = (t) => {
    const [yp, vp] = P(t), [yq, vq] = Q(t);
    return { t: r(t), yP: r(Math.max(yp, 0)), vP: r(vp), yQ: r(Math.max(yq, 0)), vQ: r(vq) };
  };
  const [frames, dt] = sample(T, frame);
  const top = Math.max(h + (u2 > 0 ? (u2 * u2) / (2 * g) : 0), (u1 * u1) / (2 * g));
  let res;
  if (meet !== null) {
    const [yp, vp] = P(meet), [, vq] = Q(meet);
    const word = (v) => (v > 1e-9 ? "upwards" : v < -1e-9 ? "downwards" : "at rest");
    res = [result("They meet after", r(meet, 3), "s"), result("Height where they meet", r(yp, 3), "m"),
      result("Velocity of P then", `${pyf(r(Math.abs(vp), 3))} m/s ${word(vp)}`),
      result("Velocity of Q then", `${pyf(r(Math.abs(vq), 3))} m/s ${word(vq)}`),
      result("Closing speed (constant once both move)", r(Math.abs(vp - vq), 3), "m/s")];
  } else {
    res = [result("Do they meet?", "no: one reaches the ground first"), result("P lands after", r(tP, 3), "s"),
      result("Q lands after", r(tQ, 3), "s")];
  }
  return { dt, frames, results: res,
    meta: { top: r(top), h, meet: meet !== null ? r(meet) : null, yMeet: meet !== null ? r(P(meet)[0]) : null, T: r(T),
      vmax: r(Math.max(Math.abs(u1), Math.abs(u2), g * T + Math.abs(u2))) } };
};

SOLVERS["parachutist"] = function (p) {
  const { H, t1, d, V, g } = p;
  check(H > 0 && t1 > 0 && d > 0 && V > 0 && g > 0, "Every number must be greater than 0.");
  const v1 = g * t1, s1 = 0.5 * g * t1 * t1;
  check(V < v1, `The steady speed must be less than the speed when the parachute opens (${fmtg(v1, 3)} m/s).`);
  const t2 = (v1 - V) / d, s2 = (v1 * v1 - V * V) / (2 * d), s3 = H - s1 - s2;
  check(s3 >= 0, `The parachutist hits the ground before reaching the steady speed (needs ${fmtg(s1 + s2, 4)} m). Start higher or open the parachute sooner.`);
  const t3 = s3 / V, T = t1 + t2 + t3;
  const state = (t) => {
    if (t <= t1) return [0.5 * g * t * t, g * t];
    if (t <= t1 + t2) { const tau = t - t1; return [s1 + v1 * tau - 0.5 * d * tau * tau, v1 - d * tau]; }
    return [s1 + s2 + V * (t - t1 - t2), V];
  };
  const [frames, dt] = sample(T, (t) => { const [s, v] = state(t); return { t: r(t), y: r(Math.max(H - s, 0)), v: r(v) }; }, 30);
  const res = [result("Speed when the parachute opens", r(v1, 3), "m/s"), result("Distance in free fall", r(s1, 3), "m"),
    result("Time slowing down", r(t2, 3), "s"), result("Distance slowing down", r(s2, 3), "m"),
    result("Time at steady speed", r(t3, 3), "s"), result("Total time to the ground", r(T, 3), "s")];
  return { dt, frames, results: res, meta: { H, t1, t2: r(t2), v1: r(v1), V, T: r(T) } };
};

// ---------------------------------------------------------------- Chapter 2
const SL_N = 300;
SOLVERS["slope-limiting"] = function (p) {
  const { angle: ang, m, mu, g } = p, horiz = p.dir === "horizontal";
  check(0 < ang && ang < 90, "The angle must be between 0° and 90°.");
  check(m > 0 && g > 0 && mu >= 0, "m and g must be greater than 0, and μ cannot be negative.");
  const th = radians(ang), W = m * g;
  const [c, s_] = horiz ? [cos(th), sin(th)] : [1.0, 0.0];
  const pLow = Math.max(0.0, (W * (sin(th) - mu * cos(th))) / (c + mu * s_));
  const den = c - mu * s_;
  const pHigh = den > 1e-9 ? (W * (sin(th) + mu * cos(th))) / den : null;
  const pMax = pHigh ? 1.25 * pHigh : 3 * W;
  const frames = [];
  for (let i = 0; i <= SL_N; i++) {
    const P = (pMax * i) / SL_N;
    const R = W * cos(th) + P * s_;
    const need = W * sin(th) - P * c;
    const lim = mu * R;
    let F, state;
    if (Math.abs(need) <= lim + 1e-9) { F = need; state = "rest"; }
    else { F = need > 0 ? lim : -lim; state = need > 0 ? "down" : "up"; }
    frames.push({ P: r(P, 3), F: r(F, 3), R: r(R, 3), lim: r(lim, 3), state });
  }
  const res = [result("Weight component down the slope", r(W * sin(th), 3), "N"),
    result("P when about to slide down", pLow > 0 ? r(pLow, 3) : "0 (rests without P)", pLow > 0 ? "N" : ""),
    result("P when about to slide up", pHigh ? r(pHigh, 3) : "never (too rough)", pHigh ? "N" : ""),
    result("Friction needed with P = 0", r(W * sin(th), 3), "N"),
    result("Greatest friction with P = 0 (μR)", r(mu * W * cos(th), 3), "N")];
  return { dt: 6 / SL_N, frames, results: res,
    meta: { angle: ang, W: r(W), pLow: r(pLow), pHigh: pHigh ? r(pHigh) : null, pMax: r(pMax), horiz } };
};

// ---------------------------------------------------------------- Chapter 3
SOLVERS["inclined-plane"] = function (p) {
  const { angle: ang, mass: m, mu, length: L, u0, g } = p;
  check(0 < ang && ang < 90, "The angle must be between 0° and 90°.");
  check(m > 0 && L > 0 && g > 0, "m, the length and g must be greater than 0.");
  check(mu >= 0 && u0 >= 0, "μ and the starting speed cannot be negative.");
  const th = radians(ang), N = m * g * cos(th), push = m * g * sin(th), a = g * (sin(th) - mu * cos(th));
  let reaches = true, tEnd = 0.0, sStop = 0.0;
  if (u0 === 0 && a <= 0) reaches = false;
  else if (a < 0 && (u0 * u0) / (2 * -a) < L) { reaches = false; tEnd = u0 / -a; sStop = (u0 * u0) / (2 * -a); }
  else tEnd = Math.abs(a) < 1e-12 ? L / u0 : (-u0 + sqrt(u0 * u0 + 2 * a * L)) / a;
  check(tEnd <= MAX_SECONDS, "The motion lasts more than 60 s. Use a shorter slope or a larger angle.");
  const frames = [];
  const n = Math.floor(tEnd * FPS) + 2;
  for (let i = 0; i < n; i++) {
    const t = Math.min(i / FPS, tEnd);
    let s, v;
    if (reaches || t < tEnd) { s = u0 * t + 0.5 * a * t * t; v = u0 + a * t; } else { s = sStop; v = 0.0; }
    const moving = v > 1e-9;
    frames.push({ t: r(t), s: r(Math.min(s, L)), v: r(Math.max(v, 0)), F: r(moving ? mu * N : Math.min(mu * N, push)) });
  }
  const res = [];
  if (u0 === 0 && a <= 0) {
    res.push(result("Motion", "stays at rest (μ ≥ tan θ)"), result("Friction force F", r(push, 2), "N"));
  } else {
    res.push(result("Acceleration a", r(a, 4), "m/s²"));
    if (reaches) res.push(result("Time to reach the end", r(tEnd, 3), "s"), result("Speed at the end", r(u0 + a * tEnd, 3), "m/s"));
    else res.push(result("Stops after", r(sStop, 3), "m"));
    res.push(result("Friction force F", r(mu * N, 2), "N"));
  }
  res.push(result("Normal reaction N", r(N, 2), "N"));
  return { dt: 1 / FPS, frames, results: res, meta: { angle: ang, length: L, weight: m * g } };
};

SOLVERS["slope-up-and-back"] = function (p) {
  const { angle: ang, u, mu, m, g } = p;
  check(0 < ang && ang < 90, "The angle must be between 0° and 90°.");
  check(u > 0 && m > 0 && g > 0 && mu >= 0, "u, m and g must be greater than 0; μ cannot be negative.");
  const th = radians(ang), aUp = g * (sin(th) + mu * cos(th)), tUp = u / aUp, sTop = (u * u) / (2 * aUp);
  const back = tan(th) > mu;
  const aDn = back ? g * (sin(th) - mu * cos(th)) : 0.0;
  const tDn = back ? sqrt((2 * sTop) / aDn) : 0.8;
  const T = tUp + tDn;
  const frame = (t) => {
    let s, v;
    if (t <= tUp) { s = u * t - 0.5 * aUp * t * t; v = u - aUp * t; }
    else if (back) { const tau = t - tUp; s = sTop - 0.5 * aDn * tau * tau; v = -aDn * tau; }
    else { s = sTop; v = 0.0; }
    return { t: r(t), s: r(Math.max(s, 0)), v: r(v) };
  };
  const [frames, dt] = sample(T, frame);
  const R = m * g * cos(th);
  const res = [result("Deceleration going up", r(aUp, 4), "m/s²"), result("Time to stop", r(tUp, 3), "s"),
    result("Distance up the slope", r(sTop, 3), "m"), result("Friction (μR)", r(mu * R, 3), "N")];
  if (back) res.push(result("Acceleration sliding down", r(aDn, 4), "m/s²"), result("Time to slide back", r(tDn, 3), "s"),
    result("Speed back at the start", r(aDn * tDn, 3), "m/s"));
  else res.push(result("After stopping", "stays at rest (μ ≥ tan θ)"));
  return { dt, frames, results: res, meta: { angle: ang, sTop: r(sTop), tUp: r(tUp), u, back, vDown: back ? r(aDn * tDn) : 0 } };
};

SOLVERS["towing"] = function (p) {
  const { M, m, D, Rc, Rt, u0, time } = p;
  check(M > 0 && m > 0, "Both masses must be greater than 0.");
  check(Rc >= 0 && Rt >= 0 && u0 >= 0, "Resistances and the starting speed cannot be negative.");
  check(0 < time && time <= MAX_SECONDS, "Time must be between 0 and 60 s.");
  const aJoint = (D - Rc - Rt) / (M + m);
  const T = m * aJoint + Rt;
  const meta = { M, m, D, Rc, Rt, link: p.link };
  if (p.link === "string" && T < 0) {
    const aCar = (D - Rc) / M, aTrailer = -Rt / m;
    let tEnd = time;
    if (u0 > 0 && aCar < 0) tEnd = Math.min(tEnd, u0 / -aCar);
    check(tEnd <= MAX_SECONDS, "The motion lasts more than 60 s.");
    const tStop = aTrailer < 0 && u0 > 0 ? u0 / -aTrailer : null;
    const trailerState = (t) => {
      if (tStop !== null && t >= tStop) return [u0 * tStop + 0.5 * aTrailer * tStop * tStop, 0.0];
      return [u0 * t + 0.5 * aTrailer * t * t, u0 + aTrailer * t];
    };
    const frames = [];
    const n = Math.floor(tEnd * FPS) + 2;
    for (let i = 0; i < n; i++) {
      const t = Math.min(i / FPS, tEnd);
      const [xt, vt] = trailerState(t);
      frames.push({ t: r(t), x: r(u0 * t + 0.5 * aCar * t * t), v: r(u0 + aCar * t), xt: r(xt), vt: r(vt), separated: true });
    }
    const [xtE] = trailerState(tEnd);
    const xcE = u0 * tEnd + 0.5 * aCar * tEnd * tEnd;
    const res = [result("The string goes slack", "it can only pull, not push, so the trailer is on its own"),
      result("Car's acceleration", r(aCar, 3), "m/s²"), result("Trailer's acceleration (resistance only)", r(aTrailer, 3), "m/s²")];
    if (tStop !== null && tStop <= tEnd + 1e-9) {
      res.push(result("Trailer comes to rest after", r(tStop, 3), "s"));
      res.push(result("Trailer's stopping distance", r(trailerState(tStop)[0], 3), "m"));
    }
    res.push(result("Without the rod's thrust, the trailer gains on the car by", r(Math.max(xtE - xcE, 0), 3), "m (a rod would be needed here)"));
    meta.T = 0; meta.separated = true;
    return { dt: 1 / FPS, frames, results: res, meta };
  }
  meta.separated = false;
  if (u0 === 0 && aJoint <= 0) {
    meta.T = 0;
    return { dt: 1 / FPS, frames: [{ t: 0, x: 0, v: 0 }], meta, results: [result("Motion", "the car does not move (driving force too small)")] };
  }
  const tEnd = aJoint < 0 ? Math.min(time, u0 / -aJoint) : time;
  meta.T = r(T);
  const frames = [];
  const n = Math.floor(tEnd * FPS) + 2;
  for (let i = 0; i < n; i++) {
    const t = Math.min(i / FPS, tEnd);
    frames.push({ t: r(t), x: r(u0 * t + 0.5 * aJoint * t * t), v: r(u0 + aJoint * t) });
  }
  const kind = T >= 0 ? "tension" : "thrust";
  const res = [result("Acceleration a", r(aJoint, 3), "m/s²"),
    result(`Force in the ${p.link}`, `${pyf(r(Math.abs(T), 2))} N (${kind})`),
    result("Speed at the end", r(u0 + aJoint * tEnd, 3), "m/s"),
    result("Distance travelled", r(u0 * tEnd + 0.5 * aJoint * tEnd ** 2, 3), "m")];
  return { dt: 1 / FPS, frames, results: res, meta };
};

SOLVERS["lift"] = function (p) {
  const { m, M, a1, t1, t2, a3, g } = p;
  const sgn = p.dir === "up" ? 1 : -1;
  check(m > 0 && M > 0 && g > 0, "Masses and g must be greater than 0.");
  check(a1 > 0 && t1 > 0 && a3 > 0 && t2 >= 0, "Accelerations and times must be greater than 0.");
  check(a1 < g && a3 < g, "Keep the accelerations below g so the person stays on the floor.");
  const V = a1 * t1, t3 = V / a3, T = t1 + t2 + t3 + 0.8;
  const stages = [[t1, a1], [t2, 0.0], [t3, -a3]];
  const state = (t) => {
    let y = 0.0, v = 0.0, t0 = 0.0;
    for (const [dur, a] of stages) {
      const tau = Math.min(Math.max(t - t0, 0), dur);
      y += v * tau + 0.5 * a * tau * tau;
      if (t < t0 + dur) return [y, v + a * tau, a];
      v += a * dur; t0 += dur;
    }
    return [y, 0.0, 0.0];
  };
  const frame = (t) => {
    const [y, v, a] = state(t);
    const aUp = sgn * a;
    return { t: r(t), y: r(sgn * y), v: r(sgn * v), a: r(aUp), R: r(m * (g + aUp), 2), T: r((M + m) * (g + aUp), 1) };
  };
  const [frames, dt] = sample(T, frame);
  const D = state(T)[0];
  const names = ["speeding up", "constant speed", "slowing down"];
  const res = stages.map(([, a], i) => result(`R from the floor (${names[i]})`, r(m * (g + sgn * a), 2), "N"));
  res.push(result("Weight of the person", r(m * g, 2), "N"),
    result("Greatest tension in the cable", r((M + m) * (g + Math.max(sgn * a1, -sgn * a3)), 1), "N"),
    result("Top speed", r(V, 3), "m/s"), result("Total distance", r(D, 3), "m"));
  return { dt, frames, results: res,
    meta: { D: r(D), sgn, W: r(m * g, 2), Rmax: r(m * (g + Math.max(a1, a3)), 2), Rmin: r(m * (g - Math.max(a1, a3)), 2), V: r(V), T: r(T) } };
};

SOLVERS["pulley-hanging"] = function (p) {
  const { m1, m2, h, g, cor } = p;
  check(m2 > 0 && h > 0 && g > 0, "m2, h and g must be greater than 0.");
  check(m1 > m2, "A must be heavier than B, so that A moves down.");
  check(0 <= cor && cor < 1, "Bounciness must be between 0 (no bounce) and just under 1.");
  const a = ((m1 - m2) * g) / (m1 + m2), T = (2 * m1 * m2 * g) / (m1 + m2);
  const t1 = sqrt((2 * h) / a), v1 = a * t1, peakExtra = (v1 * v1) / (2 * g);
  const tauLand = (v1 + sqrt(v1 * v1 + 2 * g * h)) / g;
  const vBImpact = g * tauLand - v1;
  const [AHops, ARest] = bounceHops(v1, g, cor, t1);
  const [BHops, BRest] = bounceHops(vBImpact, g, cor, t1 + tauLand);
  const total = Math.max(ARest, BRest, t1 + tauLand);
  check(total <= MAX_SECONDS, "The motion lasts more than 60 s.");
  const frames = [];
  const n = Math.floor(total * FPS) + 2;
  for (let i = 0; i < n; i++) {
    const t = Math.min(i / FPS, total);
    let yA, yB, vA, vB, slack;
    if (t <= t1) { yA = h - 0.5 * a * t * t; yB = 0.5 * a * t * t; vA = -a * t; vB = a * t; slack = false; }
    else {
      const tau = t - t1;
      [yA, vA] = bounceHeight(AHops, t, g);
      if (t <= t1 + tauLand) { yB = h + v1 * tau - 0.5 * g * tau * tau; vB = v1 - g * tau; }
      else [yB, vB] = bounceHeight(BHops, t, g);
      slack = true;
    }
    frames.push({ t: r(t), yA: r(Math.max(yA, 0)), yB: r(Math.max(yB, 0)), vA: r(vA), vB: r(vB), slack });
  }
  const res = [result("Acceleration a", r(a, 3), "m/s²"), result("Tension T", r(T, 3), "N"),
    result("Speed of A when it lands", r(v1, 3), "m/s"), result("B rises a further", r(peakExtra, 3), "m"),
    result("Greatest height of B", r(h + peakExtra, 3), "m")];
  if (cor > 0) {
    res.push(result("Bounciness (coefficient of restitution)", r(cor, 2)));
    res.push(result("B lands back down after", r(tauLand, 3), "s (measured from when A lands)"));
  } else res.push(result("Bounce", "none: A and B stay on the ground once they land"));
  return { dt: 1 / FPS, frames, results: res, meta: { h, top: r(h + peakExtra), v1: r(v1), m1, m2, cor } };
};

SOLVERS["pulley-table"] = function (p) {
  const { m1, m2, mu, d, h, g, cor } = p;
  check(m1 > 0 && m2 > 0 && d > 0 && h > 0 && g > 0, "Masses, d, h and g must be greater than 0.");
  check(mu >= 0, "μ cannot be negative.");
  check(0 <= cor && cor < 1, "Bounciness must be between 0 (no bounce) and just under 1.");
  const meta = { d, h, m1, m2, vmax: 1, cor };
  if (m2 <= mu * m1) {
    return { dt: 1 / FPS, frames: [{ t: 0, s: 0, v: 0, slack: false, drop: 0 }],
      results: [result("Motion", "nothing moves (m2 ≤ μ m1)"), result("Tension T", r(m2 * g, 2), "N")], meta };
  }
  const a = ((m2 - mu * m1) * g) / (m1 + m2), T = m2 * (g - a);
  const run = Math.min(h, d), t1 = sqrt((2 * run) / a), v1 = a * t1, dec = mu * g;
  const landed = h < d;
  let t2 = 0.0, sEnd = run, vEnd = v1, outcome = "";
  if (!landed) outcome = `reaches the pulley at ${pyf(r(v1, 3))} m/s`;
  else {
    const rem = d - h;
    if (dec === 0) { t2 = rem / v1; sEnd = d; vEnd = v1; outcome = `reaches the pulley at ${pyf(r(v1, 3))} m/s (constant speed)`; }
    else if ((v1 * v1) / (2 * dec) < rem) {
      t2 = v1 / dec; sEnd = h + (v1 * v1) / (2 * dec); vEnd = 0.0;
      outcome = `stops ${pyf(r((v1 * v1) / (2 * dec), 3))} m after the string goes slack`;
    } else {
      vEnd = sqrt(v1 * v1 - 2 * dec * rem); t2 = (v1 - vEnd) / dec; sEnd = d;
      outcome = `reaches the pulley at ${pyf(r(vEnd, 3))} m/s`;
    }
  }
  const [hops, hopRest] = !landed ? [[], t1] : bounceHops(v1, g, cor, t1);
  const total = Math.max(t1 + t2, hopRest);
  check(total <= MAX_SECONDS, "The motion lasts more than 60 s.");
  meta.vmax = r(v1);
  const frames = [];
  const n = Math.floor(total * FPS) + 2;
  for (let i = 0; i < n; i++) {
    const t = Math.min(i / FPS, total);
    let s, v, slack, drop;
    if (t <= t1) { s = 0.5 * a * t * t; v = a * t; slack = false; drop = 0.5 * a * t * t; }
    else {
      const tau = t - t1;
      s = run + v1 * tau - 0.5 * dec * tau * tau; v = v1 - dec * tau; slack = true;
      s = Math.min(s, sEnd); v = Math.max(v, 0);
      if (landed) { const [height] = bounceHeight(hops, t, g); drop = h - height; } else drop = s;
    }
    frames.push({ t: r(t), s: r(s), v: r(v), slack, drop: r(Math.max(drop, 0)) });
  }
  const res = [result("Acceleration a", r(a, 3), "m/s²"), result("Tension T", r(T, 3), "N"),
    result(landed ? "Speed when the hanging mass lands" : "Speed at the pulley", r(v1, 3), "m/s")];
  res.push(result("Then the table particle", outcome));
  if (landed) res.push(cor > 0 ? result("Bounciness of the hanging mass", r(cor, 2)) : result("The hanging mass", "stays on the floor once it lands"));
  return { dt: 1 / FPS, frames, results: res, meta };
};

SOLVERS["pulley-slope"] = function (p) {
  const { angle: ang, m1, m2, mu, run, h, cor, g } = p;
  check(0 < ang && ang < 90, "The angle must be between 0° and 90°.");
  check(m1 > 0 && m2 > 0 && run > 0 && h > 0 && g > 0, "Masses, the distance, h and g must be greater than 0.");
  check(mu >= 0, "μ cannot be negative.");
  check(0 <= cor && cor < 1, "Bounciness must be between 0 (no bounce) and just under 1.");
  const th = radians(ang), N = m1 * g * cos(th), drive = m2 * g - m1 * g * sin(th);
  const meta = { angle: ang, run, m1, m2 };
  if (Math.abs(drive) <= mu * N) {
    return { dt: 1 / FPS, frames: [{ t: 0, s: 0, v: 0, drop: 0, slack: false }],
      results: [result("Motion", "stays at rest"), result("Friction needed", r(Math.abs(drive), 3), "N"),
        result("Greatest friction available μN", r(mu * N, 3), "N"), result("Tension T", r(m2 * g, 3), "N")], meta };
  }
  const up = drive > 0;
  const a = (Math.abs(drive) - mu * N) / (m1 + m2);
  const T = up ? m2 * (g - a) : m2 * (g + a);
  const landed = up && h < run;
  if (!landed) {
    const tEnd = sqrt((2 * run) / a);
    check(tEnd <= MAX_SECONDS, "The motion lasts more than 60 s.");
    const sgn = up ? 1 : -1, frames = [];
    const n = Math.floor(tEnd * FPS) + 2;
    for (let i = 0; i < n; i++) {
      const t = Math.min(i / FPS, tEnd), s = sgn * 0.5 * a * t * t;
      frames.push({ t: r(t), s: r(s), v: r(sgn * a * t), drop: r(s), slack: false });
    }
    const res = [result("Direction", up ? "slope particle moves up, hanging mass moves down" : "slope particle moves down, hanging mass moves up"),
      result("Acceleration a", r(a, 3), "m/s²"), result("Tension T", r(T, 3), "N"), result("Friction force μN", r(mu * N, 3), "N"),
      result(`Speed after ${fmtg(run)} m`, r(a * tEnd, 3), "m/s")];
    Object.assign(meta, { h, cor });
    return { dt: 1 / FPS, frames, results: res, meta };
  }
  const t1 = sqrt((2 * h) / a), v1 = a * t1, dec = g * sin(th) + mu * g * cos(th), rem = run - h;
  let t2, sEnd, vEnd, outcome;
  if ((v1 * v1) / (2 * dec) < rem) {
    t2 = v1 / dec; sEnd = h + (v1 * v1) / (2 * dec); vEnd = 0.0;
    outcome = `slides ${pyf(r((v1 * v1) / (2 * dec), 3))} m further, then stops`;
  } else {
    vEnd = sqrt(v1 * v1 - 2 * dec * rem); t2 = (v1 - vEnd) / dec; sEnd = run;
    outcome = `reaches ${fmtg(run)} m at ${pyf(r(vEnd, 3))} m/s`;
  }
  const [hops, hopRest] = bounceHops(v1, g, cor, t1);
  const total = Math.max(t1 + t2, hopRest);
  check(total <= MAX_SECONDS, "The motion lasts more than 60 s.");
  const frames = [];
  const n = Math.floor(total * FPS) + 2;
  for (let i = 0; i < n; i++) {
    const t = Math.min(i / FPS, total);
    let s, v, drop, slack;
    if (t <= t1) { s = 0.5 * a * t * t; v = a * t; drop = 0.5 * a * t * t; slack = false; }
    else {
      const tau = t - t1;
      s = Math.min(h + v1 * tau - 0.5 * dec * tau * tau, sEnd); v = Math.max(v1 - dec * tau, 0);
      const [height] = bounceHeight(hops, t, g); drop = h - height; slack = true;
    }
    frames.push({ t: r(t), s: r(s), v: r(v), drop: r(Math.max(drop, 0)), slack });
  }
  const res = [result("Direction", "slope particle moves up, hanging mass moves down"), result("Acceleration a", r(a, 3), "m/s²"),
    result("Tension T", r(T, 3), "N"), result("Friction force μN", r(mu * N, 3), "N"),
    result("Speed when the hanging mass lands", r(v1, 3), "m/s"), result("Then the slope particle", outcome)];
  res.push(cor > 0 ? result("Bounciness of the hanging mass", r(cor, 2)) : result("The hanging mass", "stays on the ground once it lands"));
  Object.assign(meta, { h, cor });
  return { dt: 1 / FPS, frames, results: res, meta };
};

SOLVERS["pulley-extra-mass"] = function (p) {
  const { mA, mx, mB, d, hA, g } = p;
  check(mA > 0 && mx > 0 && mB > 0 && g > 0, "Masses and g must be greater than 0.");
  check(mA + mx > mB, "A with the extra mass must be heavier than B, so that A moves down.");
  check(0 < d && d < hA, "The ring must be between A's start and the ground (0 < d < height of A).");
  const a1 = ((mA + mx - mB) * g) / (mA + mx + mB), T1 = mB * (g + a1);
  const t1 = sqrt((2 * d) / a1), v1 = a1 * t1;
  const a2 = ((mA - mB) * g) / (mA + mB), T2 = mB * (g + a2);
  const rest = hA - d;
  let t2, outcome;
  if (a2 < 0 && (v1 * v1) / (-2 * a2) < rest) { t2 = v1 / -a2; outcome = "stop"; }
  else { t2 = Math.abs(a2) > 1e-12 ? (-v1 + sqrt(v1 * v1 + 2 * a2 * rest)) / a2 : rest / v1; outcome = "ground"; }
  const T = t1 + t2;
  const frame = (t) => {
    let s, v, ph;
    if (t <= t1) { s = 0.5 * a1 * t * t; v = a1 * t; ph = 1; }
    else { const tau = t - t1; s = d + v1 * tau + 0.5 * a2 * tau * tau; v = v1 + a2 * tau; ph = 2; }
    return { t: r(t), s: r(Math.min(s, hA)), v: r(v), ph };
  };
  const [frames, dt] = sample(T, frame);
  const res = [result("Acceleration with the extra mass", r(a1, 4), "m/s²"), result("Tension with the extra mass", r(T1, 3), "N"),
    result("Speed when the extra mass is removed", r(v1, 3), "m/s"), result("Acceleration afterwards (+ = A down)", r(a2, 4), "m/s²"),
    result("Tension afterwards", r(T2, 3), "N")];
  if (outcome === "stop") res.push(result("A comes to rest a further", r((v1 * v1) / (-2 * a2), 3), "m"));
  else res.push(result("A hits the ground at", r(v1 + a2 * t2, 3), "m/s"));
  return { dt, frames, results: res, meta: { hA, d, mA, mx, mB, outcome } };
};

// ---------------------------------------------------------------- Chapter 4
const COL_N = 240;
SOLVERS["collision"] = function (p) {
  const { m1, u1, m2, u2 } = p;
  let v1 = p.v1, v2;
  check(m1 > 0 && m2 > 0, "Both masses must be greater than 0.");
  check(u1 > u2, "P must be moving faster to the right than Q, so that they collide.");
  const total = m1 * u1 + m2 * u2;
  if (p.mode === "coalesce") { v1 = v2 = total / (m1 + m2); }
  else {
    v2 = (total - m1 * v1) / m2;
    check(v2 >= v1 - 1e-9, "With these numbers Q would end up behind P, which is impossible. Change the velocity of P after.");
  }
  const top = Math.max(Math.abs(u1), Math.abs(u2), Math.abs(v1), Math.abs(v2));
  check(top > 0, "At least one particle must move.");
  const ref = Math.min(m1, m2);
  const r1 = Math.min(0.9, 0.3 * Math.pow(m1 / ref, 1 / 3)), r2 = Math.min(0.9, 0.3 * Math.pow(m2 / ref, 1 / 3));
  const S = 6 / top;
  const frames = [];
  for (let i = 0; i <= COL_N; i++) {
    const tau = -1 + (2 * i) / COL_N, after = tau >= 0;
    const [a, b] = after ? [v1, v2] : [u1, u2];
    frames.push({ x1: r(-r1 + a * tau * S), x2: r(r2 + b * tau * S), after });
  }
  const ke = (a, b) => 0.5 * m1 * a * a + 0.5 * m2 * b * b;
  const res = [result("Velocity of P after", r(v1, 3), "m/s"), result("Velocity of Q after", r(v2, 3), "m/s"),
    result("Impulse on P by Q", r(m1 * (v1 - u1), 3), "N s"), result("Momentum before = after", r(total, 3), "kg m/s"),
    result("Kinetic energy lost", r(ke(u1, u2) - ke(v1, v2), 3), "J")];
  return { dt: 1 / 60, frames, results: res, meta: { m1, m2, r1: r(r1), r2: r(r2), top, u: [u1, u2], v: [r(v1), r(v2)] } };
};

SOLVERS["wall-bounce"] = function (p) {
  const { m, u } = p, N = 200;
  check(m > 0 && u > 0, "m and u must be greater than 0.");
  const v = p.mode === "speed" ? p.v : p.I / m - u;
  check(v >= 0, "With that impulse the ball would not rebound. Use a bigger impulse.");
  check(v <= u + 1e-9, "The rebound speed cannot be more than the impact speed.");
  const frames = [];
  for (let i = 0; i <= N; i++) {
    const tau = -1 + (2 * i) / N, d = tau < 0 ? -u * tau : v * tau;
    frames.push({ x: r(d * (5 / u)), after: tau >= 0 });
  }
  const I = m * (u + v);
  const res = [result("Rebound speed", r(v, 3), "m/s"), result("Impulse from the wall", r(I, 3), "N s"),
    result("Momentum before (towards wall +)", r(m * u, 3), "kg m/s"), result("Momentum after", r(-m * v, 3), "kg m/s"),
    result("Kinetic energy lost", r(0.5 * m * (u * u - v * v), 3), "J"), result("e = v ÷ u", r(v / u, 3))];
  return { dt: 1 / 60, frames, results: res, meta: { u, v: r(v), I: r(I) } };
};

SOLVERS["soft-ground"] = function (p) {
  const { m, h, depth: dd, g } = p;
  check(m > 0 && h > 0 && dd > 0 && g > 0, "Every number must be greater than 0.");
  const t1 = sqrt((2 * h) / g), V = g * t1, dec = (V * V) / (2 * dd), t2 = V / dec, R = m * (g + dec);
  const slow = 25, T = t1 + t2 * slow + 0.6;
  const frame = (t) => {
    let y, v, inside;
    if (t <= t1) { y = h - 0.5 * g * t * t; v = g * t; inside = false; }
    else { const tau = Math.min((t - t1) / slow, t2); y = -(V * tau - 0.5 * dec * tau * tau); v = V - dec * tau; inside = true; }
    return { t: r(t), y: r(y), v: r(v), in: inside };
  };
  const [frames, dt] = sample(T, frame);
  const res = [result("Speed hitting the ground", r(V, 3), "m/s"), result("Deceleration in the ground", r(dec, 3), "m/s²"),
    result("Resistance R", r(R, 3), "N"), result("Time to stop in the ground", r(t2, 4), "s"),
    result("Impulse from the ground", r(m * V, 3), "N s")];
  return { dt, frames, results: res, meta: { h, depth: dd, R: r(R), W: r(m * g), slow, V: r(V) } };
};

// ---------------------------------------------------------------- Chapter 5
SOLVERS["plank"] = function (p) {
  const { L, M, m, g } = p, N_FRAMES = 150;
  const xc = p.AC, xd = L - p.DB, a = p.x_from, b = p.x_to;
  check(L > 0 && M > 0 && m > 0 && g > 0, "L, both masses and g must be greater than 0.");
  check(p.AC > 0 && p.DB > 0 && xc < xd, "C and D must both be on the plank, with C closer to A than D.");
  check(0 <= a && a <= L && 0 <= b && b <= L, "The package must stay on the plank (0 to L).");
  const gap = xd - xc;
  const reactions = (x) => {
    const rd = (M * g * (L / 2 - xc) + m * g * (x - xc)) / gap;
    const rc = (M + m) * g - rd;
    if (rc < 0) return [0.0, (M + m) * g, "D"];
    if (rd < 0) return [(M + m) * g, 0.0, "C"];
    return [rc, rd, ""];
  };
  const frames = [];
  for (let i = 0; i <= N_FRAMES; i++) {
    const x = a + ((b - a) * i) / N_FRAMES, [rc, rd, tip] = reactions(x);
    frames.push({ x: r(x), Rc: r(Math.max(rc, 0)), Rd: r(Math.max(rd, 0)), tip });
  }
  const [rc, rd, tip] = reactions(b);
  const lo = xc - (M * (L / 2 - xc)) / m, hi = xc + ((M + m) * gap - M * (L / 2 - xc)) / m;
  const res = [result("Reaction at C", r(Math.max(rc, 0), 2), "N"), result("Reaction at D", r(Math.max(rd, 0), 2), "N")];
  if (tip) res.push(result("Final position", `plank tips about ${tip}`));
  if (lo <= 0 && hi >= L) res.push(result("Tipping", "the package cannot tip the plank anywhere on it"));
  else res.push(result("Plank stays level for x between", `${pyf(r(Math.max(lo, 0), 2))} m and ${pyf(r(Math.min(hi, L), 2))} m`));
  return { dt: 1 / 60, frames, results: res, meta: { L, M, m, g, xc, xd: r(xd) } };
};

// ---------------------------------------------------------------- Chapter 6
SOLVERS["vectors"] = function (p) {
  const { x0a, y0a, vxa, vya, x0b, y0b, vxb, vyb } = p;
  const COLLISION_TOL = 0.4;
  const bearing = (vx, vy) => pymod(degrees(Math.atan2(vx, vy)), 360);
  const speedA = hypot(vxa, vya), speedB = hypot(vxb, vyb);
  check(speedA > 0, "A must be moving: vx and vy cannot both be 0.");
  check(speedB > 0, "B must be moving: vx and vy cannot both be 0.");
  const rx = x0b - x0a, ry = y0b - y0a, dvx = vxb - vxa, dvy = vyb - vya, speed2 = dvx * dvx + dvy * dvy;
  const tStar = speed2 > 1e-9 ? Math.max(0.0, -(rx * dvx + ry * dvy) / speed2) : 0.0;
  const dist = (t) => hypot(rx + dvx * t, ry + dvy * t);
  const dMin = dist(tStar), collide = dMin < COLLISION_TOL;
  const T = collide && tStar > 0 ? tStar : Math.max(tStar * 1.6, 4.0) + 1.0;
  check(T <= MAX_SECONDS, "This motion lasts more than 60 s. Try smaller numbers.");
  const frames = [];
  const n = Math.floor(T * FPS) + 2;
  for (let i = 0; i < n; i++) {
    const t = Math.min(i / FPS, T);
    const xa = x0a + vxa * t, ya = y0a + vya * t, xb = x0b + vxb * t, yb = y0b + vyb * t;
    frames.push({ t: r(t), xa: r(xa), ya: r(ya), xb: r(xb), yb: r(yb), d: r(hypot(xb - xa, yb - ya)) });
  }
  const res = [result("Speed of A", r(speedA, 3), "m/s"), result("Bearing of A", r(bearing(vxa, vya), 1), "°"),
    result("Speed of B", r(speedB, 3), "m/s"), result("Bearing of B", r(bearing(vxb, vyb), 1), "°"),
    result(collide ? "They collide at" : "Time of closest approach", r(tStar, 3), "s")];
  if (!collide) res.push(result("Least distance apart", r(dMin, 3), "m"));
  return { dt: 1 / FPS, frames, results: res,
    meta: { x0a, y0a, vxa, vya, x0b, y0b, vxb, vyb, t_star: r(tStar), d_min: r(dMin), collide, T: r(T) } };
};

SOLVERS["vector-acceleration"] = function (p) {
  const { x0, y0, ux, uy, ax, ay, T } = p;
  check(T > 0, "The time must be greater than 0.");
  check(hypot(ax, ay) > 0 || hypot(ux, uy) > 0, "The particle must move.");
  const frame = (t) => ({ t: r(t), x: r(x0 + ux * t + 0.5 * ax * t * t), y: r(y0 + uy * t + 0.5 * ay * t * t),
    vx: r(ux + ax * t), vy: r(uy + ay * t) });
  const [frames, dt] = sample(T, frame);
  const vx = ux + ax * T, vy = uy + ay * T, last = frames[frames.length - 1];
  const res = [result("Velocity at the end", `(${pyf(r(vx, 3))}i + ${pyf(r(vy, 3))}j) m/s`),
    result("Speed at the end", r(hypot(vx, vy), 3), "m/s"),
    result("Position at the end", `(${pyf(last.x)}i + ${pyf(last.y)}j) m`),
    result("Distance from start", r(hypot(last.x - x0, last.y - y0), 3), "m")];
  if (ay !== 0 && 0 < -uy / ay && -uy / ay <= T) res.push(result("Moving parallel to i at", r(-uy / ay, 3), "s"));
  if (ax !== 0 && 0 < -ux / ax && -ux / ax <= T) res.push(result("Moving parallel to j at", r(-ux / ax, 3), "s"));
  const bearing = pymod(90 - degrees(Math.atan2(vy, vx)), 360);
  res.push(result("Bearing of motion at the end", r(bearing, 1), "°"));
  return { dt, frames, results: res, meta: { ax, ay, x0, y0 } };
};


// ---------------------------------------------------------------- Added scenes
SOLVERS["hanging-strings"] = function (p) {
  const W = p.W, al = radians(p.alpha), be = radians(p.beta), force = p.second === "force";
  check(W > 0, "W must be greater than 0.");
  check(0 < p.alpha && p.alpha < 90 && 0 < p.beta && p.beta < 90, "Both angles must be between 0° and 90°.");
  const s = sin(al + be), T1 = (W * cos(be)) / s, T2 = (W * cos(al)) / s;
  const second = force ? "Force F" : "Tension in BC", N_FRAMES = 90, frames = [];
  for (let i = 0; i < N_FRAMES; i++) frames.push({ k: r(i / (N_FRAMES - 1)) });
  const res = [result("Tension in AC", r(T1, 3), "N"), result("Tension in AC as a multiple of W", r(T1 / W, 4)),
    result(second, r(T2, 3), "N"), result(second + " as a multiple of W", r(T2 / W, 4)),
    result("Horizontal parts (equal)", r(T1 * cos(al), 3), "N"),
    result("Vertical parts add up to W", r(T1 * sin(al) + T2 * sin(be), 3), "N")];
  return { dt: 1 / 45, frames, results: res, meta: { W, alpha: p.alpha, beta: p.beta, T1: r(T1), T2: r(T2), second: p.second } };
};

SOLVERS["rough-surface"] = function (p) {
  const { angle: ang, m, mu, g, F1, th1: t1, F2, th2: t2 } = p, N = 300;
  check(0 <= ang && ang < 90, "The angle of the surface must be at least 0° (flat ground) and less than 90°.");
  check(m > 0 && g > 0 && mu >= 0, "m and g must be greater than 0, and μ cannot be negative.");
  check(F1 >= 0 && F2 >= 0, "A force cannot be negative: turn it round with its angle instead.");
  const a = radians(ang), W = m * g;
  const c1 = cos(radians(t1)), s1 = sin(radians(t1)), c2 = cos(radians(t2)), s2 = sin(radians(t2));
  const a0 = W * sin(a) - F2 * c2, r0 = W * cos(a) - F2 * s2;
  const at = (F) => [r0 - F * s1, a0 - F * c1];
  let lower = 0.0, upper = Infinity, empty = false;
  for (const [k, c] of [[s1, -r0], [-c1 + mu * s1, a0 - mu * r0], [c1 + mu * s1, -a0 - mu * r0]]) {
    if (Math.abs(k) < 1e-12) { if (c > 1e-9) empty = true; }
    else if (k > 0) upper = Math.min(upper, -c / k);
    else lower = Math.max(lower, -c / k);
  }
  if (lower > upper + 1e-9) empty = true;
  const [R, need] = at(F1), lim = mu * Math.max(R, 0.0), tol = Math.max(0.005 * lim, 1e-6);
  let state;
  if (R < -1e-9) state = "lifts off the surface";
  else if (Math.abs(need) < lim - tol) state = "stays at rest";
  else if (Math.abs(Math.abs(need) - lim) <= tol) state = "is on the point of sliding " + (need > 0 ? "down" : "up");
  else state = "slides " + (need > 0 ? "down" : "up");
  const top = empty ? Math.max(F1, W) : upper !== Infinity ? upper : lower * 1.6 + 0.6 * W + 1;
  const Fmax = Math.max(1.3 * top, 1.15 * F1, 1.0), frames = [];
  for (let i = 0; i <= N; i++) {
    const F = (Fmax * i) / N, [Rf, nd] = at(F);
    let fr, st, lm;
    if (Rf < -1e-9) { fr = 0.0; st = "lift"; lm = 0.0; }
    else {
      lm = mu * Rf;
      if (Math.abs(nd) <= lm + 1e-9) { fr = nd; st = "rest"; }
      else if (nd > 0) { fr = lm; st = "down"; }
      else { fr = -lm; st = "up"; }
    }
    frames.push({ P: r(F, 3), F: r(fr, 3), R: r(Rf, 3), lim: r(lm, 3), state: st });
  }
  const res = [result("Normal reaction R", r(R, 3), "N"), result("Friction needed (+ is up the surface)", r(need, 3), "N"),
    result("Greatest friction μR", r(lim, 3), "N"), result("The particle", state)];
  if (empty) res.push(result("Equilibrium", "no value of F1 keeps the particle at rest"));
  else {
    res.push(result("Smallest force F1 for equilibrium", lower > 1e-9 ? r(lower, 3) : "0 (it stays at rest without F1)", lower > 1e-9 ? "N" : ""));
    res.push(result("Greatest force F1 for equilibrium", upper !== Infinity ? r(upper, 3) : "no limit", upper !== Infinity ? "N" : ""));
  }
  return { dt: 6 / N, frames, results: res,
    meta: { angle: ang, W: r(W), lo: empty ? null : r(lower), hi: empty || upper === Infinity ? null : r(upper), Fmax: r(Fmax), F1, th1: t1, F2, th2: t2, empty } };
};

// ---- stages
const STAGE_NUM = /^[+-]?(\d+\.?\d*|\.\d+)$/;
const STAGE_HELP = "write each stage as duration:acceleration, for example 5:2, 15:0, 4:-2.5";
function parseStages(s, name) {
  const out = [];
  for (let piece of s.trim().split(",")) {
    piece = piece.trim();
    if (piece === "") continue;
    const parts = piece.split(":").map((x) => x.trim());
    check(parts.length === 2 && parts.every((x) => STAGE_NUM.test(x)), `${name}: ${STAGE_HELP}.`);
    const d = Number(parts[0]), a = Number(parts[1]);
    check(d > 0, `${name}: every stage must last more than 0 s.`);
    out.push([d, a]);
  }
  check(out.length <= 8, `${name}: use at most 8 stages.`);
  return out;
}
function buildVehicle(stages, start, u, xBefore) {
  const segs = []; let t = start, v = u, x = xBefore;
  for (const [d, a] of stages) { segs.push([t, t + d, a, v, x]); x += v * d + 0.5 * a * d * d; v += a * d; t += d; }
  return { segs, start, x0: xBefore, end: t, vend: v, xend: x };
}
function vehicleState(veh, t) {
  if (t < veh.start) return [veh.x0, 0.0, 0.0];
  const n = veh.segs.length;
  for (let i = 0; i < n; i++) {
    const [t0, t1, a, v0, x0] = veh.segs[i];
    if (t < t1 || (i === n - 1 && t <= t1)) { const tau = t - t0; return [x0 + v0 * tau + 0.5 * a * tau * tau, v0 + a * tau, a]; }
  }
  const tau = t - veh.end;
  return [veh.xend + veh.vend * tau, veh.vend, 0.0];
}
function pathLength(veh) {
  let total = 0.0;
  for (const [t0, t1, a, v0] of veh.segs) {
    const d = t1 - t0, xe = v0 * d + 0.5 * a * d * d;
    if (Math.abs(a) > 1e-12 && v0 * (v0 + a * d) < 0) { const ts = -v0 / a, xt = v0 * ts + 0.5 * a * ts * ts; total += Math.abs(xt) + Math.abs(xe - xt); }
    else total += Math.abs(xe);
  }
  return total;
}
function turnTimes(veh) {
  const out = []; let prev = 0;
  for (const [t0, t1, a, v0] of veh.segs) {
    const v1 = v0 + a * (t1 - t0);
    const s0 = Math.abs(v0) < 1e-9 ? 0 : v0 > 0 ? 1 : -1, s1 = Math.abs(v1) < 1e-9 ? 0 : v1 > 0 ? 1 : -1;
    if (s0 !== 0) { if (prev !== 0 && s0 !== prev) out.push(t0); prev = s0; }
    if (s0 * s1 < 0 && Math.abs(a) > 1e-12) { out.push(t0 - v0 / a); prev = s1; }
    else if (s1 !== 0) { if (prev !== 0 && s1 !== prev) out.push(t0); prev = s1; }
  }
  return out;
}
function timesAtSpeed(veh, vm) {
  const ts = [];
  for (const [t0, t1, a, v0] of veh.segs) {
    if (Math.abs(a) > 1e-12) { const t = t0 + (vm - v0) / a; if (t0 - 1e-9 <= t && t <= t1 + 1e-9) ts.push(Math.min(Math.max(t, t0), t1)); }
  }
  ts.sort((x, y) => x - y);
  const out = [];
  for (const t of ts) if (!out.length || Math.abs(t - out[out.length - 1]) > 1e-7) out.push(t);
  return out;
}
function signCrossings(fn, T, steps = 4000, tol = 1e-9) {
  const roots = []; let tl = 0.0, dl = 0.0;
  for (let k = 0; k <= steps; k++) {
    const t = (T * k) / steps, d = fn(t);
    if (Math.abs(d) < tol) continue;
    if (dl !== 0.0 && d > 0 !== dl > 0) {
      let lo = tl, hi = t; const pos = dl > 0;
      for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2, dm = fn(mid); if (dm !== 0 && dm > 0 === pos) lo = mid; else hi = mid; }
      roots.push([(lo + hi) / 2, pos ? 1 : -1]);
    }
    tl = t; dl = d;
  }
  return roots;
}
const joinTimes = (ts) => ts.map((t) => `${pyf(r(t, 3))} s`).join(" and ");

SOLVERS["stages"] = function (p) {
  const A = parseStages(p.A_stages, "Vehicle A"), B = parseStages(p.B_stages, "Vehicle B");
  check(A.length >= 1, "Vehicle A needs at least one stage.");
  const { startB, x0B, vmark: vm, tmark: tm } = p;
  check(startB >= 0, "Vehicle B cannot start before t = 0.");
  check(vm >= 0 && tm >= 0, "The marks cannot be negative.");
  const hasB = B.length > 0, veh = { A: buildVehicle(A, 0.0, p.uA, 0.0) };
  if (hasB) veh.B = buildVehicle(B, startB, p.uB, x0B);
  const T = Math.max(...Object.values(veh).map((v) => v.end));
  const frame = (t) => {
    const [xa, va, aa] = vehicleState(veh.A, t), [xb, vb, ab] = hasB ? vehicleState(veh.B, t) : [0.0, 0.0, 0.0];
    return { t: r(t), xA: r(xa), vA: r(va), aA: r(aa), xB: r(xb), vB: r(vb), aB: r(ab) };
  };
  const [frames, dt, speedup] = sampleLapse(T, frame);
  const res = [];
  for (const [name, v] of Object.entries(veh)) {
    v.segs.forEach(([t0, t1, a, v0], i) => res.push(result(`${name}: stage ${i + 1} ends`, `t = ${fmtg(r(t1, 3))} s, speed ${pyf(r(v0 + a * (t1 - t0), 3))} m/s`)));
    res.push(result(`${name}: total time`, r(v.end - v.start, 3), "s"));
    res.push(result(`${name}: distance travelled`, r(pathLength(v), 3), "m"));
    res.push(result(`${name}: displacement`, r(v.xend - v.x0, 3), "m"));
    for (const tt of turnTimes(v)) res.push(result(`${name}: turns round at t`, r(tt, 3), "s"));
    if (vm > 0) { const ts = timesAtSpeed(v, vm); res.push(result(`${name} has speed ${fmtg(vm)} m/s at t`, ts.length ? joinTimes(ts) : "never")); }
  }
  if (hasB) {
    for (const [root, was] of signCrossings((t) => vehicleState(veh.B, t)[0] - vehicleState(veh.A, t)[0], T)) {
      const [who, other] = was < 0 ? ["B", "A"] : ["A", "B"];
      res.push(result(`${who} overtakes ${other} at t`, r(root, 3), "s"));
      res.push(result("Speeds of A and B then", `${pyf(r(vehicleState(veh.A, root)[1], 3))} and ${pyf(r(vehicleState(veh.B, root)[1], 3))} m/s`));
    }
    const eq = signCrossings((t) => vehicleState(veh.A, t)[1] - vehicleState(veh.B, t)[1], T)
      .map(([t]) => t).filter((t) => Math.abs(vehicleState(veh.A, t)[1]) > 1e-9 && Math.abs(vehicleState(veh.B, t)[1]) > 1e-9);
    if (eq.length) res.push(result("The speeds are equal at t", joinTimes(eq)));
  }
  if (tm > 0) {
    for (const [name, v] of Object.entries(veh)) {
      const [x, s] = vehicleState(v, tm);
      res.push(result(`${name} at t = ${fmtg(tm)} s`, `${pyf(r(x, 3))} m from the start, speed ${pyf(r(s, 3))} m/s`));
    }
    if (hasB) res.push(result("Distance between the vehicles", r(Math.abs(vehicleState(veh.B, tm)[0] - vehicleState(veh.A, tm)[0]), 3), "m"));
  }
  if (speedup > 1) res.push(result("Playback", `time-lapse, ${pyf(r(speedup, 1))} times faster than real time`));
  const xs = frames.map((f) => f.xA).concat(hasB ? frames.map((f) => f.xB) : []);
  return { dt, frames, results: res,
    meta: { hasB, T: r(T), graph: p.graph, vmark: vm, tmark: tm, xmin: r(Math.min(...xs)), xmax: r(Math.max(...xs)), startB } };
};

// ---- beam
function leq(cons) {
  let lo = -Infinity, hi = Infinity, empty = false;
  for (const [k, c] of cons) {
    if (Math.abs(k) < 1e-12) { if (c > 1e-9) empty = true; }
    else if (k > 0) hi = Math.min(hi, -c / k);
    else lo = Math.max(lo, -c / k);
  }
  return [lo, hi, empty || lo > hi + 1e-9];
}
SOLVERS["beam"] = function (p) {
  const { L, M, G, g, m1, x_from: xa, x_to: xb, m2, x2, m3, x3, limit, pivot } = p, N = 150;
  const sup = [[p.n1, p.s1, p.k1], [p.n2, p.s2, p.k2]].filter(([, , k]) => k !== "none").map(([name, pos, kind]) => ({ name, pos, kind }));
  check(L > 0 && g > 0, "L and g must be greater than 0.");
  check(M >= 0, "The mass of the beam cannot be negative.");
  check(0 <= G && G <= L, "The centre of mass of the beam must be on the beam (0 to L).");
  check(sup.every((s) => 0 <= s.pos && s.pos <= L), "Every support must be on the beam (0 to L).");
  check([xa, xb, x2, x3].every((x) => 0 <= x && x <= L), "Every load must be on the beam (0 to L).");
  check(limit >= 0, "The most force a rope can take cannot be negative.");
  check(pivot < 0 || pivot <= L, "The point for moments must be on the beam (0 to L), or -1 for none.");
  check(M > 0 || m1 !== 0 || m2 !== 0 || m3 !== 0, "Put at least one weight on the beam.");
  if (sup.length === 2) {
    check(sup[0].pos !== sup[1].pos, "The two supports must be at different places.");
    if (sup[0].pos > sup[1].pos) sup.reverse();
  }
  const n = sup.length;
  const loads = (x, moving = true) => [[M * g, G], [moving ? m1 * g : 0.0, x], [m2 * g, x2], [m3 * g, x3]].filter(([w]) => w !== 0);
  const sum = (arr) => arr.reduce((s, v) => s + v, 0);
  const eq = (x) => {
    const ld = loads(x), Wt = sum(ld.map(([w]) => w)), tol = 1e-9 * Math.max(1.0, Math.abs(Wt));
    if (n === 0) return { R: [], Wt, tip: "", lim: "" };
    if (n === 1) {
      const tau = sum(ld.map(([w, pos]) => w * (pos - sup[0].pos)));
      return { R: [Wt], Wt, tip: Math.abs(tau) <= 1e-9 * Math.max(1.0, Math.abs(Wt) * L) ? "" : tau > 0 ? "B" : "A", lim: "" };
    }
    const s1p = sup[0].pos, s2p = sup[1].pos;
    let R2 = sum(ld.map(([w, pos]) => w * (pos - s1p))) / (s2p - s1p), R1 = Wt - R2;
    if (Math.abs(R1) <= tol) R1 = 0.0;
    if (Math.abs(R2) <= tol) R2 = 0.0;
    let tip = "", atlim = "";
    if (R1 < 0 && sup[0].kind !== "bolt") { tip = sup[0].name; R1 = 0.0; R2 = Wt; }
    else if (R2 < 0 && sup[1].kind !== "bolt") { tip = sup[1].name; R1 = Wt; R2 = 0.0; }
    else if (R1 === 0 && sup[0].kind !== "bolt") atlim = sup[0].name;
    else if (R2 === 0 && sup[1].kind !== "bolt") atlim = sup[1].name;
    return { R: [R1, R2], Wt, tip, lim: atlim };
  };
  const frames = []; let fmax = 0.0;
  for (let i = 0; i <= N; i++) {
    const x = xa + ((xb - xa) * i) / N, e = eq(x);
    const R1 = n > 0 ? e.R[0] : 0.0, R2 = n > 1 ? e.R[1] : 0.0;
    const over = limit > 0 && e.R.some((v, j) => Math.abs(v) > limit + 1e-9 && sup[j].kind !== "support");
    fmax = Math.max(fmax, Math.abs(R1), Math.abs(R2), ...loads(x).map(([w]) => Math.abs(w)), 0.0);
    frames.push({ x: r(x), R1: r(R1, 3), R2: r(R2, 3), tip: e.tip, over });
  }
  const e = eq(xb), res = [];
  sup.forEach((s, j) => {
    const R = e.R[j];
    const label = s.kind === "rope" ? `Tension in the rope at ${s.name}` : s.kind === "bolt" ? `Force at ${s.name} (bolt)` : `Reaction at ${s.name}`;
    if (s.kind === "bolt" && R < -1e-9) res.push(result(label, `${pyf(r(-R, 2))} N downwards`));
    else res.push(result(label, r(R, 2), "N"));
  });
  if (n === 1) res.push(result(`Moments about ${sup[0].name}`, !e.tip ? "balanced" : `not balanced: end ${e.tip} goes down`));
  if (e.tip && n === 2) res.push(result("The beam", `tips: it lifts off at ${e.tip}`));
  else if (e.lim) res.push(result("The beam", `is on the point of lifting off at ${e.lim}`));
  res.push(result("Total weight on the supports", r(e.Wt, 2), "N"));
  if (pivot >= 0) {
    let tot = 0.0;
    for (const [w, pos] of loads(xb)) {
      const mom = w * (pos - pivot); tot += mom;
      res.push(result(`Moment of the ${fmtg(r(Math.abs(w), 3))} N ${w > 0 ? "downward" : "upward"} force at ${fmtg(r(pos, 3))} m`, r(mom, 3), "N m"));
    }
    res.push(result(`Resultant moment about ${fmtg(pivot)} m from A (clockwise is +)`, r(tot, 3), "N m"));
  }
  if (m1 !== 0 && n === 2) {
    const s1p = sup[0].pos, s2p = sup[1].pos, others = loads(xb, false);
    const W0 = sum(others.map(([w]) => w)), F0 = sum(others.map(([w, pos]) => w * (pos - s1p))), W1 = m1 * g, gap = s2p - s1p;
    const constraints = (a2, b2, a1, b1) => {
      const out = [];
      for (const [[a, b], s] of [[[a1, b1], sup[0]], [[a2, b2], sup[1]]]) {
        if (s.kind !== "bolt") out.push([-b, -a]);
        if (limit > 0 && s.kind !== "support") { out.push([b, a - limit]); if (s.kind === "bolt") out.push([-b, -a - limit]); }
      }
      return out;
    };
    let b2 = W1 / gap, a2 = (F0 - W1 * s1p) / gap;
    let [lo, hi, empty] = leq(constraints(a2, b2, W0 + W1 - a2, -b2).concat([[1.0, -L], [-1.0, 0.0]]));
    res.push(result("Moving load is safe for x between", empty ? "never" : `${pyf(r(lo, 3))} m and ${pyf(r(hi, 3))} m`));
    if (m1 > 0) {
      b2 = (g * (xb - s1p)) / gap; a2 = F0 / gap;
      [lo, hi, empty] = leq(constraints(a2, b2, W0 - a2, g - b2).concat([[-1.0, 0.0]]));
      if (empty) res.push(result("Greatest mass of the moving load", "none"));
      else if (hi === Infinity) res.push(result("Greatest mass of the moving load", "no limit"));
      else res.push(result("Greatest mass of the moving load", r(hi, 3), "kg"));
    }
  }
  return { dt: 1 / 60, frames, results: res,
    meta: { L, G, M, g, n, limit, fmax: r(fmax, 3), sup: sup.map((s) => ({ name: s.name, pos: s.pos, kind: s.kind })),
      loads: [[m2, x2], [m3, x3]].filter(([m]) => m !== 0).map(([m, x]) => ({ m, x })), m1, pivot } };
};

// One entry point for the page and for the tests.
function solveScene(id, params) {
  const fn = SOLVERS[id];
  if (!fn) throw new InputError("Unknown scene: " + id);
  return fn(params);
}
if (typeof module !== "undefined") module.exports = { SOLVERS, solveScene, InputError };

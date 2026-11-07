// One draw function per scene. The server (Python) does all the physics;
// these functions only turn one frame of numbers into a picture.
const INK = "#16324f", RED = "#c4302b", MUTED = "#52687d", GRID = "#dbe6f0", PAPER = "#fbfcfe";
const BLUE_FILL = "#8fb0cf", RED_FILL = "#eba9a5";

const nf = (x, d = 2) => String(Number(Number(x).toFixed(d)));
const fontSize = (W) => (W < 520 ? 12 : 14);

function text(g, s, x, y, o = {}) {
  const c = g.ctx;
  c.font = `${o.bold ? "600 " : ""}${o.size || fontSize(g.W)}px ui-sans-serif, system-ui, sans-serif`;
  c.fillStyle = o.color || INK;
  c.textAlign = o.align || "left";
  c.textBaseline = o.base || "middle";
  c.fillText(s, x, y);
}

// The per-frame numbers (t =, height =, ...) used to be drawn onto the canvas
// itself; now the draw functions still call readout() with the same lines,
// but it just records them here so app.js can show them as HTML text below
// the canvas instead - see getReadout().
let _lastReadout = [];
function readout(g, lines) { _lastReadout = lines; }
function getReadout() { return _lastReadout; }

function line(g, x0, y0, x1, y1, color = INK, lw = 2, dash = []) {
  const c = g.ctx;
  c.strokeStyle = color; c.lineWidth = lw; c.setLineDash(dash);
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.setLineDash([]);
}

function circle(g, x, y, r, fill) {
  const c = g.ctx;
  c.fillStyle = fill; c.strokeStyle = INK; c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
}

function arrow(g, x0, y0, x1, y1, color, label, o = {}) {
  const c = g.ctx, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  if (len < 3) return;
  const ux = dx / len, uy = dy / len, head = Math.min(11, len * 0.5), k = head * 0.45;
  line(g, x0, y0, x1 - ux * head * 0.8, y1 - uy * head * 0.8, color, o.lw || 2.5);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x1 - ux * head - uy * k, y1 - uy * head + ux * k);
  c.lineTo(x1 - ux * head + uy * k, y1 - uy * head - ux * k);
  c.closePath(); c.fill();
  if (label) text(g, label, x1 + ux * 12, y1 + uy * 12, { color, bold: true, align: "center" });
}

function niceStep(range, target) {
  const raw = range / target, pow = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / pow;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow;
}

function box(g, cx, cy, w, h, fill, label) {
  const c = g.ctx;
  c.fillStyle = fill; c.strokeStyle = INK; c.lineWidth = 2;
  c.fillRect(cx - w / 2, cy - h / 2, w, h); c.strokeRect(cx - w / 2, cy - h / 2, w, h);
  if (label) text(g, label, cx, cy, { bold: true, align: "center", size: Math.min(fontSize(g.W), Math.max(10, h * 0.32)) });
}

const SCENES = {
  // ---------------------------------------------------------------- Chapter 1
  "vertical-projection": {
    draw(g, f, m) {
      const { ctx, W, H } = g, top = 44, bottom = H - 48, left = 64;
      const span = m.H * 1.2, sy = (bottom - top) / span, Y = (y) => bottom - y * sy, cx = W * 0.55;
      line(g, left, top, left, bottom, MUTED, 1.5);
      const step = niceStep(span, 6);
      for (let v = 0; v <= span; v += step) {
        line(g, left - 5, Y(v), left, Y(v), MUTED, 1.5);
        text(g, nf(v, 1), left - 9, Y(v), { align: "right", color: MUTED });
      }
      text(g, "height above A (m)", left, top - 18, { color: MUTED });
      line(g, left, bottom, W - 16, bottom, INK, 2);
      text(g, "A", cx, bottom + 18, { bold: true, align: "center" });
      line(g, left, Y(m.H), W - 16, Y(m.H), MUTED, 1.2, [6, 5]);
      text(g, `greatest height ${nf(m.H)} m`, W - 20, Y(m.H) - 10, { align: "right", color: MUTED });
      if (m.level > 0 && m.level < m.H) {
        line(g, left, Y(m.level), W - 16, Y(m.level), RED, 1.4, [6, 5]);
        text(g, `${nf(m.level)} m`, W - 20, Y(m.level) - 10, { align: "right", color: RED });
      }
      circle(g, cx, Y(f.y), 11, BLUE_FILL);
      arrow(g, cx + 28, Y(f.y), cx + 28, Y(f.y) - f.v * (70 / m.u), RED, "v");
      readout(g, [`t = ${nf(f.t)} s`, `height = ${nf(f.y)} m`, `v = ${nf(f.v)} m/s`]);
    },
  },

  overtaking: {
    draw(g, f, m) {
      const { ctx, W, H } = g, top = 30, midGap = 18;
      const graphH = Math.round(H * 0.42), graphTop = top, graphBottom = graphTop + graphH;
      const roadTop = graphBottom + midGap + 26, roadBottom = H - 30;
      const left = 56, right = W - 16;
      const vmax = Math.max(m.u, m.v) * 1.18, tk = (right - left) / m.T, vk = (graphBottom - graphTop) / vmax;
      const X = (t) => left + t * tk, Y = (v) => graphBottom - v * vk;
      const CAR = "#3b6ea5";

      // -- speed-time graph --
      text(g, "speed (m/s)", left, graphTop - 14, { color: MUTED });
      line(g, left, graphTop, left, graphBottom, MUTED, 1.5);
      line(g, left, graphBottom, right, graphBottom, INK, 2);
      const vstep = niceStep(vmax, 4);
      for (let vv = 0; vv <= vmax; vv += vstep) {
        line(g, left - 5, Y(vv), left, Y(vv), MUTED, 1.5);
        text(g, nf(vv, 0), left - 9, Y(vv), { align: "right", color: MUTED, size: fontSize(W) - 1 });
      }
      line(g, X(0), Y(m.u), X(f.t), Y(m.u), CAR, 3);
      const t1 = Math.min(f.t, m.t1);
      line(g, X(0), Y(0), X(t1), Y(m.a * t1), RED, 3);
      if (f.t > m.t1) line(g, X(m.t1), Y(m.v), X(f.t), Y(m.v), RED, 3);
      circle(g, X(f.t), Y(m.u), 4, CAR);
      circle(g, X(f.t), Y(f.vQ), 4, RED);
      text(g, "car", X(f.t) + 10, Y(m.u) - 12, { color: CAR, bold: true });
      text(g, "cyclist", X(f.t) + 10, Y(f.vQ) + (f.t > m.t1 ? 14 : -12), { color: RED, bold: true });
      if (m.t_catch <= m.T) line(g, X(m.t_catch), graphTop, X(m.t_catch), graphBottom, MUTED, 1.2, [5, 5]);

      // -- road --
      const xmax = m.x_catch * 1.15, rk = (right - left) / xmax, RX = (x) => left + x * rk;
      line(g, left, roadBottom, right, roadBottom, INK, 2);
      text(g, "O", left, roadBottom + 16, { bold: true });
      if (m.t_catch <= m.T) {
        line(g, RX(m.x_catch), roadTop, RX(m.x_catch), roadBottom, MUTED, 1.2, [5, 5]);
        text(g, "caught here", RX(m.x_catch), roadTop - 4, { align: "center", color: MUTED, size: fontSize(W) - 1 });
      }
      circle(g, RX(f.xP), roadTop + 16, 9, "#a9c3dc");
      circle(g, RX(f.xQ), roadTop + 42, 9, RED_FILL);
      text(g, "car", RX(f.xP), roadTop - 2, { align: "center", color: CAR, bold: true, size: fontSize(W) - 1 });
      readout(g, [`t = ${nf(f.t)} s`, `car: ${nf(f.xP)} m`, `cyclist: ${nf(f.xQ)} m at ${nf(f.vQ)} m/s`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 3
  "inclined-plane": {
    draw(g, f, m) {
      const { ctx, W, H } = g, th = (m.angle * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th), pad = 46;
      const Lp = Math.min((W - 2 * pad) / cs, (H - 2 * pad - 24) / sn);
      const bx = W - pad, by = H - pad, tx = bx - Lp * cs, ty = by - Lp * sn;
      ctx.fillStyle = "#e6eef6"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx, by); ctx.lineTo(tx, by); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by, 38, Math.PI, Math.PI + th); ctx.strokeStyle = MUTED; ctx.stroke();
      text(g, `${nf(m.angle, 1)}°`, bx - 46, by + 18, { color: MUTED, align: "center" });

      const w = Math.max(38, Lp * 0.08), h = w * 0.65;
      const along = w / 2 + (f.s / m.length) * (Lp - w);
      const px = tx + cs * along, py = ty + sn * along;
      ctx.save(); ctx.translate(px, py); ctx.rotate(th);
      ctx.fillStyle = BLUE_FILL; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.fillRect(-w / 2, -h, w, h); ctx.strokeRect(-w / 2, -h, w, h);
      ctx.restore();

      const cx = px + (sn * h) / 2, cy = py - (cs * h) / 2, unit = Math.min(90, Lp * 0.3);
      arrow(g, cx, cy, cx, cy + unit, INK, "W");
      arrow(g, px, py, px + sn * unit * cs, py - cs * unit * cs, INK, "N");
      arrow(g, px, py, px - cs * unit * (f.F / m.weight), py - sn * unit * (f.F / m.weight), RED, "F");
      readout(g, [`t = ${nf(f.t)} s`, `distance = ${nf(f.s)} m`, `speed = ${nf(f.v)} m/s`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 4
  collision: {
    draw(g, f, m) {
      const { ctx, W, H } = g, sc = (W - 40) / 16, X = (x) => W / 2 + x * sc, gy = H * 0.66;
      line(g, 16, gy, W - 16, gy, INK, 2);
      line(g, X(0), gy - 90, X(0), gy, MUTED, 1, [4, 5]);
      text(g, f.after ? "After the collision" : "Before the collision", W / 2, 24, { bold: true, align: "center", size: fontSize(W) + 2 });
      const v = f.after ? m.v : m.u;
      [[f.x1, m.r1, BLUE_FILL, "P", m.m1, v[0]], [f.x2, m.r2, RED_FILL, "Q", m.m2, v[1]]].forEach(([x, r, fill, name, mass, vel]) => {
        const cy = gy - r * sc;
        circle(g, X(x), cy, r * sc, fill);
        text(g, name, X(x), cy, { bold: true, align: "center" });
        const ay = gy - 2 * Math.max(m.r1, m.r2) * sc - 34;
        text(g, `${name}: ${nf(mass)} kg`, X(x), ay - 40, { align: "center", color: MUTED });
        text(g, `${nf(vel)} m/s`, X(x), ay - 18, { align: "center", color: RED, bold: true });
        if (Math.abs(vel) > 1e-9) arrow(g, X(x) - (vel / m.top) * 40, ay, X(x) + (vel / m.top) * 40, ay, RED, "");
      });
      text(g, "right is positive", 16, H - 16, { color: MUTED });
      readout(g, [`P: ${nf(v[0], 2)} m/s`, `Q: ${nf(v[1], 2)} m/s`, `momentum of P and Q together = ${nf(m.m1 * v[0] + m.m2 * v[1], 2)} kg m/s`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 5
  plank: {
    draw(g, f, m) {
      const { ctx, W, H } = g, left = 50, right = W - 50, X = (x) => left + (x / m.L) * (right - left);
      const py = H * 0.5, th = 14, sup = 22, wt = (m.M + m.m) * m.g, unit = (H * 0.2) / wt;
      [[m.xc, "C"], [m.xd, "D"]].forEach(([x, name]) => {
        ctx.fillStyle = INK; ctx.beginPath();
        ctx.moveTo(X(x), py + th); ctx.lineTo(X(x) - 16, py + th + sup); ctx.lineTo(X(x) + 16, py + th + sup); ctx.closePath(); ctx.fill();
        text(g, name, X(x) + 26, py + th + sup * 0.7, { bold: true });
      });
      ctx.fillStyle = "#e6eef6"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.fillRect(left, py, right - left, th); ctx.strokeRect(left, py, right - left, th);
      text(g, "A", left, py - 14, { bold: true, align: "center" });
      text(g, "B", right, py - 14, { bold: true, align: "center" });

      const pk = 30, bx = X(f.x);
      ctx.fillStyle = BLUE_FILL; ctx.fillRect(bx - pk / 2, py - pk, pk, pk); ctx.strokeRect(bx - pk / 2, py - pk, pk, pk);
      arrow(g, bx, py - pk - m.m * m.g * unit, bx, py - pk, INK, "");
      text(g, `${nf(m.m * m.g, 1)} N`, bx, py - pk - m.m * m.g * unit - 12, { align: "center", color: MUTED });
      const baseY = py + th + sup;
      arrow(g, X(m.L / 2), py + th, X(m.L / 2), py + th + m.M * m.g * unit, INK, "");
      text(g, `${nf(m.M * m.g, 1)} N`, X(m.L / 2) + 8, py + th + (m.M * m.g * unit) / 2, { color: MUTED });
      [[m.xc, f.Rc, "C"], [m.xd, f.Rd, "D"]].forEach(([x, R, name]) => {
        arrow(g, X(x), baseY + R * unit, X(x), baseY, RED, "");
        text(g, `Reaction at ${name}: ${nf(R, 1)} N`, X(x), baseY + R * unit + 14, { align: "center", color: RED });
      });
      if (f.tip) text(g, `The plank tips about ${f.tip}`, W / 2, 26, { bold: true, align: "center", color: RED, size: fontSize(W) + 3 });
      readout(g, [`package at ${nf(f.x)} m from A`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 2
  "hanging-strings": {
    draw(g, f, m) {
      const { ctx, W, H } = g, top = 46, al = (m.alpha * Math.PI) / 180, be = (m.beta * Math.PI) / 180;
      const y = 1 / (1 / Math.tan(al) + 1 / Math.tan(be)), xC = y / Math.tan(al);
      const k = Math.min((W * 0.5) / 1, (H - top - 110) / y), ax = (W - k) / 2, bx = ax + k;
      const cx = ax + xC * k, cy = top + y * k;
      line(g, ax - 40, top, bx + 40, top, INK, 3);
      const isForce = m.second === "force";
      line(g, ax, top, cx, cy, INK, 2); if (!isForce) line(g, bx, top, cx, cy, INK, 2);
      text(g, "A", ax, top - 14, { bold: true, align: "center" }); if (!isForce) text(g, "B", bx, top - 14, { bold: true, align: "center" });
      text(g, `${nf(m.alpha, 1)}°`, ax + 46, top + 14, { color: MUTED, align: "center" });
      if (!isForce) text(g, `${nf(m.beta, 1)}°`, bx - 46, top + 14, { color: MUTED, align: "center" });
      circle(g, cx, cy, 10, BLUE_FILL); text(g, "C", cx + 20, cy + 12, { bold: true });
      const s = (100 / Math.max(m.T1, m.T2, m.W)) * f.k;
      const t1 = [cx - m.T1 * Math.cos(al) * s, cy - m.T1 * Math.sin(al) * s];
      const t2 = [cx + m.T2 * Math.cos(be) * s, cy - m.T2 * Math.sin(be) * s];
      line(g, cx, cy, t1[0], cy, MUTED, 1.2, [4, 4]); line(g, t1[0], cy, t1[0], t1[1], MUTED, 1.2, [4, 4]);
      line(g, cx, cy, t2[0], cy, MUTED, 1.2, [4, 4]); line(g, t2[0], cy, t2[0], t2[1], MUTED, 1.2, [4, 4]);
      arrow(g, cx, cy, t1[0], t1[1], RED, `T1 = ${nf(m.T1 * f.k, 1)} N`);
      arrow(g, cx, cy, t2[0], t2[1], RED, `${isForce ? "F" : "T2"} = ${nf(m.T2 * f.k, 1)} N`);
      arrow(g, cx, cy, cx, cy + m.W * s, INK, `W = ${nf(m.W * f.k, 1)} N`);
      readout(g, [`pulling ${nf(f.k * 100, 0)}% of the way to the full weight`, `T1 = ${nf(m.T1 * f.k, 1)} N`, `${isForce ? "F" : "T2"} = ${nf(m.T2 * f.k, 1)} N`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 3
  "pulley-hanging": {
    draw(g, f, m) {
      const { W, H } = g, top = 50, bottom = H - 36, cx = W / 2, bw = Math.min(64, W * 0.16), bh = Math.min(44, H * 0.1), r = bw / 2 + 4;
      const k = (bottom - top - bh) / (m.top + 0.4), Y = (y) => bottom - y * k;
      line(g, cx - 70, 12, cx + 70, 12, INK, 3); line(g, cx, 12, cx, top, INK, 2);
      line(g, 16, bottom, W - 16, bottom, INK, 2); text(g, "ground", 20, bottom + 14, { color: MUTED });
      const ax = cx - r, bxx = cx + r, ya = Y(f.yA), yb = Y(f.yB);
      if (f.slack) { const c = g.ctx; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(ax, top); c.quadraticCurveTo(ax - 50, (top + ya - bh) / 2, ax + 8, ya - bh); c.stroke(); text(g, "string slack", ax - 70, (top + ya) / 2, { color: RED, align: "center" }); }
      else line(g, ax, top, ax, ya - bh, INK, 2);
      line(g, bxx, top, bxx, yb - bh, INK, 2);
      circle(g, cx, top, r, "#fff"); circle(g, cx, top, 3, INK);
      box(g, ax, ya - bh / 2, bw, bh, BLUE_FILL, `A ${nf(m.m1)} kg`);
      box(g, bxx, yb - bh / 2, bw, bh, RED_FILL, `B ${nf(m.m2)} kg`);
      const vm = m.v1 || 1;
      if (Math.abs(f.vA) > 0.02) arrow(g, ax - bw / 2 - 16, ya - bh / 2, ax - bw / 2 - 16, ya - bh / 2 - (f.vA / vm) * 45, RED, "");
      if (Math.abs(f.vB) > 0.02) arrow(g, bxx + bw / 2 + 16, yb - bh / 2, bxx + bw / 2 + 16, yb - bh / 2 - (f.vB / vm) * 45, RED, "");
      readout(g, [`t = ${nf(f.t)} s`, `A: height ${nf(f.yA)} m`, `B: height ${nf(f.yB)} m`, `speed of B = ${nf(Math.abs(f.vB))} m/s`]);
    },
  },

  "pulley-table": {
    draw(g, f, m) {
      const { W, H } = g, bs = Math.min(44, W * 0.1), r = Math.round(bs * 0.32);
      const k = Math.min((W * 0.62) / (m.d + 1), (H - 170) / (m.h + 0.2));
      const tableTop = 64, x0 = 28, xp = x0 + (m.d + 1) * k, ys = tableTop - bs / 2, pcx = xp + r, pcy = ys + r;
      const y2 = pcy + 26, floorY = y2 + m.h * k + bs + 4;
      const c = g.ctx;
      c.fillStyle = "#e6eef6"; c.strokeStyle = INK; c.lineWidth = 2;
      c.fillRect(x0, tableTop, xp - x0, 14); c.strokeRect(x0, tableTop, xp - x0, 14);
      c.fillRect(x0 + 8, tableTop + 14, 10, floorY - tableTop - 14); c.strokeRect(x0 + 8, tableTop + 14, 10, floorY - tableTop - 14);
      c.fillRect(xp - 20, tableTop + 14, 10, floorY - tableTop - 14); c.strokeRect(xp - 20, tableTop + 14, 10, floorY - tableTop - 14);
      line(g, 10, floorY, W - 10, floorY, INK, 2);
      const bx = xp - (m.d - f.s) * k - bs / 2, drop = f.drop, topB = y2 + drop * k;
      if (f.slack) { c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(bx + bs / 2, ys); c.quadraticCurveTo((bx + bs / 2 + pcx) / 2, ys + 22, pcx, ys); c.stroke(); }
      else line(g, bx + bs / 2, ys, pcx, ys, INK, 2);
      line(g, pcx + r, pcy, pcx + r, topB, INK, 2);
      circle(g, pcx, pcy, r, "#fff"); circle(g, pcx, pcy, 3, INK);
      box(g, bx, ys, bs, bs, BLUE_FILL, `${nf(m.m1)} kg`);
      box(g, pcx + r, topB + bs / 2, bs, bs, RED_FILL, `${nf(m.m2)} kg`);
      if (f.v > 0.02) arrow(g, bx, ys - bs / 2 - 14, bx + (f.v / (m.vmax || 1)) * 55, ys - bs / 2 - 14, RED, "");
      readout(g, [`t = ${nf(f.t)} s`, `distance = ${nf(f.s)} m`, `speed = ${nf(f.v)} m/s`]);
    },
  },

  "pulley-slope": {
    draw(g, f, m) {
      const { ctx, W, H } = g, th = (m.angle * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th), run = m.run;
      const bs = Math.min(44, W * 0.1), r = bs / 2, Lt = 2.6 * run, p0 = 1.3 * run, ax = 26, ay = 64;
      const k = Math.min((W * 0.62) / (Lt * cs), (H - ay - 20) / (Lt * sn), (H - ay - 20 - r - 30 - bs) / (2 * run));
      const baseY = ay + Lt * sn * k, apexX = ax + Lt * cs * k, P = (p) => [ax + p * cs * k, baseY - p * sn * k];
      const pcx = apexX - sn * r, pcy = ay - cs * r, y2 = pcy + run * k + 30, floorY = Math.max(baseY, y2 + run * k + bs + 6);
      ctx.fillStyle = "#e6eef6"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, baseY); ctx.lineTo(apexX, ay); ctx.lineTo(apexX, floorY); ctx.lineTo(ax, floorY); ctx.closePath(); ctx.fill(); ctx.stroke();
      line(g, 10, floorY, W - 10, floorY, INK, 2);
      line(g, ax, baseY, ax + 64, baseY, MUTED, 1, [4, 4]);
      ctx.strokeStyle = MUTED; ctx.beginPath(); ctx.arc(ax, baseY, 44, -th, 0); ctx.stroke();
      text(g, `${nf(m.angle, 1)}°`, ax + 70, baseY - 8, { color: MUTED });
      const [sx, sy] = P(p0 + f.s), bcx = sx - sn * r, bcy = sy - cs * r;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-th);
      ctx.fillStyle = BLUE_FILL; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(-bs / 2, -bs, bs, bs); ctx.strokeRect(-bs / 2, -bs, bs, bs);
      ctx.fillStyle = INK; ctx.font = `600 ${Math.min(fontSize(W), 13)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`${nf(m.m1)} kg`, 0, -bs / 2);
      ctx.restore();
      line(g, bcx, bcy, pcx, pcy, INK, 2);
      const xs = pcx + r, xb = Math.max(xs, apexX + r + 2), topB = y2 + f.drop * k;
      if (f.slack) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xs, pcy); ctx.quadraticCurveTo((xs + xb) / 2, pcy + 26, xb, topB - 8); ctx.stroke(); text(g, "string slack", (xs + xb) / 2, pcy + 40, { color: RED, align: "center", size: fontSize(W) - 1 }); }
      else line(g, xs, pcy, xb, topB, INK, 2);
      circle(g, pcx, pcy, r, "#fff"); circle(g, pcx, pcy, 3, INK);
      box(g, xb, topB + bs / 2, bs, bs, RED_FILL, `${nf(m.m2)} kg`);
      readout(g, [`t = ${nf(f.t)} s`, `moved ${nf(Math.abs(f.s))} m`, `speed = ${nf(Math.abs(f.v))} m/s`]);
    },
  },

  towing: {
    draw(g, f, m) {
      const { ctx, W, H } = g, gy = H * 0.66, k = 18, u = W < 520 ? 0.78 : 1, xc = W * (W < 520 ? 0.6 : 0.66), cw = 140 * u, ch = 48 * u, tw = 110 * u, tch = 40 * u, gap = 60 * u;
      const xt = xc - cw / 2 - gap - tw / 2, cE = xc - cw / 2, tE = xt + tw / 2, cy = gy - 28;
      line(g, 0, gy, W, gy, INK, 2);
      for (let j = Math.floor((f.x - W / k) / 5); j <= Math.ceil((f.x + W / k) / 5); j++) {
        const px = xc + (5 * j - f.x) * k; if (px > 0 && px < W) line(g, px, gy, px, gy + 10, MUTED, 2);
      }
      const car = (cx, w, h, fill, name) => {
        ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.fillRect(cx - w / 2, gy - h - 10, w, h); ctx.strokeRect(cx - w / 2, gy - h - 10, w, h);
        circle(g, cx - w / 3, gy - 6, 8, "#fff"); circle(g, cx + w / 3, gy - 6, 8, "#fff");
        text(g, name, cx, gy - h - 24, { bold: true, align: "center" });
      };
      const pull = m.T >= 0;
      const sep = f.separated ? Math.max(0, f.xt - f.x) : 0;   // how far the trailer has gained on the car
      const gapPx = Math.max(18, gap - Math.min(gap - 18, sep * 6));
      const xtDraw = xc - cw / 2 - gapPx - tw / 2, tEd = xtDraw + tw / 2;
      if (f.separated) {
        ctx.save(); ctx.strokeStyle = MUTED; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(tEd, cy); ctx.quadraticCurveTo((tEd + cE) / 2, cy + 24, cE, cy); ctx.stroke();
        ctx.restore();
        text(g, "string slack", (tEd + cE) / 2, cy + 40, { color: RED, align: "center", size: fontSize(W) - 1 });
        if (sep > 0.05) text(g, `gained ${nf(sep, 1)} m`, (tEd + cE) / 2, cy - 34, { color: MUTED, align: "center", size: fontSize(W) - 1 });
      } else {
        line(g, tE, cy, cE, cy, pull ? RED : INK, m.link === "rod" ? 6 : 2);
      }
      car(xc, cw, ch, BLUE_FILL, `Car ${nf(m.M, 0)} kg`);
      car(xtDraw, tw, tch, RED_FILL, f.separated && Math.abs(f.vt) < 0.02 ? `Trailer ${nf(m.m, 0)} kg (stopped)` : `Trailer ${nf(m.m, 0)} kg`);
      if (!f.separated && Math.abs(m.T) > 0.5) {
        // Forces the connection exerts. Tension: pulls the ends together. Thrust: pushes them apart.
        if (pull) { arrow(g, tE, cy - 16, tE + 22, cy - 16, INK, ""); arrow(g, cE, cy - 16, cE - 22, cy - 16, INK, ""); }
        else { arrow(g, tE + 22, cy - 16, tE, cy - 16, INK, ""); arrow(g, cE - 22, cy - 16, cE, cy - 16, INK, ""); }
        text(g, `${pull ? "tension" : "thrust"} ${nf(Math.abs(m.T), 0)} N`, (tE + cE) / 2, cy - 92 + 40 - 16, { align: "center", bold: true, size: fontSize(W) - 1 });
      }
      const sc = 60 / Math.max(m.D, m.Rc, m.Rt, 1), ay = gy + 34;
      if (m.D > 0) { arrow(g, xc + cw / 2 + 4, cy - 10, xc + cw / 2 + 4 + m.D * sc, cy - 10, INK, ""); text(g, `D = ${nf(m.D, 0)} N`, xc + cw / 2 + 4 + (m.D * sc) / 2, cy - 34, { align: "center", bold: true }); }
      if (m.Rc > 0) { arrow(g, xc + 30, ay, xc + 30 - m.Rc * sc, ay, RED, ""); text(g, `Rc = ${nf(m.Rc, 0)} N`, xc, ay + 18, { align: "center", color: RED, bold: true }); }
      if (m.Rt > 0) { arrow(g, xtDraw + 30, ay, xtDraw + 30 - m.Rt * sc, ay, RED, ""); text(g, `Rt = ${nf(m.Rt, 0)} N`, xtDraw, ay + 18, { align: "center", color: RED, bold: true }); }
      readout(g, f.separated
        ? [`t = ${nf(f.t)} s`, `car: ${nf(f.x)} m at ${nf(f.v)} m/s`, `trailer: ${nf(f.xt)} m at ${nf(f.vt)} m/s`]
        : [`t = ${nf(f.t)} s`, `distance = ${nf(f.x)} m`, `speed = ${nf(f.v)} m/s`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 5
  "tilting-rod": {
    draw(g, f, m) {
      const { ctx, W, H } = g, ang = (m.maxang * Math.PI) / 180, sa = Math.sin(ang), pk = 32, th = 14;
      const drop = m.mode === "B" ? m.L - m.pivot : m.mode === "A" ? m.pivot : 0;
      const rise = m.mode === "B" ? m.pivot : m.mode === "A" ? m.L - m.pivot : 0;
      const kH = (W - 90) / m.L, kV = (H - 60 - pk - th - 26 - 48) / ((rise + drop) * sa + 0.01), k = Math.min(kH, kV);
      const left = (W - m.L * k) / 2, X = (x) => left + x * k;
      const py = 60 + pk + rise * sa * k, floorY = py + th + drop * sa * k + 26;
      line(g, 10, floorY, W - 10, floorY, INK, 2);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(X(m.pivot), py + th); ctx.lineTo(X(m.pivot) - 24, floorY); ctx.lineTo(X(m.pivot) + 24, floorY); ctx.closePath(); ctx.fill();
      text(g, "P", X(m.pivot), floorY + 16, { bold: true, align: "center" });
      if (m.R != null) text(g, `${nf(m.R, 1)} N`, X(m.pivot), floorY + 34, { align: "center", color: RED, bold: true });
      ctx.save(); ctx.translate(X(m.pivot), py + th); ctx.rotate(f.phi);
      const a = -m.pivot * k, len = m.L * k;
      ctx.fillStyle = "#e6eef6"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.fillRect(a, -th, len, th); ctx.strokeRect(a, -th, len, th);
      const bx = (m.x - m.pivot) * k;
      ctx.fillStyle = BLUE_FILL; ctx.fillRect(bx - pk / 2, -th - pk, pk, pk); ctx.strokeRect(bx - pk / 2, -th - pk, pk, pk);
      circle(g, (m.L / 2 - m.pivot) * k, -th / 2, 4, RED);
      text(g, "A", a - 12, -th / 2, { bold: true, align: "center" }); text(g, "B", a + len + 12, -th / 2, { bold: true, align: "center" });
      ctx.restore();
      text(g, m.mode === "level" ? "The rod stays level" : `The rod tips towards ${m.mode}`, 14, 22, { bold: true, color: m.mode === "level" ? INK : RED, size: fontSize(W) + 3 });
      readout(g, [`t = ${nf(f.t)} s`, `angle = ${nf(Math.abs(f.phi) * 180 / Math.PI, 1)}°`, `ω = ${nf(Math.abs(f.w), 2)} rad/s`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 6
  vectors: {
    draw(g, f, m) {
      const { ctx, W, H } = g, pad = 44;
      const xs = [m.x0a, m.x0b, m.x0a + m.vxa * m.T, m.x0b + m.vxb * m.T];
      const ys = [m.y0a, m.y0b, m.y0a + m.vya * m.T, m.y0b + m.vyb * m.T];
      const xmin = Math.min(0, ...xs), xmax = Math.max(0, ...xs), ymin = Math.min(0, ...ys), ymax = Math.max(0, ...ys);
      const padX = (xmax - xmin) * 0.15 + 1, padY = (ymax - ymin) * 0.15 + 1;
      const kx = (W - 2 * pad) / (xmax - xmin + 2 * padX), ky = (H - 2 * pad) / (ymax - ymin + 2 * padY), k = Math.min(kx, ky);
      const X = (x) => W / 2 + (x - (xmin + xmax) / 2) * k, Y = (y) => H / 2 - (y - (ymin + ymax) / 2) * k;

      line(g, X(xmin - padX), Y(0), X(xmax + padX), Y(0), MUTED, 1.2);
      line(g, X(0), Y(ymin - padY), X(0), Y(ymax + padY), MUTED, 1.2);
      text(g, "O", X(0) - 10, Y(0) + 14, { color: MUTED });

      // full paths, dashed
      line(g, X(m.x0a), Y(m.y0a), X(m.x0a + m.vxa * m.T), Y(m.y0a + m.vya * m.T), "#a9c3dc", 1.5, [5, 5]);
      line(g, X(m.x0b), Y(m.y0b), X(m.x0b + m.vxb * m.T), Y(m.y0b + m.vyb * m.T), RED_FILL, 1.5, [5, 5]);

      if (m.t_star <= m.T) {
        const xa = m.x0a + m.vxa * m.t_star, ya = m.y0a + m.vya * m.t_star;
        const xb = m.x0b + m.vxb * m.t_star, yb = m.y0b + m.vyb * m.t_star;
        circle(g, X(xa), Y(ya), 3, MUTED); circle(g, X(xb), Y(yb), 3, MUTED);
        line(g, X(xa), Y(ya), X(xb), Y(yb), MUTED, 1.2, [3, 4]);
        text(g, m.collide ? "collision" : `closest: ${nf(m.d_min)} m`,
             (X(xa) + X(xb)) / 2, (Y(ya) + Y(yb)) / 2 - 10, { color: MUTED, align: "center", size: fontSize(W) - 1 });
      }

      line(g, X(f.xa), Y(f.ya), X(f.xb), Y(f.yb), INK, 1.4, [2, 4]);
      circle(g, X(f.xa), Y(f.ya), 9, BLUE_FILL);
      circle(g, X(f.xb), Y(f.yb), 9, RED_FILL);
      text(g, "A", X(f.xa), Y(f.ya) - 16, { bold: true, align: "center" });
      text(g, "B", X(f.xb), Y(f.yb) - 16, { bold: true, align: "center" });
      const vs = 0.6 * k;
      arrow(g, X(f.xa), Y(f.ya), X(f.xa) + m.vxa * vs, Y(f.ya) - m.vya * vs, "#3b6ea5", "");
      arrow(g, X(f.xb), Y(f.yb), X(f.xb) + m.vxb * vs, Y(f.yb) - m.vyb * vs, RED, "");
      readout(g, [`t = ${nf(f.t)} s`, `A: (${nf(f.xa)}, ${nf(f.ya)})`, `B: (${nf(f.xb)}, ${nf(f.yb)})`, `AB = ${nf(f.d)} m`]);
    },
  },
};

// ======================================================================
// Scenes added in the static rebuild (they had solvers but no drawing yet),
// plus the small helpers they share: panes() and graph().
// draw(g, frame, meta, data): `data.frames` is the whole list, for graphs.
// ======================================================================
const BLUE = "#3b6ea5";

// Two areas: side by side on a wide screen, stacked on a phone.
function panes(g) {
  const { W, H } = g;
  if (W < 520) { const h1 = Math.round(H * 0.5); return [{ x: 0, y: 0, w: W, h: h1 }, { x: 0, y: h1, w: W, h: H - h1 }]; }
  const w1 = Math.round(W * 0.44);
  return [{ x: 0, y: 0, w: w1, h: H }, { x: w1, y: 0, w: W - w1, h: H }];
}

const _extent = new WeakMap();
function seriesExtent(frames, keys, xKey) {
  const id = keys.join("|") + "@" + xKey, hit = _extent.get(frames);
  if (hit && hit.id === id) return hit;
  let lo = 0, hi = 0, xhi = 0;
  for (const f of frames) {
    for (const k of keys) { if (f[k] < lo) lo = f[k]; if (f[k] > hi) hi = f[k]; }
    if (f[xKey] > xhi) xhi = f[xKey];
  }
  const e = { id, lo, hi, xhi };
  _extent.set(frames, e);
  return e;
}

// A live graph: the curve is drawn up to frame i, with a dot at the present.
// o = { series:[{key,color,fill}], xKey, xLabel, yLabel, refs:[{y,label,color}], vlines:[{x,label,color}] }
function graph(g, bx, frames, i, o) {
  const xKey = o.xKey || "t", keys = o.series.map((s) => s.key);
  const ext = seriesExtent(frames, keys, xKey);
  const small = g.W < 520, fs = fontSize(g.W) - 1;
  const L = bx.x + (small ? 44 : 50), R = bx.x + bx.w - 14, T = bx.y + 30, B = bx.y + bx.h - 38;
  let lo = ext.lo, hi = ext.hi;
  for (const r of o.refs || []) { lo = Math.min(lo, r.y); hi = Math.max(hi, r.y); }
  const padY = (hi - lo) * 0.1 || 1;
  if (lo < 0) lo -= padY; hi += padY;
  const X = (x) => L + (x / (ext.xhi || 1)) * (R - L), Y = (y) => B - ((y - lo) / (hi - lo)) * (B - T);
  const ctx = g.ctx;
  text(g, o.yLabel || "", L, T - 14, { color: MUTED, size: fs });
  const ys = niceStep(hi - lo, 4);
  for (let v = Math.ceil(lo / ys) * ys; v <= hi + 1e-9; v += ys) {
    line(g, L - 4, Y(v), L, Y(v), MUTED, 1.2);
    text(g, nf(v, 1), L - 7, Y(v), { align: "right", color: MUTED, size: fs });
  }
  const xs = niceStep(ext.xhi || 1, 4);
  for (let v = 0; v <= (ext.xhi || 1) + 1e-9; v += xs) {
    line(g, X(v), Y(Math.max(lo, 0)), X(v), Y(Math.max(lo, 0)) + 4, MUTED, 1.2);
    text(g, nf(v, 1), X(v), B + 14, { align: "center", color: MUTED, size: fs });
  }
  line(g, L, T, L, B, MUTED, 1.5);
  line(g, L, Y(0), R, Y(0), INK, 2);
  text(g, o.xLabel || "time (s)", R, B + 31, { align: "right", color: MUTED, size: fs });
  for (const r of o.refs || []) {
    line(g, L, Y(r.y), R, Y(r.y), r.color || MUTED, 1.2, [6, 5]);
    text(g, r.label, R - 2, Y(r.y) - 9, { align: "right", color: r.color || MUTED, size: fs });
  }
  let lab = 0;
  for (const v of o.vlines || []) {
    if (v.x == null) continue;
    line(g, X(v.x), T, X(v.x), B, v.color || MUTED, 1.2, [5, 5]);
    if (v.label) { text(g, v.label, X(v.x) + 4, T + 8 + (lab % 2) * 15, { color: v.color || MUTED, size: fs }); lab++; }
  }
  for (const s of o.series) {
    if (s.fill) {
      ctx.fillStyle = s.fillColor || "rgba(143,176,207,0.45)";
      ctx.beginPath(); ctx.moveTo(X(frames[0][xKey]), Y(0));
      for (let k = 0; k <= i; k++) ctx.lineTo(X(frames[k][xKey]), Y(frames[k][s.key]));
      ctx.lineTo(X(frames[i][xKey]), Y(0)); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = s.color || RED; ctx.lineWidth = 3; ctx.setLineDash([]); ctx.beginPath();
    for (let k = 0; k <= i; k++) { const px = X(frames[k][xKey]), py = Y(frames[k][s.key]); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
    circle(g, X(frames[i][xKey]), Y(frames[i][s.key]), 4.5, s.color || RED);
  }
}
const frameNo = (data, f) => Math.max(0, data.frames.indexOf(f));
const sceneHeader = (g, s, color) => text(g, s, g.W / 2, 20, { bold: true, align: "center", color: color || INK, size: fontSize(g.W) + 2 });

Object.assign(SCENES, {
  // ---------------------------------------------------------------- Chapter 1
  "suvat-journey": {
    draw(g, f, m, data) {
      const { ctx, W, H } = g, ry = Math.round(H * 0.27), left = 34, right = W - 34;
      const X = (d) => left + (d / m.D) * (right - left);
      line(g, left, ry, right, ry, INK, 2);
      line(g, X(m.D / 2), ry - 30, X(m.D / 2), ry + 8, MUTED, 1.2, [4, 4]);
      text(g, "half the distance", X(m.D / 2), ry - 38, { align: "center", color: MUTED, size: fontSize(W) - 1 });
      text(g, "start", left, ry + 18, { align: "center", color: MUTED }); text(g, `${nf(m.D, 1)} m`, right, ry + 18, { align: "center", color: MUTED });
      const cx = X(f.x);
      ctx.fillStyle = BLUE_FILL; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.fillRect(cx - 18, ry - 24, 36, 16); ctx.strokeRect(cx - 18, ry - 24, 36, 16);
      circle(g, cx - 10, ry - 6, 5, "#fff"); circle(g, cx + 10, ry - 6, 5, "#fff");
      const gb = { x: 0, y: Math.round(H * 0.36), w: W, h: Math.round(H * 0.64) };
      graph(g, gb, data.frames, frameNo(data, f), {
        series: [{ key: "v", color: RED, fill: true }], yLabel: "speed (m/s): the shaded area is the distance travelled",
        vlines: [{ x: m.T / 2, label: "half the time", color: MUTED }, { x: m.tHalfD, label: "half the distance", color: RED }],
      });
      readout(g, [`t = ${nf(f.t)} s`, `distance = ${nf(f.x)} m`, `speed = ${nf(f.v)} m/s`]);
    },
  },

  "bouncing-ball": {
    draw(g, f, m, data) {
      const [A, B] = panes(g), top = A.y + 34, bottom = A.y + A.h - 34, ky = (bottom - top) / (m.top * 1.08 + 0.01), cx = A.x + A.w / 2;
      line(g, A.x + 16, bottom, A.x + A.w - 16, bottom, INK, 3);
      text(g, "floor", A.x + 20, bottom + 16, { color: MUTED });
      const cy = bottom - f.y * ky - 10;
      circle(g, cx, cy, 10, BLUE_FILL);
      const k = 46 / (m.vmax || 1);
      if (Math.abs(f.v) > 0.05) arrow(g, cx + 30, cy, cx + 30, cy - f.v * k, RED, "v");
      text(g, "height", A.x + 20, top - 14, { color: MUTED });
      graph(g, B, data.frames, frameNo(data, f), {
        series: [{ key: "v", color: RED }], yLabel: "velocity (m/s, up is +)",
        vlines: (m.impacts || []).map((t) => ({ x: t, color: MUTED })),
      });
      readout(g, [`t = ${nf(f.t)} s`, `height = ${nf(f.y)} m`, `v = ${nf(f.v)} m/s`]);
    },
  },

  "vertical-meeting": {
    draw(g, f, m, data) {
      const [A, B] = panes(g), top = A.y + 34, bottom = A.y + A.h - 34, ky = (bottom - top) / (m.top * 1.08 + 0.01);
      const cx = A.x + A.w / 2, Y = (y) => bottom - y * ky - 9;
      line(g, A.x + 16, bottom, A.x + A.w - 16, bottom, INK, 3);
      text(g, "ground", A.x + 20, bottom + 16, { color: MUTED });
      line(g, cx + 34, bottom, cx + 34, Y(m.h) + 9, MUTED, 1, [3, 5]);
      text(g, `${nf(m.h, 1)} m`, cx + 40, (bottom + Y(m.h)) / 2, { color: MUTED });
      circle(g, cx - 26, Y(f.yP), 9, BLUE_FILL); text(g, "P", cx - 26, Y(f.yP), { bold: true, align: "center" });
      circle(g, cx + 26, Y(f.yQ), 9, RED_FILL); text(g, "Q", cx + 26, Y(f.yQ), { bold: true, align: "center" });
      if (m.meet != null && f.t >= m.meet - 1e-9) {
        const c2 = g.ctx; c2.strokeStyle = RED; c2.lineWidth = 2; c2.beginPath(); c2.arc(cx, Y(m.yMeet), 26, 0, Math.PI * 2); c2.stroke();
        text(g, `meet at ${nf(m.yMeet, 2)} m`, cx, Y(m.yMeet) - 36, { align: "center", color: RED, bold: true, size: fontSize(g.W) - 1 });
      }
      graph(g, B, data.frames, frameNo(data, f), {
        series: [{ key: "vP", color: BLUE }, { key: "vQ", color: RED }], yLabel: "velocity (m/s, up is +):  P blue, Q red",
        vlines: [{ x: m.meet, color: MUTED }],
      });
      readout(g, [`t = ${nf(f.t)} s`, `P: ${nf(f.yP)} m, v = ${nf(f.vP)} m/s`, `Q: ${nf(f.yQ)} m, v = ${nf(f.vQ)} m/s`]);
    },
  },

  "parachutist": {
    draw(g, f, m, data) {
      const [A, B] = panes(g), top = A.y + 40, bottom = A.y + A.h - 34, ky = (bottom - top) / m.H, cx = A.x + A.w / 2;
      const cy = bottom - f.y * ky - 8;
      line(g, A.x + 16, bottom, A.x + A.w - 16, bottom, INK, 3);
      text(g, `${nf(m.H, 0)} m`, A.x + 20, top - 12, { color: MUTED });
      if (f.t > m.t1) {
        const c = g.ctx; c.fillStyle = RED_FILL; c.strokeStyle = INK; c.lineWidth = 2;
        c.beginPath(); c.arc(cx, cy - 34, 26, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
        line(g, cx - 26, cy - 34, cx, cy - 8, INK, 1.2); line(g, cx + 26, cy - 34, cx, cy - 8, INK, 1.2);
      }
      circle(g, cx, cy, 8, BLUE_FILL);
      if (f.v > 0.05) arrow(g, cx + 38, cy - 10, cx + 38, cy - 10 + Math.min(60, f.v * (46 / m.v1)), RED, "v");
      graph(g, B, data.frames, frameNo(data, f), {
        series: [{ key: "v", color: RED }], yLabel: "speed downwards (m/s)",
        vlines: [{ x: m.t1, label: "parachute opens", color: MUTED }, { x: m.t1 + m.t2, color: MUTED }],
        refs: [{ y: m.V, label: "steady speed", color: MUTED }],
      });
      readout(g, [`t = ${nf(f.t)} s`, `height = ${nf(f.y)} m`, `speed = ${nf(f.v)} m/s`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 2
  "slope-limiting": {
    draw(g, f, m) {
      const { ctx, W, H } = g, th = (m.angle * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th), pad = 34;
      const by = Math.round(H * 0.66), ax = pad, Lp = Math.min((W - 2 * pad) / cs, (H * 0.52) / sn);
      const apx = ax + Lp * cs, apy = by - Lp * sn;
      ctx.fillStyle = "#e6eef6"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, by); ctx.lineTo(apx, apy); ctx.lineTo(apx, by); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = MUTED; ctx.beginPath(); ctx.arc(apx, by, 34, Math.PI, Math.PI + th); ctx.stroke();
      text(g, `${nf(m.angle, 1)}°`, apx - 46, by - 8, { color: MUTED, align: "center" });
      const bs = Math.max(34, Lp * 0.09), s0 = Lp * 0.5, px = ax + s0 * cs, py = by - s0 * sn;
      ctx.save(); ctx.translate(px, py); ctx.rotate(-th);
      ctx.fillStyle = BLUE_FILL; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(-bs / 2, -bs, bs, bs); ctx.strokeRect(-bs / 2, -bs, bs, bs);
      ctx.restore();
      const cx = px - (sn * bs) / 2, cy = py - (cs * bs) / 2, ws = 90 / Math.max(m.W, m.pMax * (m.horiz ? 1 : 1));
      const arr = (dx, dy, n, col, lab) => { if (n * ws > 3) arrow(g, cx, cy, cx + dx * n * ws, cy + dy * n * ws, col, lab); };
      arr(0, 1, m.W, INK, "W");
      arr(-sn, -cs, f.R, INK, "R");
      if (m.horiz) arr(1, 0, f.P, BLUE, "P"); else arr(cs, -sn, f.P, BLUE, "P");
      if (f.F >= 0) arr(cs, -sn, f.F, RED, "F"); else arr(-cs, sn, -f.F, RED, "F");
      const msg = f.state === "rest" ? "Everything balances: it stays at rest"
        : f.state === "down" ? "About to slide DOWN: friction acts up the slope" : "About to slide UP: friction acts down the slope";
      text(g, msg, W / 2, 20, { bold: true, align: "center", color: f.state === "rest" ? INK : RED, size: fontSize(W) + 1 });
      // bar: how big P is
      const x0 = pad, x1 = W - pad, yb = H - 26, PX = (p) => x0 + (p / m.pMax) * (x1 - x0), hi = m.pHigh == null ? m.pMax : m.pHigh;
      ctx.fillStyle = "#f3c6c3"; ctx.fillRect(PX(0), yb - 7, PX(m.pLow) - PX(0), 14);
      ctx.fillStyle = "#c6e5cf"; ctx.fillRect(PX(m.pLow), yb - 7, PX(hi) - PX(m.pLow), 14);
      ctx.fillStyle = "#f3c6c3"; ctx.fillRect(PX(hi), yb - 7, PX(m.pMax) - PX(hi), 14);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(x0, yb - 7, x1 - x0, 14);
      line(g, PX(f.P), yb - 13, PX(f.P), yb + 13, RED, 3);
      text(g, "P (N):  green = stays at rest,  red = slides", x0, yb - 20, { color: MUTED, size: fontSize(W) - 1 });
      readout(g, [`P = ${nf(f.P, 1)} N`, `friction F = ${nf(f.F, 1)} N (+ is up the slope)`, `largest friction μR = ${nf(f.lim, 1)} N`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 3
  "slope-up-and-back": {
    draw(g, f, m) {
      const { ctx, W, H } = g, th = (m.angle * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th), pad = 40;
      const Lp = Math.min((W - 2 * pad) / cs, (H - 2 * pad - 24) / sn), ax = pad, by = H - pad, apx = ax + Lp * cs, apy = by - Lp * sn;
      ctx.fillStyle = "#e6eef6"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, by); ctx.lineTo(apx, apy); ctx.lineTo(apx, by); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = MUTED; ctx.beginPath(); ctx.arc(apx, by, 38, Math.PI, Math.PI + th); ctx.stroke();
      text(g, `${nf(m.angle, 1)}°`, apx - 48, by - 8, { color: MUTED, align: "center" });
      const bw = Math.max(36, Lp * 0.08), bh = bw * 0.65, along = bw / 2 + (f.s / (m.sTop * 1.12)) * (Lp - bw);
      const px = ax + cs * along, py = by - sn * along;
      ctx.save(); ctx.translate(px, py); ctx.rotate(-th);
      ctx.fillStyle = BLUE_FILL; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(-bw / 2, -bh, bw, bh); ctx.strokeRect(-bw / 2, -bh, bw, bh);
      ctx.restore();
      const cx = px - (sn * bh) / 2, cy = py - (cs * bh) / 2, unit = Math.min(80, Lp * 0.25);
      const moving = Math.abs(f.v) > 0.02;
      if (moving) {
        const dir = f.v > 0 ? 1 : -1, vl = Math.min(1, Math.abs(f.v) / (m.u || 1)) * unit;
        arrow(g, cx, cy, cx + dir * cs * vl, cy - dir * sn * vl, BLUE, "v");
        arrow(g, cx, cy, cx - dir * cs * unit * 0.8, cy + dir * sn * unit * 0.8, RED, "F");
      }
      const msg = !moving && f.t > 0.1 ? (m.back ? "At the top: stopped for an instant" : "It stops and stays at rest")
        : f.v > 0.02 ? "Moving UP: friction acts down the slope" : f.v < -0.02 ? "Sliding DOWN: friction acts up the slope" : "";
      if (msg) text(g, msg, W / 2, 20, { bold: true, align: "center", color: RED, size: fontSize(W) + 1 });
      readout(g, [`t = ${nf(f.t)} s`, `distance up the slope = ${nf(f.s)} m`, `v = ${nf(f.v)} m/s (+ is up the slope)`]);
    },
  },

  "lift": {
    draw(g, f, m, data) {
      const [A, B] = panes(g), top = A.y + 28, bottom = A.y + A.h - 22, ch = 64, cw = Math.min(70, A.w * 0.34), cx = A.x + A.w * 0.45;
      const range = bottom - top - ch, p = m.D > 0 ? Math.abs(f.y) / m.D : 0, ycab = m.sgn > 0 ? bottom - ch - p * range : top + p * range;
      const c = g.ctx; c.strokeStyle = MUTED; c.lineWidth = 1.5; c.strokeRect(cx - cw / 2 - 6, top - 4, cw + 12, bottom - top + 8);
      line(g, cx, top - 4, cx, ycab, INK, 2);
      c.fillStyle = "#e6eef6"; c.strokeStyle = INK; c.lineWidth = 2; c.fillRect(cx - cw / 2, ycab, cw, ch); c.strokeRect(cx - cw / 2, ycab, cw, ch);
      circle(g, cx, ycab + ch - 24, 7, BLUE_FILL); line(g, cx, ycab + ch - 17, cx, ycab + ch - 6, INK, 3);
      const ks = 50 / Math.max(m.Rmax, m.W), fy = ycab + ch - 18;
      arrow(g, cx + cw / 2 + 14, fy + 4, cx + cw / 2 + 14, fy + 4 - f.R * ks, RED, "R");
      arrow(g, cx + cw / 2 + 34, fy - 4, cx + cw / 2 + 34, fy - 4 + m.W * ks, INK, "W");
      graph(g, B, data.frames, frameNo(data, f), {
        series: [{ key: "R", color: RED }], yLabel: "force from the floor R (N)",
        refs: [{ y: m.W, label: "weight", color: MUTED }],
      });
      const word = f.a > 0.01 ? "acceleration upwards" : f.a < -0.01 ? "acceleration downwards" : "no acceleration";
      readout(g, [`t = ${nf(f.t)} s`, `${word}: a = ${nf(f.a)} m/s²`, `R = ${nf(f.R, 1)} N,  weight = ${nf(m.W, 1)} N`]);
    },
  },

  "pulley-extra-mass": {
    draw(g, f, m, data) {
      const [A, B] = panes(g), top = A.y + 44, ground = A.y + A.h - 28, bh = 34, cx = A.x + A.w / 2 + 6, bw = Math.min(56, A.w * 0.26), r = bw / 2 + 4;
      const k = (ground - top - 40 - 2 * bh) / m.hA, Aleft = cx - r, Bleft = cx + r;
      line(g, A.x + 16, ground, A.x + A.w - 16, ground, INK, 3);
      const aBottom = ground - (m.hA - f.s) * k, aTop = aBottom - bh, bBottom = ground - f.s * k, bTop = bBottom - bh;
      const ringY = ground - m.hA * k - bh + m.d * k;
      line(g, cx - r - 24, top - r - 4, cx + r + 24, top - r - 4, INK, 3); line(g, cx, top - r - 4, cx, top - r, INK, 2);
      line(g, Aleft, top, Aleft, aTop, INK, 2); line(g, Bleft, top, Bleft, bTop, INK, 2);
      circle(g, cx, top, r, "#fff"); circle(g, cx, top, 3, INK);
      const c = g.ctx;
      c.strokeStyle = MUTED; c.lineWidth = 3; c.beginPath(); c.moveTo(Aleft - bw / 2 - 14, ringY); c.lineTo(Aleft - bw / 2 + 4, ringY); c.moveTo(Aleft + bw / 2 - 4, ringY); c.lineTo(Aleft + bw / 2 + 14, ringY); c.stroke();
      text(g, "ring", Aleft - bw / 2 - 18, ringY + 0, { align: "right", color: MUTED, size: fontSize(g.W) - 1 });
      box(g, Aleft, aTop + bh / 2, bw, bh, BLUE_FILL, `A ${nf(m.mA)} kg`);
      box(g, Bleft, bTop + bh / 2, bw, bh, RED_FILL, `B ${nf(m.mB)} kg`);
      const xh = 18, mxY = f.ph === 1 ? aTop - xh : ringY - xh;
      box(g, Aleft, mxY + xh / 2, bw * 0.8, xh, "#f2d9a6", "");
      text(g, `${nf(m.mx)} kg`, Aleft, mxY + xh / 2, { align: "center", bold: true, size: 10 });
      const fr = data.frames.find((q) => q.ph === 2);
      graph(g, B, data.frames, frameNo(data, f), {
        series: [{ key: "v", color: RED }], yLabel: "speed of A (m/s, down is +)", vlines: [{ x: fr ? fr.t : null, label: "extra mass removed", color: MUTED }],
      });
      readout(g, [`t = ${nf(f.t)} s`, `A has fallen ${nf(f.s)} m`, `speed = ${nf(f.v)} m/s`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 4
  "string-jerk": {
    draw(g, f, m) {
      const { W, H } = g, bw = Math.min(50, W * 0.11), gap = bw * 1.5, left = 30, gy = H * 0.62, sc = (W - 2 * left - bw - gap) / (m.xmax * 1.02);
      const qx = left + bw / 2 + f.x2 * sc, px = left + bw / 2 + gap + f.x1 * sc, ym = gy - bw / 2;
      line(g, 10, gy, W - 10, gy, INK, 2);
      if (f.taut) line(g, qx + bw / 2, ym, px - bw / 2, ym, INK, 3);
      else { const c = g.ctx; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(qx + bw / 2, ym); c.quadraticCurveTo((qx + px) / 2, ym + 26, px - bw / 2, ym); c.stroke(); }
      box(g, qx, ym, bw, bw, RED_FILL, "Q");
      box(g, px, ym, bw, bw, BLUE_FILL, "P");
      text(g, `${nf(m.m2)} kg`, qx, gy + 16, { align: "center", color: MUTED });
      text(g, `${nf(m.m1)} kg`, px, gy + 16, { align: "center", color: MUTED });
      const vP = f.taut ? m.v : m.u, vQ = f.taut ? m.v : 0, k = 60 / m.u;
      arrow(g, px - 10, ym - bw / 2 - 16, px - 10 + vP * k, ym - bw / 2 - 16, RED, "");
      text(g, `${nf(vP, 2)} m/s`, px, ym - bw / 2 - 36, { align: "center", color: RED, bold: true, size: fontSize(W) - 1 });
      if (vQ > 0) { arrow(g, qx - 10, ym - bw / 2 - 16, qx - 10 + vQ * k, ym - bw / 2 - 16, RED, ""); text(g, `${nf(vQ, 2)} m/s`, qx, ym - bw / 2 - 36, { align: "center", color: RED, bold: true, size: fontSize(W) - 1 }); }
      text(g, f.taut ? "The string is taut: both move together" : "The string is slack: only P moves", W / 2, 22, { bold: true, align: "center", color: f.taut ? RED : INK, size: fontSize(W) + 1 });
      text(g, "slowed down so you can see the jerk", W / 2, H - 14, { align: "center", color: MUTED, size: fontSize(W) - 1 });
      readout(g, [`real time t = ${nf(f.t, 3)} s`, `P: ${nf(f.x1)} m`, `Q: ${nf(f.x2)} m`]);
    },
  },

  "wall-bounce": {
    draw(g, f, m) {
      const { ctx, W, H } = g, wallX = W - 46, gy = H * 0.66, rr = 14, k = (wallX - rr - 40) / 5, cx = wallX - rr - f.x * k, cy = gy - rr;
      line(g, 10, gy, W - 10, gy, INK, 2);
      ctx.fillStyle = "#cfd9e4"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(wallX, gy - 120, 26, 120); ctx.strokeRect(wallX, gy - 120, 26, 120);
      for (let y = gy - 114; y < gy; y += 12) line(g, wallX, y + 12, wallX + 26, y, MUTED, 1);
      circle(g, cx, cy, rr, BLUE_FILL);
      const vel = f.after ? -m.v : m.u, ref = Math.max(m.u, m.v) || 1, ay = cy - rr - 24;
      if (Math.abs(vel) > 1e-9) arrow(g, cx - Math.sign(vel) * 0, ay, cx + (vel / ref) * 70, ay, RED, "");
      text(g, `${nf(Math.abs(vel), 2)} m/s ${f.after ? "away from the wall" : "towards the wall"}`, cx, ay - 20, { align: "center", color: RED, bold: true, size: fontSize(W) - 1 });
      text(g, f.after ? "After hitting the wall" : "Before hitting the wall", W / 2, 22, { bold: true, align: "center", size: fontSize(W) + 2 });
      text(g, `impulse from the wall = ${nf(m.I, 2)} N s (away from the wall)`, W / 2, H - 16, { align: "center", color: MUTED });
      readout(g, [`distance from the wall = ${nf(f.x / (5 / m.u), 2)} m`]);
    },
  },

  "soft-ground": {
    draw(g, f, m) {
      const { ctx, W, H } = g, top = 34, gy = Math.round(H * 0.6), ky = (gy - top - 22) / (m.h * 1.02), depthPx = H - gy - 26, cx = W * 0.4, rr = 13;
      ctx.fillStyle = "#e6d8c3"; ctx.fillRect(0, gy, W, H - gy);
      line(g, 0, gy, W, gy, INK, 3);
      text(g, "soft ground (zoomed in, and slowed down ×" + m.slow + ")", 12, gy + 14, { color: MUTED, size: fontSize(W) - 1 });
      text(g, `${nf(m.h, 1)} m`, 14, top - 6 + 10, { color: MUTED });
      line(g, 10, top + 10, 10, gy, MUTED, 1.2, [4, 4]);
      const bottom = f.y >= 0 ? gy - f.y * ky : gy + (-f.y / m.depth) * depthPx, cy = bottom - rr;
      line(g, cx + 40, gy, cx + 40, gy + depthPx, MUTED, 1.2, [4, 4]);
      text(g, `depth ${nf(m.depth, 3)} m`, cx + 48, gy + depthPx / 2, { color: MUTED, size: fontSize(W) - 1 });
      circle(g, cx, cy, rr, BLUE_FILL);
      if (f.in) {
        const s = 60 / Math.max(m.R, m.W);
        arrow(g, cx - 30, cy, cx - 30, cy - m.R * s, RED, "R"); arrow(g, cx + 24, cy, cx + 24, cy + m.W * s, INK, "W");
        text(g, "In the ground R is bigger than W: the net force is upwards", W / 2, 22, { bold: true, align: "center", color: RED, size: fontSize(W) + 1 });
      } else if (f.v > 0.05) arrow(g, cx + 30, cy, cx + 30, cy + Math.min(70, f.v * (60 / m.V)), RED, "v");
      readout(g, [`t = ${nf(f.t)} s`, `height = ${nf(f.y, 3)} m`, `speed = ${nf(f.v)} m/s`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 6
  "vector-acceleration": {
    draw(g, f, m, data) {
      const { ctx, W, H } = g, pad = 46, fr = data.frames;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, vmax = 0;
      for (const q of fr) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); vmax = Math.max(vmax, Math.hypot(q.vx, q.vy)); }
      x0 = Math.min(x0, 0); y0 = Math.min(y0, 0); x1 = Math.max(x1, 0); y1 = Math.max(y1, 0);
      const px = (x1 - x0) * 0.18 + 1, py = (y1 - y0) * 0.18 + 1, k = Math.min((W - 2 * pad) / (x1 - x0 + 2 * px), (H - 2 * pad) / (y1 - y0 + 2 * py));
      const X = (x) => W / 2 + (x - (x0 + x1) / 2) * k, Y = (y) => H / 2 - (y - (y0 + y1) / 2) * k;
      line(g, X(x0 - px), Y(0), X(x1 + px), Y(0), MUTED, 1.2); line(g, X(0), Y(y0 - py), X(0), Y(y1 + py), MUTED, 1.2);
      text(g, "x (i)", X(x1 + px) - 6, Y(0) - 12, { color: MUTED, align: "right" }); text(g, "y (j)", X(0) + 8, Y(y1 + py) + 6, { color: MUTED });
      ctx.strokeStyle = "#a9c3dc"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath();
      fr.forEach((q, j) => (j ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)))); ctx.stroke(); ctx.setLineDash([]);
      const i = frameNo(data, f);
      ctx.strokeStyle = BLUE; ctx.lineWidth = 3; ctx.beginPath();
      for (let j = 0; j <= i; j++) j ? ctx.lineTo(X(fr[j].x), Y(fr[j].y)) : ctx.moveTo(X(fr[j].x), Y(fr[j].y)); ctx.stroke();
      circle(g, X(f.x), Y(f.y), 8, BLUE_FILL);
      const vs = 70 / (vmax || 1);
      arrow(g, X(f.x), Y(f.y), X(f.x) + f.vx * vs, Y(f.y) - f.vy * vs, RED, "v");
      const am = Math.hypot(m.ax, m.ay);
      if (am > 0) arrow(g, X(f.x), Y(f.y), X(f.x) + (m.ax / am) * 46, Y(f.y) - (m.ay / am) * 46, "#15803d", "a");
      readout(g, [`t = ${nf(f.t)} s`, `position = (${nf(f.x)}, ${nf(f.y)}) m`, `velocity = (${nf(f.vx)}i + ${nf(f.vy)}j) m/s`]);
    },
  },
});

// Scenes with a picture on top and a graph underneath need a taller canvas on a phone.
["bouncing-ball", "vertical-meeting", "parachutist", "lift", "pulley-extra-mass"].forEach((id) => { SCENES[id].aspectNarrow = 1.3; });

// ======================================================================
// Four more scenes: stages, rough-surface, beam (hanging-strings is above).
// ======================================================================
Object.assign(SCENES, {
  // ---------------------------------------------------------------- Chapter 1
  "stages": {
    draw(g, f, m, data) {
      const { ctx, W, H } = g, left = 44, right = W - 36, lanes = m.hasB ? 2 : 1, y1 = 52, gap = 46, trackBottom = y1 + (lanes - 1) * gap + 24;
      const span = m.xmax - m.xmin || 1, X = (x) => left + ((x - m.xmin) / span) * (right - left);
      const lane = (y, name, x, started, fill) => {
        line(g, left, y, right, y, INK, 2);
        line(g, X(m.xmin), y - 6, X(m.xmin), y + 6, MUTED, 1.5); line(g, X(m.xmax), y - 6, X(m.xmax), y + 6, MUTED, 1.5);
        const cx = X(x);
        ctx.globalAlpha = started ? 1 : 0.45; ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.fillRect(cx - 17, y - 24, 34, 16); ctx.strokeRect(cx - 17, y - 24, 34, 16);
        circle(g, cx - 9, y - 6, 4.5, "#fff"); circle(g, cx + 9, y - 6, 4.5, "#fff");
        ctx.globalAlpha = 1;
        text(g, name, cx, y - 16, { bold: true, align: "center", size: 11 });
        text(g, name, left - 12, y, { bold: true, align: "right", color: MUTED });
      };
      lane(y1, "A", f.xA, true, BLUE_FILL);
      if (m.hasB) lane(y1 + gap, "B", f.xB, f.t >= m.startB, RED_FILL);
      text(g, `${nf(m.xmin, 0)} m`, left, y1 - 40, { align: "center", color: MUTED, size: fontSize(W) - 1 });
      text(g, `${nf(m.xmax, 0)} m`, right, y1 - 40, { align: "center", color: MUTED, size: fontSize(W) - 1 });
      const acc = m.graph === "acceleration", kA = acc ? "aA" : "vA", kB = acc ? "aB" : "vB";
      const series = [{ key: kA, color: BLUE, fill: !m.hasB && !acc }];
      if (m.hasB) series.push({ key: kB, color: RED });
      const gb = { x: 0, y: trackBottom + 8, w: W, h: H - trackBottom - 8 };
      graph(g, gb, data.frames, frameNo(data, f), {
        series, yLabel: (acc ? "acceleration (m/s²)" : "speed (m/s)") + (m.hasB ? ":  A blue, B red" : ""),
        refs: m.vmark > 0 && !acc ? [{ y: m.vmark, label: `${nf(m.vmark, 1)} m/s`, color: MUTED }] : [],
        vlines: m.tmark > 0 ? [{ x: m.tmark, label: `t = ${nf(m.tmark, 1)} s`, color: MUTED }] : [],
      });
      readout(g, [`t = ${nf(f.t)} s`, `A: ${nf(f.xA)} m, ${nf(f.vA)} m/s`].concat(m.hasB ? [`B: ${nf(f.xB)} m, ${nf(f.vB)} m/s`] : []));
    },
  },

  // ---------------------------------------------------------------- Chapter 2
  "rough-surface": {
    draw(g, f, m) {
      const { ctx, W, H } = g, th = (m.angle * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th), pad = 34, by = Math.round(H * 0.64);
      let px, py;
      if (m.angle > 0) {
        const Lp = Math.min((W - 2 * pad) / cs, (H * 0.5) / sn), ax = pad, apx = ax + Lp * cs, apy = by - Lp * sn;
        ctx.fillStyle = "#e6eef6"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ax, by); ctx.lineTo(apx, apy); ctx.lineTo(apx, by); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = MUTED; ctx.beginPath(); ctx.arc(apx, by, 34, Math.PI, Math.PI + th); ctx.stroke();
        text(g, `${nf(m.angle, 1)}°`, apx - 46, by - 8, { color: MUTED, align: "center" });
        px = ax + Lp * 0.5 * cs; py = by - Lp * 0.5 * sn;
      } else {
        ctx.fillStyle = "#e6eef6"; ctx.fillRect(10, by, W - 20, 14); line(g, 10, by, W - 10, by, INK, 3);
        text(g, "rough ground", 16, by + 28, { color: MUTED, size: fontSize(W) - 1 });
        px = W / 2; py = by;
      }
      const u = [cs, -sn], n = [-sn, -cs], bs = 34;
      ctx.save(); ctx.translate(px, py); ctx.rotate(-th);
      ctx.fillStyle = BLUE_FILL; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(-bs / 2, -bs, bs, bs); ctx.strokeRect(-bs / 2, -bs, bs, bs);
      ctx.restore();
      const cx = px + n[0] * bs / 2, cy = py + n[1] * bs / 2, ws = 100 / Math.max(m.W, m.Fmax, m.F2 || 0, 1);
      const arr = (dx, dy, len, col, lab) => { if (len * ws > 3) arrow(g, cx, cy, cx + dx * len * ws, cy + dy * len * ws, col, lab); };
      const dir = (t) => { const a = (t * Math.PI) / 180; return [Math.cos(a) * u[0] + Math.sin(a) * n[0], Math.cos(a) * u[1] + Math.sin(a) * n[1]]; };
      arr(0, 1, m.W, INK, "W");
      arr(n[0], n[1], f.R, INK, "R");
      const d1 = dir(m.th1); arr(d1[0], d1[1], f.P, BLUE, "F1");
      if (m.F2 > 0) { const d2 = dir(m.th2); arr(d2[0], d2[1], m.F2, BLUE, "F2"); }
      arr(f.F >= 0 ? u[0] : -u[0], f.F >= 0 ? u[1] : -u[1], Math.abs(f.F), RED, "F");
      const msg = f.state === "rest" ? "Everything balances: it stays at rest"
        : f.state === "down" ? "About to slide DOWN: friction acts up the surface"
        : f.state === "up" ? "About to slide UP: friction acts down the surface" : "R would be negative: the particle lifts off";
      text(g, msg, W / 2, 20, { bold: true, align: "center", color: f.state === "rest" ? INK : RED, size: fontSize(W) + 1 });
      const x0 = pad, x1 = W - pad, yb = H - 26, PX = (v) => x0 + (v / m.Fmax) * (x1 - x0), RED_Z = "#f3c6c3", GREEN_Z = "#c6e5cf";
      ctx.fillStyle = RED_Z; ctx.fillRect(x0, yb - 7, x1 - x0, 14);
      if (!m.empty && m.lo != null) { ctx.fillStyle = GREEN_Z; ctx.fillRect(PX(m.lo), yb - 7, PX(m.hi == null ? m.Fmax : m.hi) - PX(m.lo), 14); }
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(x0, yb - 7, x1 - x0, 14);
      line(g, PX(m.F1), yb - 11, PX(m.F1), yb + 11, BLUE, 2);
      line(g, PX(f.P), yb - 13, PX(f.P), yb + 13, RED, 3);
      text(g, "F1 (N):  green = stays at rest,  red = slides,  blue tick = the F1 in your numbers", x0, yb - 20, { color: MUTED, size: fontSize(W) - 1 });
      readout(g, [`F1 = ${nf(f.P, 1)} N`, `friction F = ${nf(f.F, 1)} N (+ is up the surface)`, `largest friction μR = ${nf(f.lim, 1)} N`]);
    },
  },

  // ---------------------------------------------------------------- Chapter 5
  "beam": {
    draw(g, f, m) {
      const { ctx, W, H } = g, left = 50, right = W - 50, X = (x) => left + (x / m.L) * (right - left), py = Math.round(H * 0.5), th = 14;
      const sc = (H * 0.2) / (m.fmax || 1), sup = m.sup;
      const lab = (str, x, y, o) => { const w = str.length * 7.8; text(g, str, Math.min(Math.max(x, w / 2 + 6), W - w / 2 - 6), y, o); };
      // which way does the beam tip?
      let ang = 0, pv = null;
      if (f.tip) {
        if (m.n === 2) { const lift = sup[0].name === f.tip ? 0 : 1; ang = lift === 0 ? 0.1 : -0.1; pv = X(sup[1 - lift].pos); }
        else if (m.n === 1) { ang = f.tip === "B" ? 0.1 : -0.1; pv = X(sup[0].pos); }
      }
      if (m.pivot >= 0) { line(g, X(m.pivot), py - 30, X(m.pivot), py + th + 30, MUTED, 1.5, [4, 4]); lab("moments about here", X(m.pivot), py - 38, { align: "center", color: MUTED, size: fontSize(W) - 1 }); }
      // supports (not tilted)
      sup.forEach((s) => {
        const x = X(s.pos);
        if (s.kind === "support") { ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x, py + th); ctx.lineTo(x - 15, py + th + 22); ctx.lineTo(x + 15, py + th + 22); ctx.closePath(); ctx.fill(); }
        else if (s.kind === "rope") line(g, x, py, x, 16, MUTED, 1.5);
        else { ctx.fillStyle = INK; ctx.fillRect(x - 4, py - 8, 8, th + 24); }
        text(g, s.name, x + 18, py + th + 18, { bold: true });
        text(g, `${nf(s.pos, 2)} m`, x, py + th + 38, { align: "center", color: MUTED, size: fontSize(W) - 1 });
      });
      ctx.save();
      if (pv != null) { ctx.translate(pv, py + th / 2); ctx.rotate(ang); ctx.translate(-pv, -(py + th / 2)); }
      ctx.fillStyle = "#e6eef6"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(left, py, right - left, th); ctx.strokeRect(left, py, right - left, th);
      text(g, "A", left - 14, py + 7, { bold: true, align: "center" }); text(g, "B", right + 14, py + 7, { bold: true, align: "center" });
      circle(g, X(m.G), py + th / 2, 4, INK); text(g, "G", X(m.G), py - 10, { align: "center", color: MUTED, size: fontSize(W) - 1 });
      // weights: arrows pointing down from the beam
      const down = (x, w, col, txt) => { arrow(g, X(x), py + th, X(x), py + th + Math.abs(w) * sc, col, ""); lab(txt, X(x), py + th + Math.abs(w) * sc + 14, { align: "center", color: col === INK ? MUTED : col, size: fontSize(W) - 1 }); };
      const up = (x, w, col, txt) => { arrow(g, X(x), py, X(x), py - Math.abs(w) * sc, col, ""); lab(txt, X(x), py - Math.abs(w) * sc - 8, { align: "center", color: col, size: fontSize(W) - 1 }); };
      if (m.M > 0) down(m.G, m.M * m.g, INK, `${nf(m.M * m.g, 1)} N`);
      m.loads.forEach((ld) => (ld.m > 0 ? down(ld.x, ld.m * m.g, INK, `${nf(ld.m * m.g, 1)} N`) : up(ld.x, ld.m * m.g, INK, `${nf(-ld.m * m.g, 1)} N up`)));
      if (m.m1 !== 0) (m.m1 > 0 ? down : up)(f.x, m.m1 * m.g, BLUE, `${nf(Math.abs(m.m1 * m.g), 1)} N`);
      ctx.restore();
      // reactions: pointing up from the beam
      const Rs = [f.R1, f.R2];
      sup.forEach((s, j) => {
        const R = Rs[j], x = X(s.pos), col = f.over && s.kind !== "support" ? "#b00020" : RED;
        const name = s.kind === "rope" ? `T at ${s.name}` : s.kind === "bolt" ? `force at ${s.name}` : `R at ${s.name}`;
        if (R >= 0) { if (R * sc > 3) arrow(g, x, py, x, py - R * sc, col, ""); lab(`${name}: ${nf(R, 1)} N`, x, py - R * sc - 8, { align: "center", color: col, bold: true, size: fontSize(W) - 1 }); }
        else { arrow(g, x, py + th, x, py + th - R * sc, col, ""); lab(`${name}: ${nf(-R, 1)} N down`, x, py + th - R * sc + 14, { align: "center", color: col, bold: true, size: fontSize(W) - 1 }); }
      });
      const msg = f.over ? `A rope or bolt is over its limit of ${nf(m.limit, 0)} N`
        : f.tip ? (m.n === 2 ? `The beam tips: it lifts off at ${f.tip}` : `The beam turns: end ${f.tip} goes down`)
        : (() => { const z = sup.find((sp, j) => sp.kind !== "bolt" && m.n === 2 && Math.abs(Rs[j]) < 1e-6); return z ? `The beam is on the point of lifting off at ${z.name}` : m.n === 1 ? "The beam balances on its support" : ""; })();
      if (msg) text(g, msg, W / 2, 22, { bold: true, align: "center", color: RED, size: fontSize(W) + 1 });
      readout(g, (m.m1 !== 0 ? [`moving load at ${nf(f.x)} m from A`] : []).concat(sup.map((s, j) => `${s.name}: ${nf(Rs[j], 1)} N`)));
    },
  },
});
SCENES["stages"].aspectNarrow = 1.3;

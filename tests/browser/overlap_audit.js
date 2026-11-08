// Overlap audit: opens every example/preset page at several widths, scrubs through the animation and
// records every label, line and box the scene draws on the canvas. Reports labels that overlap other
// labels, lines or boxes, and labels that run off the canvas.
//   node tests/browser/overlap_audit.js [base-url] [page-filter]
// Needs playwright (npm i playwright) and the site served, e.g.  python -m http.server -d docs 8124
const { chromium } = require("playwright");
const base = process.argv[2] || "http://localhost:8124";
const filter = process.argv[3] || "";
const WIDTHS = [(process.env.WIDTHS || "380,820,1200").split(",").map(Number)][0];
const STEPS = Number(process.env.STEPS || 9);

const recorder = () => {
  const P = CanvasRenderingContext2D.prototype;
  const rec = (window.__rec = { text: [], seg: [], rect: [], on: false });
  window.__resetRec = () => { rec.text = []; rec.seg = []; rec.rect = []; rec.on = true; };
  let path = [], cur = null;
  const wrap = (name, fn) => { const o = P[name]; P[name] = function (...a) { fn.call(this, a); return o.apply(this, a); }; };
  wrap("beginPath", () => { path = []; cur = null; });
  wrap("moveTo", (a) => { cur = [a[0], a[1]]; });
  wrap("lineTo", (a) => { if (cur) path.push([cur[0], cur[1], a[0], a[1]]); cur = [a[0], a[1]]; });
  wrap("quadraticCurveTo", (a) => { if (cur) path.push([cur[0], cur[1], a[2], a[3]]); cur = [a[2], a[3]]; });
  wrap("bezierCurveTo", (a) => { if (cur) path.push([cur[0], cur[1], a[4], a[5]]); cur = [a[4], a[5]]; });
  wrap("arc", function (a) { path.push(["arc", a[0], a[1], a[2]]); });
  wrap("stroke", function () {
    if (!rec.on) return;
    const lw = this.lineWidth, col = String(this.strokeStyle).toLowerCase();
    if (lw < 1.2 || col === "#dbe6f0" || col === "rgba(0,0,0,0)") return;
    for (const s of path) {
      if (s[0] === "arc") rec.rect.push({ x: s[1] - s[3], y: s[2] - s[3], w: 2 * s[3], h: 2 * s[3], kind: "circle" });
      else rec.seg.push({ x0: s[0], y0: s[1], x1: s[2], y1: s[3], lw });
    }
  });
  wrap("fillRect", function (a) { if (rec.on) rec.rect.push({ x: a[0], y: a[1], w: a[2], h: a[3], kind: "rect", fill: String(this.fillStyle) }); });
  wrap("strokeRect", function (a) { if (rec.on) rec.rect.push({ x: a[0], y: a[1], w: a[2], h: a[3], kind: "rect", fill: "stroke" }); });
  wrap("fillText", function (a) {
    if (!rec.on) return;
    const m = this.measureText(a[0]), size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)[1]);
    const w = m.width, h = size * 1.15;
    let x = a[1], y = a[2];
    if (this.textAlign === "center") x -= w / 2; else if (this.textAlign === "right" || this.textAlign === "end") x -= w;
    if (this.textBaseline === "middle") y -= h / 2; else if (this.textBaseline === "alphabetic") y -= h * 0.8; else if (this.textBaseline === "bottom") y -= h;
    rec.text.push({ s: String(a[0]), x, y, w, h, rot: false });
  });
};

const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
function segHitsRect(s, r, pad = 1) {            // Liang-Barsky clip of the segment against the rect
  const x0 = s.x0, y0 = s.y0, dx = s.x1 - s.x0, dy = s.y1 - s.y0;
  let t0 = 0, t1 = 1;
  const p = [-dx, dx, -dy, dy], q = [x0 - (r.x + pad), r.x + r.w - pad - x0, y0 - (r.y + pad), r.y + r.h - pad - y0];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; } else {
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; t0 = Math.max(t0, t); } else { if (t < t0) return false; t1 = Math.min(t1, t); }
    }
  }
  return t0 < t1 && (t1 - t0) * Math.hypot(dx, dy) > 3;
}

function analyse(rec, W, H) {
  const out = [];
  const T = rec.text.filter((t) => t.s.trim());
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.x < -3 || t.y < -3 || t.x + t.w > W + 3 || t.y + t.h > H + 3) out.push(["off-canvas", t.s]);
    for (let j = i + 1; j < T.length; j++) {
      const u = T[j], a = inter(t, u);
      if (a > 8 && a > 0.06 * Math.min(t.w * t.h, u.w * u.h)) out.push(["text-text", `${t.s} | ${u.s}`]);
    }
    for (const s of rec.seg) if (segHitsRect(s, t, 2)) { out.push(["text-line", t.s]); break; }
    for (const r of rec.rect) {
      const a = inter(t, r);
      if (a <= 6) continue;
      const inside = t.x >= r.x - 1 && t.y >= r.y - 1 && t.x + t.w <= r.x + r.w + 1 && t.y + t.h <= r.y + r.h + 1;
      if (!inside && a > 0.08 * t.w * t.h) { out.push(["text-box", t.s]); break; }
    }
  }
  return out;
}


// page layout: text pieces that overlap each other (outside the canvas)
const domCheck = () => {
  const els = [...document.querySelectorAll("body *")].filter((e) => e.tagName !== "CANVAS" && e.tagName !== "SCRIPT" && e.tagName !== "STYLE" && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden");
  const leaves = els.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) );
  const items = leaves.map((e) => { const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); return { e, b, t: e.textContent.trim().slice(0, 30) }; }).filter((x) => x.b.width > 2 && x.b.height > 2);
  const out = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], c = items[j];
    if (a.e.contains(c.e) || c.e.contains(a.e)) continue;
    const w = Math.min(a.b.right, c.b.right) - Math.max(a.b.left, c.b.left), h = Math.min(a.b.bottom, c.b.bottom) - Math.max(a.b.top, c.b.top);
    if (w > 3 && h > 3) out.push(a.t + " | " + c.t);
  }
  const sw = document.documentElement.scrollWidth > innerWidth + 1 ? ["sideways scroll " + document.documentElement.scrollWidth + ">" + innerWidth] : [];
  return out.concat(sw);
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.addInitScript(recorder);
  const idx = await (await ctx.request.get(base + "/manifest.json")).json();
  const pages = idx.map((x) => x.url || x.path || ("e/" + x.id + "/")).filter((u) => u.includes(filter));
  const bySc = {}, detail = {};
  let n = 0;
  for (const rel of pages) {
    const page = await ctx.newPage();
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(`${base}/${rel.replace(/^\//, "")}`, { waitUntil: "load" });
      await page.waitForTimeout(250);
      const info = await page.evaluate(() => { const s = document.getElementById("scrub"); const c = document.querySelector("canvas"); return s ? { min: +s.min, max: +s.max, W: c.clientWidth, H: c.clientHeight } : null; });
      if (!info) continue;
      for (const what of await page.evaluate(domCheck)) {
        const key = `${rel.replace(/^\/?(e|m1)\//, "").replace(/\/$/, "")}|${w}|page-layout`;
        bySc[key] = (bySc[key] || 0) + 1; (detail[key] = detail[key] || new Set()).add(what);
      }
      for (let k = 0; k < STEPS; k++) {
        const v = Math.round(info.min + ((info.max - info.min) * k) / (STEPS - 1));
        const rec = await page.evaluate((v) => {
          const s = document.getElementById("scrub");
          s.value = v; window.__resetRec(); s.dispatchEvent(new Event("input", { bubbles: true }));
          const r = window.__rec; r.on = false; return JSON.parse(JSON.stringify(r));
        }, v);
        for (const [kind, what] of analyse(rec, info.W, info.H)) {
          const sc = rel.replace(/^\/?(e|m1)\//, "").replace(/\/$/, "");
          const key = `${sc}|${w}|${kind}`;
          bySc[key] = (bySc[key] || 0) + 1;
          (detail[key] = detail[key] || new Set()).add(what);
        }
        n++;
      }
    }
    await page.close();
  }
  const rows = Object.entries(bySc).sort((a, b) => b[1] - a[1]);
  console.log(`frames checked: ${n}; pages: ${pages.length}; issue groups: ${rows.length}`);
  const perScene = {};
  for (const [k, c] of rows) { const [sc, w, kind] = k.split("|"); const scene = sc.replace(/-\d+(-\d+)?$/, "") || sc; (perScene[scene] = perScene[scene] || { n: 0, kinds: {} }).n += c; perScene[scene].kinds[kind] = (perScene[scene].kinds[kind] || 0) + c; }
  console.log(JSON.stringify(Object.entries(perScene).sort((a, b) => b[1].n - a[1].n).map(([s, v]) => [s, v.n, v.kinds]), null, 0));
  require("fs").writeFileSync(process.env.OUT || "overlap_report.json", JSON.stringify(Object.fromEntries(rows.map(([k, c]) => [k, { count: c, examples: [...detail[k]].slice(0, 5) }])), null, 1));
  await b.close();
})();

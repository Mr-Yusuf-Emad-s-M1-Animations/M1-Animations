// Renders every scene (all presets) to PNG using node-canvas, and smoke-tests the drawing code.
const vm = require("vm"), fs = require("fs"), path = require("path");
const { createCanvas } = require("canvas");
const root = path.resolve(__dirname, "../..");
const { solveScene } = require(root + "/js/solvers.js");
const cat = (() => { const c = {}; vm.runInNewContext(fs.readFileSync(root + "/docs/static/catalog.js", "utf8"), { window: c }); return c.CATALOG; })();
const sb = { console, Math, String, Number, WeakMap, Object, Array }; vm.createContext(sb);
vm.runInContext(fs.readFileSync(root + "/static/scenes.js", "utf8") + ";this.SCENES=SCENES;this.getReadout=getReadout;this.PAPER=PAPER;this.GRID=GRID;", sb);
const W_WIDE = +process.argv[2] || 720;
const sheetFrames = [0.3, 0.65, 1.0];
let problems = 0;

function render(scene, data, p, W) {
  const H = Math.round(W * (W < 520 ? (scene.aspectNarrow || 0.85) : 0.6)), cv = createCanvas(W, H), ctx = cv.getContext("2d");
  ctx.fillStyle = sb.PAPER; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = sb.GRID; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x <= W; x += 20) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
  for (let y = 0; y <= H; y += 20) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
  ctx.stroke();
  return { cv, ctx, H };
}
// smoke test: wrap ctx so any NaN/Infinity coordinate is reported
function guard(ctx, name) {
  const bad = [];
  for (const fn of ["moveTo", "lineTo", "arc", "fillRect", "strokeRect", "fillText", "quadraticCurveTo", "translate"]) {
    const orig = ctx[fn].bind(ctx);
    ctx[fn] = (...a) => { if (a.some((v) => typeof v === "number" && !Number.isFinite(v))) bad.push(fn + "(" + a.join(",") + ")"); return orig(...a); };
  }
  return bad;
}
const out = [];
const vmPath = path;
for (const [id, info] of Object.entries(cat)) {
  const scene = sb.SCENES[id];
  if (!scene) { console.log("NO DRAW FUNCTION:", id); problems++; continue; }
  info.presets.forEach((pre, pi) => {
    const data = solveScene(id, pre.params);
    for (const W of [W_WIDE, 380]) {
      const sheet = [];
      for (const fr of sheetFrames) {
        const { cv, ctx, H } = render(scene, data, pre, W);
        const bad = guard(ctx, id);
        const i = Math.min(data.frames.length - 1, Math.round(fr * (data.frames.length - 1)));
        try { scene.draw({ ctx, W, H }, data.frames[i], data.meta, data); sb.getReadout(); }
        catch (e) { console.log("THROW", id, pi, W, e.message); problems++; }
        if (bad.length) { console.log("BAD NUMBERS", id, pi, W, bad.slice(0, 2)); problems++; }
        sheet.push(cv);
      }
      if (pi === 0) out.push({ id, W, sheet });
    }
  });
}
// contact sheets: 3 scenes per image
const per = 3;
for (const W of [W_WIDE, 380]) {
  const rows = out.filter((o) => o.W === W);
  for (let k = 0; k < rows.length; k += per) {
    const grp = rows.slice(k, k + per), h = grp[0].sheet[0].height, w = grp[0].sheet[0].width;
    const cv = createCanvas(w * 3 + 20, (h + 28) * grp.length), c = cv.getContext("2d");
    c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
    grp.forEach((o, r) => {
      c.fillStyle = "#000"; c.font = "bold 18px sans-serif"; c.fillText(o.id, 6, r * (h + 28) + 20);
      o.sheet.forEach((s, j) => c.drawImage(s, j * (w + 10), r * (h + 28) + 28));
    });
    fs.writeFileSync(path.join(process.argv[3] || __dirname, `sheet_${W}_${String(k / per).padStart(2, "0")}.png`), cv.toBuffer("image/png"));
  }
}
console.log("problems:", problems);

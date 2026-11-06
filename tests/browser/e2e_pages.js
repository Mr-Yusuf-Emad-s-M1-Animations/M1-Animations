// Opens every built page in jsdom (with node-canvas), runs the real page scripts,
// then clicks Play / Load / a slider and checks nothing throws and numbers appear.
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs"), path = require("path");
const docs = process.argv[2] || path.resolve(__dirname, "../../docs");
const manifest = JSON.parse(fs.readFileSync(path.join(docs, "manifest.json"), "utf8"));
let fails = 0, ok = 0;
(async () => {
  for (const pg of manifest) {
    const errors = [];
    const vc = new VirtualConsole();
    vc.on("jsdomError", (e) => errors.push(String(e.message || e).slice(0, 160)));
    vc.on("error", (e) => errors.push(String(e).slice(0, 160)));
    const dom = await JSDOM.fromFile(path.join(docs, pg.url, "index.html"), {
      runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc,
      beforeParse(w) { Object.defineProperty(w.HTMLElement.prototype, "clientWidth", { get() { return 700; } }); },
    });
    await new Promise((r) => (dom.window.document.readyState === "complete" ? r() : dom.window.addEventListener("load", r)));
    await new Promise((r) => setTimeout(r, 60));
    const d = dom.window.document, w = dom.window;
    const res = d.querySelectorAll("#results dt").length, err = d.getElementById("error").textContent;
    const read = d.querySelectorAll("#readout dd").length;
    try {
      d.getElementById("play").click(); await new Promise((r) => setTimeout(r, 80));
      d.getElementById("restart").click();
      const sl = d.querySelector('input[type=range][data-for]');
      if (sl) { sl.value = sl.max; sl.dispatchEvent(new w.Event("input", { bubbles: true })); await new Promise((r) => setTimeout(r, 330)); }
      d.getElementById("load").click();
    } catch (e) { errors.push("click: " + e.message); }
    const bad = errors.length || res === 0 || read === 0 || (err && pg.kind !== "never");
    if (bad) { fails++; console.log("FAIL", pg.url, { errors, results: res, readout: read, errorBox: err }); } else ok++;
    dom.window.close();
  }
  console.log(`pages ok: ${ok}, failed: ${fails}`);
})();

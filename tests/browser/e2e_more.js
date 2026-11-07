const { JSDOM, VirtualConsole } = require("jsdom");
const path = require("path");
const docs = process.argv[2] || path.resolve(__dirname, "../../docs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(rel, query = "") {
  const vc = new VirtualConsole(); const errors = []; vc.on("jsdomError", (e) => errors.push(String(e.message)));
  const dom = await JSDOM.fromFile(path.join(docs, rel, "index.html"), {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { Object.defineProperty(w.HTMLElement.prototype, "clientWidth", { get() { return 700; } }); },
  });
  await new Promise((r) => (dom.window.document.readyState === "complete" ? r() : dom.window.addEventListener("load", r)));
  await sleep(50); return { dom, errors };
}
let bad = 0;
const expect = (name, cond, extra = "") => { console.log((cond ? "ok   " : "FAIL ") + name, cond ? "" : extra); if (!cond) bad++; };
(async () => {
  let { dom, errors } = await open("m1/overtaking");
  let d = dom.window.document, w = dom.window;
  const u = d.querySelector('[name="u"]');
  u.value = "abc"; d.getElementById("params").dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  expect("text in a number box is ignored (default is used)", d.getElementById("error").textContent === "" && d.querySelectorAll("#results dt").length > 0, d.getElementById("error").textContent);
  expect("the old picture stays (results kept)", d.querySelectorAll("#results dt").length > 0);
  u.value = "-4"; d.getElementById("params").dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  expect("an impossible value shows the physics message", /greater than 0/.test(d.getElementById("error").textContent), d.getElementById("error").textContent);
  u.value = "12"; d.getElementById("params").dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  expect("fixing it clears the message", d.getElementById("error").textContent === "");
  const a = [...d.querySelectorAll("#results dd")].map((x) => x.textContent).join(" | ");
  expect("results change with the numbers", /Time to catch up/.test([...d.querySelectorAll("#results dt")].map((x) => x.textContent).join()), a);
  expect("no script errors", errors.length === 0, errors.join(";"));
  dom.window.close();

  // numbers in the address
  const vc = new VirtualConsole();
  const dom2 = await JSDOM.fromFile(path.join(docs, "m1/overtaking/index.html"), {
    url: "file://" + path.resolve(docs, "m1/overtaking/index.html") + "?u=8&a=2.5&v=20", runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { Object.defineProperty(w.HTMLElement.prototype, "clientWidth", { get() { return 700; } }); },
  });
  await new Promise((r) => dom2.window.addEventListener("load", r)); await sleep(60);
  const d2 = dom2.window.document;
  expect("?u=8 in the address fills the box", d2.querySelector('[name="u"]').value === "8", d2.querySelector('[name="u"]').value);
  expect("and the results use it (caught while accelerating)", [...d2.querySelectorAll("#results dt")].some((x) => /accelerating/.test(x.textContent)));
  dom2.window.close();

  // a field called "length" (clashes with form.length) and a select
  ({ dom } = await open("m1/towing")); d = dom.window.document;
  const sel = d.querySelector('[name="link"]'); sel.value = "string"; sel.dispatchEvent(new dom.window.Event("input", { bubbles: true })); await sleep(330);
  expect("select change reloads", d.getElementById("error").textContent === "" && d.querySelectorAll("#results dt").length > 0);
  dom.window.close();
  console.log(bad ? "FAILED" : "all good");
  process.exit(bad ? 1 : 0);
})();

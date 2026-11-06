// Reads cases.json, runs each through the JS solvers, writes js_out.json.
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { solveScene, InputError } = require("../js/solvers.js");
const cases = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const out = cases.map(({ id, params }) => {
  try { return { ok: solveScene(id, params) }; }
  catch (e) { return e instanceof InputError ? { error: e.message } : { crash: String(e.stack || e) }; }
});
fs.writeFileSync(process.argv[3], JSON.stringify(out));

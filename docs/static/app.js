// The page: reads the numbers, asks the solver (solvers.js, running right here in
// the browser) for the frames, and plays them through the scene's draw function.
(() => {
  const id = window.SCENE_ID, scene = SCENES[id], spec = window.CATALOG[id];
  const canvas = document.getElementById("stage"), ctx = canvas.getContext("2d");
  const form = document.getElementById("params"), loadBtn = document.getElementById("load");
  const playBtn = document.getElementById("play"), restartBtn = document.getElementById("restart");
  const speedSel = document.getElementById("speed"), scrub = document.getElementById("scrub");
  const errBox = document.getElementById("error"), resultsBox = document.getElementById("results");
  const readoutBox = document.getElementById("readout");
  // look fields up by name; the form.elements collection would clash with a field called "length"
  const field = (key) => form.querySelector(`[name="${key}"]`);

  let data = null, t = 0, playing = false, last = 0, debounceTimer = 0, W = 0, H = 0;
  let dirty = false;   // the form has changed since the numbers on screen were loaded

  function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth;
    H = Math.round(W * (W < 520 ? scene.aspectNarrow || 0.85 : 0.6));
    canvas.style.height = H + "px";
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function background() {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = GRID; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x <= W; x += 20) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 0; y <= H; y += 20) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
  }

  const index = () => (data ? Math.min(data.frames.length - 1, Math.floor(t / data.dt + 1e-9)) : 0);
  const endTime = () => (data.frames.length - 1) * data.dt;

  function draw() {
    background();
    if (!data) { readoutBox.replaceChildren(); return; }
    const i = index();
    scrub.value = i;
    scene.draw({ ctx, W, H }, data.frames[i], data.meta, data);
    showReadout(getReadout());
  }

  function tick(ts) {
    if (!playing) return;
    t += ((ts - last) / 1000) * Number(speedSel.value);
    last = ts;
    if (t >= endTime()) { t = endTime(); playing = false; }
    draw(); updateButtons();
    if (playing) requestAnimationFrame(tick);
  }

  function play() {
    if (!data || dirty) load(false);
    if (!data) return;
    if (playing) { playing = false; updateButtons(); return; }
    if (t >= endTime()) t = 0;
    playing = true; last = performance.now(); updateButtons();
    requestAnimationFrame(tick);
  }

  function restart() {
    if (!data || dirty) load(false);
    playing = false; t = 0; updateButtons(); draw();
  }

  function step(n) {
    if (!data) return;
    playing = false; t = Math.min(Math.max(0, t + n * data.dt), endTime()); updateButtons(); draw();
  }

  function updateButtons() {
    const atEnd = data && t >= endTime();
    playBtn.textContent = playing ? "Pause" : atEnd ? "Play again" : "Play";
    loadBtn.textContent = "Load";
  }

  function showReadout(lines) {
    readoutBox.replaceChildren();
    for (const s of lines) { const dd = document.createElement("dd"); dd.textContent = s; readoutBox.append(dd); }
  }

  function showResults(list) {
    resultsBox.replaceChildren();
    for (const r of list) {
      const dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = r.label; dd.textContent = r.value;
      if (r.unit) { const u = document.createElement("small"); u.textContent = " " + r.unit; dd.append(u); }
      resultsBox.append(dt, dd);
    }
  }

  // Read the form the same way the Python server did: empty means the default,
  // something that is not a number is an error.
  function readValues() {
    const v = {};
    for (const sp of spec.params) {
      const raw = String(field(sp.key).value).trim();
      if (sp.type === "text") { v[sp.key] = raw; continue; }
      if (sp.type === "select") { v[sp.key] = sp.options.some((o) => o[0] === raw) ? raw : sp.default; continue; }
      const x = raw === "" ? Number(sp.default) : Number(raw);
      if (!Number.isFinite(x)) throw new InputError(`${sp.label} must be a number.`);
      v[sp.key] = x;
    }
    return v;
  }

  // fromUser: the person typed or pressed Load, so the address bar now holds their numbers.
  function load(fromUser) {
    playing = false; t = 0;
    try {
      const values = readValues();
      data = solveScene(id, values);
      errBox.textContent = ""; dirty = false;
      scrub.max = data.frames.length - 1;
      showResults(data.results);
      if (fromUser) { try { history.replaceState(null, "", "?" + new URLSearchParams(values)); } catch (e) { /* file:// */ } }
    } catch (e) {
      if (e instanceof InputError) errBox.textContent = e.message;
      else { errBox.textContent = "Something went wrong with these numbers."; console.error(e); }
      // keep any scene that is already on screen
    }
    updateButtons(); draw();
  }

  loadBtn.addEventListener("click", () => { clearTimeout(debounceTimer); location.reload(); });   // Load reloads the whole page
  playBtn.addEventListener("click", play);
  restartBtn.addEventListener("click", restart);
  scrub.addEventListener("input", () => { if (!data) return; playing = false; t = Number(scrub.value) * data.dt; updateButtons(); draw(); });

  form.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.for) field(el.dataset.for).value = el.value;     // slider -> number box
    else { const sl = form.querySelector(`input[data-for="${el.name}"]`); if (sl) sl.value = el.value; }   // number box -> slider
    dirty = true; updateButtons();
    clearTimeout(debounceTimer); debounceTimer = setTimeout(() => load(true), 250);
  });
  form.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(debounceTimer); load(true); } });
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, select, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === " " && e.target.tagName !== "BUTTON") { e.preventDefault(); play(); }
    else if (e.key === "r" || e.key === "R") restart();
    else if (e.key === "ArrowRight") step(e.shiftKey ? 10 : 1);
    else if (e.key === "ArrowLeft") step(e.shiftKey ? -10 : -1);
  });
  window.addEventListener("resize", () => { sizeCanvas(); draw(); });

  // numbers in the address (?u=17.5&...) win over the defaults printed in the page
  const qs = new URLSearchParams(location.search);
  for (const sp of spec.params) {
    if (!qs.has(sp.key)) continue;
    field(sp.key).value = qs.get(sp.key);
    const sl = form.querySelector(`input[data-for="${sp.key}"]`); if (sl) sl.value = qs.get(sp.key);
  }
  sizeCanvas();
  load(false);
})();

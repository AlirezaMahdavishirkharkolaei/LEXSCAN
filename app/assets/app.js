// LexScan application controller.
import { scan } from "./scanner.js";
import { verifyAnalysis, verifyQuote } from "./verify.js";
import { redact, restore } from "./redact.js";
import { MODELS, analyse, ask } from "./gemini.js";
import { extract } from "./extract.js";
import { toHtml, toMarkdown } from "./report.js";
import { UI_LANGS, RTL, t, setLang, detectUiLang } from "./i18n.js";
import { SAMPLE_ANALYSIS, SAMPLE_CONTRACT, SAMPLE_NAME, SAMPLE_OPTIONS } from "./sample.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};
const MAX_INLINE_BYTES = 14 * 1024 * 1024; // base64 grows by a third; Gemini's inline request limit is 20 MB.

const state = { doc: null, scan: null, analysis: null, demo: false, riskFilter: "all", busy: false };
let sessionKey = "";

// ------------------------------------------------------------------ language
function applyLanguage(code) {
  setLang(code);
  document.documentElement.lang = code;
  document.documentElement.dir = RTL.has(code) ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  $("drop").setAttribute("aria-label", t("drop"));
  updateMode();
  if (state.doc) { renderDocMeta(); renderDocument(); }
  renderScan();
  renderAI();
  renderSuggestions();
}

// ------------------------------------------------------------------ settings
function initSettings() {
  $("ui-lang").innerHTML = Object.entries(UI_LANGS).map(([c, n]) => `<option value="${c}">${n}</option>`).join("");
  const urlLang = new URLSearchParams(location.search).get("lang");
  $("ui-lang").value = (urlLang && UI_LANGS[urlLang] ? urlLang : null) || store.get("lexscan_ui") || detectUiLang();
  $("ui-lang").addEventListener("change", () => {
    store.set("lexscan_ui", $("ui-lang").value);
    if (store.get("lexscan_language") === null) $("language").value = $("ui-lang").value;
    applyLanguage($("ui-lang").value);
  });
  $("model").innerHTML = MODELS.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join("");
  const saved = store.get("lexscan_key");
  if (saved) { $("api-key").value = saved; $("remember-key").checked = true; sessionKey = saved; }
  $("language").value = $("ui-lang").value;
  for (const id of ["model", "model-custom", "jurisdiction", "perspective", "language"]) {
    const v = store.get("lexscan_" + id);
    if (v !== null && (id !== "model" || MODELS.some((m) => m.id === v))) $(id).value = v;
    $(id).addEventListener("change", () => store.set("lexscan_" + id, $(id).value));
  }
  $("pseudonymise").checked = store.get("lexscan_pseudonymise") === "1";
  $("pseudonymise").addEventListener("change", () => store.set("lexscan_pseudonymise", $("pseudonymise").checked ? "1" : "0"));
  $("api-key").addEventListener("input", () => {
    sessionKey = $("api-key").value.trim();
    if ($("remember-key").checked) store.set("lexscan_key", sessionKey);
    updateMode();
    renderAI();
  });
  $("remember-key").addEventListener("change", () => store.set("lexscan_key", $("remember-key").checked ? sessionKey : null));
  $("open-settings").addEventListener("click", () => toggleSettings($("settings").hidden));
}

function toggleSettings(open, focusKey = false) {
  $("settings").hidden = !open;
  $("open-settings").setAttribute("aria-expanded", String(open));
  if (open && focusKey) $("api-key").focus();
}

function options() {
  const j = $("jurisdiction");
  return {
    jurisdiction: j.value, jurisdictionLabel: j.options[j.selectedIndex].text,
    perspective: $("perspective").value.trim(), language: $("language").value,
  };
}
const model = () => $("model-custom").value.trim() || $("model").value;
function updateMode() {
  const live = sessionKey.length > 10;
  $("mode").textContent = live ? t("ready") : t("demo");
  $("mode").classList.toggle("live", live);
}

function msg(text, kind = "error") {
  $("msg").textContent = text || "";
  $("msg").className = "msg" + (kind === "info" ? " info" : "");
  $("msg").hidden = !text;
}

// ------------------------------------------------------------------ tabs
function selectTab(name) {
  for (const tab of ["scan", "ai", "ask"]) {
    $("tab-" + tab).setAttribute("aria-selected", String(tab === name));
    $("panel-" + tab).hidden = tab !== name;
  }
}

// ------------------------------------------------------------------ document
function loadDocument(doc, { demo = false } = {}) {
  (state.doc?.previews || []).forEach((u) => URL.revokeObjectURL(u));
  state.doc = { files: [], previews: [], ...doc };
  state.demo = demo;
  state.analysis = null;
  $("ai-meta").textContent = "";
  state.scan = doc.text ? scan(doc.text) : null;
  renderDocMeta();
  renderDocument();
  renderScan();
  renderAI();
  $("qa").innerHTML = "";
  $("export").hidden = false;
  msg("");
}

function renderDocMeta() {
  const d = state.doc;
  $("doc-name").textContent = d.nameKey ? t(d.nameKey) : d.name;
  const parts = [];
  if (d.noteKey) parts.push(t(d.noteKey));
  else if (d.note) parts.push(d.note);
  if (d.pages) parts.push(t("pages", { n: d.pages }));
  else if (d.files.length > 1 || d.kind === "images") parts.push(t("pages", { n: d.files.length }));
  if (state.scan) parts.push(t("words", { w: state.scan.wordCount.toLocaleString(), p: state.scan.paragraphs.length }));
  if (d.transcribed) parts.push(t("transcribed"));
  $("doc-meta").textContent = parts.join(" · ");
  const thumbs = $("thumbs");
  thumbs.hidden = !d.previews.length;
  thumbs.innerHTML = d.previews.map((u, i) => `<img src="${u}" alt="${esc(t("pages", { n: i + 1 }))}">`).join("")
    + (d.kind === "images" ? `<button type="button" class="ghost add" id="add-page" title="${esc(t("addPage"))}" aria-label="${esc(t("addPage"))}">+</button>` : "");
}

function renderDocument() {
  const body = $("doc-body");
  if (!state.doc) { body.innerHTML = `<p class="empty">${esc(t("emptyDoc"))}</p>`; return; }
  const paras = state.scan?.paragraphs || [];
  if (!paras.length) { body.innerHTML = `<p class="empty">${esc(t("noText"))}</p>`; return; }
  const scanHits = new Set(state.scan.redFlags.map((f) => f.paragraph));
  const quotesBy = {};
  for (const item of [...(state.analysis?.clauses || []), ...(state.analysis?.red_flags || [])]) {
    const v = item.verification;
    if (v && v.status !== "not_found" && v.paragraph >= 0) (quotesBy[v.paragraph] = quotesBy[v.paragraph] || []).push(item.quote);
  }
  body.innerHTML = paras.map((p, i) => {
    let html = esc(p);
    for (const q of quotesBy[i] || []) {
      const qe = esc(q.trim());
      if (qe && html.includes(qe) && !html.includes(`<mark class="ai">${qe}`)) html = html.replace(qe, () => `<mark class="ai">${qe}</mark>`);
    }
    return `<div class="para${scanHits.has(i) ? " scan-hit" : ""}" id="p-${i}"><span class="pn">P${i + 1}</span><span class="pt">${html.replace(/\n/g, "<br>")}</span></div>`;
  }).join("");
}

function focusParagraph(i) {
  const el = $("p-" + i);
  if (!el) return;
  document.querySelectorAll(".para.focus").forEach((e) => e.classList.remove("focus"));
  el.classList.add("focus");
  el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
}

// ------------------------------------------------------------------ instant scan
const flagText = (f) => t("flag_" + f.id, { n: f.n, unit: f.unit });

function renderScan() {
  const s = state.scan, out = $("panel-scan");
  if (!state.doc) { out.innerHTML = `<p class="empty">${esc(t("scanEmpty"))}</p>`; return; }
  if (!s) { out.innerHTML = `<p class="empty">${esc(t("scanNoText"))}</p>`; return; }
  const present = s.clauses.filter((c) => c.present);
  const dl = (label, arr) => (arr.length ? `<dt>${esc(t(label))}</dt><dd dir="auto">${arr.map(esc).join(" · ")}</dd>` : "");
  const pnums = (arr) => arr.map((p) => "P" + (p + 1)).join(", ");
  out.innerHTML = `
    <div class="stats">
      <div class="stat"><b>${s.completeness}%</b><span>${esc(t("stCompleteness"))}</span></div>
      <div class="stat"><b>${s.redFlags.length}</b><span>${esc(t("stFlags"))}</span></div>
      <div class="stat"><b>${s.missing.length}</b><span>${esc(t("stMissing"))}</span></div>
      <div class="stat"><b>${s.language.toUpperCase()}</b><span>${esc(t("stLang"))}</span></div>
    </div>
    ${s.parties.length ? `<div class="section"><h3>${esc(t("parties"))}</h3><p dir="auto">${s.parties.map(esc).join(" · ")}</p></div>` : ""}
    <div class="section"><h3>${esc(t("redFlags"))} <span class="meta">${esc(t("clickToSee"))}</span></h3>
      ${s.redFlags.length ? s.redFlags.map((f) => `<div class="flag"><a href="#p-${f.paragraph}" data-p="${f.paragraph}"><b>P${f.paragraph + 1}</b> · ${esc(flagText(f))}</a><p dir="auto">${esc(f.snippet)}…</p></div>`).join("") : `<p class="meta">${esc(t("noFlags"))}</p>`}
    </div>
    <div class="section"><h3>${esc(t("clauses"))}</h3><div class="chips">
      ${present.map((c) => `<button class="chip on" type="button" data-p="${c.paragraphs[0]}" title="${esc(t("foundIn"))} ${pnums(c.paragraphs)}">${esc(t("clause_" + c.key))}</button>`).join("")}
      ${s.clauses.filter((c) => c.expected && !c.present).map((c) => `<span class="chip off" title="${esc(t("notFoundStd"))}">${esc(t("clause_" + c.key))}</span>`).join("")}
    </div><p class="meta">${esc(t("clauseLegend"))}</p></div>
    <div class="section"><h3>${esc(t("keyData"))}</h3><dl class="datagrid">
      ${dl("amounts", s.data.amounts)}${dl("dates", s.data.dates)}${dl("periods", s.data.durations)}${dl("percentages", s.data.percentages)}${dl("definedTerms", s.data.definedTerms)}
    </dl></div>
    <p class="note">${esc(t("scanNote"))}</p>`;
}

// ------------------------------------------------------------------ AI review
const RISK_ORDER = { high: 0, medium: 1, low: 2 };
const VER_KEY = { exact: "verExact", approximate: "verApprox", not_found: "verNot" };
const riskLabel = (r) => (RISK_ORDER[r] !== undefined ? t("r_" + r) : r);

function quoteHtml(item) {
  if (!item.quote) return "";
  const v = item.verification || { status: "not_found", paragraph: -1 };
  const where = v.paragraph >= 0 && v.status !== "not_found" ? ` · P${v.paragraph + 1}` : "";
  return `<blockquote dir="auto" data-p="${v.paragraph}" title="${esc(t("showInDoc"))}">${esc(item.quote)}</blockquote>
    <span class="ver ${v.status}">${esc(t(VER_KEY[v.status]))}${where}</span>`;
}

function renderAI() {
  const a = state.analysis, out = $("ai-out");
  $("run-ai").disabled = !state.doc || state.busy;
  if (!state.doc) { out.innerHTML = `<p class="empty">${esc(t("loadFirst"))}</p>`; return; }
  if (!a) {
    out.innerHTML = `<div class="section"><h3>${esc(t("aiEmptyTitle"))}</h3><ul class="clean">
      <li>${esc(t("aiAdd1"))}</li><li>${t("aiAdd2")}</li><li>${esc(t("aiAdd3"))}</li></ul>
      <p class="meta">${esc(sessionKey ? t("modelIs", { m: model() }) : t("needKey"))}</p></div>`;
    return;
  }
  const clauses = [...(a.clauses || [])].sort((x, y) => (RISK_ORDER[x.risk] ?? 3) - (RISK_ORDER[y.risk] ?? 3))
    .filter((c) => state.riskFilter === "all" || c.risk === state.riskFilter);
  const count = (r) => (a.clauses || []).filter((c) => c.risk === r).length;
  const vs = a.verification_summary || {};
  const list = (arr, f) => (arr?.length ? `<ul class="clean">${arr.map((x) => `<li dir="auto">${f(x)}</li>`).join("")}</ul>` : `<p class="meta">${esc(t("none"))}</p>`);
  out.innerHTML = `
    ${state.demo ? `<p class="msg info">${esc(t("sampleNotice"))}</p>` : ""}
    <div class="section"><div class="risk-head">
      <div class="risk-badge r-${esc(a.overall_risk)}">${esc(t("risk"))}<b>${esc(riskLabel(a.overall_risk))}</b></div>
      <div><h3 dir="auto">${esc(a.document_type)}</h3><p dir="auto">${esc(a.summary)}</p></div></div>
      <p class="meta" dir="auto">${esc(a.risk_rationale)}</p>
      <div class="stats">
        <div class="stat"><b>${count("high")}</b><span>${esc(t("hiRisk"))}</span></div>
        <div class="stat"><b>${count("medium")}</b><span>${esc(t("medRisk"))}</span></div>
        <div class="stat"><b>${vs.checked ? `${vs.verified}/${vs.checked}` : "–"}</b><span>${esc(t("quotesVerified"))}</span></div>
        <div class="stat"><b class="word">${esc(riskLabel(a.confidence))}</b><span>${esc(t("modelConf"))}</span></div>
      </div></div>
    ${a.key_terms?.length ? `<div class="section"><h3>${esc(t("keyTerms"))}</h3><dl class="datagrid">${a.key_terms.map((k) => `<dt dir="auto">${esc(k.label)}</dt><dd dir="auto">${esc(k.value)}</dd>`).join("")}</dl></div>` : ""}
    <div class="section"><h3>${esc(t("clauseReview"))} <span class="filter">${["all", "high", "medium", "low"].map((r) => `<button type="button" class="chip" data-filter="${r}" aria-pressed="${state.riskFilter === r}">${esc(r === "all" ? t("f_all") : t("r_" + r))}</button>`).join("")}</span></h3>
      ${clauses.map((c) => `<article class="clause ${esc(c.risk)}">
        <header><div><span class="type" dir="auto">${esc(c.type)}</span><h3 dir="auto">${esc(c.title)}</h3></div>
        <span class="pill r-${esc(c.risk)}">${esc(riskLabel(c.risk))} · ${esc(t("favours", { x: c.favours }))}</span></header>
        ${quoteHtml(c)}<p dir="auto">${esc(c.assessment)}</p>
        <p class="rec"><b>${esc(t("recommendation"))}</b> <span dir="auto">${esc(c.recommendation)}</span></p>
        ${c.legal_reference ? `<p class="ref" dir="auto">${esc(c.legal_reference)}</p>` : ""}</article>`).join("") || `<p class="meta">${esc(t("noneAtLevel"))}</p>`}
    </div>
    <div class="section"><h3>${esc(t("redFlags"))}</h3>${(a.red_flags || []).map((f) => `<div class="clause ${esc(f.severity)}"><h3 dir="auto">${esc(f.issue)}</h3>${quoteHtml(f)}<p dir="auto">${esc(f.why)}</p></div>`).join("") || `<p class="meta">${esc(t("none"))}</p>`}</div>
    <div class="section"><h3>${esc(t("missingClauses"))}</h3>${list(a.missing_clauses, (m) => `<b>${esc(m.clause)}:</b> ${esc(m.why_it_matters)}`)}</div>
    <div class="section"><h3>${esc(t("negotiation"))}</h3>${list(a.negotiation_points, esc)}</div>
    ${a.obligations?.length ? `<div class="section"><h3>${esc(t("obligations"))}</h3>${list(a.obligations, (o) => `<b>${esc(o.party)}:</b> ${esc(o.obligation)}${o.deadline ? ` <span class="meta">(${esc(o.deadline)})</span>` : ""}`)}</div>` : ""}
    ${a.questions_for_client?.length ? `<div class="section"><h3>${esc(t("questions"))}</h3>${list(a.questions_for_client, esc)}</div>` : ""}
    ${a.jurisdiction_notes?.length ? `<div class="section"><h3>${esc(t("frameworkNotes"))}</h3>${list(a.jurisdiction_notes, (n) => `${esc(n.note)}${n.reference ? ` <span class="ref">${esc(n.reference)}</span>` : ""} <span class="meta">· ${esc(t("confidence", { x: riskLabel(n.confidence) }))}</span>`)}</div>` : ""}`;
}

/** Pseudonymise the paragraphs and the "review for" field with the same placeholders. */
function pseudonymised(paras) {
  const opts = options();
  if (!$("pseudonymise").checked || !paras.length) return { paras, map: {}, opts };
  const r = redact(paras.join("\n\n"), state.scan?.parties || []);
  let perspective = opts.perspective;
  for (const [tag, value] of Object.entries(r.map)) perspective = perspective.split(value).join(tag);
  return { paras: r.text.split("\n\n"), map: r.map, opts: { ...opts, perspective: redact(perspective, []).text.replace(/\[(EMAIL|PHONE|IBAN|CARD|ID)_\d+\]/g, "[…]") } };
}

async function runAI() {
  if (!state.doc || state.busy) return;
  if (!sessionKey) { toggleSettings(true, true); msg(t("addKeyMsg"), "info"); return; }
  state.busy = true;
  renderAI();
  msg("");
  const started = Date.now();
  $("ai-meta").innerHTML = `<span class="spinner"></span> ${esc(t("reviewing", { m: model() }))}`;
  try {
    const { paras, map, opts } = pseudonymised(state.scan?.paragraphs || []);
    const { json, usage, model: used } = await analyse({ apiKey: sessionKey, model: model(), paras, files: state.doc.files, options: opts });
    let result = restore(json, map);
    if (!state.scan && result.transcript) {
      // Scans and photos: the model's transcript becomes the document text.
      state.scan = scan(result.transcript);
      state.doc.transcribed = true;
    }
    result = verifyAnalysis(result, state.scan?.paragraphs || []);
    state.analysis = result;
    state.demo = false;
    const secs = ((Date.now() - started) / 1000).toFixed(0);
    const n = Object.keys(map).length;
    $("ai-meta").textContent = [used, `${secs}s`, usage?.totalTokenCount ? `${usage.totalTokenCount.toLocaleString()} tokens` : "", n ? t("pseudoCount", { n }) : ""].filter(Boolean).join(" · ");
    renderDocMeta();
    renderDocument();
    renderScan();
  } catch (e) {
    $("ai-meta").textContent = "";
    msg(e.message || String(e));
  } finally {
    state.busy = false;
    renderAI();
  }
}

// ------------------------------------------------------------------ Q&A
function renderSuggestions() {
  $("suggest").innerHTML = ["sug1", "sug2", "sug3", "sug4", "sug5"].map((k) => `<button type="button" class="chip">${esc(t(k))}</button>`).join("");
}

async function runAsk(question) {
  if (!question.trim() || !state.doc) return;
  if (!state.scan?.paragraphs?.length) { msg(t("qaNeedsText")); return; }
  if (!sessionKey) { msg(t("addKeyAsk"), "info"); toggleSettings(true, true); return; }
  msg("");
  const box = document.createElement("div");
  box.className = "qa";
  box.innerHTML = `<p class="q" dir="auto">${esc(question)}</p><p class="meta"><span class="spinner"></span> ${esc(t("reading"))}</p>`;
  $("qa").prepend(box);
  try {
    const { paras, map } = pseudonymised(state.scan.paragraphs);
    const { json } = await ask({ apiKey: sessionKey, model: model(), paras, question, language: options().language });
    const r = restore(json, map);
    const quotes = (r.quotes || []).map((q) => ({ ...q, verification: verifyQuote(q.quote, state.scan.paragraphs) }));
    box.innerHTML = `<p class="q" dir="auto">${esc(question)}</p><p dir="auto">${esc(r.answer)}</p>
      ${quotes.map((q) => quoteHtml(q)).join("")}
      <p class="meta">${r.not_in_contract ? esc(t("notInContract")) + " " : ""}${esc(t("confidence", { x: riskLabel(r.confidence) }))}</p>`;
  } catch (e) {
    box.innerHTML = `<p class="q" dir="auto">${esc(question)}</p><p class="msg">${esc(e.message || e)}</p>`;
  }
}

// ------------------------------------------------------------------ export
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function exportAs(kind) {
  if (!state.doc) return;
  const docName = $("doc-name").textContent;
  const ctx = { docName, analysis: state.analysis, scan: state.scan, options: options() };
  const base = "LexScan_" + (docName.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40) || "report");
  if (kind === "print") { selectTab(state.analysis ? "ai" : "scan"); window.print(); return; }
  if (kind === "html") download(base + ".html", toHtml(ctx), "text/html");
  if (kind === "md") download(base + ".md", toMarkdown(ctx), "text/markdown");
  if (kind === "json") {
    const scanOut = state.scan && { ...state.scan, paragraphs: undefined };
    download(base + ".json", JSON.stringify({ tool: "LexScan 2", document: docName, created: new Date().toISOString(), options: options(), scan: scanOut, analysis: state.analysis }, null, 2), "application/json");
  }
}

// ------------------------------------------------------------------ files
async function handleFiles(fileList, { append = false } = {}) {
  const files = [...(fileList || [])];
  if (!files.length) return;
  msg(t("readingFile", { f: files.map((f) => f.name).join(", ") }), "info");
  try {
    const docs = [];
    for (const f of files) docs.push(await extract(f));
    const texts = docs.filter((d) => d.text);
    const binaries = docs.filter((d) => d.file);
    const addToImages = append && state.doc?.kind === "images" && !texts.length;
    const allFiles = [...(addToImages ? state.doc.files : []), ...binaries.map((d) => d.file)];
    const bytes = allFiles.reduce((n, f) => n + f.data.length * 0.75, 0);
    if (bytes > MAX_INLINE_BYTES) throw new Error(t("tooLarge"));
    if (texts.length) {
      loadDocument({
        name: texts.length === 1 ? texts[0].name : `${texts[0].name} +${texts.length - 1}`,
        kind: texts[0].kind, text: texts.map((d) => d.text).join("\n\n"),
        pages: texts.length === 1 ? texts[0].pages : undefined,
        note: texts.length === 1 ? texts[0].note : "",
      });
      selectTab("scan");
    } else {
      const images = binaries.every((d) => d.kind === "image");
      const previews = [...(addToImages ? state.doc.previews : []), ...binaries.map((d) => d.preview).filter(Boolean)];
      if (addToImages) state.doc.previews = []; // keep the old preview URLs alive: loadDocument revokes the previous ones
      loadDocument({
        name: images ? "" : binaries[0].name, nameKey: images ? "photos" : null,
        kind: images ? "images" : binaries[0].kind, text: "", files: allFiles, previews,
        note: images ? "" : binaries[0].note,
      });
      selectTab("ai");
      msg(t("noTextLayer"), "info");
    }
  } catch (e) { msg(e.message || String(e)); }
}

function loadSample() {
  for (const [k, v] of Object.entries(SAMPLE_OPTIONS)) if ($(k) && k !== "language") $(k).value = v;
  loadDocument({ name: SAMPLE_NAME, text: SAMPLE_CONTRACT, kind: "text", noteKey: "fictional" }, { demo: true });
  state.analysis = verifyAnalysis(structuredClone(SAMPLE_ANALYSIS), state.scan.paragraphs);
  renderDocument();
  renderAI();
}

function init() {
  initSettings();
  $("drop").addEventListener("click", () => $("file").click());
  $("drop").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file").click(); } });
  $("file").addEventListener("change", (e) => { handleFiles(e.target.files); e.target.value = ""; });
  $("camera").addEventListener("change", (e) => { handleFiles(e.target.files, { append: true }); e.target.value = ""; });
  $("photo-btn").addEventListener("click", () => $("camera").click());
  ["dragenter", "dragover"].forEach((ev) => $("drop").addEventListener(ev, (e) => { e.preventDefault(); $("drop").classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => $("drop").addEventListener(ev, (e) => { e.preventDefault(); $("drop").classList.remove("over"); }));
  $("drop").addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
  $("paste-toggle").addEventListener("click", () => { $("paste-box").hidden = !$("paste-box").hidden; if (!$("paste-box").hidden) $("paste").focus(); });
  $("paste-go").addEventListener("click", () => {
    const text = $("paste").value.trim();
    if (text.length < 50) { msg(t("pasteShort")); return; }
    loadDocument({ name: "", nameKey: "pastedName", text, kind: "text", noteKey: "pasted" });
    $("paste-box").hidden = true;
    selectTab("scan");
  });
  $("load-sample").addEventListener("click", loadSample);
  for (const tab of ["scan", "ai", "ask"]) $("tab-" + tab).addEventListener("click", () => selectTab(tab));
  $("run-ai").addEventListener("click", runAI);
  $("ask-form").addEventListener("submit", (e) => { e.preventDefault(); const q = $("question").value; $("question").value = ""; runAsk(q); });
  $("suggest").addEventListener("click", (e) => { if (e.target.matches("button")) runAsk(e.target.textContent); });
  document.querySelectorAll("[data-export]").forEach((b) => b.addEventListener("click", () => exportAs(b.dataset.export)));
  // Delegated clicks: paragraph jumps, risk filters, adding a page.
  document.addEventListener("click", (e) => {
    if (e.target.closest("#add-page")) { $("camera").click(); return; }
    const f = e.target.closest("[data-filter]");
    if (f) { state.riskFilter = f.dataset.filter; renderAI(); return; }
    const p = e.target.closest("[data-p]");
    if (p && Number(p.dataset.p) >= 0) { e.preventDefault(); focusParagraph(Number(p.dataset.p)); }
  });
  applyLanguage($("ui-lang").value);
  loadSample();
  const h = location.hash.slice(1);
  if (["scan", "ai", "ask"].includes(h)) selectTab(h);
}

init();

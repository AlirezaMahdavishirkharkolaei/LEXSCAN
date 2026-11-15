// LexScan application controller.
import { scan } from "./scanner.js";
import { verifyAnalysis, verifyQuote } from "./verify.js";
import { redact, restore } from "./redact.js";
import { MODELS, analyse, ask } from "./gemini.js";
import { extract } from "./extract.js";
import { toHtml, toMarkdown } from "./report.js";
import { SAMPLE_ANALYSIS, SAMPLE_CONTRACT, SAMPLE_NAME, SAMPLE_OPTIONS } from "./sample.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

const state = { doc: null, scan: null, analysis: null, demo: false, riskFilter: "all", busy: false };
let sessionKey = "";

// ------------------------------------------------------------------ settings
function initSettings() {
  $("model").innerHTML = MODELS.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join("");
  const saved = store.get("lexscan_key");
  if (saved) { $("api-key").value = saved; $("remember-key").checked = true; sessionKey = saved; }
  for (const id of ["model", "model-custom", "jurisdiction", "perspective", "language"]) {
    const v = store.get("lexscan_" + id);
    if (v !== null) $(id).value = v;
    $(id).addEventListener("change", () => store.set("lexscan_" + id, $(id).value));
  }
  $("pseudonymise").checked = store.get("lexscan_pseudonymise") === "1";
  $("pseudonymise").addEventListener("change", () => store.set("lexscan_pseudonymise", $("pseudonymise").checked ? "1" : "0"));
  $("api-key").addEventListener("input", () => {
    sessionKey = $("api-key").value.trim();
    if ($("remember-key").checked) store.set("lexscan_key", sessionKey);
    updateMode();
  });
  $("remember-key").addEventListener("change", () => store.set("lexscan_key", $("remember-key").checked ? sessionKey : null));
  $("open-settings").addEventListener("click", () => {
    const open = $("settings").hidden;
    $("settings").hidden = !open;
    $("open-settings").setAttribute("aria-expanded", String(open));
  });
  updateMode();
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
  $("mode").textContent = live ? "AI ready" : "Demo mode";
  $("mode").classList.toggle("live", live);
}

function msg(text, kind = "error") {
  $("msg").textContent = text || "";
  $("msg").className = "msg" + (kind === "info" ? " info" : "");
  $("msg").hidden = !text;
}

// ------------------------------------------------------------------ tabs
function selectTab(name) {
  for (const t of ["scan", "ai", "ask"]) {
    $("tab-" + t).setAttribute("aria-selected", String(t === name));
    $("panel-" + t).hidden = t !== name;
  }
}

// ------------------------------------------------------------------ document
function loadDocument(doc, { demo = false } = {}) {
  state.doc = doc;
  state.demo = demo;
  state.analysis = null;
  state.scan = doc.text ? scan(doc.text) : null;
  $("doc-name").textContent = doc.name;
  $("doc-meta").textContent = [doc.note, state.scan ? `${state.scan.wordCount.toLocaleString()} words · ${state.scan.paragraphs.length} paragraphs` : ""].filter(Boolean).join(" · ");
  renderDocument();
  renderScan();
  renderAI();
  $("qa").innerHTML = "";
  renderSuggestions();
  $("export").hidden = false;
  msg("");
}

function renderDocument() {
  const body = $("doc-body");
  if (!state.doc) { body.innerHTML = `<p class="empty">Upload a contract, paste text, or load the sample.</p>`; return; }
  const paras = state.scan?.paragraphs || [];
  if (!paras.length) { body.innerHTML = `<p class="empty">${esc(state.doc.note || "No text layer")}. Run the AI review to read it.</p>`; return; }
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
      if (qe && html.includes(qe)) html = html.replace(qe, `<mark class="ai">${qe}</mark>`);
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
function renderScan() {
  const s = state.scan, out = $("panel-scan");
  if (!state.doc) { out.innerHTML = `<p class="empty">The instant scan runs in your browser as soon as a document is loaded. No API key needed.</p>`; return; }
  if (!s) { out.innerHTML = `<p class="empty">This file has no text layer. Use the AI review, which reads scans and photos directly.</p>`; return; }
  const present = s.clauses.filter((c) => c.present);
  const dl = (label, arr) => (arr.length ? `<dt>${label}</dt><dd>${arr.map(esc).join(" · ")}</dd>` : "");
  out.innerHTML = `
    <div class="stats">
      <div class="stat"><b>${s.completeness}%</b><span>standard clauses present</span></div>
      <div class="stat"><b>${s.redFlags.length}</b><span>rule-based red flags</span></div>
      <div class="stat"><b>${s.missing.length}</b><span>standard clauses not found</span></div>
      <div class="stat"><b>${s.language.toUpperCase()}</b><span>detected language</span></div>
    </div>
    ${s.parties.length ? `<div class="section"><h3>Parties</h3><p>${s.parties.map(esc).join(" · ")}</p></div>` : ""}
    <div class="section"><h3>Red flags <span class="meta">click to see the clause</span></h3>
      ${s.redFlags.length ? s.redFlags.map((f) => `<div class="flag"><a href="#p-${f.paragraph}" data-p="${f.paragraph}"><b>P${f.paragraph + 1}</b> · ${esc(f.text)}</a><p>${esc(f.snippet)}…</p></div>`).join("") : `<p class="meta">No rule-based red flags. Run the AI review for a full assessment.</p>`}
    </div>
    <div class="section"><h3>Clauses</h3><div class="chips">
      ${present.map((c) => `<button class="chip on" type="button" data-p="${c.paragraphs[0]}" title="Found in ${c.paragraphs.map((p) => "P" + (p + 1)).join(", ")}">${esc(c.label)}</button>`).join("")}
      ${s.clauses.filter((c) => c.expected && !c.present).map((c) => `<span class="chip off" title="Standard clause not found">${esc(c.label)}</span>`).join("")}
    </div><p class="meta">Green: found. Red: standard clause not found.</p></div>
    <div class="section"><h3>Key data</h3><dl class="datagrid">
      ${dl("Amounts", s.data.amounts)}${dl("Dates", s.data.dates)}${dl("Periods", s.data.durations)}${dl("Percentages", s.data.percentages)}${dl("Defined terms", s.data.definedTerms)}
    </dl></div>
    <p class="note">The instant scan uses keyword rules for English, Turkish and Greek. It finds clauses; it does not judge them. Use the AI review for substance.</p>`;
}

// ------------------------------------------------------------------ AI review
const RISK_ORDER = { high: 0, medium: 1, low: 2 };
const VER_LABEL = { exact: "✓ verified in document", approximate: "≈ approximately verified", not_found: "✗ not found in document" };

function quoteHtml(item) {
  if (!item.quote) return "";
  const v = item.verification || { status: "not_found", paragraph: -1 };
  return `<blockquote dir="auto" data-p="${v.paragraph}" title="Show in document">${esc(item.quote)}</blockquote>
    <span class="ver ${v.status}">${VER_LABEL[v.status]}${v.paragraph >= 0 && v.status !== "not_found" ? ` · P${v.paragraph + 1}` : ""}</span>`;
}

function renderAI() {
  const a = state.analysis, out = $("ai-out");
  $("run-ai").disabled = !state.doc || state.busy;
  if (!state.doc) { out.innerHTML = `<p class="empty">Load a document first.</p>`; return; }
  if (!a) {
    out.innerHTML = `<div class="section"><h3>What the AI review adds</h3><ul class="clean">
      <li>Clause-by-clause assessment for the party you represent, with risk and recommendations</li>
      <li>Every finding quotes the contract, and each quote is <b>checked against the document</b></li>
      <li>Missing clauses, negotiation points, questions for the client and notes on the chosen legal framework</li></ul>
      <p class="meta">${sessionKey ? `Model: ${esc(model())}` : "Add your Gemini API key in Settings to run it."}</p></div>`;
    return;
  }
  const clauses = [...(a.clauses || [])].sort((x, y) => (RISK_ORDER[x.risk] ?? 3) - (RISK_ORDER[y.risk] ?? 3))
    .filter((c) => state.riskFilter === "all" || c.risk === state.riskFilter);
  const count = (r) => (a.clauses || []).filter((c) => c.risk === r).length;
  const vs = a.verification_summary || {};
  const list = (arr, f) => (arr?.length ? `<ul class="clean">${arr.map((x) => `<li dir="auto">${f(x)}</li>`).join("")}</ul>` : `<p class="meta">None.</p>`);
  out.innerHTML = `
    ${state.demo ? `<p class="msg info">Sample analysis: written by hand to show the interface, not generated by a model. Add an API key and press “Run AI review” to analyse your own document.</p>` : ""}
    <div class="section"><div class="risk-head">
      <div class="risk-badge r-${esc(a.overall_risk)}">risk<b>${esc(a.overall_risk)}</b></div>
      <div><h3 dir="auto">${esc(a.document_type)}</h3><p dir="auto">${esc(a.summary)}</p></div></div>
      <p class="meta" dir="auto">${esc(a.risk_rationale)}</p>
      <div class="stats">
        <div class="stat"><b>${count("high")}</b><span>high-risk clauses</span></div>
        <div class="stat"><b>${count("medium")}</b><span>medium-risk clauses</span></div>
        <div class="stat"><b>${vs.checked ? `${vs.verified}/${vs.checked}` : "–"}</b><span>quotes verified in document</span></div>
        <div class="stat"><b>${esc(a.confidence)}</b><span>model confidence</span></div>
      </div></div>
    ${a.key_terms?.length ? `<div class="section"><h3>Key terms</h3><dl class="datagrid">${a.key_terms.map((k) => `<dt dir="auto">${esc(k.label)}</dt><dd dir="auto">${esc(k.value)}</dd>`).join("")}</dl></div>` : ""}
    <div class="section"><h3>Clause review <span class="filter">${["all", "high", "medium", "low"].map((r) => `<button type="button" class="chip" data-filter="${r}" aria-pressed="${state.riskFilter === r}">${r}</button>`).join("")}</span></h3>
      ${clauses.map((c) => `<article class="clause ${esc(c.risk)}">
        <header><div><span class="type" dir="auto">${esc(c.type)}</span><h3 dir="auto">${esc(c.title)}</h3></div>
        <span class="pill r-${esc(c.risk)}">${esc(c.risk)} · favours ${esc(c.favours)}</span></header>
        ${quoteHtml(c)}<p dir="auto">${esc(c.assessment)}</p>
        <p class="rec" dir="auto"><b>Recommendation:</b> ${esc(c.recommendation)}</p>
        ${c.legal_reference ? `<p class="ref">${esc(c.legal_reference)}</p>` : ""}</article>`).join("") || `<p class="meta">No clauses at this risk level.</p>`}
    </div>
    <div class="section"><h3>Red flags</h3>${(a.red_flags || []).map((f) => `<div class="clause ${esc(f.severity)}"><h3 dir="auto">${esc(f.issue)}</h3>${quoteHtml(f)}<p dir="auto">${esc(f.why)}</p></div>`).join("") || `<p class="meta">None.</p>`}</div>
    <div class="section"><h3>Missing clauses</h3>${list(a.missing_clauses, (m) => `<b>${esc(m.clause)}:</b> ${esc(m.why_it_matters)}`)}</div>
    <div class="section"><h3>Negotiation points</h3>${list(a.negotiation_points, esc)}</div>
    ${a.obligations?.length ? `<div class="section"><h3>Obligations and deadlines</h3>${list(a.obligations, (o) => `<b>${esc(o.party)}:</b> ${esc(o.obligation)}${o.deadline ? ` <span class="meta">(${esc(o.deadline)})</span>` : ""}`)}</div>` : ""}
    ${a.questions_for_client?.length ? `<div class="section"><h3>Questions for the client</h3>${list(a.questions_for_client, esc)}</div>` : ""}
    ${a.jurisdiction_notes?.length ? `<div class="section"><h3>Notes on the legal framework</h3>${list(a.jurisdiction_notes, (n) => `${esc(n.note)}${n.reference ? ` <span class="ref">${esc(n.reference)}</span>` : ""} <span class="meta">· confidence ${esc(n.confidence)}</span>`)}</div>` : ""}`;
}

async function runAI() {
  if (!state.doc || state.busy) return;
  if (!sessionKey) {
    $("settings").hidden = false;
    $("open-settings").setAttribute("aria-expanded", "true");
    $("api-key").focus();
    msg("Add your Google Gemini API key to run the AI review.", "info");
    return;
  }
  state.busy = true;
  renderAI();
  msg("");
  const started = Date.now();
  $("ai-meta").innerHTML = `<span class="spinner"></span> Reviewing with ${esc(model())}…`;
  try {
    let paras = state.scan?.paragraphs || [];
    let map = {};
    if ($("pseudonymise").checked && paras.length) {
      const r = redact(paras.join("\n\n"), state.scan.parties);
      map = r.map;
      paras = r.text.split("\n\n");
    }
    const { json, usage, model: used } = await analyse({ apiKey: sessionKey, model: model(), paras, files: state.doc.file ? [state.doc.file] : [], options: options() });
    let result = restore(json, map);
    if (!state.scan && result.transcript) {
      // Scans and photos: the model's transcript becomes the document text.
      state.scan = scan(result.transcript);
      $("doc-meta").textContent = `${state.doc.note} · transcribed by the AI (check against the original)`;
    }
    result = verifyAnalysis(result, state.scan?.paragraphs || []);
    state.analysis = result;
    state.demo = false;
    const secs = ((Date.now() - started) / 1000).toFixed(0);
    $("ai-meta").textContent = `${used} · ${secs}s${usage?.totalTokenCount ? ` · ${usage.totalTokenCount.toLocaleString()} tokens` : ""}${Object.keys(map).length ? ` · ${Object.keys(map).length} items pseudonymised` : ""}`;
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
const SUGGESTIONS = ["Can either party terminate early, and at what cost?", "Who owns the intellectual property?",
  "What is each party's maximum liability?", "Are there any automatic renewals or notice deadlines?", "What happens to our data at the end?"];
function renderSuggestions() {
  $("suggest").innerHTML = SUGGESTIONS.map((s) => `<button type="button" class="chip">${esc(s)}</button>`).join("");
}

async function runAsk(question) {
  if (!question.trim() || !state.doc) return;
  if (!state.scan?.paragraphs?.length) { msg("Q&A needs the document text. Run the AI review first for scans and photos."); return; }
  if (!sessionKey) { msg("Add your Google Gemini API key in Settings to ask questions.", "info"); $("settings").hidden = false; return; }
  const box = document.createElement("div");
  box.className = "qa";
  box.innerHTML = `<p class="q" dir="auto">${esc(question)}</p><p class="meta"><span class="spinner"></span> Reading the contract…</p>`;
  $("qa").prepend(box);
  try {
    let paras = state.scan.paragraphs, map = {};
    if ($("pseudonymise").checked) { const r = redact(paras.join("\n\n"), state.scan.parties); map = r.map; paras = r.text.split("\n\n"); }
    const { json } = await ask({ apiKey: sessionKey, model: model(), paras, question, language: options().language });
    const r = restore(json, map);
    const quotes = (r.quotes || []).map((q) => ({ ...q, verification: verifyQuote(q.quote, state.scan.paragraphs) }));
    box.innerHTML = `<p class="q" dir="auto">${esc(question)}</p><p dir="auto">${esc(r.answer)}</p>
      ${quotes.map((q) => quoteHtml(q)).join("")}
      <p class="meta">${r.not_in_contract ? "The contract does not appear to address this. " : ""}Confidence: ${esc(r.confidence)}</p>`;
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
  const ctx = { docName: state.doc.name, analysis: state.analysis, scan: state.scan, options: options() };
  const base = "LexScan_" + state.doc.name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_").slice(0, 40);
  if (kind === "print") { selectTab(state.analysis ? "ai" : "scan"); window.print(); return; }
  if (kind === "html") download(base + ".html", toHtml(ctx), "text/html");
  if (kind === "md") download(base + ".md", toMarkdown(ctx), "text/markdown");
  if (kind === "json") download(base + ".json", JSON.stringify({ document: state.doc.name, scan: state.scan && { ...state.scan, paragraphs: undefined }, analysis: state.analysis }, null, 2), "application/json");
}

// ------------------------------------------------------------------ wiring
async function handleFile(file) {
  if (!file) return;
  msg(`Reading ${file.name}…`, "info");
  try {
    const doc = await extract(file);
    loadDocument(doc);
    selectTab("scan");
    if (!doc.text) { selectTab("ai"); msg("No text layer found: the AI review will read the file directly.", "info"); }
  } catch (e) { msg(e.message || String(e)); }
}

function loadSample() {
  for (const [k, v] of Object.entries(SAMPLE_OPTIONS)) if ($(k)) $(k).value = v;
  loadDocument({ name: SAMPLE_NAME, text: SAMPLE_CONTRACT, kind: "text", note: "Fictional parties" }, { demo: true });
  state.analysis = verifyAnalysis(structuredClone(SAMPLE_ANALYSIS), state.scan.paragraphs);
  renderDocument();
  renderAI();
}

function init() {
  initSettings();
  $("drop").addEventListener("click", () => $("file").click());
  $("drop").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file").click(); } });
  $("file").addEventListener("change", (e) => { handleFile(e.target.files[0]); e.target.value = ""; });
  ["dragenter", "dragover"].forEach((t) => $("drop").addEventListener(t, (e) => { e.preventDefault(); $("drop").classList.add("over"); }));
  ["dragleave", "drop"].forEach((t) => $("drop").addEventListener(t, (e) => { e.preventDefault(); $("drop").classList.remove("over"); }));
  $("drop").addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));
  $("paste-toggle").addEventListener("click", () => { $("paste-box").hidden = !$("paste-box").hidden; if (!$("paste-box").hidden) $("paste").focus(); });
  $("paste-go").addEventListener("click", () => {
    const t = $("paste").value.trim();
    if (t.length < 50) { msg("Paste at least a few sentences of the contract."); return; }
    loadDocument({ name: "Pasted text", text: t, kind: "text", note: "Pasted" });
    $("paste-box").hidden = true;
  });
  $("load-sample").addEventListener("click", loadSample);
  for (const t of ["scan", "ai", "ask"]) $("tab-" + t).addEventListener("click", () => selectTab(t));
  $("run-ai").addEventListener("click", runAI);
  $("ask-form").addEventListener("submit", (e) => { e.preventDefault(); const q = $("question").value; $("question").value = ""; runAsk(q); });
  $("suggest").addEventListener("click", (e) => { if (e.target.matches("button")) runAsk(e.target.textContent); });
  document.querySelectorAll("[data-export]").forEach((b) => b.addEventListener("click", () => exportAs(b.dataset.export)));
  // Delegated: any element with data-p jumps to that paragraph; filters re-render.
  document.addEventListener("click", (e) => {
    const f = e.target.closest("[data-filter]");
    if (f) { state.riskFilter = f.dataset.filter; renderAI(); return; }
    const p = e.target.closest("[data-p]");
    if (p && Number(p.dataset.p) >= 0) { e.preventDefault(); focusParagraph(Number(p.dataset.p)); }
  });
  loadSample();
  const h = location.hash.slice(1);
  if (["scan", "ai", "ask"].includes(h)) selectTab(h);
}

init();

// ===== LexScan — Google Gemini Edition =====

const GEMINI_MODEL = "gemini-1.5-flash";  // free tier, fast, supports images
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

let currentLang   = localStorage.getItem("lexscan_lang") || "en";
let currentImages = [];   // [{name, type, data(base64), preview(dataURL)}]
let currentReport = null;
let cameraStream  = null;
let currentTab    = "upload";

// ===== BOOT =====
document.addEventListener("DOMContentLoaded", () => {
  buildLangSwitcher();
  applyLang(currentLang);
  restoreApiKey();
  checkFirstVisit();
  checkAnalyzeBtn();
});

// ===== FIRST VISIT / SETUP NOTICE =====
function checkFirstVisit() {
  if (!localStorage.getItem("lexscan_seen")) {
    document.getElementById("setupNotice").style.display = "flex";
  }
}
function dismissSetup() {
  localStorage.setItem("lexscan_seen", "1");
  document.getElementById("setupNotice").style.display = "none";
}
function toggleSetup() {
  const el = document.getElementById("setupNotice");
  el.style.display = el.style.display === "none" ? "flex" : "none";
}

// ===== LANGUAGE =====
function buildLangSwitcher() {
  const wrap = document.getElementById("langSwitcher");
  wrap.innerHTML = "";
  Object.keys(LANGUAGES).forEach(code => {
    const L = LANGUAGES[code];
    const btn = document.createElement("button");
    btn.className = "lang-btn" + (code === currentLang ? " active" : "");
    btn.innerHTML = `<span>${L.flag}</span><span class="lang-name">${L.name}</span>`;
    btn.onclick = () => { currentLang = code; localStorage.setItem("lexscan_lang", code); applyLang(code); buildLangSwitcher(); };
    wrap.appendChild(btn);
  });
}

function applyLang(code) {
  const t = LANGUAGES[code].t;
  document.documentElement.lang = code;
  document.documentElement.dir  = LANGUAGES[code].dir;

  set("txt-tagline",       t.tagline);
  set("txt-tagline2",      t.tagline2);
  set("txt-subtitle",      t.subtitle);
  set("txt-tab-upload",    t.tabUpload);
  set("txt-tab-camera",    t.tabCamera);
  set("txt-tab-text",      t.tabText);
  set("txt-dragDrop",      t.dragDrop);
  set("txt-orClick",       t.orClick);
  set("txt-formats",       t.formats);
  set("txt-cameraHint",    t.cameraHint);
  set("txt-cameraStart",   t.cameraStart);
  set("txt-cameraCapture", t.cameraCapture);
  set("txt-cameraStop",    t.cameraStop);
  set("txt-analyzeBtn",    t.analyzeBtn);
  set("txt-reportTitle",   t.reportTitle);
  set("txt-reportSub",     t.reportSub);
  set("txt-newAnalysis",   t.newAnalysis);
  set("txt-exportBtn",     t.exportBtn);
  set("txt-printBtn",      t.printBtn);
  set("txt-apiLabel",      t.apiLabel);
  set("txt-howTo",         t.howTo);
  set("txt-apiHint",       t.apiHint);
  set("txt-setupTitle",    t.setupTitle);
  set("txt-setupDesc",     t.setupDesc);
  set("txt-setupBtn",      t.setupBtn);

  // Setup steps (HTML list)
  const stepsList = document.getElementById("setupStepsList");
  if (stepsList && t.setupSteps) {
    stepsList.innerHTML = t.setupSteps.map(s => `<li>${s}</li>`).join("");
  }

  const ta = document.getElementById("contractText");
  if (ta) ta.placeholder = t.textPlaceholder;

  updateThumbLabel();
  if (currentReport) renderReport(currentReport);
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.textContent = val;
}

// ===== TAB SWITCHING =====
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.toggle("active", c.id === "tab-" + tab));
  if (tab !== "camera") stopCamera();
  updateThumbLabel();
  checkAnalyzeBtn();
}

// ===== FILE HANDLING =====
function handleDragOver(e) { e.preventDefault(); document.getElementById("dropzone").classList.add("dragover"); }
function handleDragLeave()  { document.getElementById("dropzone").classList.remove("dragover"); }
function handleDrop(e) { e.preventDefault(); document.getElementById("dropzone").classList.remove("dragover"); processFiles(e.dataTransfer.files); }
function handleFileSelect(e) { processFiles(e.target.files); e.target.value = ""; }

function processFiles(files) {
  Array.from(files).filter(f => f.type.startsWith("image/")).forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      currentImages.push({ name: file.name, type: file.type, data: ev.result.split(",")[1], preview: ev.result });
      renderThumbnails();
      checkAnalyzeBtn();
    };
    reader.readAsDataURL(file);
  });
}

function renderThumbnails() {
  const area = document.getElementById("thumbnailArea");
  const grid = document.getElementById("thumbGrid");
  if (!currentImages.length) { area.style.display = "none"; return; }
  area.style.display = "block";
  updateThumbLabel();
  grid.innerHTML = "";
  currentImages.forEach((img, i) => {
    const wrap = document.createElement("div");
    wrap.className = "thumb-item";
    wrap.innerHTML = `<img src="${img.preview}" alt="page ${i+1}" loading="lazy"/><button class="thumb-remove" onclick="removeImage(${i})">×</button>`;
    grid.appendChild(wrap);
  });
}

function removeImage(i) { currentImages.splice(i, 1); renderThumbnails(); checkAnalyzeBtn(); }
function updateThumbLabel() {
  const el = document.getElementById("txt-uploadedFiles");
  if (!el) return;
  const t = LANGUAGES[currentLang].t;
  el.textContent = (currentTab === "camera" ? t.capturedPages : t.uploadedFiles) + ` (${currentImages.length})`;
}

// ===== CAMERA =====
async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal:"environment" } } });
    const v = document.getElementById("videoEl");
    v.srcObject = cameraStream; v.style.display = "block";
    document.getElementById("cameraPlaceholder").style.display = "none";
    document.getElementById("btnStartCam").style.display = "none";
    document.getElementById("btnCapture").style.display  = "inline-flex";
    document.getElementById("btnStopCam").style.display  = "inline-flex";
  } catch(e) { showError("Camera access denied: " + e.message); }
}

function captureFrame() {
  const v = document.getElementById("videoEl");
  const c = document.getElementById("captureCanvas");
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext("2d").drawImage(v, 0, 0);
  c.toBlob(blob => {
    const r = new FileReader();
    r.onload = ev => {
      currentImages.push({ name:`capture_${Date.now()}.jpg`, type:"image/jpeg", data: ev.result.split(",")[1], preview: ev.result });
      renderThumbnails(); checkAnalyzeBtn();
    };
    r.readAsDataURL(blob);
  }, "image/jpeg", 0.92);
}

function stopCamera() {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  const v = document.getElementById("videoEl");
  if (v) { v.style.display = "none"; v.srcObject = null; }
  const ph = document.getElementById("cameraPlaceholder");
  if (ph) ph.style.display = "flex";
  ["btnStartCam","btnCapture","btnStopCam"].forEach((id,i) => {
    const el = document.getElementById(id);
    if (el) el.style.display = i === 0 ? "inline-flex" : "none";
  });
}

// ===== API KEY =====
function onApiKeyInput(val) { localStorage.setItem("lexscan_gemini_key", val.trim()); checkAnalyzeBtn(); }
function restoreApiKey() {
  const k = localStorage.getItem("lexscan_gemini_key") || "";
  const el = document.getElementById("apiKeyInput");
  if (el) el.value = k;
}
function getApiKey() { return (document.getElementById("apiKeyInput")?.value || "").trim(); }

// ===== ANALYZE BUTTON STATE =====
function checkAnalyzeBtn() {
  const btn = document.getElementById("analyzeBtn");
  if (!btn) return;
  const hasImages = currentImages.length > 0;
  const hasText   = (document.getElementById("contractText")?.value || "").trim().length > 30;
  const hasKey    = getApiKey().length > 10;
  btn.disabled = !(hasKey && (currentTab === "text" ? hasText : hasImages));
}
document.addEventListener("input", e => { if (e.target.id === "contractText") checkAnalyzeBtn(); });

// ===== ANALYZE =====
async function analyze() {
  const apiKey = getApiKey();
  if (!apiKey) { showError("Please enter your Google Gemini API key."); return; }
  hideError();
  showLoading(true);
  try {
    const result = await callGemini(apiKey);
    currentReport = result;
    renderReport(result);
    showPanel("reportPanel");
  } catch(e) {
    showError(e.message || "Analysis failed. Please check your API key and try again.");
  } finally {
    showLoading(false);
  }
}

async function callGemini(apiKey) {
  const isImage  = currentTab !== "text";
  const langNames = { en:"English", tr:"Turkish", el:"Greek", ru:"Russian", de:"German" };
  const langName  = langNames[currentLang] || "English";

  const systemInstruction = `You are an expert legal analyst for professional lawyers. Analyze the provided contract and extract critical legal information. Respond ONLY in ${langName}. Return ONLY a valid JSON object — no markdown fences, no extra text — with exactly these keys: parties, dates, obligations, clauses, risks, jurisdiction, financials, termination, summary, recommendations, confidence (high|medium|low), riskLevel (high|medium|low). Use bullet points starting with • to separate multiple items. If a section has no information write: "Not specified in this contract."`;

  const parts = [];

  if (isImage) {
    currentImages.forEach(img => {
      parts.push({ inlineData: { mimeType: img.type, data: img.data } });
    });
    parts.push({ text: `${systemInstruction}\n\nAnalyze all the contract pages shown in the images above and return the JSON.` });
  } else {
    const contractText = document.getElementById("contractText").value;
    parts.push({ text: `${systemInstruction}\n\nContract text to analyze:\n\n${contractText}\n\nReturn the JSON analysis.` });
  }

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: "application/json" }
  };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `API Error ${res.status}`;
    if (res.status === 400) throw new Error("Invalid API key or request. Make sure your Gemini API key is correct.");
    if (res.status === 403) throw new Error("API key doesn't have permission. Enable Generative Language API in Google Cloud Console.");
    if (res.status === 429) throw new Error("Too many requests. Please wait a moment and try again.");
    throw new Error(msg);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!rawText) throw new Error("Empty response from Gemini. Please try again.");

  // Parse JSON — strip any accidental fences
  const clean = rawText.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse AI response. Please try again.");
  }
}

// ===== RENDER REPORT =====
function renderReport(report) {
  const t = LANGUAGES[currentLang].t;

  // Badges
  const badges = document.getElementById("reportBadges");
  badges.innerHTML = "";
  if (report.riskLevel) {
    const b = document.createElement("div");
    b.className = `badge badge-risk-${report.riskLevel}`;
    b.textContent = `⚠ ${t.riskLevel}: ${t[report.riskLevel] || report.riskLevel}`;
    badges.appendChild(b);
  }
  if (report.confidence) {
    const b = document.createElement("div");
    b.className = `badge badge-conf-${report.confidence}`;
    b.textContent = `✓ ${t.confidence}: ${t[report.confidence] || report.confidence}`;
    badges.appendChild(b);
  }

  // Summary
  const sc = document.getElementById("summaryCard");
  if (report.summary?.trim()) {
    sc.style.display = "block";
    sc.innerHTML = `<div class="summary-card-title"><span>📝</span><span>${t.sections.summary}</span></div>
                    <div class="summary-card-body">${esc(report.summary)}</div>`;
  } else { sc.style.display = "none"; }

  // Sections
  const grid = document.getElementById("sectionsGrid");
  grid.innerHTML = "";
  REPORT_SECTIONS.forEach(key => {
    const meta  = SECTION_META[key];
    const label = t.sections[key] || key;
    const color = getComputedStyle(document.documentElement).getPropertyValue(meta.colorVar).trim() || "#4f8ef7";
    const raw   = report[key] || "";

    const card = document.createElement("div");
    card.className = "section-card";
    card.style.borderTop = `3px solid ${color}`;
    card.innerHTML = `
      <div class="section-card-header">
        <span class="section-icon">${meta.icon}</span>
        <span class="section-label" style="color:${color}">${label}</span>
      </div>
      <div class="section-body">${formatContent(raw, color, t.noContent)}</div>`;
    grid.appendChild(card);
  });
}

function formatContent(raw, color, noContentText) {
  if (!raw || !raw.trim() || raw.toLowerCase().includes("not specified")) {
    return `<span class="section-empty">${noContentText}</span>`;
  }
  const items = raw.split("•").map(s => s.trim()).filter(Boolean);
  if (items.length <= 1) return `<span>${esc(raw)}</span>`;
  return items.map((item, i) =>
    i === 0 && !raw.trimStart().startsWith("•")
      ? `<div class="section-item"><span>${esc(item)}</span></div>`
      : `<div class="section-item"><span class="section-bullet" style="color:${color}">•</span><span>${esc(item)}</span></div>`
  ).join("");
}

function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/\n/g,"<br>");
}

// ===== NAVIGATION =====
function showPanel(id) {
  document.getElementById("inputPanel").style.display  = id === "inputPanel"  ? "block" : "none";
  document.getElementById("reportPanel").style.display = id === "reportPanel" ? "block" : "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function newAnalysis() { currentReport = null; showPanel("inputPanel"); }

// ===== EXPORT =====
function exportReport() {
  if (!currentReport) return;
  const t = LANGUAGES[currentLang].t;
  const sep = "=".repeat(60);
  const lines = [
    sep, `  ${t.reportTitle.toUpperCase()}`, `  ${t.reportSub}`,
    `  ${new Date().toLocaleString()}`, sep, "",
    ...["summary", ...REPORT_SECTIONS].map(key => [
      `--- ${(t.sections[key]||key).toUpperCase()} ---`,
      currentReport[key] || t.noContent, ""
    ]).flat(),
    sep, "Generated by LexScan — AI Legal Contract Intelligence",
    "Powered by Google Gemini AI (Free)"
  ];
  const blob = new Blob([lines.join("\n")], { type:"text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `LexScan_Report_${Date.now()}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function printReport() { window.print(); }

// ===== UI HELPERS =====
function showError(msg) {
  const el = document.getElementById("errorBox");
  el.innerHTML = "⚠ " + msg; el.style.display = "block";
}
function hideError() {
  const el = document.getElementById("errorBox");
  if (el) el.style.display = "none";
}
function showLoading(show) {
  let ov = document.getElementById("loadingOverlay");
  if (show) {
    if (!ov) {
      const t = LANGUAGES[currentLang].t;
      ov = document.createElement("div");
      ov.id = "loadingOverlay"; ov.className = "loading-overlay";
      ov.innerHTML = `<div class="loading-spinner"></div>
        <div class="loading-text">${t.loadingText}</div>
        <div class="loading-sub">${t.loadingSub}</div>`;
      document.body.appendChild(ov);
    }
    ov.style.display = "flex";
  } else {
    if (ov) ov.style.display = "none";
  }
}

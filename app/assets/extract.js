// Text extraction in the browser: PDF (pdf.js), Word .docx (mammoth), plain text.
// Scanned PDFs and photos have no text layer; they are passed to the AI as files instead.

const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const MAMMOTH = "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js";

const loaded = {};
function loadScript(src) {
  if (!loaded[src]) {
    loaded[src] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.async = true; s.onload = resolve;
      s.onerror = () => reject(new Error(`Could not load ${src.split("/").pop()}. Check your connection.`));
      document.head.appendChild(s);
    });
  }
  return loaded[src];
}

function toBase64(buf) {
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function pdfText(buf) {
  await loadScript(PDFJS);
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const pdf = await window.pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    // Group text items into lines by their baseline, then start a new paragraph where the gap
    // between lines is clearly larger than the usual line spacing on that page.
    const lines = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5];
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - y) < 2) last.text += item.str;
      else lines.push({ y, text: item.str });
    }
    const gaps = lines.slice(1).map((l, i) => Math.abs(lines[i].y - l.y)).filter((g) => g > 0).sort((a, b) => a - b);
    const lineGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 12;
    let text = "";
    lines.forEach((l, i) => {
      if (i > 0) text += Math.abs(lines[i - 1].y - l.y) > lineGap * 1.4 ? "\n\n" : "\n";
      text += l.text.trim();
    });
    pages.push(text.replace(/\n{3,}/g, "\n\n").trim());
  }
  return { text: pages.join("\n\n"), pages: pdf.numPages };
}

async function docxText(buf) {
  await loadScript(MAMMOTH);
  const res = await window.mammoth.extractRawText({ arrayBuffer: buf });
  return res.value.replace(/\n{3,}/g, "\n\n").trim();
}

/** Phone photos are often 3-8 MB; scale to at most 2200 px and re-encode as JPEG so several pages fit in one request. */
async function shrinkImage(file, buf) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && buf.byteLength < 1.5e6) return { mimeType: file.type, data: toBase64(buf) };
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return { mimeType: "image/jpeg", data: toBase64(await blob.arrayBuffer()) };
  } catch {
    return { mimeType: file.type, data: toBase64(buf) };
  }
}

/** Returns {name, kind, text, file?: {mimeType, data}, note} */
export async function extract(file) {
  const name = file.name || "document";
  const lower = name.toLowerCase();
  const buf = await file.arrayBuffer();
  if (buf.byteLength > 20 * 1024 * 1024) throw new Error("The file is larger than 20 MB.");
  if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
    const { text, pages } = await pdfText(buf);
    if (text.replace(/\s/g, "").length > 200) return { name, kind: "pdf", text, pages, note: "PDF" };
    return { name, kind: "pdf-scan", text: "", file: { mimeType: "application/pdf", data: toBase64(buf) },
      note: "PDF (scan)" };
  }
  if (lower.endsWith(".docx")) return { name, kind: "docx", text: await docxText(buf), note: "Word (.docx)" };
  if (file.type.startsWith("image/")) {
    const img = await shrinkImage(file, buf);
    return { name, kind: "image", text: "", file: img, preview: URL.createObjectURL(file), note: "" };
  }
  if (file.type.startsWith("text/") || /\.(txt|md|html?)$/.test(lower)) {
    let text = new TextDecoder().decode(buf);
    if (/\.html?$/.test(lower)) text = new DOMParser().parseFromString(text, "text/html").body.innerText;
    return { name, kind: "text", text, note: lower.split(".").pop().toUpperCase() };
  }
  throw new Error(`Unsupported file type: ${name}. Use PDF, DOCX, TXT or an image.`);
}

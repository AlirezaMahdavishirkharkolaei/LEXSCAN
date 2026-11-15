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
    let text = "", lastY = null;
    for (const item of content.items) {
      const y = item.transform ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 14) text += "\n\n";
      else if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) text += "\n";
      text += item.str + (item.hasEOL ? "\n" : "");
      lastY = y;
    }
    pages.push(text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim());
  }
  return { text: pages.join("\n\n"), pages: pdf.numPages };
}

async function docxText(buf) {
  await loadScript(MAMMOTH);
  const res = await window.mammoth.extractRawText({ arrayBuffer: buf });
  return res.value.replace(/\n{3,}/g, "\n\n").trim();
}

/** Returns {name, kind, text, file?: {mimeType, data}, note} */
export async function extract(file) {
  const name = file.name || "document";
  const lower = name.toLowerCase();
  const buf = await file.arrayBuffer();
  if (buf.byteLength > 20 * 1024 * 1024) throw new Error("The file is larger than 20 MB.");
  if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
    const { text, pages } = await pdfText(buf);
    if (text.replace(/\s/g, "").length > 200) return { name, kind: "pdf", text, note: `${pages} page(s), text layer extracted` };
    return { name, kind: "pdf-scan", text: "", file: { mimeType: "application/pdf", data: toBase64(buf) },
      note: "Scanned PDF without a text layer: the AI will read it directly" };
  }
  if (lower.endsWith(".docx")) return { name, kind: "docx", text: await docxText(buf), note: "Word document" };
  if (file.type.startsWith("image/")) {
    return { name, kind: "image", text: "", file: { mimeType: file.type, data: toBase64(buf) }, note: "Image: the AI will read it directly" };
  }
  if (file.type.startsWith("text/") || /\.(txt|md|rtf|html?)$/.test(lower)) {
    let text = new TextDecoder().decode(buf);
    if (/\.html?$/.test(lower)) text = new DOMParser().parseFromString(text, "text/html").body.innerText;
    return { name, kind: "text", text, note: "Plain text" };
  }
  throw new Error(`Unsupported file type: ${name}. Use PDF, DOCX, TXT or an image.`);
}

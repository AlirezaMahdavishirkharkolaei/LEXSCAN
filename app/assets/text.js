// Text utilities shared by the scanner, the verifier and the redactor.

/** Lower-case, strip diacritics, unify quotes/dashes and collapse whitespace (for matching only). */
export function norm(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[‘’‛′´`]/g, "'")
    .replace(/[“”‟″«»]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/ı/g, "i") // Turkish dotless i
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a document into paragraphs (blank lines or numbered headings), keeping their original text. */
export function paragraphs(text) {
  const raw = String(text || "").replace(/\r\n?/g, "\n");
  const blocks = raw.split(/\n\s*\n/).flatMap((b) => {
    // Break long blocks before numbered clause headings like "12." / "12.3" / "Article 5".
    return b.split(/\n(?=\s*(?:\d{1,2}(?:\.\d{1,2})*\.?\s+\S|(?:Article|Clause|Madde|Άρθρο)\s+\d))/i);
  });
  return blocks.map((t) => t.trim()).filter((t) => t.length > 0);
}

export function tokens(s) {
  return norm(s).replace(/[^\p{L}\p{N}%]+/gu, " ").split(" ").filter(Boolean);
}

export function detectLanguage(text) {
  const t = String(text || "").slice(0, 5000);
  const greek = (t.match(/[Ͱ-Ͽ]/g) || []).length;
  const latin = (t.match(/[a-zA-Z]/g) || []).length;
  const words = norm(t).split(/[^a-z]+/).filter(Boolean);
  const trWords = words.filter((w) => /^(ve|ile|isbu|sozlesme(si|nin)?|taraf(lar|larin)?|madde|olarak|icin|veya|hukuk(u|una)?|sart|odeme)$/.test(w)).length;
  const trChars = (t.match(/[şğıİŞĞ]/g) || []).length;
  if (greek > latin * 0.3) return "el";
  if (trWords >= 3 || trChars >= 5 || (words.length && trWords / words.length > 0.05)) return "tr";
  return "en";
}

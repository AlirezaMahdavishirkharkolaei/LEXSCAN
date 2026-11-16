// Optional pseudonymisation before a document is sent for AI analysis.
// Replaces e-mails, phone numbers, IBANs, card-like and ID numbers, and any names you list,
// with placeholders such as [PARTY_1]; the mapping stays in the browser and is reversed in the report.

const PATTERNS = [
  ["EMAIL", /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
  ["IBAN", /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/g],
  ["CARD", /\b(?:\d[ -]?){13,19}\b/g],
  ["PHONE", /(?:\+|00)\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,4}/g],
  ["ID", /\b(?:HE|ΗΕ)\s?\d{4,8}\b|\b\d{11}\b/g], // Cyprus company no. (HE 123456), Turkish ID (11 digits)
];

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export function redact(text, names = []) {
  const map = {};
  const counters = {};
  const reverse = new Map();
  const put = (kind, value) => {
    if (reverse.has(value)) return reverse.get(value);
    counters[kind] = (counters[kind] || 0) + 1;
    const tag = `[${kind}_${counters[kind]}]`;
    map[tag] = value;
    reverse.set(value, tag);
    return tag;
  };
  let out = String(text || "");
  const cleanNames = [...new Set(names.map((n) => n.trim()).filter((n) => n.length > 2))].sort((a, b) => b.length - a.length);
  for (const name of cleanNames) {
    out = out.replace(new RegExp(escapeRe(name), "gi"), (m) => put("PARTY", m.replace(/\s+/g, " ")));
  }
  for (const [kind, re] of PATTERNS) {
    out = out.replace(re, (m) => (/^\[[A-Z]+_\d+\]$/.test(m) ? m : put(kind, m)));
  }
  return { text: out, map };
}

export function restore(value, map) {
  if (!map || !Object.keys(map).length) return value;
  if (typeof value === "string") return value.replace(/\[[A-Z]+_\d+\]/g, (t) => map[t] ?? t);
  if (Array.isArray(value)) return value.map((v) => restore(v, map));
  if (value && typeof value === "object") {
    const o = {};
    for (const [k, v] of Object.entries(value)) o[k] = restore(v, map);
    return o;
  }
  return value;
}

// Quote verification: checks that every quotation the AI attributes to the contract really is in it.
// This is the main guard against hallucinated clauses.

import { norm, tokens } from "./text.js";

export function verifyQuote(quote, paras) {
  const q = norm(quote).replace(/^["'.…\s]+|["'.…\s]+$/g, "").replace(/\s*(\.\.\.|…)\s*/g, " … ");
  if (!q || q.length < 8) return { status: "not_found", paragraph: -1, score: 0 };
  const normParas = paras.map(norm);
  // 1) exact (after normalisation); quotes with ellipses: every part must appear in the same paragraph, in order.
  const parts = q.split(" … ").map((s) => s.trim()).filter((s) => s.length >= 4);
  for (let i = 0; i < normParas.length; i++) {
    let pos = 0, ok = true;
    for (const part of parts) {
      const at = normParas[i].indexOf(part, pos);
      if (at < 0) { ok = false; break; }
      pos = at + part.length;
    }
    if (ok) return { status: "exact", paragraph: i, score: 1 };
  }
  // 2) the quote may span two paragraphs
  for (let i = 0; i < normParas.length - 1; i++) {
    if ((normParas[i] + " " + normParas[i + 1]).includes(parts[0] || q)) return { status: "exact", paragraph: i, score: 1 };
  }
  // 3) approximate: best sliding window of the same token length, measured by token overlap
  const qt = tokens(q.replace(/…/g, " "));
  if (qt.length < 3) return { status: "not_found", paragraph: -1, score: 0 };
  let best = { score: 0, paragraph: -1 };
  paras.forEach((p, i) => {
    const pt = tokens(p);
    const w = Math.min(pt.length, qt.length + 3);
    for (let s = 0; s + 1 <= Math.max(1, pt.length - w + 1); s++) {
      const win = new Set(pt.slice(s, s + w));
      const hit = qt.filter((t) => win.has(t)).length / qt.length;
      if (hit > best.score) best = { score: hit, paragraph: i };
    }
  });
  if (best.score >= 0.8) return { status: "approximate", paragraph: best.paragraph, score: Math.round(best.score * 100) / 100 };
  return { status: "not_found", paragraph: best.paragraph, score: Math.round(best.score * 100) / 100 };
}

/** Annotate every quote in an AI analysis with its verification result. */
export function verifyAnalysis(analysis, paras) {
  let checked = 0, verified = 0;
  const visit = (item) => {
    if (item && typeof item.quote === "string" && item.quote.trim()) {
      item.verification = verifyQuote(item.quote, paras);
      checked++;
      if (item.verification.status !== "not_found") verified++;
    }
  };
  (analysis.clauses || []).forEach(visit);
  (analysis.red_flags || []).forEach(visit);
  (analysis.obligations || []).forEach(visit);
  analysis.verification_summary = { checked, verified, rate: checked ? Math.round((100 * verified) / checked) : null };
  return analysis;
}

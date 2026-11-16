// Export an analysis as a self-contained HTML report or Markdown, with headings in the report language.
import { RTL, tFor } from "./i18n.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const VER = { exact: "verExact", approximate: "verApprox", not_found: "verNot" };
const today = () => new Date().toISOString().slice(0, 10);

function labels(options) {
  const t = tFor(options.language || "en");
  const risk = (r) => (["low", "medium", "high"].includes(r) ? t("r_" + r) : r);
  return { t, risk };
}

export function toMarkdown({ docName, analysis: a, scan, options }) {
  const { t, risk } = labels(options);
  const L = [];
  L.push(`# ${t("repTitle")}: ${docName}`, "");
  L.push(`*LexScan · ${today()} · ${options.jurisdictionLabel} · ${t("repPerspective")}: ${options.perspective || t("repNeutral")}*`, "");
  if (a) {
    L.push(`**${t("repOverall")}: ${risk(a.overall_risk)}** (${t("confidence", { x: risk(a.confidence) })})`, "", a.summary, "", a.risk_rationale, "");
    if (a.verification_summary?.checked) L.push(`${t("quotesVerified")}: ${a.verification_summary.verified}/${a.verification_summary.checked}`, "");
    if (a.parties?.length) L.push(`## ${t("parties")}`, ...a.parties.map((p) => `- ${p.name} — ${p.role}`), "");
    if (a.key_terms?.length) L.push(`## ${t("keyTerms")}`, ...a.key_terms.map((k) => `- **${k.label}:** ${k.value}`), "");
    L.push(`## ${t("clauseReview")}`);
    for (const c of a.clauses || []) {
      L.push("", `### ${c.title} — ${risk(c.risk)} (${t("favours", { x: c.favours })})`);
      if (c.quote) L.push(`> ${c.quote}${c.paragraph ? ` [P${c.paragraph}]` : ""} — *${t(VER[c.verification?.status] || "verNot")}*`);
      L.push("", c.assessment, "", `**${t("recommendation")}** ${c.recommendation}`);
      if (c.legal_reference) L.push(`*${t("repReference")}:* ${c.legal_reference}`);
    }
    if (a.red_flags?.length) L.push("", `## ${t("redFlags")}`, ...a.red_flags.map((f) => `- **${f.issue}** (${risk(f.severity)}): ${f.why}${f.quote ? ` — “${f.quote}”` : ""}`));
    if (a.missing_clauses?.length) L.push("", `## ${t("missingClauses")}`, ...a.missing_clauses.map((m) => `- **${m.clause}:** ${m.why_it_matters}`));
    if (a.negotiation_points?.length) L.push("", `## ${t("negotiation")}`, ...a.negotiation_points.map((n) => `- ${n}`));
    if (a.obligations?.length) L.push("", `## ${t("obligations")}`, ...a.obligations.map((o) => `- **${o.party}:** ${o.obligation}${o.deadline ? ` (${o.deadline})` : ""}`));
    if (a.questions_for_client?.length) L.push("", `## ${t("questions")}`, ...a.questions_for_client.map((n) => `- ${n}`));
    if (a.jurisdiction_notes?.length) L.push("", `## ${t("frameworkNotes")}`, ...a.jurisdiction_notes.map((n) => `- ${n.note}${n.reference ? ` (${n.reference})` : ""} — ${t("confidence", { x: risk(n.confidence) })}`));
  }
  if (scan) {
    L.push("", `## ${t("repScan")}`, `- ${t("repFound")}: ${scan.clauses.filter((c) => c.present).map((c) => t("clause_" + c.key)).join(", ")}`);
    if (scan.missingKeys?.length) L.push(`- ${t("repMissing")}: ${scan.missingKeys.map((k) => t("clause_" + k)).join(", ")}`);
    scan.redFlags.forEach((f) => L.push(`- [P${f.paragraph + 1}] ${t("flag_" + f.id, { n: f.n, unit: f.unit })}`));
  }
  L.push("", "---", `*${t("repFooter")}*`);
  return L.join("\n");
}

export function toHtml(ctx) {
  const { docName, analysis: a, scan, options } = ctx;
  const { t, risk } = labels(options);
  const lang = options.language || "en";
  const pill = (r) => `<span class="pill ${esc(r)}">${esc(risk(r))}</span>`;
  const sec = (title, body) => (body ? `<h2>${esc(title)}</h2>${body}` : "");
  const list = (items) => (items?.length ? `<ul>${items.map((i) => `<li dir="auto">${i}</li>`).join("")}</ul>` : "");
  const clauses = (a?.clauses || []).map((c) => `<div class="clause ${esc(c.risk)}"><h3 dir="auto">${esc(c.title)} ${pill(c.risk)}</h3>
    <p class="meta" dir="auto">${esc(c.type)} · ${esc(t("favours", { x: c.favours }))}${c.paragraph ? ` · P${c.paragraph}` : ""}</p>
    ${c.quote ? `<blockquote dir="auto">${esc(c.quote)}<span class="ver ${esc(c.verification?.status)}">${esc(t(VER[c.verification?.status] || "verNot"))}</span></blockquote>` : ""}
    <p dir="auto">${esc(c.assessment)}</p><p dir="auto"><b>${esc(t("recommendation"))}</b> ${esc(c.recommendation)}</p>
    ${c.legal_reference ? `<p class="meta" dir="auto">${esc(t("repReference"))}: ${esc(c.legal_reference)}</p>` : ""}</div>`).join("");
  return `<!DOCTYPE html><html lang="${lang}" dir="${RTL.has(lang) ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t("repTitle"))}: ${esc(docName)}</title><style>
body{font:15px/1.6 Georgia,"Vazirmatn",Tahoma,serif;color:#15201d;max-width:860px;margin:0 auto;padding:32px 20px 60px;background:#fff}
h1{font-size:26px;margin:0 0 4px}h2{font:600 18px system-ui,Tahoma,sans-serif;margin:28px 0 8px;border-bottom:1px solid #dbe1de;padding-bottom:4px}
h3{font:600 15px system-ui,Tahoma,sans-serif;margin:0 0 4px}.meta{color:#5b6763;font:13px system-ui,Tahoma,sans-serif}
.box{border:1px solid #dbe1de;border-inline-start:5px solid #b3261e;border-radius:8px;padding:12px 16px}
.clause{border:1px solid #dbe1de;border-inline-start:4px solid #999;border-radius:8px;padding:10px 14px;margin:10px 0;break-inside:avoid}
.clause.high{border-inline-start-color:#b3261e}.clause.medium{border-inline-start-color:#8a5600}.clause.low{border-inline-start-color:#1e6f3f}
.pill{font:700 11px system-ui,Tahoma,sans-serif;border-radius:99px;padding:1px 8px;vertical-align:2px}
.pill.high{background:#fbe4e2;color:#b3261e}.pill.medium{background:#fcefd2;color:#8a5600}.pill.low{background:#e1f2e7;color:#1e6f3f}
blockquote{margin:6px 0;padding:6px 10px;border-inline-start:3px solid #4a8fd4;background:#eef6ff}
.ver{display:block;font:600 11.5px system-ui,Tahoma,sans-serif;margin-top:3px}.ver.exact{color:#1e6f3f}.ver.approximate{color:#8a5600}.ver.not_found{color:#b3261e}
footer{margin-top:36px;color:#5b6763;font:12.5px system-ui,Tahoma,sans-serif;border-top:1px solid #dbe1de;padding-top:10px}
</style></head><body>
<h1 dir="auto">${esc(t("repTitle"))}: ${esc(docName)}</h1>
<p class="meta">LexScan · ${today()} · ${esc(options.jurisdictionLabel)} · ${esc(t("repPerspective"))}: ${esc(options.perspective || t("repNeutral"))}</p>
${a ? `<div class="box"><b>${esc(t("repOverall"))}: ${esc(risk(a.overall_risk))}</b> · ${esc(t("confidence", { x: risk(a.confidence) }))}${a.verification_summary?.checked ? ` · ${a.verification_summary.verified}/${a.verification_summary.checked} ${esc(t("quotesVerified"))}` : ""}
<p dir="auto">${esc(a.summary)}</p><p class="meta" dir="auto">${esc(a.risk_rationale)}</p></div>` : ""}
${sec(t("keyTerms"), list((a?.key_terms || []).map((k) => `<b>${esc(k.label)}:</b> ${esc(k.value)}`)))}
${sec(t("clauseReview"), clauses)}
${sec(t("redFlags"), list((a?.red_flags || []).map((f) => `<b>${esc(f.issue)}</b> ${pill(f.severity)} ${esc(f.why)}`)))}
${sec(t("missingClauses"), list((a?.missing_clauses || []).map((m) => `<b>${esc(m.clause)}:</b> ${esc(m.why_it_matters)}`)))}
${sec(t("negotiation"), list((a?.negotiation_points || []).map(esc)))}
${sec(t("obligations"), list((a?.obligations || []).map((o) => `<b>${esc(o.party)}:</b> ${esc(o.obligation)}${o.deadline ? ` <span class="meta">(${esc(o.deadline)})</span>` : ""}`)))}
${sec(t("questions"), list((a?.questions_for_client || []).map(esc)))}
${sec(t("frameworkNotes"), list((a?.jurisdiction_notes || []).map((n) => `${esc(n.note)}${n.reference ? ` <span class="meta">(${esc(n.reference)})</span>` : ""} <span class="meta">${esc(t("confidence", { x: risk(n.confidence) }))}</span>`)))}
${scan ? sec(t("repScan"), list([
    `${esc(t("repFound"))}: ${esc(scan.clauses.filter((c) => c.present).map((c) => t("clause_" + c.key)).join(", "))}`,
    ...(scan.missingKeys?.length ? [`${esc(t("repMissing"))}: ${esc(scan.missingKeys.map((k) => t("clause_" + k)).join(", "))}`] : []),
    ...scan.redFlags.map((f) => `P${f.paragraph + 1}: ${esc(t("flag_" + f.id, { n: f.n, unit: f.unit }))}`)])) : ""}
<footer>${esc(t("repFooter"))}</footer>
</body></html>`;
}

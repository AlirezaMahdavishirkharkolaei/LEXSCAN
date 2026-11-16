// Deterministic clause scanner: runs instantly in the browser, needs no API key.
// Finds common clause types in English, Turkish and Greek contracts, extracts key data,
// raises rule-based red flags and lists standard clauses that seem to be missing.

import { norm, paragraphs, detectLanguage } from "./text.js";

// JavaScript's \b only knows ASCII letters; rebuild every pattern with a Unicode-aware boundary
// so Greek and Turkish words match too.
const B = "(?:(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}])|(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}]))";
const U = (re) => new RegExp(re.source.split("\\b").join(B), "u" + (re.flags.includes("g") ? "g" : ""));

// Patterns are matched against normalised text (lower case, no diacritics).
export const CLAUSES = {
  parties:        { label: "Parties", expected: false, p: [/\bbetween\b.{3,200}\band\b/, /\bisbu sozlesme\b.{0,120}\barasinda\b/, /\bμεταξυ\b/] },
  definitions:    { label: "Definitions", expected: false, p: [/\b(definitions|interpretation)\b/, /\bshall mean\b|\bmeans\b.{0,40}"/, /\btanimlar\b/, /\bορισμοι\b/] },
  term_renewal:   { label: "Term and renewal", expected: true, p: [/\b(term of (this|the) agreement|initial term|renew(al|ed|s)?)\b/, /\bautomatically (renew|extend)/, /\b(sure(si)?|suresince)\b.{0,40}\b(yil|ay)\b|\b(yenilen|uzatil)/, /\bδιαρκεια\b|\bανανεω/] },
  payment:        { label: "Payment", expected: true, p: [/\b(payment|invoice|fees?|price|remuneration)\b/, /\b(odeme|ucret|fatura|bedel)\b/, /\b(πληρωμ|καταβολ|τιμημα|αμοιβ)/] },
  late_payment:   { label: "Late payment / interest", expected: false, p: [/\blate payment\b|\b(default|penalty) interest\b|\binterest (at|of) .{0,30}%/, /\bgecikme faizi\b|\btemerrut\b/, /\bτοκος υπερημεριας\b|\bυπερημερ/] },
  ip:             { label: "Intellectual property", expected: true, p: [/\bintellectual property\b|\bcopyright\b|\bownership of (the )?(deliverables|work product)/, /\bfikri (ve sinai )?mulkiyet\b|\btelif\b/, /\bπνευματικ(η|ης) ιδιοκτησι/] },
  confidentiality:{ label: "Confidentiality", expected: true, p: [/\bconfidential(ity)?\b|\bnon-disclosure\b/, /\bgizli(lik)?\b/, /\bεμπιστευτικ|\bαπορρη/] },
  data_protection:{ label: "Data protection", expected: true, p: [/\b(personal data|data protection|gdpr|data processing)\b/, /\bkisisel veri|\bkvkk\b/, /\bπροσωπικ(α|ων) δεδομεν|\bγκπδ\b/] },
  liability:      { label: "Limitation of liability", expected: true, p: [/\b(limitation of liability|liab(le|ility))\b/, /\bsorumlu(luk)?\b/, /\bευθυν(η|ης)\b/] },
  indemnity:      { label: "Indemnity", expected: true, p: [/\bindemnif(y|ies|ication)\b|\bhold harmless\b/, /\btazmin\b|\bzararini karsila/, /\bαποζημιωσ|\bσκοπο απαλλαγ/] },
  penalty:        { label: "Penalty / liquidated damages", expected: false, p: [/\b(liquidated damages|penalty|penalties)\b/, /\bcezai sart\b/, /\bποινικ(η|ης) ρητρ/] },
  non_compete:    { label: "Non-compete / non-solicitation", expected: false, p: [/\bnon-?compet(e|ition)\b|\bshall not (directly or indirectly )?(engage|compete)\b|\bnon-?solicit/, /\brekabet (yasagi|etmeme)\b/, /\bμη ανταγωνισμ|\bρητρα ανταγωνισμ/] },
  termination:    { label: "Termination", expected: true, p: [/\bterminat(e|ion|ed)\b/, /\bfesih\b|\bfeshet/, /\bκαταγγελι|\bλυση της συμβασ/] },
  force_majeure:  { label: "Force majeure", expected: true, p: [/\bforce majeure\b|\bacts? of god\b/, /\bmucbir sebep\b/, /\bανωτερ(α|ας) βια/] },
  assignment:     { label: "Assignment / subcontracting", expected: true, p: [/\bassign(ment)?\b|\bsubcontract/, /\bdevir\b|\bdevred(e|il)/, /\bεκχωρησ|\bυποκατασταση/] },
  governing_law:  { label: "Governing law", expected: true, p: [/\bgoverning law\b|\bgoverned by (and construed in accordance with )?the laws? of\b/, /\buygulanacak hukuk\b|\bhukuku(na)? (tabi|uygulanir|gore)/, /\bεφαρμοστεο δικαιο\b|\bδιεπεται απο\b/] },
  dispute:        { label: "Jurisdiction / dispute resolution", expected: true, p: [/\b(jurisdiction|arbitration|courts? of|dispute resolution|mediation)\b/, /\b(yetkili mahkeme|tahkim|icra daire|arabulucu|uyusmazlik)|\bmahkemeleri\b.{0,40}\byetkili/, /\b(δικαιοδοσι|διαιτησι|αρμοδια δικαστηρια|διαμεσολαβ)/] },
  notices:        { label: "Notices", expected: true, p: [/\bnotices?\b.{0,60}\b(in writing|shall be (given|sent|delivered))/, /\bbildirim|\btebligat/, /\bειδοποιησ|\bκοινοποιησ/] },
  entire:         { label: "Entire agreement", expected: true, p: [/\bentire agreement\b|\bsupersedes all prior\b/, /\bsozlesmenin tamami\b|\btum mutabakat/, /\bολοκληρη (τη|την) συμφωνια/] },
  amendment:      { label: "Amendments", expected: false, p: [/\b(amendment|variation|modif(y|ied|ication))\b.{0,60}\bin writing\b/, /\bdegisiklik\b.{0,60}\byazili\b/, /\bτροποποιησ/] },
};

const RED_FLAGS_RAW = [
  { id: "auto_renewal", re: /\b(automatically (renew|extend)ed?|shall (be )?renew(ed)? automatically|kendiliginden (uzar|yenilenir)|ανανεωνεται αυτοματα)/,
    text: "Automatic renewal: check the notice period needed to stop it." },
  { id: "unlimited_liability", re: /\b(unlimited liability|without (any )?limit(ation)?|in full for all|sinirsiz(ca)? sorumlu|απεριοριστ(η|ως) ευθυν)/,
    text: "Liability appears to be unlimited for at least one party." },
  { id: "sole_discretion", re: /\b(sole (and absolute )?discretion|at any time (and )?(for any reason|without (cause|reason))|tek tarafli olarak|κατα την απολυτη κριση)/,
    text: "One-sided discretion or termination at will." },
  { id: "exclusive_jurisdiction", re: /\bexclusive jurisdiction\b|\bmunhasiran yetkili|\bαποκλειστικ(η|ως) αρμοδι/,
    text: "Exclusive jurisdiction: confirm the forum suits your client." },
  { id: "penalty", re: /\b(penalty|liquidated damages|cezai sart|ποινικη ρητρα)\b.{0,120}(\d+(\.\d+)?\s?%|%\s?\d+)/,
    text: "Penalty or liquidated damages expressed as a percentage: check proportionality." },
  { id: "waiver_of_rights", re: /\b(irrevocably waives?|waives? (any|all) (rights?|claims?)|her turlu haktan feragat|παραιτειται ανεκκλητα)/,
    text: "Broad waiver of rights or claims." },
  { id: "unilateral_change", re: /\b(may (amend|change|modify|vary) (this agreement|these terms|the (fees|prices))( at any time)?|unilaterally)/,
    text: "Unilateral right to change terms or prices." },
];

for (const def of Object.values(CLAUSES)) def.p = def.p.map(U);
const RED_FLAGS = RED_FLAGS_RAW.map((f) => ({ ...f, re: U(f.re) }));

const DURATION_RAW = /(\d{1,3})\s*(?:\(\s*[a-zÀ-ɏͰ-Ͽ ]+\s*\)\s*)?(days?|business days?|months?|years?|gun|ay|yil|ημερες|ημερων|μηνες|μηνων|ετη|ετων)\b/g;
const AMOUNT = /(?:(€|eur|euro|\$|usd|£|gbp|₺|try|tl)\s?(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?))|(?:(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s?(€|eur(?:os?)?|usd|\$|£|gbp|₺|try|tl)\b)/gi;
const DATE = /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)? (?:of )?(?:january|february|march|april|may|june|july|august|september|october|november|december|ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik) \d{4})\b/gi;
const DURATION = U(DURATION_RAW);
const PERCENT = /(\d+(?:[.,]\d+)?\s?%|%\s?\d+(?:[.,]\d+)?)/g;

function toDays(n, unit) {
  const u = unit.toLowerCase();
  if (/^(day|days|business|gun|ημερ)/.test(u)) return n;
  if (/^(month|ay|μην)/.test(u)) return n * 30;
  return n * 365;
}

function partyNames(text) {
  const t = text.slice(0, 3000).replace(/\s+/g, " ");
  const m = t.match(/\bbetween:?\s+(.{3,120}?)(?:,|\(|\s+of\s|\s+a company|\s+having)[\s\S]{0,400}?\band\s+(.{3,120}?)(?:,|\(|\s+of\s|\s+a company|\s+having)/i);
  if (!m) return [];
  return [m[1], m[2]].map((s) => s.replace(/^(the\s+)/i, "").replace(/["“”]/g, "").trim()).filter((s) => s.length > 2);
}

export function scan(text) {
  const paras = paragraphs(text);
  const lang = detectLanguage(text);
  const found = {};
  const flags = [];
  paras.forEach((para, i) => {
    const n = norm(para);
    for (const [key, def] of Object.entries(CLAUSES)) {
      if (def.p.some((re) => re.test(n))) {
        (found[key] = found[key] || []).push(i);
      }
    }
    for (const f of RED_FLAGS) {
      if (f.re.test(n)) flags.push({ id: f.id, text: f.text, paragraph: i, snippet: para.slice(0, 260) });
    }
    // Long non-compete periods and long payment terms.
    if (CLAUSES.non_compete.p.some((re) => re.test(n))) {
      for (const m of n.matchAll(DURATION)) {
        if (toDays(Number(m[1]), m[2]) > 730) {
          flags.push({ id: "long_non_compete", n: m[1], unit: m[2], text: `Restrictive covenant lasting ${m[1]} ${m[2]}: may be unenforceable or void as a restraint of trade.`, paragraph: i, snippet: para.slice(0, 260) });
          break;
        }
      }
    }
    if (CLAUSES.payment.p.some((re) => re.test(n)) && /\b(within|in|icinde|εντος)\b/.test(n)) {
      for (const m of n.matchAll(DURATION)) {
        if (toDays(Number(m[1]), m[2]) >= 60 && toDays(Number(m[1]), m[2]) <= 365 && /(pay|invoice|odeme|fatura|πληρωμ|καταβολ)/.test(n)) {
          flags.push({ id: "long_payment_term", n: m[1], unit: m[2], text: `Long payment term (${m[1]} ${m[2]}).`, paragraph: i, snippet: para.slice(0, 260) });
          break;
        }
      }
    }
  });

  const clauses = Object.entries(CLAUSES).map(([key, def]) => ({
    key, label: def.label, expected: def.expected, paragraphs: found[key] || [], present: Boolean(found[key]),
  }));
  const missingKeys = clauses.filter((c) => c.expected && !c.present).map((c) => c.key);
  const missing = missingKeys.map((k) => CLAUSES[k].label);

  const plain = String(text || "");
  const uniq = (arr) => [...new Set(arr.map((s) => s.trim()))];
  const amounts = uniq([...plain.matchAll(AMOUNT)].map((m) => m[0])).slice(0, 25);
  const dates = uniq([...plain.matchAll(DATE)].map((m) => m[0])).slice(0, 25);
  const durations = uniq([...plain.matchAll(new RegExp(DURATION.source, "giu"))].map((m) => m[0])).slice(0, 25);
  const percentages = uniq([...plain.matchAll(PERCENT)].map((m) => m[0])).slice(0, 15);
  const defined = uniq([...plain.matchAll(/["“]([A-Z][\w\s-]{1,40})["”]\s*(?:\)|shall mean|means|anlamina|σημαινει)/g)].map((m) => m[1])).slice(0, 30);

  // Deduplicate flags by id + paragraph.
  const seen = new Set();
  const redFlags = flags.filter((f) => { const k = f.id + ":" + f.paragraph; if (seen.has(k)) return false; seen.add(k); return true; });

  const coverage = clauses.filter((c) => c.expected).length;
  const score = Math.round(100 * (coverage - missing.length) / coverage);
  return {
    language: lang, paragraphs: paras, wordCount: (plain.match(/\S+/g) || []).length,
    parties: partyNames(plain), clauses, missing, missingKeys, redFlags,
    data: { amounts, dates, durations, percentages, definedTerms: defined },
    completeness: score,
  };
}

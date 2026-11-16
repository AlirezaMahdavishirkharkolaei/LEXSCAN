// Google Gemini integration: structured contract analysis and grounded Q&A.
// Requests go straight from the browser to Google with the user's own API key.

export const MODELS = [
  { id: "gemini-flash-latest", label: "Gemini Flash (latest)" },
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (fastest)" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview, deeper, may need billing)" },
];

const ENDPOINT = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

const S = (type, extra = {}) => ({ type, ...extra });
const STR = S("STRING");
const RISK = S("STRING", { enum: ["low", "medium", "high"] });
const OBJ = (properties, required) => S("OBJECT", { properties, required: required || Object.keys(properties) });
const ARR = (items) => S("ARRAY", { items });

export const ANALYSIS_SCHEMA = OBJ({
  document_type: STR,
  summary: STR,
  overall_risk: RISK,
  risk_rationale: STR,
  parties: ARR(OBJ({ name: STR, role: STR })),
  key_terms: ARR(OBJ({ label: STR, value: STR, quote: STR }, ["label", "value"])),
  clauses: ARR(OBJ({
    type: STR, title: STR, paragraph: S("INTEGER"), quote: STR, assessment: STR, risk: RISK,
    favours: STR, recommendation: STR, legal_reference: STR,
  }, ["type", "title", "quote", "assessment", "risk", "favours", "recommendation"])),
  obligations: ARR(OBJ({ party: STR, obligation: STR, deadline: STR, quote: STR }, ["party", "obligation"])),
  red_flags: ARR(OBJ({ issue: STR, quote: STR, why: STR, severity: RISK }, ["issue", "why", "severity"])),
  missing_clauses: ARR(OBJ({ clause: STR, why_it_matters: STR })),
  negotiation_points: ARR(STR),
  questions_for_client: ARR(STR),
  jurisdiction_notes: ARR(OBJ({ note: STR, reference: STR, confidence: RISK }, ["note", "confidence"])),
  confidence: RISK,
  transcript: STR,
}, ["document_type", "summary", "overall_risk", "risk_rationale", "parties", "clauses", "red_flags", "missing_clauses",
    "negotiation_points", "confidence"]);

export const QA_SCHEMA = OBJ({
  answer: STR,
  quotes: ARR(OBJ({ quote: STR, paragraph: S("INTEGER") }, ["quote"])),
  confidence: RISK,
  not_in_contract: S("BOOLEAN"),
}, ["answer", "quotes", "confidence", "not_in_contract"]);

export const JURISDICTIONS = {
  generic: "No specific jurisdiction: apply general principles of contract law and flag where the governing law matters.",
  cy: "Republic of Cyprus: the Contract Law, Cap. 149 (based on the Indian Contract Act 1872), common-law principles, and EU law (e.g. Unfair Contract Terms Directive 93/13/EEC as transposed, GDPR).",
  trnc: "Northern Cyprus (TRNC): the Contract Law, Fasıl 149, as applied in the TRNC, and TRNC legislation.",
  ew: "England and Wales: common law of contract, Unfair Contract Terms Act 1977, Consumer Rights Act 2015.",
  tr: "Turkey: Turkish Code of Obligations No. 6098 (incl. Arts. 20-25 on standard terms and Art. 182 on penalty clauses), Turkish Commercial Code No. 6102, KVKK.",
  gr: "Greece: Greek Civil Code, EU law.",
};

export const LANGUAGES = { en: "English", tr: "Turkish", el: "Greek", fa: "Persian (Farsi)", ru: "Russian", de: "German" };

export function numberedText(paras) {
  return paras.map((p, i) => `[P${i + 1}] ${p}`).join("\n\n");
}

export function analysisPrompt({ jurisdiction = "generic", perspective = "", language = "en", hasText = true }) {
  return [
    "You are a senior contract lawyer preparing a review memo for another lawyer.",
    `Review the contract ${perspective ? `from the perspective of: ${perspective}.` : "neutrally, noting which party each clause favours."}`,
    `Legal framework: ${JURISDICTIONS[jurisdiction] || JURISDICTIONS.generic}`,
    `Write every explanatory field in ${LANGUAGES[language] || "English"}. Keep "quote" fields in the contract's original language.`,
    "",
    "Rules:",
    hasText
      ? "- The contract is given as numbered paragraphs [P1], [P2], ... Put the paragraph number in \"paragraph\"."
      : "- The contract is given as images or a PDF (several images are consecutive pages of one document). First transcribe it faithfully into \"transcript\", separating paragraphs with a blank line, then analyse it; paragraph numbers refer to the order of paragraphs in your transcript.",
    "- Every \"quote\" must be copied VERBATIM from the contract (an exact substring, 5-60 words). Never paraphrase inside a quote. If you cannot quote, leave it empty.",
    "- Cover every significant clause: parties, term/renewal, payment, liability, indemnity, IP, confidentiality, data protection, termination, penalties, restrictive covenants, assignment, governing law and disputes.",
    "- \"risk\" reflects the risk for the reviewing party (or both parties if neutral). Be specific about why.",
    "- \"legal_reference\": cite a statute section or leading case only if you are confident it exists and applies; otherwise leave it empty. Mark doubt in \"jurisdiction_notes\" with confidence low.",
    "- List standard clauses that are missing and why they matter. Give concrete negotiation points and questions for the client.",
    "- Do not invent facts that are not in the contract. This memo supports, and does not replace, a lawyer's review.",
  ].join("\n");
}

async function call({ apiKey, model, parts, schema }) {
  const res = await fetch(ENDPOINT(model), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      // Temperature is left at the model default: Gemini 3 models are tuned for it.
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, maxOutputTokens: 32768 },
    }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json())?.error?.message || ""; } catch { /* ignore */ }
    const hint = {
      400: "The request was rejected. Check that the API key is valid.",
      401: "The API key was not accepted.",
      403: "This key is not allowed to use the Gemini API. Enable the Generative Language API for its project.",
      404: `The model "${model}" is not available. Choose another model.`,
      429: "Rate limit or free quota reached. Wait a minute or use a key with billing enabled.",
    }[res.status] || `Gemini returned HTTP ${res.status}.`;
    throw new Error(detail ? `${hint} (${detail})` : hint);
  }
  const data = await res.json();
  const cand = data?.candidates?.[0];
  if (!cand) throw new Error(data?.promptFeedback?.blockReason ? `The request was blocked (${data.promptFeedback.blockReason}).` : "Gemini returned no answer.");
  const text = (cand.content?.parts || []).map((p) => p.text || "").join("");
  if (!text) throw new Error(cand.finishReason === "MAX_TOKENS" ? "The answer was cut off (document too long). Try a shorter document or the Pro model." : `Gemini returned an empty answer (${cand.finishReason || "unknown"}).`);
  return { json: parseJson(text), usage: data.usageMetadata || null, model: data.modelVersion || model };
}

export function parseJson(text) {
  const clean = String(text).replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(clean); } catch { /* fall through */ }
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* fall through */ } }
  throw new Error("The model's answer was not valid JSON. Please try again.");
}

/** files: [{mimeType, data(base64)}] used when no text could be extracted (scans, photos). */
export async function analyse({ apiKey, model, paras, files = [], options }) {
  const hasText = paras.length > 0;
  const parts = [];
  if (!hasText) files.forEach((f) => parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } }));
  parts.push({ text: analysisPrompt({ ...options, hasText }) + (hasText ? `\n\nCONTRACT:\n\n${numberedText(paras)}` : "") });
  return call({ apiKey, model, parts, schema: ANALYSIS_SCHEMA });
}

export async function ask({ apiKey, model, paras, question, language = "en" }) {
  const prompt = [
    "Answer the question using ONLY the contract below. Quote the supporting text verbatim (exact substrings) with paragraph numbers.",
    "If the contract does not answer the question, say so and set not_in_contract to true.",
    `Answer in ${LANGUAGES[language] || "English"}.`,
    "", `QUESTION: ${question}`, "", "CONTRACT:", numberedText(paras),
  ].join("\n");
  return call({ apiKey, model, parts: [{ text: prompt }], schema: QA_SCHEMA });
}

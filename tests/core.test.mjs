import { test } from "node:test";
import assert from "node:assert/strict";
import { scan } from "../app/assets/scanner.js";
import { detectLanguage, paragraphs } from "../app/assets/text.js";
import { verifyQuote, verifyAnalysis } from "../app/assets/verify.js";
import { redact, restore } from "../app/assets/redact.js";
import { analyse, ask, parseJson, numberedText } from "../app/assets/gemini.js";
import { toHtml, toMarkdown } from "../app/assets/report.js";
import { SAMPLE_CONTRACT, SAMPLE_ANALYSIS } from "../app/assets/sample.js";

const TR = `HİZMET SÖZLEŞMESİ

İşbu sözleşme Girne Yazılım Ltd ile Lefkoşa Danışmanlık Ltd arasında akdedilmiştir.

Madde 1. Sözleşme süresi bir yıldır ve taraflardan biri feshetmedikçe otomatik olarak yenilenir.

Madde 2. Gizlilik. Taraflar gizli bilgileri üçüncü kişilere açıklamaz.

Madde 3. Cezai şart. Gecikme halinde %20 cezai şart ödenir.

Madde 4. Uyuşmazlıklarda Girne mahkemeleri münhasıran yetkilidir. Bu sözleşmeye KKTC hukuku uygulanır.`;

const EL = `ΣΥΜΒΑΣΗ ΠΑΡΟΧΗΣ ΥΠΗΡΕΣΙΩΝ

Άρθρο 1. Εμπιστευτικότητα. Τα μέρη τηρούν εμπιστευτικές όλες τις πληροφορίες.

Άρθρο 2. Η παρούσα σύμβαση διέπεται από το δίκαιο της Κυπριακής Δημοκρατίας.

Άρθρο 3. Καταγγελία. Κάθε μέρος μπορεί να καταγγείλει τη σύμβαση με γραπτή ειδοποίηση.`;

test("sample contract: clauses, missing clauses and red flags", () => {
  const s = scan(SAMPLE_CONTRACT);
  assert.equal(s.language, "en");
  assert.equal(s.paragraphs.length, 18);
  assert.deepEqual(s.parties, ["Kyrenia Digital Ltd", "Larnaca Code Studio Ltd"]);
  assert.deepEqual(s.missing.sort(), ["Data protection", "Force majeure"]);
  const flags = s.redFlags.map((f) => f.id).sort();
  for (const id of ["auto_renewal", "unilateral_change", "unlimited_liability", "long_non_compete", "sole_discretion", "exclusive_jurisdiction"]) {
    assert.ok(flags.includes(id), `missing flag ${id}`);
  }
  assert.ok(s.data.amounts.some((a) => a.includes("18,500")));
});

test("Turkish and Greek contracts are detected and scanned", () => {
  assert.equal(detectLanguage(TR), "tr");
  assert.equal(detectLanguage(EL), "el");
  const tr = scan(TR);
  const found = tr.clauses.filter((c) => c.present).map((c) => c.key);
  for (const k of ["confidentiality", "penalty", "governing_law", "dispute", "term_renewal"]) assert.ok(found.includes(k), `TR ${k}`);
  assert.ok(tr.redFlags.some((f) => f.id === "penalty"));
  const el = scan(EL);
  const elFound = el.clauses.filter((c) => c.present).map((c) => c.key);
  for (const k of ["confidentiality", "governing_law", "termination"]) assert.ok(elFound.includes(k), `EL ${k}`);
});

test("paragraph splitting keeps numbered clauses apart", () => {
  const p = paragraphs("1. First clause text.\n2. Second clause text.\n\nMadde 3. Third.");
  assert.equal(p.length, 3);
});

test("quote verification: exact, approximate, missing", () => {
  const paras = scan(SAMPLE_CONTRACT).paragraphs;
  const exact = verifyQuote("All intellectual property rights in the Deliverables shall remain with the Developer.", paras);
  assert.equal(exact.status, "exact");
  assert.equal(exact.paragraph, 6);
  const approx = verifyQuote("All intellectual property rights in the Deliverables will remain with the Developer.", paras);
  assert.equal(approx.status, "approximate");
  assert.equal(verifyQuote("The Developer shall pay the Client a bonus of EUR 1,000,000.", paras).status, "not_found");
});

test("every quote in the demo analysis is verified exactly", () => {
  const a = verifyAnalysis(structuredClone(SAMPLE_ANALYSIS), scan(SAMPLE_CONTRACT).paragraphs);
  assert.ok(a.verification_summary.checked > 10);
  assert.equal(a.verification_summary.verified, a.verification_summary.checked);
});

test("pseudonymisation round-trips", () => {
  const text = "Kyrenia Digital Ltd (HE 412233), e-mail info@kyrenia.example, phone +357 22 123456, IBAN CY17 0020 0128 0000 0012 0052 7600.";
  const { text: red, map } = redact(text, ["Kyrenia Digital Ltd"]);
  for (const s of ["Kyrenia Digital Ltd", "412233", "info@kyrenia.example", "123456", "CY17"]) assert.ok(!red.includes(s), `leaked ${s}`);
  assert.equal(restore(red, map), text);
  assert.deepEqual(restore({ a: [red] }, map), { a: [text] });
});

test("JSON parsing tolerates code fences", () => {
  assert.deepEqual(parseJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJson('Here: {"a":2} done'), { a: 2 });
  assert.throws(() => parseJson("no json"));
});

test("Gemini request: key in header, schema, numbered paragraphs", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"answer":"Yes","quotes":[],"confidence":"high","not_in_contract":false}' }] } }], modelVersion: "m" }) };
  };
  const r = await ask({ apiKey: "KEY123", model: "gemini-flash-latest", paras: ["A.", "B."], question: "Q?" });
  assert.equal(r.json.answer, "Yes");
  const { url, init } = calls[0];
  assert.ok(url.includes("/models/gemini-flash-latest:generateContent"));
  assert.ok(!url.includes("KEY123"), "key must not be in the URL");
  assert.equal(init.headers["x-goog-api-key"], "KEY123");
  const body = JSON.parse(init.body);
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.ok(body.contents[0].parts[0].text.includes("[P2] B."));
  assert.equal(numberedText(["x"]), "[P1] x");

  await analyse({ apiKey: "K", model: "m", paras: [], files: [{ mimeType: "image/png", data: "AAAA" }], options: { jurisdiction: "cy" } });
  const parts = JSON.parse(calls[1].init.body).contents[0].parts;
  assert.equal(parts[0].inlineData.mimeType, "image/png");
  assert.ok(parts[1].text.includes("transcribe"));
});

test("Gemini errors are explained", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: { message: "quota" } }) });
  await assert.rejects(ask({ apiKey: "K", model: "m", paras: ["a"], question: "q" }), /quota/);
});

test("reports render", () => {
  const scanned = scan(SAMPLE_CONTRACT);
  const a = verifyAnalysis(structuredClone(SAMPLE_ANALYSIS), scanned.paragraphs);
  const ctx = { docName: "Sample", analysis: a, scan: scanned, options: { jurisdictionLabel: "Cyprus", perspective: "Client" } };
  const md = toMarkdown(ctx);
  assert.ok(md.includes("## Clause review") && md.includes("verified in document"));
  const html = toHtml(ctx);
  assert.ok(html.startsWith("<!DOCTYPE html>") && !html.includes("<script"));
});

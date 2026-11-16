# LexScan

**A contract review workspace that runs in the browser.** Drop in a contract and get an instant rule-based clause scan. Add a Google Gemini key for a full AI review, in which **every quoted passage is checked against the document**. Then ask questions that are answered only from the contract.

**Live app:** https://alirezamahdavishirkharkolaei.github.io/LEXSCAN/

It opens with a fictional sample contract and a sample review, so you can see the whole interface without a key.

[![tests](https://github.com/AlirezaMahdavishirkharkolaei/LEXSCAN/actions/workflows/tests.yml/badge.svg)](https://github.com/AlirezaMahdavishirkharkolaei/LEXSCAN/actions/workflows/tests.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

## What it does

| Layer | Needs a key? | What you get |
|---|---|---|
| **Instant scan** | No, runs locally | 20 clause types detected in English, Turkish and Greek. Also: missing standard clauses, rule-based red flags (automatic renewal, unlimited liability, one-sided termination, long restrictive covenants, penalties, exclusive jurisdiction, unilateral changes), and extracted amounts, dates, periods and defined terms. |
| **AI review** | Gemini key | A clause-by-clause memo for the party you represent. It covers risk and who each clause favours, recommendations, red flags, missing clauses, negotiation points, questions for the client, and notes on the chosen legal framework (Cyprus Cap. 149, TRNC, England & Wales, Turkey TBK, Greece, or none). |
| **Ask the contract** | Gemini key | Answers grounded in the contract, with verbatim supporting quotes. It also says when the contract is silent on the question. |

### Why the output can be trusted more than a plain chatbot

- **Quote verification.** The model must support each finding with a verbatim quote. LexScan then searches the document for every quote itself and marks it ✓ verified, ≈ approximately verified, or ✗ not found. Click a quote to jump to it in the document; verified passages are highlighted there.
- **Structured output.** The model answers against a fixed JSON schema (Gemini `responseSchema`), so every report has the same sections and can be exported.
- **Conservative citations.** The prompt allows a statute or case reference only when the model is confident that it exists and applies. Doubtful points go to the framework notes with a confidence level.
- **Two independent layers.** The deterministic scan and the AI review are produced separately, so each one can be used to check the other.

### Documents

PDF (text layer, read with pdf.js), Word `.docx` (read with mammoth), plain text, Markdown and HTML are extracted in the browser. Scanned PDFs and photos go to Gemini, which transcribes them and then reviews them; the transcript becomes the document view. Several photos are treated as consecutive pages of one document. On a phone, **Photograph pages** opens the camera, and **+** adds another page. Photos are downscaled in the browser before they are sent.

### Languages

The interface is available in English, Türkçe, Ελληνικά, Русский, Deutsch and فارسی (right-to-left). It follows the browser language, and you can change it in the header or link to it with `?lang=tr`. The AI report language is chosen separately, and exported reports use that language for their headings.

### Exports

A self-contained HTML report, Markdown, JSON (for use in other tools), and Print / Save as PDF.

## Getting an API key

Open [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey), sign in with a Google account, press **Create API key**, and paste the key into **Settings & API key**.

## Privacy

There is no LexScan server. The page is static and the instant scan never leaves the browser. Only the AI review and Q&A send the document to Google, and they do so under your own key. The key is kept in memory for the session, unless you tick "remember", which stores it in this browser's local storage.

**Models.** The default is `gemini-flash-latest`, which Google keeps pointed at its newest Flash model. You can also pick a specific model or type any model id.

If you use Google's **free tier**, Google may use what you send to improve its products. For client documents, use a key with billing enabled. You can also tick **pseudonymise**: party names, e-mails, phone numbers, IBANs, card numbers and company or ID numbers are then replaced with placeholders before sending, and restored in the report. Pseudonymisation works on text: photos and scans are sent as images.

## Run locally

```bash
git clone https://github.com/AlirezaMahdavishirkharkolaei/LEXSCAN.git
cd LEXSCAN/app
python3 -m http.server 8000   # then open http://localhost:8000
```

To run the tests (Node 20 or later): `npm test`. They cover the scanner, quote verification, pseudonymisation, the Gemini request format and error handling, the report exports, and the completeness of the translations.

## Project layout

```
app/
  index.html
  assets/
    app.js        UI controller
    scanner.js    rule-based clause scanner (EN / TR / EL)
    text.js       normalisation, paragraph splitting, language detection
    verify.js     quote verification against the source text
    redact.js     optional pseudonymisation and restore
    gemini.js     prompts, JSON schemas and the Gemini API calls
    extract.js    PDF / DOCX / image extraction in the browser
    report.js     HTML and Markdown exports
    i18n.js       interface strings (EN / TR / EL / RU / DE / FA)
    sample.js     fictional sample contract and illustrative sample review
tests/            node --test suite
```

## Limits

- LexScan supports a lawyer's review; it does not replace it. AI output can be wrong even when its quotes are verified, because a correct quote can still be read wrongly.
- The instant scan finds clauses by keywords. It does not judge their substance.
- The framework notes are general and must be checked against current law.

## Author

Alireza Mahdavi Shirkharkolaei, LL.M. (Cyprus International University). This project is part of a series of legal-tech tools on contract, tax and trade law.

**Mohammad Amir Modami** collaborated on the legal analysis and research behind this project.

## License

[MIT](LICENSE)

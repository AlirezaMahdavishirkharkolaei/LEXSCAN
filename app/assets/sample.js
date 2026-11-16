// Sample contract (fictional parties) and an ILLUSTRATIVE analysis, written by hand to demonstrate the
// interface without an API key. It is not output from a model and not legal advice.

export const SAMPLE_NAME = "Sample: software development agreement (fictional)";

export const SAMPLE_CONTRACT = "SOFTWARE DEVELOPMENT AND SERVICES AGREEMENT\n\nThis Agreement is made on 3 March 2026 between Kyrenia Digital Ltd, a company registered in the Republic of Cyprus under number HE 412233, having its registered office at 14 Harbour Street, Kyrenia (the \"Client\"), and Larnaca Code Studio Ltd, a company registered in the Republic of Cyprus under number HE 398871, having its registered office at 7 Marina Avenue, Larnaca (the \"Developer\").\n\n1. Definitions. \"Deliverables\" means all software, source code, documentation and other materials produced by the Developer under this Agreement. \"Services\" means the development, maintenance and support services described in Schedule 1.\n\n2. Term. This Agreement commences on 1 April 2026 and continues for an initial term of 24 months. Thereafter it shall be renewed automatically for successive periods of 12 months unless the Client gives written notice of non-renewal at least 180 days before the end of the then-current term.\n\n3. Fees. The Client shall pay the Developer a monthly fee of EUR 18,500 plus VAT. The Developer may change the fees at any time by giving the Client 15 days' notice by e-mail.\n\n4. Payment. The Client shall pay each invoice within 30 days of the invoice date. Any amount not paid when due shall bear interest at 2% per month until payment in full.\n\n5. Intellectual Property. All intellectual property rights in the Deliverables shall remain with the Developer. The Client is granted a non-exclusive, non-transferable licence to use the Deliverables for its internal business purposes for as long as this Agreement remains in force.\n\n6. Confidentiality. Each party shall keep confidential all information received from the other party and marked as confidential, during the term of this Agreement and for 2 years after its termination.\n\n7. Liability. The Developer's total liability arising out of or in connection with this Agreement shall not exceed the fees paid by the Client in the 3 months preceding the event giving rise to the claim. The Client shall be liable in full for all losses suffered by the Developer, without limitation.\n\n8. Indemnity. The Client shall indemnify and hold harmless the Developer against all claims, losses and expenses arising from the Client's use of the Deliverables.\n\n9. Non-solicitation and non-compete. During the term of this Agreement and for a period of 5 years after its termination, the Client shall not, directly or indirectly, engage or employ any developer who has worked on the Services, nor develop software competing with the Deliverables anywhere in the world.\n\n10. Termination. The Developer may terminate this Agreement at any time for any reason by giving 30 days' written notice. The Client may terminate this Agreement only for material breach by the Developer which remains unremedied 60 days after written notice.\n\n11. Consequences of termination. Upon termination for any reason, the Client shall immediately pay all outstanding invoices and a termination fee equal to 6 monthly fees, and the licence granted under clause 5 shall end.\n\n12. Assignment. The Developer may assign or subcontract any of its obligations under this Agreement without the Client's consent. The Client may not assign this Agreement without the Developer's prior written consent.\n\n13. Entire agreement. This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations and agreements.\n\n14. Governing law and jurisdiction. This Agreement is governed by the laws of the Republic of Cyprus. The courts of Larnaca shall have exclusive jurisdiction over any dispute arising out of this Agreement.\n\n15. Notices. Notices under this Agreement shall be given in writing and delivered by hand or by registered post to the registered office of the relevant party.\n\nSigned for Kyrenia Digital Ltd: ____________    Signed for Larnaca Code Studio Ltd: ____________";

export const SAMPLE_OPTIONS = { jurisdiction: "cy", perspective: "Kyrenia Digital Ltd (Client)", language: "en" };

export const SAMPLE_ANALYSIS = {
 "document_type": "Software development and services agreement (B2B)",
 "summary": "A 24-month development and support agreement under Cyprus law between Kyrenia Digital Ltd (Client) and Larnaca Code Studio Ltd (Developer). It is heavily weighted towards the Developer: the Developer keeps all IP, can change fees on short notice and terminate at will, while the Client faces unlimited liability, a 6-month termination fee, a 180-day renewal notice window and a 5-year worldwide restrictive covenant.",
 "overall_risk": "high",
 "risk_rationale": "Several one-sided clauses combine: the Client pays for development but never owns the software, its licence ends on termination, and its liability is uncapped while the Developer's is capped at 3 months of fees.",
 "parties": [
  {
   "name": "Kyrenia Digital Ltd",
   "role": "Client"
  },
  {
   "name": "Larnaca Code Studio Ltd",
   "role": "Developer"
  }
 ],
 "key_terms": [
  {
   "label": "Start and initial term",
   "value": "1 April 2026, 24 months",
   "quote": "commences on 1 April 2026 and continues for an initial term of 24 months"
  },
  {
   "label": "Monthly fee",
   "value": "EUR 18,500 plus VAT",
   "quote": "a monthly fee of EUR 18,500 plus VAT"
  },
  {
   "label": "Renewal notice",
   "value": "180 days before the end of the term",
   "quote": "at least 180 days before the end of the then-current term"
  },
  {
   "label": "Late-payment interest",
   "value": "2% per month (about 24% a year)",
   "quote": "shall bear interest at 2% per month until payment in full"
  },
  {
   "label": "Termination fee",
   "value": "6 monthly fees (EUR 111,000 plus VAT)",
   "quote": "a termination fee equal to 6 monthly fees"
  }
 ],
 "clauses": [
  {
   "type": "Intellectual property",
   "title": "Developer keeps all IP in paid-for software",
   "paragraph": 7,
   "quote": "All intellectual property rights in the Deliverables shall remain with the Developer.",
   "assessment": "The Client funds the development but receives only a non-exclusive, non-transferable licence that ends with the Agreement. The Developer could reuse or resell the same software to competitors.",
   "risk": "high",
   "favours": "Developer",
   "recommendation": "Require assignment of all IP in bespoke Deliverables on payment, with a licence back to the Developer for its pre-existing tools only; at minimum a perpetual, irrevocable licence and source-code escrow.",
   "legal_reference": ""
  },
  {
   "type": "Liability",
   "title": "Asymmetric liability: capped for the Developer, unlimited for the Client",
   "paragraph": 9,
   "quote": "The Client shall be liable in full for all losses suffered by the Developer, without limitation.",
   "assessment": "The Developer's liability is capped at 3 months of fees (about EUR 55,500), while the Client's is uncapped and covers all losses, including indirect ones.",
   "risk": "high",
   "favours": "Developer",
   "recommendation": "Make the cap mutual (e.g. 12 months' fees), exclude indirect and consequential loss for both parties, and carve out only fraud, wilful misconduct and confidentiality breaches.",
   "legal_reference": ""
  },
  {
   "type": "Fees",
   "title": "Unilateral fee changes on 15 days' notice",
   "paragraph": 5,
   "quote": "The Developer may change the fees at any time by giving the Client 15 days' notice by e-mail.",
   "assessment": "No ceiling, no link to an index and no right for the Client to terminate if it rejects the change.",
   "risk": "high",
   "favours": "Developer",
   "recommendation": "Fix fees for the initial term; allow at most one annual increase capped at CPI (or a fixed %), with a right to terminate without the termination fee if the Client objects.",
   "legal_reference": ""
  },
  {
   "type": "Termination",
   "title": "Developer may terminate at will; Client only for material breach",
   "paragraph": 12,
   "quote": "The Developer may terminate this Agreement at any time for any reason by giving 30 days' written notice.",
   "assessment": "Combined with clause 11, the Developer could terminate, end the Client's licence and still claim the termination fee.",
   "risk": "high",
   "favours": "Developer",
   "recommendation": "Make termination rights mutual, require a transition period (at least 90 days) and assistance, and exclude the termination fee where the Developer terminates or is in breach.",
   "legal_reference": ""
  },
  {
   "type": "Termination fee",
   "title": "Termination fee of 6 monthly fees on any termination",
   "paragraph": 13,
   "quote": "a termination fee equal to 6 monthly fees",
   "assessment": "Payable 'upon termination for any reason', even termination by the Developer or for the Developer's breach. A fixed sum not tied to a genuine estimate of loss may be challenged as a penalty.",
   "risk": "high",
   "favours": "Developer",
   "recommendation": "Delete, or limit it to Client termination for convenience with a sum reflecting the Developer's actual unrecovered costs.",
   "legal_reference": "Contract Law, Cap. 149, s. 74 (compensation where a penalty is stipulated)"
  },
  {
   "type": "Restrictive covenant",
   "title": "5-year worldwide non-compete and no-hire on the Client",
   "paragraph": 11,
   "quote": "for a period of 5 years after its termination, the Client shall not, directly or indirectly, engage or employ any developer who has worked on the Services",
   "assessment": "Prevents the Client from developing competing software anywhere for 5 years and from hiring developers. Very likely excessive in duration and scope.",
   "risk": "high",
   "favours": "Developer",
   "recommendation": "Delete the non-compete; limit any non-solicitation to 12 months and to active solicitation of the Developer's employees.",
   "legal_reference": "Contract Law, Cap. 149, s. 27 (agreements in restraint of trade)"
  },
  {
   "type": "Renewal",
   "title": "Automatic renewal with a 180-day notice window",
   "paragraph": 4,
   "quote": "shall be renewed automatically for successive periods of 12 months",
   "assessment": "Missing the notice date by a day locks the Client into another 12 months, which then also triggers the termination fee on any exit.",
   "risk": "medium",
   "favours": "Developer",
   "recommendation": "Shorten the notice to 60 days, require the Developer to send a renewal reminder, and allow termination for convenience after the initial term.",
   "legal_reference": ""
  },
  {
   "type": "Late payment",
   "title": "Interest of 2% per month",
   "paragraph": 6,
   "quote": "shall bear interest at 2% per month until payment in full",
   "assessment": "About 24% a year, well above statutory late-payment interest.",
   "risk": "medium",
   "favours": "Developer",
   "recommendation": "Replace with the statutory rate for commercial transactions or a modest fixed rate.",
   "legal_reference": ""
  },
  {
   "type": "Assignment",
   "title": "Developer may subcontract freely",
   "paragraph": 14,
   "quote": "The Developer may assign or subcontract any of its obligations under this Agreement without the Client's consent.",
   "assessment": "The Client could end up with an unknown provider holding its confidential information.",
   "risk": "medium",
   "favours": "Developer",
   "recommendation": "Require prior written consent (not unreasonably withheld) and make the Developer liable for subcontractors.",
   "legal_reference": ""
  },
  {
   "type": "Confidentiality",
   "title": "Only information marked confidential is protected, for 2 years",
   "paragraph": 8,
   "quote": "all information received from the other party and marked as confidential",
   "assessment": "Source code, business data and oral disclosures are rarely marked; protection ends 2 years after termination.",
   "risk": "medium",
   "favours": "Neutral (weak for the Client)",
   "recommendation": "Protect all information that is confidential by nature, without a marking requirement, and keep trade secrets protected indefinitely.",
   "legal_reference": ""
  },
  {
   "type": "Governing law and jurisdiction",
   "title": "Cyprus law, exclusive jurisdiction of the Larnaca courts",
   "paragraph": 16,
   "quote": "The courts of Larnaca shall have exclusive jurisdiction over any dispute arising out of this Agreement.",
   "assessment": "Acceptable in principle; the Client is based in Kyrenia, so consider the practical forum.",
   "risk": "low",
   "favours": "Neutral",
   "recommendation": "Consider the courts of Nicosia or arbitration, and add an escalation and mediation step.",
   "legal_reference": ""
  }
 ],
 "obligations": [
  {
   "party": "Client",
   "obligation": "Pay each invoice within 30 days",
   "deadline": "30 days from invoice",
   "quote": "The Client shall pay each invoice within 30 days of the invoice date."
  },
  {
   "party": "Client",
   "obligation": "Give notice of non-renewal",
   "deadline": "180 days before the end of the term",
   "quote": "at least 180 days before the end of the then-current term"
  },
  {
   "party": "Developer",
   "obligation": "Provide development, maintenance and support services (Schedule 1)",
   "deadline": "",
   "quote": "the development, maintenance and support services described in Schedule 1"
  }
 ],
 "red_flags": [
  {
   "issue": "Client pays for software it never owns",
   "quote": "the licence granted under clause 5 shall end",
   "why": "On any termination the Client loses the right to use the software it has paid for.",
   "severity": "high"
  },
  {
   "issue": "Uncapped liability for the Client only",
   "quote": "The Client shall be liable in full for all losses suffered by the Developer, without limitation.",
   "why": "Exposure is unlimited while the Developer's is capped.",
   "severity": "high"
  },
  {
   "issue": "Termination fee even when the Developer terminates",
   "quote": "Upon termination for any reason, the Client shall immediately pay all outstanding invoices and a termination fee equal to 6 monthly fees",
   "why": "The Developer could terminate at will and still collect six months' fees.",
   "severity": "high"
  }
 ],
 "missing_clauses": [
  {
   "clause": "Service levels and acceptance testing",
   "why_it_matters": "There is no standard for quality, timelines or acceptance of Deliverables, and no remedy for poor performance."
  },
  {
   "clause": "Data protection (GDPR processor terms)",
   "why_it_matters": "If the Developer processes personal data for the Client, Art. 28 GDPR requires a written processing agreement."
  },
  {
   "clause": "Force majeure",
   "why_it_matters": "Neither party's obligations are suspended in extraordinary events."
  },
  {
   "clause": "Source-code escrow and exit assistance",
   "why_it_matters": "Without them the Client depends entirely on the Developer for continuity."
  },
  {
   "clause": "Warranties",
   "why_it_matters": "No warranty that the Deliverables work, are original or do not infringe third-party rights."
  }
 ],
 "negotiation_points": [
  "Assignment of IP in bespoke Deliverables on payment (non-negotiable for a development agreement).",
  "Mutual liability cap of 12 months' fees with standard carve-outs.",
  "Delete the termination fee, or limit it to Client termination for convenience.",
  "Fixed fees for the initial term; indexed annual increase only.",
  "Delete the non-compete; 12-month non-solicitation at most.",
  "Mutual termination rights with a 90-day transition period."
 ],
 "questions_for_client": [
  "Will the Developer process any personal data of your customers or staff?",
  "Do you need to own the software, e.g. to sell the business or switch providers?",
  "Are any of the Developer's staff people you might want to hire later?"
 ],
 "jurisdiction_notes": [
  {
   "note": "Cap. 149 s. 27 renders agreements in restraint of trade void to that extent, subject to limited exceptions; a 5-year worldwide non-compete on a customer is unlikely to survive.",
   "reference": "Contract Law, Cap. 149, s. 27",
   "confidence": "medium"
  },
  {
   "note": "Under Cap. 149 s. 74, where a contract names a sum payable on breach, the court awards reasonable compensation not exceeding that sum, so the termination fee is not automatically recoverable in full.",
   "reference": "Contract Law, Cap. 149, s. 74",
   "confidence": "medium"
  },
  {
   "note": "Verify the current consolidated text of Cap. 149 and recent case law before advising.",
   "reference": "",
   "confidence": "high"
  }
 ],
 "confidence": "high"
};

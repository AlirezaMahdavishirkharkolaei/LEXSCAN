// ===== LexScan i18n — 5 Languages =====

const LANGUAGES = {
  en: {
    flag:"🇬🇧", name:"English", dir:"ltr",
    t:{
      tagline:"Professional Legal Intelligence",
      subtitle:"AI-Powered Legal Contract Intelligence",
      tagline2:"Upload contract images, use your camera, or paste text — get instant legal insights.",
      tabUpload:"Upload Images", tabCamera:"Camera", tabText:"Paste Text",
      dragDrop:"Drag & drop contract pages here", orClick:"or click to browse files",
      formats:"Supports JPG, PNG, WEBP",
      textPlaceholder:"Paste the full contract text here for analysis...",
      cameraHint:"Camera will appear here",
      cameraStart:"Start Camera", cameraCapture:"Capture Page", cameraStop:"Stop Camera",
      uploadedFiles:"Uploaded Files", capturedPages:"Captured Pages",
      apiLabel:"Google Gemini API Key (Free)",
      howTo:"How to get it?",
      apiHint:"No credit card · 1500 requests/day · Google account only",
      setupTitle:"Free API Key Required",
      setupDesc:"LexScan uses Google Gemini AI — completely free, no credit card needed. You only need a Google account.",
      setupSteps:[
        'Go to <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>',
        "Sign in with your Google account",
        'Click <strong>"Create API Key"</strong>',
        "Copy the key (starts with AIzaSy...)",
        "Paste it in the field below"
      ],
      setupBtn:"Got it, let me enter my key",
      analyzeBtn:"Analyze Contract", analyzing:"Analyzing...",
      reportTitle:"Legal Intelligence Report", reportSub:"Extracted key legal information",
      newAnalysis:"New Analysis", exportBtn:"Export Report", printBtn:"Print",
      riskLevel:"Risk Level", confidence:"Confidence",
      noContent:"Not specified in this contract.",
      loadingText:"Analyzing contract...", loadingSub:"Extracting legal intelligence",
      high:"High", medium:"Medium", low:"Low",
      sections:{
        parties:"Contracting Parties", dates:"Critical Dates & Deadlines",
        obligations:"Key Obligations", clauses:"Important Clauses",
        risks:"Risk Indicators", jurisdiction:"Jurisdiction & Governing Law",
        financials:"Financial Terms", termination:"Termination Conditions",
        summary:"Executive Summary", recommendations:"Legal Recommendations"
      }
    }
  },
  tr: {
    flag:"🇹🇷", name:"Türkçe", dir:"ltr",
    t:{
      tagline:"Profesyonel Hukuki Analiz",
      subtitle:"Yapay Zeka Destekli Sözleşme Analizi",
      tagline2:"Sözleşme görseli yükleyin, kamera kullanın veya metin yapıştırın.",
      tabUpload:"Görsel Yükle", tabCamera:"Kamera", tabText:"Metin Gir",
      dragDrop:"Sözleşme sayfalarını buraya sürükleyin", orClick:"veya dosya seçmek için tıklayın",
      formats:"JPG, PNG, WEBP desteklenir",
      textPlaceholder:"Analiz için sözleşmenin tam metnini yapıştırın...",
      cameraHint:"Kamera burada görünecek",
      cameraStart:"Kamerayı Başlat", cameraCapture:"Sayfayı Yakala", cameraStop:"Kamerayı Durdur",
      uploadedFiles:"Yüklenen Dosyalar", capturedPages:"Yakalanan Sayfalar",
      apiLabel:"Google Gemini API Anahtarı (Ücretsiz)",
      howTo:"Nasıl alınır?",
      apiHint:"Kredi kartı yok · Günde 1500 istek · Sadece Google hesabı gerekli",
      setupTitle:"Ücretsiz API Anahtarı Gerekli",
      setupDesc:"LexScan, Google Gemini AI kullanır — tamamen ücretsiz, kredi kartı gerekmez.",
      setupSteps:[
        '<a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a> adresine gidin',
        "Google hesabınızla giriş yapın",
        '<strong>"Create API Key"</strong> butonuna tıklayın',
        "Anahtarı kopyalayın (AIzaSy... ile başlar)",
        "Aşağıdaki alana yapıştırın"
      ],
      setupBtn:"Anladım, anahtarımı gireyim",
      analyzeBtn:"Sözleşmeyi Analiz Et", analyzing:"Analiz ediliyor...",
      reportTitle:"Hukuki İstihbarat Raporu", reportSub:"Çıkarılan temel hukuki bilgiler",
      newAnalysis:"Yeni Analiz", exportBtn:"Raporu Dışa Aktar", printBtn:"Yazdır",
      riskLevel:"Risk Seviyesi", confidence:"Güven",
      noContent:"Bu sözleşmede belirtilmemiş.",
      loadingText:"Sözleşme analiz ediliyor...", loadingSub:"Hukuki bilgiler çıkarılıyor",
      high:"Yüksek", medium:"Orta", low:"Düşük",
      sections:{
        parties:"Sözleşme Tarafları", dates:"Kritik Tarihler ve Son Günler",
        obligations:"Temel Yükümlülükler", clauses:"Önemli Sözleşme Maddeleri",
        risks:"Risk Göstergeleri", jurisdiction:"Yargı Yetkisi ve Geçerli Hukuk",
        financials:"Mali Koşullar", termination:"Fesih Koşulları",
        summary:"Yönetici Özeti", recommendations:"Hukuki Tavsiyeler"
      }
    }
  },
  el: {
    flag:"🇬🇷", name:"Ελληνικά", dir:"ltr",
    t:{
      tagline:"Επαγγελματική Νομική Ανάλυση",
      subtitle:"Ανάλυση Συμβολαίων με Τεχνητή Νοημοσύνη",
      tagline2:"Μεταφορτώστε εικόνες, χρησιμοποιήστε κάμερα ή επικολλήστε κείμενο.",
      tabUpload:"Μεταφόρτωση", tabCamera:"Κάμερα", tabText:"Επικόλληση Κειμένου",
      dragDrop:"Σύρετε σελίδες συμβολαίου εδώ", orClick:"ή κάντε κλικ για αρχεία",
      formats:"Υποστηρίζονται JPG, PNG, WEBP",
      textPlaceholder:"Επικολλήστε το πλήρες κείμενο του συμβολαίου...",
      cameraHint:"Η κάμερα θα εμφανιστεί εδώ",
      cameraStart:"Εκκίνηση Κάμερας", cameraCapture:"Λήψη Σελίδας", cameraStop:"Διακοπή Κάμερας",
      uploadedFiles:"Αναρτημένα Αρχεία", capturedPages:"Ληφθείσες Σελίδες",
      apiLabel:"Google Gemini API Key (Δωρεάν)",
      howTo:"Πώς να το αποκτήσω;",
      apiHint:"Χωρίς πιστωτική κάρτα · 1500 αιτήματα/ημέρα · Μόνο λογαριασμός Google",
      setupTitle:"Απαιτείται Δωρεάν API Key",
      setupDesc:"Το LexScan χρησιμοποιεί Google Gemini AI — εντελώς δωρεάν, χωρίς πιστωτική κάρτα.",
      setupSteps:[
        'Μεταβείτε στο <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>',
        "Συνδεθείτε με τον λογαριασμό Google σας",
        'Κάντε κλικ στο <strong>"Create API Key"</strong>',
        "Αντιγράψτε το κλειδί (ξεκινά με AIzaSy...)",
        "Επικολλήστε το παρακάτω"
      ],
      setupBtn:"Κατάλαβα, ας εισάγω το κλειδί μου",
      analyzeBtn:"Ανάλυση Συμβολαίου", analyzing:"Ανάλυση...",
      reportTitle:"Έκθεση Νομικής Ανάλυσης", reportSub:"Εξαγόμενες νομικές πληροφορίες",
      newAnalysis:"Νέα Ανάλυση", exportBtn:"Εξαγωγή Έκθεσης", printBtn:"Εκτύπωση",
      riskLevel:"Επίπεδο Κινδύνου", confidence:"Εμπιστοσύνη",
      noContent:"Δεν εντοπίστηκε σε αυτό το συμβόλαιο.",
      loadingText:"Ανάλυση συμβολαίου...", loadingSub:"Εξαγωγή νομικών πληροφοριών",
      high:"Υψηλός", medium:"Μέτριος", low:"Χαμηλός",
      sections:{
        parties:"Συμβαλλόμενα Μέρη", dates:"Κρίσιμες Ημερομηνίες",
        obligations:"Κύριες Υποχρεώσεις", clauses:"Σημαντικές Ρήτρες",
        risks:"Δείκτες Κινδύνου", jurisdiction:"Δικαιοδοσία & Εφαρμοστέο Δίκαιο",
        financials:"Οικονομικοί Όροι", termination:"Όροι Καταγγελίας",
        summary:"Εκτελεστική Περίληψη", recommendations:"Νομικές Συστάσεις"
      }
    }
  },
  ru: {
    flag:"🇷🇺", name:"Русский", dir:"ltr",
    t:{
      tagline:"Профессиональный правовой анализ",
      subtitle:"Правовой анализ договоров на базе ИИ",
      tagline2:"Загрузите фото, используйте камеру или вставьте текст договора.",
      tabUpload:"Загрузить фото", tabCamera:"Камера", tabText:"Вставить текст",
      dragDrop:"Перетащите страницы договора сюда", orClick:"или нажмите для выбора файлов",
      formats:"Поддерживаются JPG, PNG, WEBP",
      textPlaceholder:"Вставьте полный текст договора для анализа...",
      cameraHint:"Здесь появится камера",
      cameraStart:"Включить камеру", cameraCapture:"Сфотографировать", cameraStop:"Выключить камеру",
      uploadedFiles:"Загруженные файлы", capturedPages:"Сделанные снимки",
      apiLabel:"Google Gemini API Key (Бесплатно)",
      howTo:"Как получить?",
      apiHint:"Без кредитной карты · 1500 запросов/день · Только аккаунт Google",
      setupTitle:"Требуется бесплатный API Key",
      setupDesc:"LexScan использует Google Gemini AI — полностью бесплатно, без кредитной карты.",
      setupSteps:[
        'Перейдите на <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>',
        "Войдите с аккаунтом Google",
        'Нажмите <strong>"Create API Key"</strong>',
        "Скопируйте ключ (начинается с AIzaSy...)",
        "Вставьте в поле ниже"
      ],
      setupBtn:"Понял, введу ключ",
      analyzeBtn:"Анализировать договор", analyzing:"Анализируется...",
      reportTitle:"Отчёт о правовом анализе", reportSub:"Извлечённая правовая информация",
      newAnalysis:"Новый анализ", exportBtn:"Экспорт отчёта", printBtn:"Печать",
      riskLevel:"Уровень риска", confidence:"Достоверность",
      noContent:"Не указано в данном договоре.",
      loadingText:"Анализ договора...", loadingSub:"Извлечение правовой информации",
      high:"Высокий", medium:"Средний", low:"Низкий",
      sections:{
        parties:"Стороны договора", dates:"Ключевые даты и сроки",
        obligations:"Основные обязательства", clauses:"Важные положения",
        risks:"Индикаторы рисков", jurisdiction:"Юрисдикция и применимое право",
        financials:"Финансовые условия", termination:"Условия расторжения",
        summary:"Краткое резюме", recommendations:"Правовые рекомендации"
      }
    }
  },
  de: {
    flag:"🇩🇪", name:"Deutsch", dir:"ltr",
    t:{
      tagline:"Professionelle Rechtsanalyse",
      subtitle:"KI-gestützte Vertragsanalyse",
      tagline2:"Bilder hochladen, Kamera nutzen oder Text einfügen — sofortige Rechtsanalyse.",
      tabUpload:"Bilder hochladen", tabCamera:"Kamera", tabText:"Text einfügen",
      dragDrop:"Vertragsseiten hier ablegen", orClick:"oder klicken zum Durchsuchen",
      formats:"Unterstützt JPG, PNG, WEBP",
      textPlaceholder:"Vollständigen Vertragstext zur Analyse einfügen...",
      cameraHint:"Kamera wird hier angezeigt",
      cameraStart:"Kamera starten", cameraCapture:"Seite aufnehmen", cameraStop:"Kamera stoppen",
      uploadedFiles:"Hochgeladene Dateien", capturedPages:"Aufgenommene Seiten",
      apiLabel:"Google Gemini API-Schlüssel (Kostenlos)",
      howTo:"Wie bekomme ich ihn?",
      apiHint:"Keine Kreditkarte · 1500 Anfragen/Tag · Nur Google-Konto erforderlich",
      setupTitle:"Kostenloser API-Schlüssel erforderlich",
      setupDesc:"LexScan nutzt Google Gemini AI — völlig kostenlos, keine Kreditkarte nötig.",
      setupSteps:[
        'Gehen Sie zu <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>',
        "Melden Sie sich mit Ihrem Google-Konto an",
        'Klicken Sie auf <strong>"Create API Key"</strong>',
        "Kopieren Sie den Schlüssel (beginnt mit AIzaSy...)",
        "Fügen Sie ihn unten ein"
      ],
      setupBtn:"Verstanden, Schlüssel eingeben",
      analyzeBtn:"Vertrag analysieren", analyzing:"Wird analysiert...",
      reportTitle:"Rechtlicher Analysebericht", reportSub:"Extrahierte rechtliche Schlüsselinformationen",
      newAnalysis:"Neue Analyse", exportBtn:"Bericht exportieren", printBtn:"Drucken",
      riskLevel:"Risikoniveau", confidence:"Genauigkeit",
      noContent:"In diesem Vertrag nicht angegeben.",
      loadingText:"Vertrag wird analysiert...", loadingSub:"Rechtliche Informationen werden extrahiert",
      high:"Hoch", medium:"Mittel", low:"Niedrig",
      sections:{
        parties:"Vertragsparteien", dates:"Kritische Daten & Fristen",
        obligations:"Hauptverpflichtungen", clauses:"Wichtige Klauseln",
        risks:"Risikoindikatoren", jurisdiction:"Gerichtsstand & Anwendbares Recht",
        financials:"Finanzielle Bedingungen", termination:"Kündigungsbedingungen",
        summary:"Zusammenfassung", recommendations:"Rechtliche Empfehlungen"
      }
    }
  }
};

const SECTION_META = {
  parties:        { icon:"👥",  colorVar:"--c-parties" },
  dates:          { icon:"📅",  colorVar:"--c-dates" },
  obligations:    { icon:"⚖️", colorVar:"--c-obligations" },
  clauses:        { icon:"📋",  colorVar:"--c-clauses" },
  risks:          { icon:"⚠️", colorVar:"--c-risks" },
  jurisdiction:   { icon:"🏛️", colorVar:"--c-jurisdiction" },
  financials:     { icon:"💰",  colorVar:"--c-financials" },
  termination:    { icon:"🔚",  colorVar:"--c-termination" },
  recommendations:{ icon:"💡",  colorVar:"--c-recommendations" }
};

const REPORT_SECTIONS = ["parties","dates","obligations","clauses","risks","jurisdiction","financials","termination","recommendations"];

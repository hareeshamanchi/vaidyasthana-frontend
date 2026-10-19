/**
 * Vaidyasthana Centralized Internationalization & Clinical Translation System
 * Provides lightweight key resolution, clinical entity translations,
 * and supported languages for the API-based translation engine.
 */

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "te", label: "Telugu", nativeName: "తెలుగు" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी" },
  { code: "ta", label: "Tamil", nativeName: "தமிழ்" },
  { code: "kn", label: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", nativeName: "മലയാളം" },
  { code: "es", label: "Spanish", nativeName: "Español" },
];

/**
 * Built-in core healthcare translations for common UI tokens,
 * ensuring immediate rendering while dynamic API translations load.
 */
export const CORE_TRANSLATIONS = {
  en: {
    "common.appName": "Vaidyasthana",
    "common.tagline": "Clinical Health Records",
    "common.secondsAgo": "{count}s ago",
    "nav.home": "Home",
    "nav.appointments": "Appointments",
    "nav.consultations": "Consultations",
    "nav.medicalVault": "Medical Vault",
    "nav.healthTimeline": "Health Timeline",
    "nav.timeline": "Timeline",
    "nav.dietPlan": "Diet Plan",
    "nav.insurance": "Insurance",
    "nav.contact": "Contact",
    "nav.signIn": "Sign In",
    "nav.signOut": "Sign Out",
    "nav.getStarted": "Get Started",
  },
  te: {
    "common.appName": "వైద్యస్థాన",
    "common.tagline": "క్లినికల్ ఆరోగ్య రికార్డులు",
    "common.secondsAgo": "{count} సెకన్ల క్రితం",
    "nav.home": "హోమ్",
    "nav.appointments": "అపాయింట్‌మెంట్లు",
    "nav.consultations": "సంప్రదింపులు",
    "nav.medicalVault": "మెడికల్ వాల్ట్",
    "nav.healthTimeline": "ఆరోగ్య టైమ్‌లైన్",
    "nav.timeline": "టైమ్‌లైన్",
    "nav.dietPlan": "ఆహార ప్రణాళిక",
    "nav.insurance": "భీమా",
    "nav.contact": "సంప్రదించండి",
    "nav.signIn": "లాగిన్",
    "nav.signOut": "లాగ్ అవుట్",
    "nav.getStarted": "ప్రారంభించండి",
  },
  hi: {
    "common.appName": "वैद्यस्थान",
    "common.tagline": "नैदानिक स्वास्थ्य रिकॉर्ड",
    "common.secondsAgo": "{count} सेकंड पहले",
    "nav.home": "होम",
    "nav.appointments": "नियुक्तियां",
    "nav.consultations": "परामर्श",
    "nav.medicalVault": "मेडिकल वॉल्ट",
    "nav.healthTimeline": "स्वास्थ्य समयरेखा",
    "nav.timeline": "समयरेखा",
    "nav.dietPlan": "आहार योजना",
    "nav.insurance": "बीमा",
    "nav.contact": "संपर्क करें",
    "nav.signIn": "साइन इन",
    "nav.signOut": "साइन आउट",
    "nav.getStarted": "शुरू करें",
  },
};

/**
 * Clinical status mapping for known medical and appointment states.
 */
const STATUS_MAP = {
  te: {
    Confirmed: "నిర్ధారించబడింది",
    Scheduled: "షెడ్యూల్ చేయబడింది",
    Completed: "పూర్తయింది",
    Cancelled: "రద్దు చేయబడింది",
    Pending: "పెండింగ్‌లో ఉంది",
    Rejected: "తిరస్కరించబడింది",
    Expired: "గడువు ముగిసింది",
    Taken: "తీసుకున్నారు",
    Skipped: "దాటవేయబడింది",
    Due: "తీసుకోవాల్సి ఉంది",
    Abnormal: "అసాధారణం",
    Normal: "సాధారణం",
    Critical: "క్లిష్టమైనది",
    High: "ఎక్కువ",
    Low: "తక్కువ",
    Standard: "ప్రామాణికం",
    Processed: "విశ్లేషించబడింది",
    Active: "క్రియాశీలం",
    Inactive: "నిష్క్రియం",
    Suspended: "సస్పెండ్ చేయబడింది",
    Verified: "ధృవీకరించబడింది",
  },
  hi: {
    Confirmed: "पुष्टि की गई",
    Scheduled: "शेड्यूल किया गया",
    Completed: "पूर्ण हुआ",
    Cancelled: "रद्द किया गया",
    Pending: "लंबित",
    Rejected: "अस्वीकृत",
    Expired: "समाप्त",
    Taken: "लिया गया",
    Skipped: "छोड़ा गया",
    Due: "देय",
    Abnormal: "असामान्य",
    Normal: "सामान्य",
    Critical: "गंभीर",
    High: "उच्च",
    Low: "निम्न",
    Standard: "मानक",
    Processed: "संसाधित",
  },
  ta: {
    Confirmed: "உறுதிப்படுத்தப்பட்டது",
    Scheduled: "திட்டமிடப்பட்டது",
    Completed: "முடிந்தது",
    Cancelled: "ரத்து செய்யப்பட்டது",
    Abnormal: "இயல்புக்கு மாறானது",
    Normal: "இயல்பானது",
  },
  es: {
    Confirmed: "Confirmado",
    Scheduled: "Programado",
    Completed: "Completado",
    Cancelled: "Cancelado",
    Abnormal: "Anormal",
    Normal: "Normal",
  },
};

/**
 * Clinical category mapping (laboratory, radiology, etc.)
 */
const CATEGORY_MAP = {
  te: {
    "Laboratory Report": "ప్రయోగశాల నివేదిక (ల్యాబ్)",
    Prescription: "ప్రిస్క్రిప్షన్ (మందుల చీటి)",
    Cardiology: "కార్డియాలజీ (గుండె)",
    Radiology: "రేడియాలజీ (స్కాన్లు/ఎక్స్-రే)",
    Pathology: "పాథాలజీ",
    "General Medicine": "జనరల్ మెడిసిన్",
    Diagnostic: "రోగనిర్ధారణ",
  },
  hi: {
    "Laboratory Report": "प्रयोगशाला रिपोर्ट",
    Prescription: "नुस्खा (प्रिस्क्रिप्शन)",
    Cardiology: "कार्डियोलॉजी",
    Radiology: "रेडियोलॉजी",
    Pathology: "पैथोलॉजी",
    "General Medicine": "सामान्य चिकित्सा",
  },
  ta: {
    "Laboratory Report": "ஆய்வக அறிக்கை",
    Prescription: "மருந்துச்சீட்டு",
    Cardiology: "இதயவியல்",
  },
  es: {
    "Laboratory Report": "Informe de Laboratorio",
    Prescription: "Receta Médica",
    Cardiology: "Cardiología",
  },
};

/**
 * Translates known clinical status values without altering raw backend enum values.
 */
export const translateStatus = (status = "", lang = "en") => {
  if (!status) return "";
  if (lang === "en") return status;
  const langMap = STATUS_MAP[lang];
  return (langMap && langMap[status]) || status;
};

/**
 * Translates clinical categories (e.g. "Laboratory Report", "Prescription").
 */
export const translateCategory = (category = "", lang = "en") => {
  if (!category) return "";
  if (lang === "en") return category;
  const langMap = CATEGORY_MAP[lang];
  return (langMap && langMap[category]) || category;
};

/**
 * Retrieves a translated string with interpolation and fallback.
 *
 * @param {string} lang - language code (e.g. 'en', 'te')
 * @param {string} key - dotted key identifier, e.g. "common.appName"
 * @param {object} [params] - interpolation replacements
 * @param {string} [fallback] - fallback text
 * @returns {string} Translated string
 */
export const getTranslation = (lang = "en", key = "", params = null, fallback = "") => {
  const activeDict = CORE_TRANSLATIONS[lang] || CORE_TRANSLATIONS.en || {};
  let text = activeDict[key];

  if (text === undefined && lang !== "en") {
    text = CORE_TRANSLATIONS.en?.[key];
  }

  if (text === undefined || text === null) {
    if (fallback !== undefined && fallback !== "") {
      text = fallback;
    } else {
      const segments = (key || "").split(".");
      text = segments[segments.length - 1] || key;
    }
  }

  if (typeof text === "string" && params && typeof params === "object") {
    Object.keys(params).forEach((paramKey) => {
      const placeholder = new RegExp(`\\{${paramKey}\\}`, "g");
      text = text.replace(placeholder, params[paramKey] !== undefined ? params[paramKey] : "");
    });
  }

  return text;
};

const i18n = {
  SUPPORTED_LANGUAGES,
  translateStatus,
  translateCategory,
  getTranslation,
};

export default i18n;

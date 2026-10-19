import en from "./en";
import te from "./te";

export const translations = { en, te };

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "te", label: "Telugu", nativeName: "తెలుగు" },
];

/**
 * Resolves a nested key in an object, e.g. "nav.home" -> obj.nav.home
 */
const resolveKey = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
};

/**
 * Retrieves a translated string with interpolation and fallback.
 *
 * @param {string} lang - 'en' or 'te'
 * @param {string} key - Dotted key path, e.g. "dashboard.welcome"
 * @param {object} [params] - Key-value replacements for {placeholder}
 * @param {string} [fallback] - Fallback text if key is not found
 * @returns {string} Translated string
 */
export const getTranslation = (lang = "en", key = "", params = null, fallback = "") => {
  const activeDict = translations[lang] || translations.en;
  let text = resolveKey(activeDict, key);

  // Fallback to English dictionary if not found in active language
  if (text === undefined && lang !== "en") {
    text = resolveKey(translations.en, key);
  }

  // If still not found, use provided fallback or key itself
  if (text === undefined || text === null) {
    if (fallback !== undefined && fallback !== "") {
      text = fallback;
    } else {
      // Return last segment of key as graceful fallback
      const segments = key.split(".");
      text = segments[segments.length - 1] || key;
    }
  }

  // Handle interpolation e.g. {count}, {name}, {time}
  if (typeof text === "string" && params && typeof params === "object") {
    Object.keys(params).forEach((paramKey) => {
      const placeholder = new RegExp(`\\{${paramKey}\\}`, "g");
      text = text.replace(placeholder, params[paramKey]);
    });
  }

  return text;
};

/**
 * Translates known clinical status values without altering raw backend enum values.
 */
export const translateStatus = (status = "", lang = "en") => {
  if (!status) return "";
  const normalized = status.toLowerCase().trim();
  const statusKey = `status.${normalized}`;
  return getTranslation(lang, statusKey, null, status);
};

/**
 * Translates clinical categories (e.g. "Laboratory Report", "Prescription").
 */
export const translateCategory = (category = "", lang = "en") => {
  if (!category) return "";
  const catMap = {
    "laboratory report": "dashboard.labReport",
    "lab report": "dashboard.labReport",
    "radiology & imaging": "dashboard.radiology",
    "radiology": "dashboard.radiology",
    "prescription": "dashboard.prescription",
    "discharge summary": "dashboard.dischargeSummary",
    "cardiology": "dashboard.cardiology",
    "pathology": "dashboard.pathology",
    "medical report": "dashboard.medicalReport",
    "all": "dashboard.allCategories",
    "all categories": "dashboard.allCategories",
  };

  const key = catMap[category.toLowerCase().trim()];
  if (key) {
    return getTranslation(lang, key, null, category);
  }
  return category;
};

export default translations;

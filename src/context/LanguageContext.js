import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getTranslation, translateStatus, translateCategory, SUPPORTED_LANGUAGES, CORE_TRANSLATIONS } from "../i18n";
import { translationAPI } from "../services/api";

export const LANGUAGE_STORAGE_KEY = "vaidyasthana_language";
const DYNAMIC_CACHE_PREFIX = "vaidyasthana_api_i18n_";

const defaultTranslate = (key, arg1 = null, arg2 = null) => {
  let params = null;
  let fallback = "";
  if (typeof arg1 === "string") {
    fallback = arg1;
    if (arg2 && typeof arg2 === "object") params = arg2;
  } else if (arg1 && typeof arg1 === "object") {
    params = arg1;
    if (typeof arg2 === "string") fallback = arg2;
  } else if (typeof arg2 === "string") {
    fallback = arg2;
  }
  return getTranslation("en", key, params, fallback);
};

export const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  t: defaultTranslate,
  translateStatus: (status) => translateStatus(status, "en"),
  translateCategory: (category) => translateCategory(category, "en"),
  translateClinicalText: async () => ({}),
  isTelugu: false,
  isTranslating: false,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
          return saved;
        }
      } catch (e) {
        // Safe ignore localStorage errors
      }
    }
    return "en";
  });

  const [supportedLanguages, setSupportedLanguages] = useState(SUPPORTED_LANGUAGES);
  const [isTranslating, setIsTranslating] = useState(false);
  const [dynamicCache, setDynamicCache] = useState(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const cached = window.localStorage.getItem(DYNAMIC_CACHE_PREFIX + language);
        if (cached) return JSON.parse(cached);
      } catch (e) {
        // Safe ignore
      }
    }
    return {};
  });

  // Attempt to fetch supported languages from backend API on mount
  useEffect(() => {
    let isMounted = true;
    translationAPI
      .getLanguages()
      .then((res) => {
        if (isMounted && res.data?.languages && Array.isArray(res.data.languages)) {
          const mapped = res.data.languages.map((l) => ({
            code: l.code,
            label: l.name,
            nativeName: l.nativeName,
          }));
          setSupportedLanguages(mapped);
        }
      })
      .catch(() => {
        // Fallback to static supported languages without error
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Reload client dynamic cache when language changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const cached = window.localStorage.getItem(DYNAMIC_CACHE_PREFIX + language);
        setDynamicCache(cached ? JSON.parse(cached) : {});
      } catch (e) {
        setDynamicCache({});
      }
    }
  }, [language]);

  const setLanguage = useCallback((newLang) => {
    const isSupported = SUPPORTED_LANGUAGES.some((l) => l.code === newLang);
    const validLang = isSupported ? newLang : "en";
    setLanguageState(validLang);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, validLang);
      } catch (e) {
        console.warn("Could not persist language preference:", e);
      }
      document.documentElement.lang = validLang;
      if (document.body) {
        SUPPORTED_LANGUAGES.forEach((l) => {
          document.body.classList.remove(`lang-${l.code}`);
        });
        if (validLang !== "en") {
          document.body.classList.add(`lang-${validLang}`);
        }
      }
    }
  }, []);

  // Synchronize document attribute and body class on mount and language change
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      if (document.body) {
        SUPPORTED_LANGUAGES.forEach((l) => {
          document.body.classList.remove(`lang-${l.code}`);
        });
        if (language !== "en") {
          document.body.classList.add(`lang-${language}`);
        }
      }
    }
  }, [language]);

  /**
   * Flexible translation helper.
   * Usage:
   *   t("nav.home")
   *   t("nav.home", "Home") // second arg as fallback string
   *   t("medications.repeatingChimeIn", { seconds: 45 })
   *   t("medications.repeatingChimeIn", "Chime in {seconds}s", { seconds: 45 })
   */
  const t = useCallback(
    (key, arg1 = null, arg2 = null) => {
      let params = null;
      let fallback = "";

      if (typeof arg1 === "string") {
        fallback = arg1;
        if (arg2 && typeof arg2 === "object") params = arg2;
      } else if (arg1 && typeof arg1 === "object") {
        params = arg1;
        if (typeof arg2 === "string") fallback = arg2;
      } else if (typeof arg2 === "string") {
        fallback = arg2;
      }

      if (language === "en") {
        return getTranslation("en", key, params, fallback);
      }

      // Check core pre-translated dictionary first
      const coreVal = CORE_TRANSLATIONS[language]?.[key];
      if (coreVal !== undefined) {
        let text = coreVal;
        if (params && typeof params === "object") {
          Object.keys(params).forEach((paramKey) => {
            const placeholder = new RegExp(`\\{${paramKey}\\}`, "g");
            text = text.replace(placeholder, params[paramKey] !== undefined ? params[paramKey] : "");
          });
        }
        return text;
      }

      // Check dynamic cache
      if (dynamicCache[key]) {
        let text = dynamicCache[key];
        if (params && typeof params === "object") {
          Object.keys(params).forEach((paramKey) => {
            const placeholder = new RegExp(`\\{${paramKey}\\}`, "g");
            text = text.replace(placeholder, params[paramKey] !== undefined ? params[paramKey] : "");
          });
        }
        return text;
      }

      // Fallback
      return getTranslation(language, key, params, fallback);
    },
    [language, dynamicCache]
  );

  /**
   * Translates arbitrary clinical or report text via the backend /api/translate endpoint.
   * Safely preserves original numbers, medication names, and dosages.
   */
  const translateClinicalText = useCallback(
    async ({ text, targetLanguage = language, context = "clinical_report" }) => {
      if (!text || typeof text !== "string") {
        return {
          originalText: text || "",
          translatedText: text || "",
          preservedTerms: [],
          disclaimer: "",
        };
      }

      if (targetLanguage === "en") {
        return {
          originalText: text,
          translatedText: text,
          preservedTerms: [],
          disclaimer: "",
        };
      }

      setIsTranslating(true);
      try {
        const res = await translationAPI.translate({
          text,
          targetLanguage,
          context,
        });

        if (res.data?.success) {
          return {
            originalText: text,
            translatedText: res.data.translatedText || text,
            preservedTerms: res.data.preservedTerms || [],
            disclaimer: res.data.disclaimer || "",
            cached: Boolean(res.data.cached),
          };
        }
      } catch (err) {
        console.warn("Clinical translation request failed:", err.message);
      } finally {
        setIsTranslating(false);
      }

      // Safe fallback: return original text
      return {
        originalText: text,
        translatedText: text,
        preservedTerms: [],
        disclaimer: "Medical Translation Disclaimer: Translation service unavailable. Displaying original text.",
      };
    },
    [language]
  );

  const localizedTranslateStatus = useCallback(
    (status) => translateStatus(status, language),
    [language]
  );

  const localizedTranslateCategory = useCallback(
    (category) => translateCategory(category, language),
    [language]
  );

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      translateStatus: localizedTranslateStatus,
      translateCategory: localizedTranslateCategory,
      translateClinicalText,
      isTelugu: language === "te",
      isTranslating,
      supportedLanguages,
    }),
    [language, setLanguage, t, localizedTranslateStatus, localizedTranslateCategory, translateClinicalText, isTranslating, supportedLanguages]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export default LanguageContext;

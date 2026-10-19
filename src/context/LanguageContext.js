import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getTranslation, translateStatus, translateCategory, SUPPORTED_LANGUAGES } from "../i18n";

export const LANGUAGE_STORAGE_KEY = "vaidyasthana_language";

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
  isTelugu: false,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === "te" || saved === "en") {
          return saved;
        }
      } catch (e) {
        // Safe ignore localStorage errors
      }
    }
    return "en";
  });

  const setLanguage = useCallback((newLang) => {
    const validLang = newLang === "te" ? "te" : "en";
    setLanguageState(validLang);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, validLang);
      } catch (e) {
        console.warn("Could not persist language preference:", e);
      }
      document.documentElement.lang = validLang;
      if (document.body) {
        if (validLang === "te") {
          document.body.classList.add("lang-te");
        } else {
          document.body.classList.remove("lang-te");
        }
      }
    }
  }, []);

  // Synchronize document attribute and body class on mount and language change
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      if (document.body) {
        if (language === "te") {
          document.body.classList.add("lang-te");
        } else {
          document.body.classList.remove("lang-te");
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
   *   t("medications.repeatingChimeIn", { seconds: 45 }, "Repeating chime in 45s")
   *   t("medications.repeatingChimeIn", "Repeating chime in 45s", { seconds: 45 })
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

      return getTranslation(language, key, params, fallback);
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

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      translateStatus: localizedTranslateStatus,
      translateCategory: localizedTranslateCategory,
      isTelugu: language === "te",
      supportedLanguages: SUPPORTED_LANGUAGES,
    }),
    [language, setLanguage, t, localizedTranslateStatus, localizedTranslateCategory]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export default LanguageContext;

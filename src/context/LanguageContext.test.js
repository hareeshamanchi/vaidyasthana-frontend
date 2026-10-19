import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "./LanguageContext";
import { translateCategory, translateStatus } from "../i18n";

// Test consumer component
const TestConsumer = () => {
  const { language, setLanguage, t, isTelugu } = useLanguage();

  return (
    <div>
      <span data-testid="current-lang">{language}</span>
      <span data-testid="is-telugu">{isTelugu ? "yes" : "no"}</span>
      <span data-testid="app-name">{t("common.appName", "Fallback Name")}</span>
      <span data-testid="interpolated">
        {t("common.secondsAgo", "{count}s ago", { count: 45 })}
      </span>
      <span data-testid="fallback-text">
        {t("nonExistentKey.xyz", "My Clean Fallback")}
      </span>
      <button onClick={() => setLanguage("te")} data-testid="switch-to-te">
        Switch to Telugu
      </button>
      <button onClick={() => setLanguage("en")} data-testid="switch-to-en">
        Switch to English
      </button>
    </div>
  );
};

describe("LanguageContext & i18n Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
    document.body.classList.remove("lang-te");
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("initializes with English (en) by default", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId("current-lang").textContent).toBe("en");
    expect(screen.getByTestId("is-telugu").textContent).toBe("no");
    expect(screen.getByTestId("app-name").textContent).toBe("Vaidyasthana");
    expect(document.documentElement.lang).toBe("en");
    expect(document.body.classList.contains("lang-te")).toBe(false);
  });

  test("loads persisted Telugu preference from localStorage", () => {
    localStorage.setItem("vaidyasthana_language", "te");

    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId("current-lang").textContent).toBe("te");
    expect(screen.getByTestId("is-telugu").textContent).toBe("yes");
    expect(document.documentElement.lang).toBe("te");
    expect(document.body.classList.contains("lang-te")).toBe(true);
  });

  test("switches between English and Telugu and updates document and localStorage", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId("current-lang").textContent).toBe("en");

    // Click switch to Telugu
    fireEvent.click(screen.getByTestId("switch-to-te"));

    expect(screen.getByTestId("current-lang").textContent).toBe("te");
    expect(screen.getByTestId("is-telugu").textContent).toBe("yes");
    expect(localStorage.getItem("vaidyasthana_language")).toBe("te");
    expect(document.documentElement.lang).toBe("te");
    expect(document.body.classList.contains("lang-te")).toBe(true);

    // Click switch back to English
    fireEvent.click(screen.getByTestId("switch-to-en"));

    expect(screen.getByTestId("current-lang").textContent).toBe("en");
    expect(screen.getByTestId("is-telugu").textContent).toBe("no");
    expect(localStorage.getItem("vaidyasthana_language")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(document.body.classList.contains("lang-te")).toBe(false);
  });

  test("interpolates variables properly in translations", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId("interpolated").textContent).toBe("45s ago");

    fireEvent.click(screen.getByTestId("switch-to-te"));
    expect(screen.getByTestId("interpolated").textContent).toBe("45 సెకన్ల క్రితం");
  });

  test("uses fallback value when key does not exist", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId("fallback-text").textContent).toBe("My Clean Fallback");
  });

  test("translateCategory translates known clinical categories correctly", () => {
    expect(translateCategory("Laboratory Report", "en")).toBe("Laboratory Report");
    expect(translateCategory("Laboratory Report", "te")).toBe("ప్రయోగశాల నివేదిక (ల్యాబ్)");
    expect(translateCategory("Prescription", "te")).toBe("ప్రిస్క్రిప్షన్ (మందుల చీటి)");
    expect(translateCategory("Cardiology", "te")).toBe("కార్డియాలజీ (గుండె)");
    expect(translateCategory("Unknown Custom Category", "te")).toBe("Unknown Custom Category");
  });

  test("translateStatus translates known appointment and report statuses", () => {
    expect(translateStatus("Confirmed", "en")).toBe("Confirmed");
    expect(translateStatus("Confirmed", "te")).toBe("నిర్ధారించబడింది");
    expect(translateStatus("Scheduled", "te")).toBe("షెడ్యూల్ చేయబడింది");
    expect(translateStatus("Completed", "te")).toBe("పూర్తయింది");
    expect(translateStatus("Cancelled", "te")).toBe("రద్దు చేయబడింది");
    expect(translateStatus("Taken", "te")).toBe("తీసుకున్నారు");
    expect(translateStatus("Skipped", "te")).toBe("దాటవేయబడింది");
    expect(translateStatus("Abnormal", "te")).toBe("అసాధారణం");
    expect(translateStatus("Normal", "te")).toBe("సాధారణం");
  });
});

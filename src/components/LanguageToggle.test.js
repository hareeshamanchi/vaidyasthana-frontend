import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LanguageToggle from "./LanguageToggle";
import { LanguageProvider } from "../context/LanguageContext";

const renderWithLanguageProvider = (ui, initialLang = "en") => {
  localStorage.setItem("vaidyasthana_language", initialLang);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

describe("LanguageToggle Component", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
    document.body.classList.remove("lang-te");
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("renders English and Telugu options with proper accessibility attributes", () => {
    renderWithLanguageProvider(<LanguageToggle />);

    const enBtn = screen.getByRole("button", { name: /switch to english/i });
    const teBtn = screen.getByRole("button", { name: /switch to telugu|తెలుగు/i });

    expect(enBtn).toBeInTheDocument();
    expect(teBtn).toBeInTheDocument();
    expect(enBtn).toHaveAttribute("aria-pressed", "true");
    expect(teBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("clicking Telugu toggles language to te and updates active state", () => {
    renderWithLanguageProvider(<LanguageToggle />);

    const teBtn = screen.getByRole("button", { name: /switch to telugu|తెలుగు/i });
    fireEvent.click(teBtn);

    expect(teBtn).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("vaidyasthana_language")).toBe("te");
    expect(document.documentElement.lang).toBe("te");
    expect(document.body.classList.contains("lang-te")).toBe(true);
  });

  test("supports compact prop variant for mobile drawer", () => {
    const { container } = renderWithLanguageProvider(<LanguageToggle compact={true} />);

    expect(container.querySelector(".language-toggle-pill.compact")).toBeInTheDocument();
  });
});

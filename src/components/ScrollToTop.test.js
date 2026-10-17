import React, { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import ScrollToTop, { resetDocumentScroll } from "./ScrollToTop";

// Mock helper components for routing test
const HomePage = () => {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>Home Page</h1>
      <button onClick={() => setCount((c) => c + 1)}>Increment: {count}</button>
      <Link to="/insurance">Go to Insurance</Link>
      <Link to="/appointments">Go to Appointments</Link>
    </div>
  );
};

const InsurancePage = () => (
  <div>
    <h1>Insurance Page</h1>
    <Link to="/">Back to Home</Link>
    <div id="plan-details">Plan Details Anchor Target</div>
    <Link to="/insurance#plan-details">Jump to Plan Details</Link>
  </div>
);

const AppointmentsPage = () => (
  <div>
    <h1>Appointments Page</h1>
    <Link to="/">Back to Home</Link>
  </div>
);

describe("Global ScrollToTop Component & Scroll Restoration", () => {
  let originalScrollTo;
  let scrollToMock;

  beforeEach(() => {
    scrollToMock = jest.fn();
    originalScrollTo = window.scrollTo;
    window.scrollTo = scrollToMock;

    // Reset document offsets
    document.documentElement.scrollTop = 500;
    document.body.scrollTop = 500;
  });

  afterEach(() => {
    window.scrollTo = originalScrollTo;
    jest.clearAllMocks();
  });

  test("1. Scrolls to top (0, 0) instantly on initial mount", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollToTop />
        <HomePage />
      </MemoryRouter>
    );

    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0, left: 0, behavior: "instant" })
    );
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });

  test("2. Automatically resets scroll to (0, 0) when pathname changes to a new page", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/insurance" element={<InsurancePage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial mount scroll
    expect(scrollToMock).toHaveBeenCalledTimes(1);

    // Simulate user scrolling down 1500px towards footer
    document.documentElement.scrollTop = 1500;
    document.body.scrollTop = 1500;

    // Click link to navigate to /insurance
    const insuranceLink = screen.getByText(/Go to Insurance/i);
    act(() => {
      fireEvent.click(insuranceLink);
    });

    expect(screen.getByText(/Insurance Page/i)).toBeInTheDocument();
    // Verify scroll was called again on route change
    expect(scrollToMock).toHaveBeenCalledTimes(2);
    expect(scrollToMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ top: 0, left: 0, behavior: "instant" })
    );
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });

  test("3. Does NOT trigger scroll when component re-renders with the same pathname", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollToTop />
        <HomePage />
      </MemoryRouter>
    );

    // Clear initial call
    scrollToMock.mockClear();

    // Simulate user scrolling down
    document.documentElement.scrollTop = 800;

    // Trigger state change (re-render) without changing pathname
    const incButton = screen.getByText(/Increment: 0/i);
    act(() => {
      fireEvent.click(incButton);
    });

    expect(screen.getByText(/Increment: 1/i)).toBeInTheDocument();
    // Scroll should NOT be invoked for re-renders on the same page
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(document.documentElement.scrollTop).toBe(800);
  });

  test("4. Resets any nested container scroll positions if present", () => {
    const container = document.createElement("div");
    container.className = "main-content";
    container.scrollTop = 600;
    document.body.appendChild(container);

    resetDocumentScroll();

    expect(container.scrollTop).toBe(0);
    document.body.removeChild(container);
  });

  test("5. Handles hash navigation when element exists on the page", () => {
    const scrollIntoViewMock = jest.fn();
    const anchorEl = document.createElement("div");
    anchorEl.id = "plan-details";
    anchorEl.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(anchorEl);

    const origRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      callback();
      return 1;
    };

    render(
      <MemoryRouter initialEntries={["/insurance#plan-details"]}>
        <ScrollToTop />
        <InsurancePage />
      </MemoryRouter>
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });

    window.requestAnimationFrame = origRAF;
    document.body.removeChild(anchorEl);
  });
});

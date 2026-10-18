import { render, screen } from "@testing-library/react";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

test("renders Vaidyasthana portal brand and navigation", () => {
  render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
  const brandElements = screen.getAllByText(/Vaidyasthana/i);
  expect(brandElements.length).toBeGreaterThan(0);

  const homeElement = screen.getByText(/Welcome to Vaidyasthana/i);
  expect(homeElement).toBeInTheDocument();
});

test("renders ResetPasswordPage when directly opening /reset-password/:token path", async () => {
  window.history.pushState({}, "Reset Password", "/reset-password/token-abc-1234567890abcdef");

  render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );

  // Directly renders ResetPasswordPage loading / validating view
  expect(screen.getByText("Validating Security Token")).toBeInTheDocument();
});

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

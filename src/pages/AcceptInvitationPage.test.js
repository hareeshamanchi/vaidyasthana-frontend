import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AcceptInvitationPage from "./AcceptInvitationPage";
import { authAPI } from "../services/api";

jest.mock("../services/api", () => ({
  authAPI: {
    validateInvitation: jest.fn(),
    acceptInvitation: jest.fn(),
  },
}));

const mockInvitationData = {
  data: {
    success: true,
    invitation: {
      id: "invite-123",
      email: "newdoctor@hospital.test",
      name: "Dr. Ananya Roy",
      role: "doctor",
      hospital: {
        id: "hosp-1",
        name: "Metro Health Hospital",
        hospitalCode: "METRO-01",
      },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
  },
};

const renderPage = (initialUrl = "/accept-invitation?token=validtoken123") => {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe("AcceptInvitationPage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("displays error message if no token is provided in the query parameters", async () => {
    renderPage("/accept-invitation");

    expect(await screen.findByText(/No invitation token found in the link/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to homepage/i })).toBeInTheDocument();
  });

  test("validates token and displays hospital name, email, and role", async () => {
    authAPI.validateInvitation.mockResolvedValue(mockInvitationData);

    renderPage();

    expect(await screen.findByText("Hospital Staff Invitation")).toBeInTheDocument();
    expect(screen.getByText("Metro Health Hospital")).toBeInTheDocument();
    expect(screen.getByText("Doctor / Clinician")).toBeInTheDocument();
    expect(screen.getByDisplayValue("newdoctor@hospital.test")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dr. Ananya Roy")).toBeInTheDocument();
  });

  test("validates password length and matching confirmation before submission", async () => {
    authAPI.validateInvitation.mockResolvedValue(mockInvitationData);

    renderPage();

    await screen.findByText("Hospital Staff Invitation");

    const passInputs = screen.getAllByPlaceholderText(/min 6 characters|confirm password/i);
    // Enter short password
    fireEvent.change(passInputs[0], { target: { value: "123" } });
    fireEvent.change(passInputs[1], { target: { value: "123" } });

    const submitBtn = screen.getByRole("button", { name: /activate account/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Password must be at least 6 characters long/i)).toBeInTheDocument();
    expect(authAPI.acceptInvitation).not.toHaveBeenCalled();

    // Mismatched passwords
    fireEvent.change(passInputs[0], { target: { value: "Password123!" } });
    fireEvent.change(passInputs[1], { target: { value: "MismatchPass123!" } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(authAPI.acceptInvitation).not.toHaveBeenCalled();
  });

  test("submits valid activation data and displays success confirmation", async () => {
    authAPI.validateInvitation.mockResolvedValue(mockInvitationData);
    authAPI.acceptInvitation.mockResolvedValue({
      data: {
        success: true,
        token: "jwt-token-123",
        message: "Account activated successfully.",
      },
    });

    renderPage();

    await screen.findByText("Hospital Staff Invitation");

    const passInputs = screen.getAllByPlaceholderText(/min 6 characters|confirm password/i);
    fireEvent.change(passInputs[0], { target: { value: "SecurePass123!" } });
    fireEvent.change(passInputs[1], { target: { value: "SecurePass123!" } });

    const submitBtn = screen.getByRole("button", { name: /activate account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authAPI.acceptInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "validtoken123",
          password: "SecurePass123!",
        })
      );
    });

    expect(await screen.findByText("Welcome to Vaidyasthana!")).toBeInTheDocument();
    expect(screen.getByText(/Your account has been activated successfully/i)).toBeInTheDocument();
  });
});

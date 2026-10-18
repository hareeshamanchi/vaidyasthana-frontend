import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ResetPasswordPage from "./ResetPasswordPage";
import { authAPI } from "../services/api";

jest.mock("../services/api", () => ({
  authAPI: {
    validateResetToken: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

describe("ResetPasswordPage Component Suite", () => {
  const validToken = "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRoute = (initialPath, routePath = "/reset-password/:token") => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={routePath} element={<ResetPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<div>Forgot Password Screen</div>} />
          <Route path="/" element={<div>Homepage</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  test("1. Direct route loading with valid token extracts token and shows reset form", async () => {
    authAPI.validateResetToken.mockResolvedValueOnce({
      data: { success: true, message: "Password reset token is valid." },
    });

    renderWithRoute(`/reset-password/${validToken}`);

    // Loading state is shown initially
    expect(screen.getByText("Validating Security Token")).toBeInTheDocument();

    // After validation, reset form renders
    await waitFor(() => {
      expect(authAPI.validateResetToken).toHaveBeenCalledWith(validToken);
      expect(screen.getByText("Create New Password")).toBeInTheDocument();
      expect(screen.getByLabelText("New Password *")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirm New Password *")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Reset Password/i })).toBeInTheDocument();
    });
  });

  test("2. Direct route loading with token in query param validates and renders form", async () => {
    authAPI.validateResetToken.mockResolvedValueOnce({
      data: { success: true, message: "Password reset token is valid." },
    });

    renderWithRoute(`/reset-password?token=${validToken}`, "/reset-password");

    await waitFor(() => {
      expect(authAPI.validateResetToken).toHaveBeenCalledWith(validToken);
      expect(screen.getByText("Create New Password")).toBeInTheDocument();
    });
  });

  test("3. Missing token shows error state with link to request new link", async () => {
    renderWithRoute("/reset-password", "/reset-password");

    await waitFor(() => {
      expect(screen.getByText("Invalid or Expired Link")).toBeInTheDocument();
      expect(
        screen.getByText("No password reset token was provided in the link.")
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Request a New Reset Link/i })).toBeInTheDocument();
    });

    expect(authAPI.validateResetToken).not.toHaveBeenCalled();
  });

  test("4. Invalid or expired token displays error message and 15-minute security notice", async () => {
    authAPI.validateResetToken.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          message: "This password reset link is invalid, expired, or has already been used.",
        },
      },
    });

    renderWithRoute(`/reset-password/expired-or-used-token`);

    await waitFor(() => {
      expect(screen.getByText("Invalid or Expired Link")).toBeInTheDocument();
      expect(
        screen.getByText("This password reset link is invalid, expired, or has already been used.")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/password reset tokens are strictly single-use and expire 15 minutes/i)
      ).toBeInTheDocument();
    });
  });

  test("5. Validates matching passwords and enforces minimum length", async () => {
    authAPI.validateResetToken.mockResolvedValueOnce({
      data: { success: true },
    });

    renderWithRoute(`/reset-password/${validToken}`);

    await waitFor(() => {
      expect(screen.getByText("Create New Password")).toBeInTheDocument();
    });

    const newPassInput = screen.getByLabelText("New Password *");
    const confirmPassInput = screen.getByLabelText("Confirm New Password *");
    const submitBtn = screen.getByRole("button", { name: /Reset Password/i });

    // Submit button should be disabled initially
    expect(submitBtn).toBeDisabled();

    // Enter short password
    fireEvent.change(newPassInput, { target: { value: "123" } });
    fireEvent.change(confirmPassInput, { target: { value: "123" } });
    expect(submitBtn).toBeDisabled();

    // Enter mismatched password
    fireEvent.change(newPassInput, { target: { value: "Secret@123" } });
    fireEvent.change(confirmPassInput, { target: { value: "Different@123" } });
    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Enter matching valid password
    fireEvent.change(confirmPassInput, { target: { value: "Secret@123" } });
    expect(screen.getByText(/Passwords match/i)).toBeInTheDocument();
    expect(submitBtn).toBeEnabled();
  });

  test("6. Successfully submits new password and displays completion screen with sign-in link", async () => {
    authAPI.validateResetToken.mockResolvedValueOnce({
      data: { success: true },
    });
    authAPI.resetPassword.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Your password has been reset successfully. You can now sign in with your new credentials.",
      },
    });

    renderWithRoute(`/reset-password/${validToken}`);

    await waitFor(() => {
      expect(screen.getByText("Create New Password")).toBeInTheDocument();
    });

    const newPassInput = screen.getByLabelText("New Password *");
    const confirmPassInput = screen.getByLabelText("Confirm New Password *");
    const submitBtn = screen.getByRole("button", { name: /Reset Password/i });

    fireEvent.change(newPassInput, { target: { value: "NewSecurePassword123!" } });
    fireEvent.change(confirmPassInput, { target: { value: "NewSecurePassword123!" } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authAPI.resetPassword).toHaveBeenCalledWith(validToken, "NewSecurePassword123!");
      expect(screen.getByText("Password Reset Complete")).toBeInTheDocument();
      expect(
        screen.getByText(/Your single-use reset token has been invalidated/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Return to Homepage & Sign In/i })
      ).toHaveAttribute("href", "/?auth=login");
    });
  });

  test("7. Displays server error message if password submission fails", async () => {
    authAPI.validateResetToken.mockResolvedValueOnce({
      data: { success: true },
    });
    authAPI.resetPassword.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          message: "Password reset token has expired. Please request a new link.",
        },
      },
    });

    renderWithRoute(`/reset-password/${validToken}`);

    await waitFor(() => {
      expect(screen.getByText("Create New Password")).toBeInTheDocument();
    });

    const newPassInput = screen.getByLabelText("New Password *");
    const confirmPassInput = screen.getByLabelText("Confirm New Password *");
    const submitBtn = screen.getByRole("button", { name: /Reset Password/i });

    fireEvent.change(newPassInput, { target: { value: "NewSecurePassword123!" } });
    fireEvent.change(confirmPassInput, { target: { value: "NewSecurePassword123!" } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText("Password reset token has expired. Please request a new link.")
      ).toBeInTheDocument();
    });
  });
});

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import BMIPopup from "../components/BMIPopup";
import AuthModal from "../components/AuthModal";
import Home from "../components/Home";
import DietResultPage from "./DietResultPage";
import Contact from "./Contact";
import UploadProgressCard from "../components/UploadProgressCard";
import DoctorDashboard from "./DoctorDashboard";
import AdminDashboard from "./AdminDashboard";
import ForgotPasswordPage from "./ForgotPasswordPage";
import ResetPasswordPage from "./ResetPasswordPage";
import { AuthContext } from "../context/AuthContext";

describe("Vaidyasthana Healthcare Modules Test Suite", () => {
  test("BMIPopup calculates correct BMI category and shows screening disclaimer", () => {
    const handleClose = jest.fn();
    render(<BMIPopup onClose={handleClose} />);

    expect(screen.getByText(/Body Mass Index \(BMI\) Calculator/i)).toBeInTheDocument();

    const heightInput = screen.getByPlaceholderText(/175/i);
    const weightInput = screen.getByPlaceholderText(/70/i);

    fireEvent.change(heightInput, { target: { value: "180" } });
    fireEvent.change(weightInput, { target: { value: "72" } });

    const calcButton = screen.getByText(/Calculate BMI/i);
    fireEvent.click(calcButton);

    // 72 / (1.8 * 1.8) = 22.2 (Normal weight)
    expect(screen.getByText(/22.2/i)).toBeInTheDocument();
    expect(screen.getByText(/Normal weight/i)).toBeInTheDocument();
    expect(screen.getByText(/Screening Disclaimer/i)).toBeInTheDocument();
  });

  test("DietResultPage computes nutritional targets and displays clinical disclaimer", async () => {
    render(<DietResultPage />);

    expect(screen.getByText(/AI-Assisted Nutrition & Diet Advisor/i)).toBeInTheDocument();
    expect(screen.getByText(/Nutritional Safety Disclaimer/i)).toBeInTheDocument();

    const computeBtn = screen.getByRole("button", { name: /Compute Nutrition Plan/i });
    fireEvent.click(computeBtn);

    expect(await screen.findByText(/Target Energy/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Protein/i)).toBeInTheDocument();
    expect(screen.getByText(/Structured Daily Meal Routine/i)).toBeInTheDocument();
  });

  test("Contact page renders clinical inquiry form and support coordinates", () => {
    render(<Contact />);

    expect(screen.getByText(/Contact Vaidyasthana Healthcare Support/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Rahul Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Healthcare Support Desk/i)).toBeInTheDocument();
  });

  test("UploadProgressCard renders 6 stages, file preview, and live AI notice", () => {
    const dummyFile = new File(["test data"], "blood_test_cbc.pdf", { type: "application/pdf" });
    render(
      <BrowserRouter>
        <UploadProgressCard
          files={[dummyFile]}
          currentStage="AI is analyzing your report"
          uploadProgress={100}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/blood_test_cbc\.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/Extracting text from your document/i)).toBeInTheDocument();
    expect(screen.getAllByText(/AI is analyzing your report/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/AI is analyzing your report\. This may take a little while\./i)
    ).toBeInTheDocument();
  });

  test("UploadProgressCard renders error state with recoverable retry button", () => {
    const handleRetry = jest.fn();
    render(
      <BrowserRouter>
        <UploadProgressCard
          files={[{ name: "scan.png", size: 1024 }]}
          currentStage="Uploading your medical report"
          error="Network timeout reaching Azure AI"
          onRetry={handleRetry}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/Upload or Analysis Interrupted/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Network timeout reaching Azure AI/i).length).toBeGreaterThan(0);

    const retryBtn = screen.getByRole("button", { name: /Retry Upload/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  test("AuthModal renders centered viewport dialog with tabs, role switcher, and Escape support", () => {
    const handleClose = jest.fn();
    render(
      <AuthProvider>
        <AuthModal type="login" onClose={handleClose} />
      </AuthProvider>
    );

    // Verify Login Mode
    expect(screen.getByText(/Welcome Back to Vaidyasthana/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name@example\.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In to Health Vault/i })).toBeInTheDocument();

    // Verify Tab Switch to Registration
    const registerTab = screen.getByRole("button", { name: /New Patient \/ Doctor/i });
    fireEvent.click(registerTab);

    expect(screen.getByText(/Create Your Clinical Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Account Role:/i)).toBeInTheDocument();
    expect(screen.getByText(/Physician \/ Doctor/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();

    // Verify Close button
    const closeBtn = screen.getByTitle(/Close Dialog/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Verify Escape key trigger
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  test("Home component renders hero, trust badge, and showcase carousel without layout clip", () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText(/Azure Cloud Vault & Clinical AI Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome to Vaidyasthana/i)).toBeInTheDocument();
    expect(screen.getByText(/Medical Interface Showcase/i)).toBeInTheDocument();
    expect(screen.getByText(/Clinical Records Visualization Showcase/i)).toBeInTheDocument();

    // Verify Prev/Next preview buttons
    const prevBtn = screen.getByRole("button", { name: /Previous preview/i });
    const nextBtn = screen.getByRole("button", { name: /Next preview/i });
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
  });

  test("DoctorDashboard renders physician workspace, patient lookup, and clinical upload panel with patient enforcement", () => {
    const doctorUser = { id: "doc123", name: "Dr. Clinician", role: "doctor" };
    localStorage.setItem("user", JSON.stringify(doctorUser));

    render(
      <AuthProvider>
        <BrowserRouter>
          <DoctorDashboard />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText(/Clinician & Doctor Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient Record Lookup/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter Patient ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Medical Report for Patient/i)).toBeInTheDocument();
    expect(screen.getByText(/Select a patient above to enable report upload/i)).toBeInTheDocument();
    expect(screen.getByText(/Please enter a Patient ID in the lookup bar/i)).toBeInTheDocument();

    // Verify lookup button
    const lookupBtn = screen.getByRole("button", { name: /Retrieve Health Vault/i });
    expect(lookupBtn).toBeInTheDocument();

    // Verify Audit button
    const auditBtn = screen.getByRole("button", { name: /Audit Records/i });
    expect(auditBtn).toBeInTheDocument();
  });

  test("AdminDashboard renders access denied card for non-admin user", () => {
    const patientUser = { id: "pat123", name: "Patient Doe", role: "patient" };
    render(
      <AuthContext.Provider value={{ user: patientUser, loading: false }}>
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText(/Restricted Administrative Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/authorized hospital administrators/i)).toBeInTheDocument();
  });

  test("AdminDashboard renders credentialing workspace, platform metrics, and tab controls for admin", () => {
    const adminUser = { id: "admin123", name: "Compliance Admin", role: "admin" };
    render(
      <AuthContext.Provider value={{ user: adminUser, loading: false }}>
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText(/Hospital Medical Council Administration/i)).toBeInTheDocument();
    expect(screen.getByText(/Clinician Credentialing & Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified Clinicians/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh Records/i })).toBeInTheDocument();
  });

  test("AuthModal renders clearly visible Forgot Password link in Sign In view and switches to password recovery mode", () => {
    const handleClose = jest.fn();
    render(
      <AuthProvider>
        <AuthModal type="login" onClose={handleClose} />
      </AuthProvider>
    );

    const forgotBtn = screen.getByRole("button", { name: /Forgot Password\?/i });
    expect(forgotBtn).toBeInTheDocument();

    fireEvent.click(forgotBtn);

    expect(screen.getByText(/Reset Your Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Password Recovery/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send Reset Link/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Return to Sign In/i })).toBeInTheDocument();
  });

  test("ForgotPasswordPage renders email input form and return link", () => {
    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    expect(screen.getByRole("heading", { name: /Reset Your Password/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send Reset Link/i })).toBeInTheDocument();
    expect(screen.getByText(/Return to Homepage & Sign In/i)).toBeInTheDocument();
  });

  test("ResetPasswordPage handles missing token state gracefully", async () => {
    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );

    expect(await screen.findByText(/Invalid or Expired Link/i)).toBeInTheDocument();
    expect(screen.getByText(/Request a New Reset Link/i)).toBeInTheDocument();
  });
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DoctorPrescriptionModal from "./DoctorPrescriptionModal";
import { prescriptionsAPI } from "../services/api";

jest.mock("../services/api", () => ({
  prescriptionsAPI: {
    createPrescription: jest.fn(),
  },
}));

describe("DoctorPrescriptionModal Component", () => {
  const mockOnClose = jest.fn();
  const mockOnCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not render when isOpen is false", () => {
    const { container } = render(
      <DoctorPrescriptionModal
        isOpen={false}
        onClose={mockOnClose}
        onPrescriptionCreated={mockOnCreated}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test("renders prescription authoring modal with prefill consultation info", () => {
    render(
      <DoctorPrescriptionModal
        isOpen={true}
        onClose={mockOnClose}
        onPrescriptionCreated={mockOnCreated}
        prefillData={{
          patientId: "patient-1",
          patientName: "Hareesh Amanchi",
          patientPhone: "+919876543210",
          appointmentId: "appt-999",
          reason: "Persistent Cough and Fever",
        }}
      />
    );

    expect(screen.getByText(/Author & Sign Medical Prescription/i)).toBeInTheDocument();
    expect(screen.getByText("Hareesh Amanchi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Persistent Cough and Fever")).toBeInTheDocument();
    expect(
      screen.getByText(/Mandatory Clinician Sign-Off & Legal Authorization/i)
    ).toBeInTheDocument();
  });

  test("submit button is disabled unless clinician sign-off checkbox is checked", () => {
    render(
      <DoctorPrescriptionModal
        isOpen={true}
        onClose={mockOnClose}
        onPrescriptionCreated={mockOnCreated}
        prefillData={{
          patientId: "patient-1",
          patientName: "Hareesh Amanchi",
        }}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Issue & Digitally Sign Rx/i });
    expect(submitBtn).toBeDisabled();

    const signCheckbox = screen.getByRole("checkbox");
    fireEvent.click(signCheckbox);

    expect(submitBtn).not.toBeDisabled();
  });

  test("fills medication and submits signed prescription", async () => {
    prescriptionsAPI.createPrescription.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Prescription issued successfully",
        prescription: {
          _id: "rx-new-123",
          prescriptionNumber: "RX-20261021-5555",
        },
      },
    });

    render(
      <DoctorPrescriptionModal
        isOpen={true}
        onClose={mockOnClose}
        onPrescriptionCreated={mockOnCreated}
        prefillData={{
          patientId: "patient-1",
          patientName: "Hareesh Amanchi",
          appointmentId: "appt-999",
        }}
      />
    );

    // Diagnosis
    const diagInput = screen.getByPlaceholderText(/e\.g\. Acute Bronchitis/i);
    fireEvent.change(diagInput, { target: { value: "Acute Pharyngitis" } });

    // Medication 1
    const medNameInput = screen.getByPlaceholderText(/e\.g\. Amoxicillin, Paracetamol/i);
    fireEvent.change(medNameInput, { target: { value: "Azithromycin" } });

    const medDosageInput = screen.getByPlaceholderText(/e\.g\. 500, 625/i);
    fireEvent.change(medDosageInput, { target: { value: "500" } });

    // Sign off
    const signCheckbox = screen.getByRole("checkbox");
    fireEvent.click(signCheckbox);

    const submitBtn = screen.getByRole("button", { name: /Issue & Digitally Sign Rx/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(prescriptionsAPI.createPrescription).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "patient-1",
          diagnosis: "Acute Pharyngitis",
          isSigned: true,
          medications: expect.arrayContaining([
            expect.objectContaining({
              name: "Azithromycin",
              dosage: "500",
            }),
          ]),
        })
      );
      expect(mockOnCreated).toHaveBeenCalled();
    });
  });
});

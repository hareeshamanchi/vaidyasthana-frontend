import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import PatientPrescriptions from "./PatientPrescriptions";
import { prescriptionsAPI } from "../services/api";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../services/api", () => ({
  prescriptionsAPI: {
    getPrescriptions: jest.fn(),
    downloadPDF: jest.fn(),
    createReminders: jest.fn(),
  },
}));

const mockPrescriptions = [
  {
    _id: "rx-101",
    prescriptionNumber: "MITS-20261021-1001",
    doctorName: "Dr. Jeshu",
    doctorSpecialization: "General Medicine",
    doctorQualifications: "MBBS, MD",
    doctorRegistrationNumber: "MCI-98765",
    hospitalName: "MITS College Hospital",
    patientName: "Hareesh Amanchi",
    diagnosis: "Acute Bronchitis",
    createdAt: "2026-10-21T10:00:00.000Z",
    status: "active",
    vitals: {
      bloodPressure: "120/80",
      pulseRate: "72",
      temperature: "98.6 F",
      spo2: "99",
    },
    medications: [
      {
        name: "Amoxicillin & Clavulanate",
        dosage: "625",
        dosageUnit: "mg",
        route: "Oral",
        frequency: "twice_daily",
        timing: "after_food",
        duration: "5 days",
        instructions: "Complete entire course",
      },
      {
        name: "Paracetamol",
        dosage: "650",
        dosageUnit: "mg",
        route: "Oral",
        frequency: "thrice_daily",
        timing: "after_food",
        duration: "3 days",
        instructions: "Take SOS for fever",
      },
    ],
    generalInstructions: "Drink plenty of warm fluids and rest.",
    followUpDate: "2026-10-28T00:00:00.000Z",
    isSigned: true,
    signedAt: "2026-10-21T10:05:00.000Z",
  },
];

describe("PatientPrescriptions Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders empty state when no prescriptions exist", async () => {
    prescriptionsAPI.getPrescriptions.mockResolvedValueOnce({
      data: { success: true, count: 0, prescriptions: [] },
    });

    render(
      <BrowserRouter>
        <PatientPrescriptions />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No digital prescriptions issued yet/i)
      ).toBeInTheDocument();
    });
  });

  test("renders prescription card with details, doctor, and medications", async () => {
    prescriptionsAPI.getPrescriptions.mockResolvedValueOnce({
      data: { success: true, count: 1, prescriptions: mockPrescriptions },
    });

    render(
      <BrowserRouter>
        <PatientPrescriptions />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("MITS-20261021-1001")).toBeInTheDocument();
      expect(screen.getByText("Acute Bronchitis")).toBeInTheDocument();
      expect(screen.getByText("Dr. Jeshu")).toBeInTheDocument();
      expect(screen.getByText("MITS College Hospital")).toBeInTheDocument();
      expect(screen.getByText(/Amoxicillin & Clavulanate/i)).toBeInTheDocument();
    });
  });

  test("clicking Download PDF triggers downloadPDF API", async () => {
    prescriptionsAPI.getPrescriptions.mockResolvedValueOnce({
      data: { success: true, count: 1, prescriptions: mockPrescriptions },
    });
    prescriptionsAPI.downloadPDF.mockResolvedValueOnce(true);

    render(
      <BrowserRouter>
        <PatientPrescriptions />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("MITS-20261021-1001")).toBeInTheDocument();
    });

    const downloadBtn = screen.getByRole("button", { name: /Download PDF/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(prescriptionsAPI.downloadPDF).toHaveBeenCalledWith(
        "rx-101",
        "Prescription-MITS-20261021-1001.pdf"
      );
    });
  });

  test("clicking Set Reminders calls createReminders API and displays success status", async () => {
    prescriptionsAPI.getPrescriptions.mockResolvedValueOnce({
      data: { success: true, count: 1, prescriptions: mockPrescriptions },
    });
    prescriptionsAPI.createReminders.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Successfully scheduled 2 medication reminders from your prescription.",
        count: 2,
      },
    });

    render(
      <BrowserRouter>
        <PatientPrescriptions />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("MITS-20261021-1001")).toBeInTheDocument();
    });

    const reminderBtn = screen.getByRole("button", { name: /Set Reminders/i });
    fireEvent.click(reminderBtn);

    await waitFor(() => {
      expect(prescriptionsAPI.createReminders).toHaveBeenCalledWith("rx-101");
      expect(
        screen.getByText(/Successfully scheduled 2 medication reminders/i)
      ).toBeInTheDocument();
    });
  });

  test("opens and closes View Rx modal", async () => {
    prescriptionsAPI.getPrescriptions.mockResolvedValueOnce({
      data: { success: true, count: 1, prescriptions: mockPrescriptions },
    });

    render(
      <BrowserRouter>
        <PatientPrescriptions />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("MITS-20261021-1001")).toBeInTheDocument();
    });

    const viewBtn = screen.getByRole("button", { name: /View Rx/i });
    fireEvent.click(viewBtn);

    expect(screen.getByText("Medical Prescription")).toBeInTheDocument();
    expect(
      screen.getByText(/Drink plenty of warm fluids and rest/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Digitally Signed & Clinically Verified/i)
    ).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);

    expect(screen.queryByText("Medical Prescription")).not.toBeInTheDocument();
  });
});

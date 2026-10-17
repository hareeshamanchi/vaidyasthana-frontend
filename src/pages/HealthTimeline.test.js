import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HealthTimeline from "./HealthTimeline";
import { AuthContext } from "../context/AuthContext";
import { timelineAPI, reportsAPI, doctorAPI } from "../services/api";

jest.mock("../services/api", () => ({
  timelineAPI: {
    getTimeline: jest.fn(),
    getPatientTimeline: jest.fn(),
  },
  reportsAPI: {
    viewReport: jest.fn(),
  },
  doctorAPI: {
    getPatients: jest.fn(),
  },
}));

const testNow = new Date();
const testCurMin = testNow.getHours() * 60 + testNow.getMinutes();
const testActiveMin = Math.max(0, testCurMin - 5);
const testH24 = Math.floor(testActiveMin / 60);
const testM = testActiveMin % 60;
const testMod = testH24 >= 12 ? "PM" : "AM";
let testH12 = testH24 % 12;
if (testH12 === 0) testH12 = 12;
const testActiveSlot = `${String(testH12).padStart(2, "0")}:${String(testM).padStart(2, "0")} ${testMod}`;

const mockPatient = {
  _id: "60c72b2f9b1d8b2bad0000a1",
  id: "60c72b2f9b1d8b2bad0000a1",
  name: "Ramesh Kumar",
  email: "ramesh@example.com",
  phoneNumber: "+91 9876543210",
  bloodGroup: "O+",
  gender: "Male",
  address: "123 MG Road, Bengaluru",
};

const mockTimelineData = {
  success: true,
  patient: mockPatient,
  metrics: {
    totalRecords: 2,
    totalReports: 1,
    totalAppointments: 1,
    abnormalBiomarkersCount: 2,
    upcomingAppointmentsCount: 1,
  },
  availableCategories: ["Blood Report"],
  availableStatuses: ["Scheduled"],
  timeline: [
    {
      id: "report-101",
      recordType: "report",
      date: new Date("2026-10-15T09:00:00Z"),
      title: "Comprehensive Metabolic Panel.pdf",
      fileName: "Comprehensive Metabolic Panel.pdf",
      originalName: "Comprehensive Metabolic Panel.pdf",
      category: "Blood Report",
      fileType: "application/pdf",
      fileSize: 154000,
      notes: "Annual clinical health screening",
      uploadedByRole: "doctor",
      uploaderName: "Dr. Sharma",
      analysisStatus: "Completed",
      hasBiomarkers: true,
      aiAnalysis: {
        summary: "Elevated fasting blood sugar and cholesterol observed.",
        severity: "High",
        abnormalParameters: [
          {
            parameter: "Fasting Blood Glucose",
            value: "142 mg/dL",
            normalRange: "70 - 99 mg/dL",
            status: "High",
            reason: "Impaired glucose metabolism indicative of prediabetes.",
          },
          {
            parameter: "Total Cholesterol",
            value: "250 mg/dL",
            normalRange: "125 - 200 mg/dL",
            status: "High",
            reason: "Hypercholesterolemia requiring lipid management.",
          },
        ],
        possibleDiseases: ["Prediabetes", "Hyperlipidemia"],
        recommendations: ["Dietary modification", "Daily exercise"],
      },
      abnormalParameters: [
        {
          parameter: "Fasting Blood Glucose",
          value: "142 mg/dL",
          normalRange: "70 - 99 mg/dL",
          status: "High",
          reason: "Impaired glucose metabolism indicative of prediabetes.",
        },
        {
          parameter: "Total Cholesterol",
          value: "250 mg/dL",
          normalRange: "125 - 200 mg/dL",
          status: "High",
          reason: "Hypercholesterolemia requiring lipid management.",
        },
      ],
      possibleDiseases: ["Prediabetes", "Hyperlipidemia"],
      recommendations: ["Dietary modification", "Daily exercise"],
      severity: "High",
      viewEndpoint: "/upload/view/report-101",
    },
    {
      id: "appt-201",
      recordType: "appointment",
      date: testNow,
      title: "Cardiology Consultation",
      doctorName: "Dr. Sharma",
      doctorId: "60c72b2f9b1d8b2bad0000d1",
      patientName: "Ramesh Kumar",
      patientId: "60c72b2f9b1d8b2bad0000a1",
      department: "Cardiology",
      timeSlot: testActiveSlot,
      status: "Scheduled",
      consultationType: "Video / Online",
      reason: "Follow-up review of lipid profile results",
      notes: "Please have previous ECG reports accessible during video call.",
      meetingRoomId: "vaidya-room-test-101",
      isUpcoming: true,
    },
  ],
  milestones: [
    {
      period: "October 2026",
      year: 2026,
      month: "October",
      count: 2,
      items: [
        {
          id: "report-101",
          recordType: "report",
          date: new Date("2026-10-15T09:00:00Z"),
          title: "Comprehensive Metabolic Panel.pdf",
          fileName: "Comprehensive Metabolic Panel.pdf",
          originalName: "Comprehensive Metabolic Panel.pdf",
          category: "Blood Report",
          fileType: "application/pdf",
          fileSize: 154000,
          notes: "Annual clinical health screening",
          uploadedByRole: "doctor",
          uploaderName: "Dr. Sharma",
          analysisStatus: "Completed",
          hasBiomarkers: true,
          aiAnalysis: {
            summary: "Elevated fasting blood sugar and cholesterol observed.",
            severity: "High",
            abnormalParameters: [
              {
                parameter: "Fasting Blood Glucose",
                value: "142 mg/dL",
                normalRange: "70 - 99 mg/dL",
                status: "High",
                reason: "Impaired glucose metabolism indicative of prediabetes.",
              },
              {
                parameter: "Total Cholesterol",
                value: "250 mg/dL",
                normalRange: "125 - 200 mg/dL",
                status: "High",
                reason: "Hypercholesterolemia requiring lipid management.",
              },
            ],
            possibleDiseases: ["Prediabetes", "Hyperlipidemia"],
            recommendations: ["Dietary modification", "Daily exercise"],
          },
          abnormalParameters: [
            {
              parameter: "Fasting Blood Glucose",
              value: "142 mg/dL",
              normalRange: "70 - 99 mg/dL",
              status: "High",
              reason: "Impaired glucose metabolism indicative of prediabetes.",
            },
            {
              parameter: "Total Cholesterol",
              value: "250 mg/dL",
              normalRange: "125 - 200 mg/dL",
              status: "High",
              reason: "Hypercholesterolemia requiring lipid management.",
            },
          ],
          possibleDiseases: ["Prediabetes", "Hyperlipidemia"],
          recommendations: ["Dietary modification", "Daily exercise"],
          severity: "High",
          viewEndpoint: "/upload/view/report-101",
        },
        {
          id: "appt-201",
          recordType: "appointment",
          date: testNow,
          title: "Cardiology Consultation",
          doctorName: "Dr. Sharma",
          doctorId: "60c72b2f9b1d8b2bad0000d1",
          patientName: "Ramesh Kumar",
          patientId: "60c72b2f9b1d8b2bad0000a1",
          department: "Cardiology",
          timeSlot: testActiveSlot,
          status: "Scheduled",
          consultationType: "Video / Online",
          reason: "Follow-up review of lipid profile results",
          notes: "Please have previous ECG reports accessible during video call.",
          meetingRoomId: "vaidya-room-test-101",
          isUpcoming: true,
        },
      ],
    },
  ],
};

const renderWithContext = (ui, authValue) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthContext.Provider>
  );
};

describe("HealthTimeline Component Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Renders patient identity dossier and executive metrics ribbon", async () => {
    timelineAPI.getTimeline.mockResolvedValueOnce({ data: mockTimelineData });

    renderWithContext(<HealthTimeline />, {
      user: { id: "60c72b2f9b1d8b2bad0000a1", role: "patient", name: "Ramesh Kumar" },
      loading: false,
    });

    expect(screen.getByText(/Loading Chronological Health Timeline/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Ramesh Kumar")).toBeInTheDocument();
    });

    // Blood group chip
    expect(screen.getByText(/Blood:/i)).toBeInTheDocument();
    expect(screen.getByText(/O\+/i)).toBeInTheDocument();

    // Metric tiles
    expect(screen.getByText("Total Events")).toBeInTheDocument();
    expect(screen.getByText("Diagnostic Reports")).toBeInTheDocument();
    expect(screen.getByText(/Consultations \(1 upcoming\)/i)).toBeInTheDocument();
    expect(screen.getByText("Biomarker Flags")).toBeInTheDocument();
  });

  test("Renders chronological milestone header and report card with AI interpretation", async () => {
    timelineAPI.getTimeline.mockResolvedValueOnce({ data: mockTimelineData });

    renderWithContext(<HealthTimeline />, {
      user: { id: "60c72b2f9b1d8b2bad0000a1", role: "patient", name: "Ramesh Kumar" },
      loading: false,
    });

    await waitFor(() => {
      expect(screen.getByText("October 2026")).toBeInTheDocument();
    });

    // Report card
    expect(screen.getByText("Comprehensive Metabolic Panel.pdf")).toBeInTheDocument();
    expect(screen.getByText("Uploaded by Dr. Sharma")).toBeInTheDocument();
    expect(screen.getByText(/Azure AI Clinical Interpretation/i)).toBeInTheDocument();
    expect(screen.getByText(/Severity: High/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Elevated fasting blood sugar and cholesterol observed/i)
    ).toBeInTheDocument();

    // Biomarkers toggle accordion
    const toggleBtn = screen.getByRole("button", { name: /2 Abnormal Biomarkers Flagged/i });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);

    // Verify abnormal parameters table opens
    expect(screen.getByText("Fasting Blood Glucose")).toBeInTheDocument();
    expect(screen.getByText("142 mg/dL")).toBeInTheDocument();
    expect(screen.getByText("Total Cholesterol")).toBeInTheDocument();
    expect(screen.getByText("250 mg/dL")).toBeInTheDocument();
  });

  test("Renders appointment card with consultation details and join video call button", async () => {
    timelineAPI.getTimeline.mockResolvedValueOnce({ data: mockTimelineData });

    renderWithContext(<HealthTimeline />, {
      user: { id: "60c72b2f9b1d8b2bad0000a1", role: "patient", name: "Ramesh Kumar" },
      loading: false,
    });

    await waitFor(() => {
      expect(screen.getByText("Cardiology Consultation")).toBeInTheDocument();
    });

    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(screen.getAllByText("Scheduled").length).toBeGreaterThan(0);
    expect(screen.getByText(/Follow-up review of lipid profile results/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Please have previous ECG reports accessible during video call/i)
    ).toBeInTheDocument();

    // Video action link
    const videoBtn = screen.getByRole("link", { name: /Join Video Consultation/i });
    expect(videoBtn).toBeInTheDocument();
    expect(videoBtn).toHaveAttribute("href", "/video-consultation/appt-201");
  });

  test("Doctor view renders clinician authorization badge and patient selector", async () => {
    doctorAPI.getPatients.mockResolvedValueOnce({
      data: {
        patients: [mockPatient],
      },
    });
    timelineAPI.getTimeline.mockResolvedValueOnce({ data: mockTimelineData });

    renderWithContext(<HealthTimeline />, {
      user: { id: "60c72b2f9b1d8b2bad0000d1", role: "doctor", name: "Dr. Sharma" },
      loading: false,
    });

    await waitFor(() => {
      expect(screen.getByText(/Clinically Authorized/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Authorized Patient:/i)).toBeInTheDocument();
    expect(screen.getByText(/Back to Doctor Dashboard/i)).toBeInTheDocument();
  });

  test("Clicking 'Open Secure Document' calls reportsAPI.viewReport and handles SAS link", async () => {
    timelineAPI.getTimeline.mockResolvedValueOnce({ data: mockTimelineData });
    reportsAPI.viewReport.mockResolvedValueOnce({
      data: { url: "https://vaidyasthana.blob.core.windows.net/test.pdf?sv=2021" },
    });

    window.open = jest.fn();

    renderWithContext(<HealthTimeline />, {
      user: { id: "60c72b2f9b1d8b2bad0000a1", role: "patient", name: "Ramesh Kumar" },
      loading: false,
    });

    await waitFor(() => {
      expect(screen.getByText("Comprehensive Metabolic Panel.pdf")).toBeInTheDocument();
    });

    const openDocBtn = screen.getByRole("button", { name: /Open Secure Document/i });
    fireEvent.click(openDocBtn);

    await waitFor(() => {
      expect(reportsAPI.viewReport).toHaveBeenCalledWith("report-101");
      expect(window.open).toHaveBeenCalledWith(
        "https://vaidyasthana.blob.core.windows.net/test.pdf?sv=2021",
        "_blank",
        "noopener,noreferrer"
      );
    });
  });

  test("Filter tabs correctly filter timeline by record type", async () => {
    timelineAPI.getTimeline.mockResolvedValue({ data: mockTimelineData });

    renderWithContext(<HealthTimeline />, {
      user: { id: "60c72b2f9b1d8b2bad0000a1", role: "patient", name: "Ramesh Kumar" },
      loading: false,
    });

    await waitFor(() => {
      expect(screen.getByText("Comprehensive Metabolic Panel.pdf")).toBeInTheDocument();
    });

    const reportsTab = screen.getByRole("button", { name: /Reports \(1\)/i });
    fireEvent.click(reportsTab);

    await waitFor(() => {
      expect(timelineAPI.getTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ type: "reports" })
      );
    });
  });
});

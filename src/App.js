import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./components/Home";

import AIAnalysis from "./pages/AIAnalysis";
import Appointment from "./pages/Appointment";
import DietResultPage from "./pages/DietResultPage";
import Contact from "./pages/Contact";
import InsurancePage from "./pages/InsurancePage";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VideoConsultation from "./pages/VideoConsultation";

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<PatientDashboard />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/ai-analysis" element={<AIAnalysis />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/appointments" element={<Appointment />} />
          <Route path="/consultation/:id" element={<VideoConsultation />} />
          <Route path="/video-consultation/:id" element={<VideoConsultation />} />
          <Route path="/diet" element={<DietResultPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/insurance" element={<InsurancePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>

        <Footer />
      </div>
    </Router>
  );
}

export default App;

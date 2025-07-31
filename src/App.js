import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import AIAnalysis from './pages/AIAnalysis';
import Appointment from './pages/Appointment';
import Footer from './components/Footer';
import DietResultPage from './pages/DietResultPage';
import Contact from './pages/Contact';
import InsurancePage from './pages/InsurancePage';
import PatientDashboard from './pages/PatientDashboard'; // Import the new dashboard

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<PatientDashboard />} /> {/* Add dashboard route */}
          <Route path="/ai-analysis" element={<AIAnalysis />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/diet" element={<DietResultPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/insurance" element={<InsurancePage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import AIAnalysis from './pages/AIAnalysis';
import Appointment from './pages/Appointment';
import Footer from './components/Footer';
import DietResultPage from './pages/DietResultPage';  // Ensure correct import
import Contact from './pages/Contact'; // Import the Contact component
import InsurancePage from './pages/InsurancePage';  // Import the InsurancePage

function App() {
  const handleLogin = () => {
    console.log("Login Modal Triggered");
  };

  const handleSignup = () => {
    console.log("Signup Modal Triggered");
  };

  return (
    <Router>
      <div className="App">
        <Navbar
          onOpenLogin={handleLogin}
          onOpenSignup={handleSignup}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ai-analysis" element={<AIAnalysis />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/diet" element={<DietResultPage />} /> {/* Corrected route */}
          <Route path="/contact" element={<Contact />} /> {/* Updated route */}
          <Route path="/insurance" element={<InsurancePage />} /> {/* Added Insurance route */}
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

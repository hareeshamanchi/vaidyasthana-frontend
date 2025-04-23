import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import AIAnalysis from './pages/AIAnalysis'; // import the AIAnalysis component

function App() {
  const handleLogin = () => {
    console.log("Login Modal Triggered");
    // Open modal or redirect to /login page
  };

  const handleSignup = () => {
    console.log("Signup Modal Triggered");
    // Open modal or redirect to /signup page
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
          <Route path="/ai-analysis" element={<AIAnalysis />} /> {/* Add AIAnalysis route */}
          {/* Future: add <Route path="/reports" element={<Reports />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;

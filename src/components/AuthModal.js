import React, { useState, useContext } from 'react';
// import { useNavigate } from 'react-router-dom'; // <--- REMOVED
import './AuthModal.css';
import { AuthContext } from '../context/AuthContext';

const AuthModal = ({ type, onClose, onLoginSuccess }) => {
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phoneNumber: '',
    address: '',
    rememberMe: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  // const navigate = useNavigate(); // <--- REMOVED

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        ...(type === 'register' && {
          name: formData.name,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
        }),
      };

      const res = await fetch(`http://localhost:5000/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setMessage(data.message || `${type === 'login' ? 'Login' : 'Signup'} successful!`);
        if (type === 'login') {
          login(data.user); // Update context with user data
        }
        
        setTimeout(() => {
          onLoginSuccess(data);
          onClose();
        }, 1500);

      } else {
        setError(data.message || 'An error occurred.');
      }
    } catch (err) {
      setLoading(false);
      setError('Server not reachable. Please try again later.');
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <button onClick={onClose} className="close-modal-btn" title="Close">&times;</button>
        <h2>{type === 'login' ? 'Login' : 'Create Your Patient Account'}</h2>

        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" required value={formData.password} onChange={handleChange} />
          </div>

          {type === 'register' && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" required value={formData.name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" name="phoneNumber" required value={formData.phoneNumber} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" name="address" required value={formData.address} onChange={handleChange} />
              </div>
            </>
          )}

          {type === 'login' && (
            <div className="form-group remember-me">
              <label>
                <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} />
                Remember me
              </label>
            </div>
          )}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Processing...' : type === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
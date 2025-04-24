import React, { useState } from 'react';
import './AuthModal.css';

const AuthModal = ({ type, onClose, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phoneNumber: '',
    address: '',
    specialization: '',
    role: 'patient',
    rememberMe: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
          specialization: formData.role === 'doctor' ? formData.specialization : undefined,
          role: formData.role,
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
        setMessage(`${type === 'login' ? 'Login' : 'Signup'} successful!`);
        if (formData.rememberMe) localStorage.setItem('user', JSON.stringify(data));
        onLoginSuccess(data);
        setTimeout(onClose, 1500); // Close modal after short delay
      } else {
        setError(data.message || data.error || 'Something went wrong');
      }
    } catch (err) {
      setLoading(false);
      setError('Server not reachable');
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <button onClick={onClose} className="close-modal-btn" title="Close">&times;</button>
        <h2>{type === 'login' ? 'Login' : 'Sign Up'}</h2>

        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {type === 'register' && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  name="phoneNumber"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>
              {formData.role === 'doctor' && (
                <div className="form-group">
                  <label>Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    required
                    value={formData.specialization}
                    onChange={handleChange}
                  />
                </div>
              )}
            </>
          )}

          <div className="form-group remember-me">
            <label>
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              Remember me
            </label>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Please wait...' : type === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;

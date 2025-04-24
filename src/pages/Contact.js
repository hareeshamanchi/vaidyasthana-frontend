import React, { useState } from 'react';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    query: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('We will get back to you soon. Thank you for your valuable information!');
    setFormData({ name: '', email: '', query: '' }); // Clear form after submission
  };

  return (
    <div className="contact-container">
      <h2>Contact Us</h2>
      <form onSubmit={handleSubmit} className="contact-form">
        <div className="form-group">
          <label>Name</label>
          <input type="text" name="name" required value={formData.name} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" name="email" required value={formData.email} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Query</label>
          <textarea name="query" required value={formData.query} onChange={handleChange}></textarea>
        </div>
        <button type="submit" className="submit-btn">Submit</button>
      </form>
    </div>
  );
};

export default Contact;
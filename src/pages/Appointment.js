// src/components/Appointment.js
import React, { useEffect, useState } from 'react';
import './Appointment.css';

const Appointment = () => {
  const [appointments, setAppointments] = useState([]);
  const [timer, setTimer] = useState(null);

  useEffect(() => {
    const fetchAppointments = () => {
      const mockAppointments = [
        {
          id: 1,
          date: new Date('2025-04-20T10:00:00'),
          type: 'Previous Appointment'
        },
        {
          id: 2,
          date: new Date('2025-04-25T10:00:00'),
          type: 'Next Appointment'
        }
      ];

      setAppointments(mockAppointments);

      const nextAppointment = mockAppointments.find(app => app.type === 'Next Appointment');
      if (nextAppointment) {
        const timeLeft = nextAppointment.date.getTime() - new Date().getTime();
        if (timeLeft > 0) {
          setTimer(timeLeft);
        }
      }
    };

    fetchAppointments();
  }, []);

  useEffect(() => {
    if (timer !== null) {
      const interval = setInterval(() => {
        setTimer(prevTimer => (prevTimer - 1000 > 0 ? prevTimer - 1000 : 0));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timer]);

  const formatTime = (timeInMillis) => {
    const days = Math.floor(timeInMillis / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeInMillis % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeInMillis % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeInMillis % (1000 * 60)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="appointments-container">
      <h2>Appointments</h2>

      <div className="appointment-item">
        <h3>{appointments[0]?.type}</h3>
        <p>Date: {appointments[0]?.date.toLocaleString()}</p>
      </div>

      <div className="appointment-item">
        <h3>{appointments[1]?.type}</h3>
        <p>Date: {appointments[1]?.date.toLocaleString()}</p>
        <p>
          {timer > 0 ? (
            <span className="time-left-floating">Time Left: {formatTime(timer)}</span>
          ) : (
            <span className="time-left-floating">Appointment is due now!</span>
          )}
        </p>
      </div>
    </div>
  );
};

export default Appointment;      
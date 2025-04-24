import React, { useState } from "react";
import "./BMIPopup.css";

const BMIPopup = ({ onClose }) => {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState(null);
  const [category, setCategory] = useState("");

  const calculateBMI = () => {
    if (!height || !weight) return;

    const h = height / 100;
    const result = (weight / (h * h)).toFixed(1);
    setBmi(result);

    let cat = "";
    if (result < 18.5) cat = "Underweight";
    else if (result >= 18.5 && result < 25) cat = "Normal weight";
    else if (result >= 25 && result < 30) cat = "Overweight";
    else cat = "Obese";

    setCategory(cat);
  };

  const resetForm = () => {
    setHeight("");
    setWeight("");
    setBmi(null);
    setCategory("");
  };

  return (
    <div className="bmi-modal-overlay">
      <div className="bmi-modal">
        <button className="close-modal-btn" onClick={onClose}>
          &times;
        </button>
        {!bmi ? (
          <>
            <h2>Check Your BMI</h2>
            <input
              type="number"
              placeholder="Height (cm)"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
            <input
              type="number"
              placeholder="Weight (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <button className="calculate-btn" onClick={calculateBMI}>
              Calculate
            </button>
          </>
        ) : (
          <>
            <h2>Your BMI is: {bmi}</h2>
            <h3 className={`bmi-category ${category.toLowerCase().replace(" ", "-")}`}>
              {category}
            </h3>
            <button className="back-btn" onClick={resetForm}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BMIPopup;

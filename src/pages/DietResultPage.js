import React, { useState, useEffect, useContext } from "react";
import "./DietResultPage.css";
import { AuthContext } from "../context/AuthContext";
import { nutritionAPI, reportsAPI } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import {
  FiHeart,
  FiActivity,
  FiZap,
  FiClock,
  FiAlertTriangle,
  FiCpu,
  FiCheckCircle,
  FiInfo,
  FiFileText,
  FiRefreshCw,
} from "react-icons/fi";

const DietResultPage = () => {
  const { t } = useLanguage();
  const auth = useContext(AuthContext);
  const user = auth?.user || null;

  const [formData, setFormData] = useState({
    age: "30",
    gender: "Male",
    height: "172",
    weight: "70",
    activityLevel: "1.375", // Light
    dietaryPreference: "Vegetarian",
    healthGoal: "General Wellness & Immunity",
    selectedReportId: "",
  });

  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [userReports, setUserReports] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [computing, setComputing] = useState(false);
  const [dietPlan, setDietPlan] = useState(null);
  const [serviceMessage, setServiceMessage] = useState("");
  const [useAI, setUseAI] = useState(true);

  // 1. Check Ollama Status & Fetch User Reports
  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const res = await nutritionAPI.getStatus();
        if (isMounted && res.data) {
          setOllamaStatus(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setOllamaStatus({ available: false, error: err.message });
        }
      } finally {
        if (isMounted) setLoadingStatus(false);
      }
    };

    const fetchReports = async () => {
      if (!user) return;
      try {
        const res = await reportsAPI.getReports();
        if (isMounted) {
          setUserReports(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load user reports for nutrition grounding:", err);
      }
    };

    checkStatus();
    fetchReports();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Local deterministic fallback calculation
  const computeLocalFallbackPlan = () => {
    const age = parseFloat(formData.age) || 30;
    const height = parseFloat(formData.height) || 170;
    const weight = parseFloat(formData.weight) || 70;
    const activity = parseFloat(formData.activityLevel) || 1.375;

    let bmr = 10 * weight + 6.25 * height - 5 * age;
    if (formData.gender === "Male") {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    let tdee = Math.round(bmr * activity);
    let targetCalories = tdee;
    let calorieReason = "Maintenance caloric expenditure based on physiological biometrics.";

    if (formData.healthGoal === "Weight Loss / Calorie Deficit") {
      targetCalories = Math.max(1200, Math.round(tdee - 450));
      calorieReason = "Safe caloric deficit of ~450 kcal/day for progressive weight management.";
    } else if (formData.healthGoal === "Muscle Building / Hypertrophy") {
      targetCalories = Math.round(tdee + 350);
      calorieReason = "Hypertrophic surplus of ~350 kcal/day for lean mass synthesis.";
    }

    const proteinGrams = Math.round((targetCalories * 0.25) / 4);
    const carbGrams = Math.round((targetCalories * 0.5) / 4);
    const fatGrams = Math.round((targetCalories * 0.25) / 9);
    const waterLiters = (weight * 0.035).toFixed(1);

    const isVeg =
      formData.dietaryPreference === "Vegetarian" ||
      formData.dietaryPreference === "Vegan";

    const meals = [
      {
        timeSlot: "07:30 AM - 08:30 AM",
        mealName: "Morning Wake-Up & Breakfast",
        items: isVeg
          ? [
              "Warm lemon water with soaked chia seeds",
              "Moong dal chilla with crushed almonds (250g portion)",
              "1 cup fresh pomegranate or papaya cubes",
            ]
          : [
              "Warm water with soaked almonds & walnuts",
              "Scrambled eggs (2 whites, 1 whole) with spinach and whole wheat toast",
              "1 medium apple or bowl of seasonal berries",
            ],
        portionGrams: "Approx 350g total",
        clinicalPurpose: "Glycemic stability and essential amino acids",
      },
      {
        timeSlot: "11:00 AM",
        mealName: "Mid-Morning Micronutrient Booster",
        items: [
          "Tender coconut water or spiced buttermilk (chaas) (200ml)",
          "Handful of roasted pumpkin & sunflower seeds (25g)",
        ],
        portionGrams: "Approx 225g total",
        clinicalPurpose: "Electrolyte balance and zinc supplementation",
      },
      {
        timeSlot: "01:00 PM - 02:00 PM",
        mealName: "Nutrient-Dense Balanced Lunch",
        items: isVeg
          ? [
              "Fresh cucumber, tomato, carrot salad with cold-pressed olive oil",
              "1.5 cups brown rice or 2 multigrain rotis",
              "Paneer / Tofu curry with mixed green vegetable sabzi",
              "1 bowl thick probiotic curd / yogurt (150g)",
            ]
          : [
              "Crisp garden salad with lemon dressing",
              "Grilled chicken breast / Steamed fish fillet (150g) with broccoli",
              "1 cup quinoa or 2 multigrain rotis",
              "1 bowl yellow lentil soup (dal) (150g)",
            ],
        portionGrams: "Approx 450g total",
        clinicalPurpose: "Slow-release complex carbohydrates and satiety",
      },
      {
        timeSlot: "04:30 PM - 05:30 PM",
        mealName: "Evening Revitalizer Snack",
        items: [
          "Herbal tulsi infusion or green tea (caffeine-free)",
          "Roasted makhana (fox nuts) or steamed sprouts with lime (50g)",
        ],
        portionGrams: "Approx 60g total",
        clinicalPurpose: "Pre-dinner antioxidant support",
      },
      {
        timeSlot: "07:30 PM - 08:30 PM",
        mealName: "Light Restorative Dinner",
        items: isVeg
          ? [
              "Warm vegetable clear soup with ginger and turmeric",
              "2 jowar or bajra rotis with dal tadka and sauteed beans",
              "1 small bowl mixed vegetable raita",
            ]
          : [
              "Warm chicken clear soup / bone broth",
              "Pan-seared fish with grilled zucchini and carrots",
              "1 small sweet potato or small bowl brown rice",
            ],
        portionGrams: "Approx 350g total",
        clinicalPurpose: "Light digestion and nocturnal recovery",
      },
    ];

    return {
      engine: "Deterministic (Mifflin-St Jeor)",
      summary: `Standard clinical nutritional regimen calibrated to ${targetCalories} kcal/day based on biological biometrics and ${formData.dietaryPreference} preference.`,
      clinicalRationale: calorieReason,
      metabolicTargets: {
        bmr: Math.round(bmr),
        tdee,
        targetCalories,
        calorieAdjustmentReason: calorieReason,
      },
      macronutrients: {
        proteinGrams,
        carbGrams,
        fatGrams,
        fiberGrams: 30,
        waterLiters,
        macroRationale: "Evidence-based 25% Protein / 50% Carbohydrates / 25% Healthy Fats distribution.",
      },
      mealSchedule: meals,
      foodsToEmphasize: [
        "Unrefined whole grains (Jowar, Bajra, Oats, Brown Rice)",
        "Cruciferous vegetables & dark leafy greens",
        "Plant or lean animal proteins",
        "Adequate fluid intake (min 2.5L daily)",
      ],
      foodsToLimit: [
        "High-fructose corn syrup & sweetened beverages",
        "Refined white flour (Maida)",
        "Deep-fried trans-fat foods",
        "Excess sodium (> 2300 mg/day)",
      ],
      missingDataDisclosures: [
        "Recent blood glucose (HbA1c) not provided. Baseline normoglycemic diet assumed.",
        "Lipid profile (LDL, HDL, Triglycerides) not factored in.",
        "Kidney function (eGFR / Serum Creatinine) not provided.",
      ],
      disclaimer:
        "Nutritional Disclaimer: Deterministic calculation based on standard Mifflin-St Jeor equation. Does not replace individualized medical nutrition therapy.",
    };
  };

  const calculatePlan = async (e) => {
    e.preventDefault();
    setComputing(true);
    setServiceMessage("");

    // Try AI generation via Ollama if requested
    if (useAI) {
      try {
        const payload = {
          biometrics: formData,
          reportId: formData.selectedReportId || undefined,
        };

        const res = await nutritionAPI.generatePlan(payload);
        if (res.data?.success && res.data.plan) {
          setDietPlan(res.data.plan);
          setServiceMessage("Clinical nutrition plan synthesized successfully using local Ollama LLM.");
          setComputing(false);
          return;
        }
      } catch (err) {
        console.warn("AI generation error, checking fallback:", err);
        const errData = err.response?.data;

        if (err.response?.status === 503 && errData?.error === "OLLAMA_UNAVAILABLE") {
          // Transparently inform the user of offline status and switch to deterministic calculation
          setServiceMessage(
            `Ollama Local LLM is offline: ${errData.message}. Switched to verified deterministic Mifflin-St Jeor algorithm.`
          );
          if (errData.fallbackPlan) {
            setDietPlan(errData.fallbackPlan);
          } else {
            setDietPlan(computeLocalFallbackPlan());
          }
          setComputing(false);
          return;
        }
      }
    }

    // Default deterministic calculation
    setDietPlan(computeLocalFallbackPlan());
    setServiceMessage("Calculated using standard clinical Mifflin-St Jeor metabolic algorithm.");
    setComputing(false);
  };

  return (
    <div className="diet-page-container">
      {/* Medical Safety Banner */}
      <div className="diet-safety-banner" role="alert">
        <FiAlertTriangle className="safety-icon" />
        <div className="safety-text">
          <strong>{t("diet.safetyDisclaimer", "Nutritional Safety Disclaimer")}:</strong> {t("diet.pageSubtitle", "This dietary computation is based on the Mifflin-St Jeor metabolic algorithm and general evidence-based macronutrient partitioning. Always verify with your clinical dietitian or physician.")}
        </div>
      </div>

      {/* Service Status Indicator */}
      <div className="ollama-status-strip">
        <div className="status-strip-left">
          <FiCpu className="cpu-icon" />
          <span>{t("aiAnalysis.pageTitle", "AI Engine Status")}:</span>
          {loadingStatus ? (
            <span className="status-tag loading">{t("common.loading", "Checking Service...")}</span>
          ) : ollamaStatus?.available ? (
            <span className="status-tag online">
              <FiCheckCircle /> Ollama Online ({ollamaStatus.configuredModel})
            </span>
          ) : (
            <span className="status-tag offline">
              <FiInfo /> Standard Clinical Algorithm
            </span>
          )}
        </div>
        <div className="status-strip-right">
          <label className="toggle-ai-label">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
            />
            <span>{t("home.securityCard3Title", "Enable Local AI Synthesis")}</span>
          </label>
        </div>
      </div>

      <header className="diet-page-header">
        <div className="diet-badge">
          <FiHeart /> {t("diet.badge", "Clinical Nutrition & Energy Metabolism")}
        </div>
        <h1>{t("diet.pageTitle", "AI-Assisted Nutrition & Diet Advisor")}</h1>
        <p className="diet-subtitle">
          {t("diet.pageSubtitle", "Calculate your Basal Metabolic Rate (BMR), Total Daily Energy Expenditure (TDEE), and receive macronutrient-partitioned meal schedules customized to your biometrics.")}
        </p>
      </header>

      {serviceMessage && (
        <div className="diet-service-alert" role="status">
          <FiInfo />
          <span>{serviceMessage}</span>
        </div>
      )}

      <div className="diet-workspace-grid">
        {/* Form Column */}
        <div className="biometrics-form-card">
          <div className="card-header-strip">
            <FiActivity size={20} className="header-icon" />
            <div>
              <h3>{t("diet.formTitle", "Patient Biometrics & Goals")}</h3>
              <p>{t("diet.formSubtitle", "Enter your physiological parameters for metabolic calculation")}</p>
            </div>
          </div>

          <form onSubmit={calculatePlan} className="biometrics-form">
            <div className="form-row-2">
              <div className="form-field">
                <label>{t("diet.ageLabel", "Age (years) *")}</label>
                <input
                  type="number"
                  name="age"
                  min="12"
                  max="120"
                  required
                  value={formData.age}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-field">
                <label>{t("diet.genderLabel", "Biological Gender *")}</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                >
                  <option value="Male">{t("diet.male", "Male")}</option>
                  <option value="Female">{t("diet.female", "Female")}</option>
                </select>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label>{t("diet.heightLabel", "Height (cm) *")}</label>
                <input
                  type="number"
                  name="height"
                  min="50"
                  max="250"
                  required
                  value={formData.height}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-field">
                <label>{t("diet.weightLabel", "Current Weight (kg) *")}</label>
                <input
                  type="number"
                  name="weight"
                  min="25"
                  max="300"
                  required
                  value={formData.weight}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-field">
              <label>{t("diet.activityLabel", "Daily Physical Activity Level *")}</label>
              <select
                name="activityLevel"
                value={formData.activityLevel}
                onChange={handleInputChange}
              >
                <option value="1.2">{t("diet.sedentary", "Sedentary (Desk work, little to no exercise)")}</option>
                <option value="1.375">{t("diet.light", "Light Activity (Exercise 1–3 days/week)")}</option>
                <option value="1.55">{t("diet.moderate", "Moderate Activity (Exercise 3–5 days/week)")}</option>
                <option value="1.725">{t("diet.active", "Very Active (Heavy training 6–7 days/week)")}</option>
              </select>
            </div>

            <div className="form-field">
              <label>{t("diet.dietPreferenceLabel", "Dietary Food Preference *")}</label>
              <select
                name="dietaryPreference"
                value={formData.dietaryPreference}
                onChange={handleInputChange}
              >
                <option value="Vegetarian">{t("diet.vegetarian", "Vegetarian (Includes dairy, legumes)")}</option>
                <option value="Non-Vegetarian">{t("diet.nonVegetarian", "Non-Vegetarian (Eggs, poultry, fish)")}</option>
                <option value="Vegan">{t("diet.vegan", "Vegan (100% plant-based)")}</option>
                <option value="Eggetarian">{t("diet.eggetarian", "Eggetarian (Vegetarian + Eggs)")}</option>
              </select>
            </div>

            <div className="form-field">
              <label>{t("diet.healthGoalLabel", "Primary Wellness Objective *")}</label>
              <select
                name="healthGoal"
                value={formData.healthGoal}
                onChange={handleInputChange}
              >
                <option value="General Wellness & Immunity">
                  {t("diet.generalWellness", "General Wellness & Optimal Immunity")}
                </option>
                <option value="Weight Loss / Calorie Deficit">
                  {t("diet.weightLoss", "Healthy Weight Reduction (Moderate Deficit)")}
                </option>
                <option value="Muscle Building / Hypertrophy">
                  {t("diet.muscleBuilding", "Lean Mass Building (Hypertrophy Surplus)")}
                </option>
              </select>
            </div>

            {/* Optional Medical Report Grounding */}
            {user && userReports.length > 0 && (
              <div className="form-field">
                <label>
                  <FiFileText /> {t("diet.groundingReportLabel", "Ground Plan with Medical Report (Optional)")}
                </label>
                <select
                  name="selectedReportId"
                  value={formData.selectedReportId}
                  onChange={handleInputChange}
                >
                  <option value="">{t("diet.noReportSelected", "None (General Biometrics Only)")}</option>
                  {userReports.map((rep) => (
                    <option key={rep._id} value={rep._id}>
                      {rep.originalName || rep.fileName || `Report ${rep._id.slice(-6)}`} (
                      {rep.category || "General"})
                    </option>
                  ))}
                </select>
                <small className="field-hint">
                  {t("diet.groundingHint", "Incorporates documented abnormal biomarkers (e.g. cholesterol, glucose) from your vault.")}
                </small>
              </div>
            )}

            <button
              type="submit"
              className="btn-compute-diet"
              disabled={computing}
            >
              {computing ? (
                <>
                  <FiRefreshCw className="spin" /> {t("diet.calculating", "Computing Nutrition Targets...")}
                </>
              ) : (
                <>
                  <FiZap /> {t("diet.calculateBtn", "Compute Nutrition Plan")}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Column */}
        <div className="diet-results-panel">
          {!dietPlan ? (
            <div className="empty-diet-state">
              <FiHeart size={48} className="empty-heart-icon" />
              <h3>{t("diet.architectTitle", "Personalized Nutrition Architect")}</h3>
              <p>
                {t("diet.emptyPrompt", "Fill in your biometrics and click \"Compute Nutrition Plan\" to calculate metabolic targets and receive a structured daily meal routine.")}
              </p>
            </div>
          ) : (
            <div className="diet-plan-dossier">
              {/* Engine Badge */}
              <div className="plan-engine-badge">
                <FiCpu />
                <span>
                  {t("diet.synthesizedVia", "Synthesized via:")} <strong>{dietPlan.engine || "Standard Clinical Model"}</strong>
                  {dietPlan.model ? ` (${dietPlan.model})` : ""}
                </span>
              </div>

              {/* Clinical Summary */}
              {dietPlan.summary && (
                <div className="diet-summary-callout">
                  <p>{dietPlan.summary}</p>
                </div>
              )}

              {/* Metabolic Targets Cards */}
              <div className="metabolic-metrics-grid">
                <div className="target-card primary">
                  <span className="card-label">{t("diet.targetEnergy", "Target Energy")}</span>
                  <div className="card-val">{dietPlan.metabolicTargets?.targetCalories}</div>
                  <span className="card-unit">{t("diet.caloriesPerDay", "kcal / day")}</span>
                </div>

                <div className="target-card">
                  <span className="card-label">{t("diet.basalRate", "Basal Rate (BMR)")}</span>
                  <div className="card-val">{dietPlan.metabolicTargets?.bmr}</div>
                  <span className="card-unit">{t("diet.kcalAtRest", "kcal at rest")}</span>
                </div>

                <div className="target-card">
                  <span className="card-label">{t("diet.maintenanceEnergy", "Maintenance (TDEE)")}</span>
                  <div className="card-val">{dietPlan.metabolicTargets?.tdee}</div>
                  <span className="card-unit">{t("diet.caloriesPerDay", "kcal / day")}</span>
                </div>

                <div className="target-card hydration">
                  <span className="card-label">{t("diet.targetHydration", "Target Hydration")}</span>
                  <div className="card-val">
                    {dietPlan.macronutrients?.waterLiters || "2.5"}
                  </div>
                  <span className="card-unit">{t("diet.litersPerDay", "Liters / day")}</span>
                </div>
              </div>

              {/* Macronutrient Partitioning */}
              <div className="macronutrient-breakdown-card">
                <h4>{t("diet.macronutrientsTitle", "Macronutrient Target Distribution")}</h4>
                <div className="macros-pills-row">
                  <div className="macro-pill protein">
                    <span className="m-name">{t("diet.protein", "Daily Protein")}</span>
                    <span className="m-val">{dietPlan.macronutrients?.proteinGrams}g</span>
                    <span className="m-pct">(25% Energy)</span>
                  </div>
                  <div className="macro-pill carbs">
                    <span className="m-name">{t("diet.carbs", "Carbohydrates")}</span>
                    <span className="m-val">{dietPlan.macronutrients?.carbGrams}g</span>
                    <span className="m-pct">(50% Energy)</span>
                  </div>
                  <div className="macro-pill fats">
                    <span className="m-name">{t("diet.fats", "Healthy Fats")}</span>
                    <span className="m-val">{dietPlan.macronutrients?.fatGrams}g</span>
                    <span className="m-pct">(25% Energy)</span>
                  </div>
                </div>
                {dietPlan.macronutrients?.macroRationale && (
                  <p className="macro-rationale-text">
                    {dietPlan.macronutrients.macroRationale}
                  </p>
                )}
              </div>

              {/* Daily Meal Routine */}
              {dietPlan.mealSchedule && dietPlan.mealSchedule.length > 0 && (
                <div className="meals-routine-card">
                  <div className="routine-header">
                    <FiClock className="routine-icon" />
                    <h4>{t("diet.mealPlanTitle", "Structured Daily Meal Routine")}</h4>
                  </div>

                  <div className="meals-timeline">
                    {dietPlan.mealSchedule.map((meal, idx) => (
                      <div key={idx} className="timeline-meal-item">
                        <div className="meal-time-tag">{meal.timeSlot || meal.time}</div>
                        <div className="meal-details">
                          <h5>{meal.mealName || meal.name}</h5>
                          {meal.portionGrams && (
                            <span className="portion-tag">{t("diet.portion", "Portion:")} {meal.portionGrams}</span>
                          )}
                          <ul className="meal-food-list">
                            {(meal.items || []).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                          {meal.clinicalPurpose && (
                            <p className="meal-purpose-text">
                              <em>{t("diet.clinicalFocus", "Clinical Focus:")}</em> {meal.clinicalPurpose}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Foods to Emphasize & Limit */}
              <div className="foods-recommendation-grid">
                <div className="foods-card emphasize">
                  <h5>✅ {t("diet.foodsToEmphasize", "Foods to Emphasize")}</h5>
                  <ul>
                    {(dietPlan.foodsToEmphasize || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="foods-card limit">
                  <h5>⚠️ {t("diet.foodsToLimit", "Foods to Moderate or Limit")}</h5>
                  <ul>
                    {(dietPlan.foodsToLimit || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Missing Data Disclosures */}
              {dietPlan.missingDataDisclosures &&
                dietPlan.missingDataDisclosures.length > 0 && (
                  <div className="disclosures-card">
                    <div className="disclosures-header">
                      <FiInfo />
                      <h5>{t("diet.disclosures", "Clinical Data Limitations & Disclosures")}</h5>
                    </div>
                    <ul>
                      {dietPlan.missingDataDisclosures.map((disc, idx) => (
                        <li key={idx}>{disc}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DietResultPage;

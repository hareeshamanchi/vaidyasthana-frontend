export const featureData = [
  {
    key: "cmr",
    title: "Centralized Medical Records",
    description: "All patient data — diagnostics to prescriptions — securely organized in one place.",
    image: "/assets/CMR.png",
  },
  {
    key: "up",
    title: "Unique Patient ID System",
    description: "Quick and accurate access to complete medical history via unique ID.",
    image: "/assets/UP.png",
  },
  {
    key: "pa",
    title: "Predictive Analytics",
    description: "AI forecasts health risks and helps create preventive care plans.",
    image: "/assets/PA.png",
  },
  {
    key: "mdt",
    title: "Medication & Diagnostics Timeline",
    description: "Chronological view of medications, dosages, and diagnostics to prevent issues.",
    image: "/assets/MDT.png",
  },
  {
    key: "diet",
    title: "Personalized Diet Plans",
    description: "AI-generated diet based on medical history and lifestyle.",
    image: "/assets/DIET.png",
  },
  {
    key: "ins",
    title: "Insurance Integration",
    description: "Automated claims and fast approvals through smart linking.",
    image: "/assets/insurance.png",
  },
];

export const getLocalizedFeatureData = (t) => [
  {
    key: "cmr",
    title: t ? t("home.featuresCmrTitle", "Centralized Medical Records") : "Centralized Medical Records",
    description: t ? t("home.featuresCmrDesc", "All patient data — diagnostics to prescriptions — securely organized in one place.") : "All patient data — diagnostics to prescriptions — securely organized in one place.",
    image: "/assets/CMR.png",
  },
  {
    key: "up",
    title: t ? t("home.featuresUpTitle", "Unique Patient ID System") : "Unique Patient ID System",
    description: t ? t("home.featuresUpDesc", "Quick and accurate access to complete medical history via unique ID.") : "Quick and accurate access to complete medical history via unique ID.",
    image: "/assets/UP.png",
  },
  {
    key: "pa",
    title: t ? t("home.featuresPaTitle", "Predictive Analytics") : "Predictive Analytics",
    description: t ? t("home.featuresPaDesc", "AI forecasts health risks and helps create preventive care plans.") : "AI forecasts health risks and helps create preventive care plans.",
    image: "/assets/PA.png",
  },
  {
    key: "mdt",
    title: t ? t("home.featuresMdtTitle", "Medication & Diagnostics Timeline") : "Medication & Diagnostics Timeline",
    description: t ? t("home.featuresMdtDesc", "Chronological view of medications, dosages, and diagnostics to prevent issues.") : "Chronological view of medications, dosages, and diagnostics to prevent issues.",
    image: "/assets/MDT.png",
  },
  {
    key: "diet",
    title: t ? t("home.featuresDietTitle", "Personalized Diet Plans") : "Personalized Diet Plans",
    description: t ? t("home.featuresDietDesc", "AI-generated diet based on medical history and lifestyle.") : "AI-generated diet based on medical history and lifestyle.",
    image: "/assets/DIET.png",
  },
  {
    key: "ins",
    title: t ? t("home.featuresInsTitle", "Insurance Integration") : "Insurance Integration",
    description: t ? t("home.featuresInsDesc", "Automated claims and fast approvals through smart linking.") : "Automated claims and fast approvals through smart linking.",
    image: "/assets/insurance.png",
  },
];

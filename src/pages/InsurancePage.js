import React, { useState, useEffect, useCallback, useContext } from "react";
import "./InsurancePage.css";
import { insuranceAPI } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  FiShield,
  FiPlus,
  FiPhoneCall,
  FiCheckCircle,
  FiTrash2,
  FiX,
  FiRefreshCw,
  FiCreditCard,
  FiUser,
} from "react-icons/fi";

const InsurancePage = () => {
  const { user } = useContext(AuthContext);
  const { t, isTelugu } = useLanguage();

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [formData, setFormData] = useState({
    providerName: "Star Health & Allied Insurance",
    policyNumber: "",
    policyHolderName: user?.name || "",
    coverageType: "Comprehensive Health",
    coverageAmount: 500000,
    validUntil: "",
    emergencyContact: "1800-425-2255",
  });

  const providers = [
    "Star Health & Allied Insurance",
    "HDFC ERGO Health Insurance",
    "Care Health Insurance",
    "ICICI Lombard Health Shield",
    "Niva Bupa Health Insurance",
    "Bajaj Allianz General Insurance",
  ];

  const fetchPolicies = useCallback(async () => {
    if (!user) {
      setPolicies([]);
      setLoading(false);
      return;
    }

    try {
      const res = await insuranceAPI.getInsuranceList();
      setPolicies(res.data?.policies || []);
    } catch (err) {
      console.error("Fetch policies error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    if (showAddModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setShowAddModal(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showAddModal]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.policyNumber || !formData.validUntil) {
      alert("Policy number and expiration date are required.");
      return;
    }

    try {
      await insuranceAPI.createInsurance({
        ...formData,
        policyHolderName: formData.policyHolderName || user?.name || "Patient",
      });
      setStatusMessage("Insurance policy recorded successfully.");
      setShowAddModal(false);
      setFormData({
        providerName: "Star Health & Allied Insurance",
        policyNumber: "",
        policyHolderName: user?.name || "",
        coverageType: "Comprehensive Health",
        coverageAmount: 500000,
        validUntil: "",
        emergencyContact: "1800-425-2255",
      });
      fetchPolicies();
    } catch (err) {
      console.error("Add insurance error:", err);
      alert(err.response?.data?.message || "Failed to add policy.");
    }
  };

  const handleDeletePolicy = async (id) => {
    if (!window.confirm("Remove this policy record from your profile?")) {
      return;
    }
    try {
      await insuranceAPI.deleteInsurance(id);
      setStatusMessage("Policy record removed.");
      fetchPolicies();
    } catch (err) {
      console.error("Delete policy error:", err);
      alert("Failed to delete policy.");
    }
  };

  if (loading) {
    return (
      <div className="insurance-page-container">
        <div className="insurance-loading">
          <FiRefreshCw className="spinner-icon" />
          <p>{t("common.loading", "Retrieving your health insurance records...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="insurance-page-container">
      {/* Page Header */}
      <header className="insurance-page-header">
        <div className="header-info">
          <span className="header-badge">{t("nav.insurance", "Coverage Vault")}</span>
          <h1>{t("insurance.pageTitle", "Health Insurance & Policy Integration")}</h1>
          <p>
            {t("insurance.pageSubtitle", "Centralize your health insurance coverage, track sum insured limits, and access 24/7 cashless emergency TPA helplines.")}
          </p>
        </div>
        <button
          className="btn-add-policy"
          onClick={() => setShowAddModal(true)}
          type="button"
        >
          <FiPlus /> {t("insurance.addPolicyBtn", "Add Insurance Policy")}
        </button>
      </header>

      {statusMessage && (
        <div className="insurance-banner success">
          <FiCheckCircle />
          <span>{statusMessage}</span>
          <button
            className="dismiss-btn"
            onClick={() => setStatusMessage("")}
            aria-label="Dismiss banner"
          >
            <FiX />
          </button>
        </div>
      )}

      {/* Emergency TPA & Cashless Helpline Card */}
      <section className="emergency-tpa-card">
        <div className="tpa-icon-wrap">
          <FiPhoneCall size={28} />
        </div>
        <div className="tpa-content">
          <h3>{t("insurance.emergencyContactLabel", "24/7 Hospital Cashless & TPA Emergency Desk")}</h3>
          <p>
            {t("footer.disclaimerDetails", "For emergency hospitalization, cashless pre-authorization, or claim settlement assistance across our partner hospital network:")}
          </p>
          <div className="tpa-helpline-numbers">
            <a href="tel:18004252255" className="helpline-pill">
              {t("insurance.callHelpline", "Toll-Free Helpline")}: 1800-425-2255
            </a>
            <span className="helpline-subtext">{t("footer.emergencySupport", "Instant cashless pre-authorization support")}</span>
          </div>
        </div>
      </section>

      {/* Active Policies Section */}
      <section className="policies-grid-section">
        <div className="section-title-wrap">
          <h2>{t("insurance.totalPolicies", "Linked Insurance Policies")} ({policies.length})</h2>
          <span className="sub-tag">{t("home.securityCard1Desc", "Verified coverage for diagnostic tests and hospitalization")}</span>
        </div>

        {policies.length === 0 ? (
          <div className="empty-policies-box">
            <FiShield size={48} className="empty-shield-icon" />
            <h3>{t("insurance.noPolicies", "No Policies Linked")}</h3>
            <p>
              {t("insurance.pageSubtitle", "Link your health insurance provider to ensure quick claim validation and cashless approvals during clinical visits.")}
            </p>
            <button
              className="btn-link-first"
              onClick={() => setShowAddModal(true)}
              type="button"
            >
              <FiPlus /> {t("insurance.addPolicyBtn", "Link Your Policy")}
            </button>
          </div>
        ) : (
          <div className="policies-cards-grid">
            {policies.map((pol) => (
              <div key={pol._id} className="policy-smart-card">
                <div className="card-chip-strip">
                  <FiCreditCard className="chip-icon" />
                  <span className="policy-type-tag">
                    {pol.coverageType || "Comprehensive Health"}
                  </span>
                  <span className="policy-status-pill active">{t("status.scheduled", "Active")}</span>
                </div>

                <div className="provider-name-row">
                  <h3>{pol.providerName}</h3>
                </div>

                <div className="policy-number-block">
                  <span className="label">{t("insurance.policyNumberLabel", "Policy Number")}</span>
                  <div className="number-value">
                    {pol.policyNumber.replace(/(\w{4})/g, "$1 ").trim()}
                  </div>
                </div>

                <div className="policy-financials-grid">
                  <div className="fin-item">
                    <span className="label">{t("insurance.coverageAmountLabel", "Sum Insured")}</span>
                    <span className="value">
                      ₹{Number(pol.coverageAmount || 500000).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="fin-item">
                    <span className="label">{t("insurance.validUntilLabel", "Valid Until")}</span>
                    <span className="value">
                      {pol.validUntil
                        ? new Date(pol.validUntil).toLocaleDateString(isTelugu ? "te-IN" : "en-US", {
                            month: "short",
                            year: "numeric",
                          })
                        : "Active"}
                    </span>
                  </div>
                </div>

                <div className="policy-footer-strip">
                  <span className="holder-name">
                    <FiUser size={13} /> {pol.policyHolderName || user?.name}
                  </span>
                  <button
                    className="btn-delete-policy"
                    onClick={() => handleDeletePolicy(pol._id)}
                    title={t("common.delete", "Remove Policy")}
                    type="button"
                  >
                    <FiTrash2 size={14} /> {t("common.delete", "Remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Policy Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="insurance-dialog-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="dialog-header">
              <div className="title-wrap">
                <FiShield className="header-icon" />
                <div>
                  <h3>{t("insurance.modalTitle", "Register Health Insurance Policy")}</h3>
                  <p>{t("insurance.pageSubtitle", "Add your policy information to your patient records vault")}</p>
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowAddModal(false)}
                type="button"
                aria-label={t("common.close", "Close")}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="insurance-form">
              <div className="form-group">
                <label>{t("insurance.providerLabel", "Insurance Provider *")}</label>
                <select
                  name="providerName"
                  value={formData.providerName}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  {providers.map((p, idx) => (
                    <option key={idx} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t("insurance.policyNumberLabel", "Policy Number *")}</label>
                <input
                  type="text"
                  name="policyNumber"
                  required
                  placeholder="e.g. POL-789456123"
                  value={formData.policyNumber}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>{t("insurance.coverageAmountLabel", "Sum Insured (Coverage Amount in ₹)")}</label>
                  <input
                    type="number"
                    name="coverageAmount"
                    value={formData.coverageAmount}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>{t("insurance.validUntilLabel", "Valid Until *")}</label>
                  <input
                    type="date"
                    name="validUntil"
                    required
                    value={formData.validUntil}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t("insurance.policyHolderLabel", "Policyholder Name")}</label>
                <input
                  type="text"
                  name="policyHolderName"
                  value={formData.policyHolderName}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder={user?.name || "Patient Name"}
                />
              </div>

              <div className="dialog-buttons-row">
                <button
                  type="button"
                  className="btn-dialog-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button type="submit" className="btn-dialog-save">
                  {t("insurance.savePolicyBtn", "Register Policy")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsurancePage;

import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { hospitalAdminAPI } from "../services/api";
import {
  FiUsers,
  FiUserPlus,
  FiUserCheck,
  FiUserX,
  FiSettings,
  FiCalendar,
  FiActivity,
  FiSearch,
  FiMail,
  FiCopy,
  FiCheckCircle,
  FiAlertCircle,
  FiEdit2,
  FiShield,
  FiClock,
  FiMapPin,
  FiX,
  FiPlus,
  FiRefreshCw,
} from "react-icons/fi";
import "./HospitalAdminDashboard.css";

const ROLE_LABELS = {
  hospital_admin: "Hospital Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  lab_technician: "Lab Technician",
  pharmacist: "Pharmacist",
  billing_staff: "Billing Staff",
  patient: "Patient",
};

const ROLE_BADGE_CLASSES = {
  hospital_admin: "badge-indigo",
  doctor: "badge-blue",
  nurse: "badge-emerald",
  receptionist: "badge-purple",
  lab_technician: "badge-amber",
  pharmacist: "badge-teal",
  billing_staff: "badge-orange",
  patient: "badge-slate",
};

const HospitalAdminDashboard = () => {
  const { user, loading: authLoading, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Route & Role Protection:
  // 1. Superadmin / Admin -> Always redirect to Platform Owner dashboard (/admin)
  // 2. Doctor / Patient / Guest -> Redirect to their respective workspaces
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/", { replace: true });
      return;
    }
    if (user.role === "superadmin" || user.role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }
    if (user.role !== "hospital_admin") {
      if (user.role === "doctor") {
        navigate("/doctor-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
      return;
    }
  }, [user, authLoading, navigate]);

  const [activeTab, setActiveTab] = useState("staff");
  const [overview, setOverview] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [patientList, setPatientList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Search & Filter
  const [staffSearch, setStaffSearch] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState("all");
  const [patientSearch, setPatientSearch] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);

  // Form states
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "doctor",
    phoneNumber: "",
    department: "",
    specialization: "General Medicine",
    qualifications: "MBBS",
    experienceYears: 5,
    consultationFee: 500,
  });

  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "doctor",
    expiryDays: 7,
  });
  const [createdInviteLink, setCreatedInviteLink] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    role: "",
    phoneNumber: "",
    department: "",
    specialization: "",
    qualifications: "",
    experienceYears: 0,
    consultationFee: 500,
  });

  const [deactivateReason, setDeactivateReason] = useState("");

  const [patientForm, setPatientForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    gender: "Male",
    dateOfBirth: "",
    bloodGroup: "O+",
    address: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const [settingsForm, setSettingsForm] = useState({
    address: "",
    city: "",
    state: "",
    postalCode: "",
    contactPhone: "",
    emergencyContact: "",
    timezone: "Asia/Kolkata",
    operationalHours: {
      start: "08:00 AM",
      end: "08:00 PM",
    },
  });

  // Load Data
  const loadDashboardData = useCallback(async () => {
    // Only load if user is a hospital_admin bound to a valid hospitalId
    if (!user || user.role !== "hospital_admin" || !user.hospitalId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [overviewRes, staffRes, patientsRes] = await Promise.all([
        hospitalAdminAPI.getOverview(),
        hospitalAdminAPI.getStaff({ search: staffSearch, role: staffRoleFilter !== "all" ? staffRoleFilter : undefined }),
        hospitalAdminAPI.getPatients({ search: patientSearch }),
      ]);

      if (overviewRes.data?.success) {
        setOverview(overviewRes.data);
        const hosp = overviewRes.data.hospital;
        if (hosp) {
          setSettingsForm({
            address: hosp.address || "",
            city: hosp.city || "",
            state: hosp.state || "",
            postalCode: hosp.postalCode || "",
            contactPhone: hosp.contactPhone || "",
            emergencyContact: hosp.emergencyContact || "",
            timezone: hosp.timezone || "Asia/Kolkata",
            operationalHours: hosp.operationalHours || { start: "08:00 AM", end: "08:00 PM" },
          });
        }
      }

      if (staffRes.data?.success) {
        setStaffList(staffRes.data.staff || []);
        setPendingInvitations(staffRes.data.pendingInvitations || []);
      }

      if (patientsRes.data?.success) {
        setPatientList(patientsRes.data.patients || []);
      }
    } catch (err) {
      console.error("Error loading hospital dashboard:", err);
      setError(err.response?.data?.message || "Failed to load hospital operational data.");
    } finally {
      setLoading(false);
    }
  }, [staffSearch, staffRoleFilter, patientSearch]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Add Staff
  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await hospitalAdminAPI.createStaff(addForm);
      if (res.data?.success) {
        showToast(res.data.message || "Staff member created successfully!");
        setShowAddModal(false);
        setAddForm({
          name: "",
          email: "",
          password: "",
          role: "doctor",
          phoneNumber: "",
          department: "",
          specialization: "General Medicine",
          qualifications: "MBBS",
          experienceYears: 5,
          consultationFee: 500,
        });
        loadDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create staff member.");
    }
  };

  // Invite Staff
  const handleInviteStaffSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await hospitalAdminAPI.inviteStaff(inviteForm);
      if (res.data?.success) {
        const fullLink = `${window.location.origin}${res.data.invitation.setupLink}`;
        setCreatedInviteLink(fullLink);
        showToast("Invitation link created successfully!");
        loadDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate staff invitation.");
    }
  };

  const copyInviteToClipboard = () => {
    if (createdInviteLink) {
      navigator.clipboard.writeText(createdInviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Edit Staff
  const openEditModal = (staff) => {
    setSelectedStaff(staff);
    setEditForm({
      name: staff.name || "",
      role: staff.role || "doctor",
      phoneNumber: staff.phoneNumber || "",
      department: staff.department || "",
      specialization: staff.specialization || "",
      qualifications: staff.qualifications || "",
      experienceYears: staff.experienceYears || 0,
      consultationFee: staff.consultationFee || 500,
    });
    setShowEditModal(true);
  };

  const handleEditStaffSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setError("");
    try {
      const res = await hospitalAdminAPI.updateStaff(selectedStaff._id, editForm);
      if (res.data?.success) {
        showToast("Staff profile updated successfully.");
        setShowEditModal(false);
        loadDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update staff member.");
    }
  };

  // Deactivate Staff
  const openDeactivateModal = (staff) => {
    setSelectedStaff(staff);
    setDeactivateReason("");
    setShowDeactivateModal(true);
  };

  const handleDeactivateSubmit = async () => {
    if (!selectedStaff) return;
    const nextStatus = selectedStaff.status === "suspended" ? "active" : "suspended";
    setError("");
    try {
      const res = await hospitalAdminAPI.updateStaffStatus(selectedStaff._id, {
        status: nextStatus,
        reason: deactivateReason || `Status changed to ${nextStatus} by hospital administrator`,
      });
      if (res.data?.success) {
        showToast(res.data.message);
        setShowDeactivateModal(false);
        loadDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update staff status.");
    }
  };

  // Revoke Invite
  const handleRevokeInvite = async (inviteId) => {
    if (!window.confirm("Are you sure you want to revoke this invitation?")) return;
    try {
      const res = await hospitalAdminAPI.revokeInvitation(inviteId);
      if (res.data?.success) {
        showToast(res.data.message);
        loadDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to revoke invitation.");
    }
  };

  // Register Patient
  const handleRegisterPatientSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await hospitalAdminAPI.registerPatient(patientForm);
      if (res.data?.success) {
        showToast("Patient registered successfully!");
        setShowPatientModal(false);
        setPatientForm({
          name: "",
          email: "",
          phoneNumber: "",
          gender: "Male",
          dateOfBirth: "",
          bloodGroup: "O+",
          address: "",
          city: "",
          state: "",
          postalCode: "",
        });
        loadDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to register patient.");
    }
  };

  // Update Settings
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await hospitalAdminAPI.updateSettings(settingsForm);
      if (res.data?.success) {
        showToast("Hospital operational settings updated successfully.");
        loadDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update hospital settings.");
    }
  };

  // Immediate guard: If superadmin/admin, render redirecting placeholder
  if (user && (user.role === "superadmin" || user.role === "admin")) {
    return (
      <div className="hospital-admin-loading">
        <FiRefreshCw className="spin-icon" />
        <p>Redirecting to Platform Owner Dashboard...</p>
      </div>
    );
  }

  // Guard: Hospital admin account pending tenant assignment
  if (user && user.role === "hospital_admin" && !user.hospitalId) {
    return (
      <div className="hospital-admin-container">
        <div className="hospital-unassigned-card">
          <div className="unassigned-icon-wrap">
            <FiShield size={48} color="#eab308" />
          </div>
          <h2>Hospital Tenant Required</h2>
          <p>
            Your account (<strong>{user.email}</strong>) has the Hospital Administrator role,
            but is not currently associated with an active hospital tenant.
          </p>
          <p className="unassigned-hint">
            Please contact your Platform Owner (Super Administrator) to onboard your hospital or
            invite your account through a valid institutional setup link.
          </p>
          <div className="unassigned-actions">
            <button className="btn-secondary" onClick={() => navigate("/")}>
              Return Home
            </button>
            <button className="btn-primary" onClick={() => logout()}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !overview) {
    return (
      <div className="hospital-admin-loading">
        <FiRefreshCw className="spin-icon" />
        <p>Loading Hospital Administration Panel...</p>
      </div>
    );
  }

  const hosp = overview?.hospital;
  const metrics = overview?.metrics;

  return (
    <div className="hospital-admin-container">
      {/* Toast notifications */}
      {successMsg && (
        <div className="toast-banner toast-success" role="alert">
          <FiCheckCircle />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="toast-banner toast-error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button className="toast-close" onClick={() => setError("")}>
            <FiX />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="hospital-header-card">
        <div className="hospital-header-info">
          <div className="hospital-title-row">
            <h1>{hosp?.name || "Hospital Administration"}</h1>
            <span className="hospital-code-badge">{hosp?.hospitalCode || "HOSP"}</span>
            <span className={`status-pill status-${hosp?.status || "active"}`}>
              {hosp?.status?.toUpperCase()}
            </span>
            <span className="plan-pill">{hosp?.subscription?.plan?.toUpperCase()} PLAN</span>
          </div>
          <div className="hospital-meta-row">
            <span>
              <FiClock /> Operating: {hosp?.operationalHours?.start || "08:00 AM"} -{" "}
              {hosp?.operationalHours?.end || "08:00 PM"}
            </span>
            <span>
              <FiMapPin /> {hosp?.timezone || "Asia/Kolkata"}
            </span>
            <span>
              <FiShield /> Tenant Administrator: {user?.name} ({user?.email})
            </span>
          </div>
        </div>

        <div className="hospital-header-actions">
          <button
            className="btn-primary"
            onClick={() => setShowAddModal(true)}
            title="Directly add staff member"
          >
            <FiUserPlus /> Add Staff
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setCreatedInviteLink(null);
              setShowInviteModal(true);
            }}
            title="Generate single-use invitation link"
          >
            <FiMail /> Invite Staff
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards-grid">
        <div className="stat-card">
          <div className="stat-icon icon-blue">
            <FiUsers />
          </div>
          <div className="stat-content">
            <span className="stat-value">{metrics?.totalStaff || 0}</span>
            <span className="stat-label">Total Staff Members</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-emerald">
            <FiUserCheck />
          </div>
          <div className="stat-content">
            <span className="stat-value">{metrics?.doctors || 0}</span>
            <span className="stat-label">Active Doctors</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-purple">
            <FiActivity />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {(metrics?.nurses || 0) +
                (metrics?.receptionists || 0) +
                (metrics?.labTechnicians || 0) +
                (metrics?.pharmacists || 0) +
                (metrics?.billingStaff || 0)}
            </span>
            <span className="stat-label">Allied & Nursing Staff</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-teal">
            <FiUsers />
          </div>
          <div className="stat-content">
            <span className="stat-value">{metrics?.totalPatients || 0}</span>
            <span className="stat-label">Hospital Patients</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-amber">
            <FiCalendar />
          </div>
          <div className="stat-content">
            <span className="stat-value">{metrics?.totalAppointments || 0}</span>
            <span className="stat-label">Appointments</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === "staff" ? "active" : ""}`}
          onClick={() => setActiveTab("staff")}
        >
          <FiUsers /> Staff Directory ({staffList.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "patients" ? "active" : ""}`}
          onClick={() => setActiveTab("patients")}
        >
          <FiUserCheck /> Patient Registry ({patientList.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <FiSettings /> Hospital Settings
        </button>
      </div>

      {/* TAB 1: Staff Directory */}
      {activeTab === "staff" && (
        <div className="tab-pane">
          <div className="toolbar-row">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search staff by name, email, department..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
            </div>

            <div className="filter-box">
              <label htmlFor="staffRoleSelect">Role:</label>
              <select
                id="staffRoleSelect"
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="doctor">Doctors</option>
                <option value="nurse">Nurses</option>
                <option value="receptionist">Receptionists</option>
                <option value="lab_technician">Lab Technicians</option>
                <option value="pharmacist">Pharmacists</option>
                <option value="billing_staff">Billing Staff</option>
                <option value="hospital_admin">Hospital Admins</option>
              </select>
            </div>
          </div>

          {/* Pending Invitations Section */}
          {pendingInvitations.length > 0 && (
            <div className="pending-invites-card">
              <div className="pending-invites-header">
                <h3>
                  <FiMail /> Pending Staff Invitations ({pendingInvitations.length})
                </h3>
              </div>
              <div className="pending-invites-list">
                {pendingInvitations.map((inv) => (
                  <div key={inv._id} className="invite-row">
                    <div className="invite-info">
                      <span className="invite-email">{inv.email}</span>
                      <span className={`badge ${ROLE_BADGE_CLASSES[inv.role] || "badge-slate"}`}>
                        {ROLE_LABELS[inv.role] || inv.role}
                      </span>
                      <span className="invite-expiry">
                        Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="invite-actions">
                      <button
                        className="btn-icon"
                        title="Revoke invitation"
                        onClick={() => handleRevokeInvite(inv._id)}
                      >
                        <FiX /> Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff Table */}
          <div className="table-responsive">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Department / Specialty</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-table-state">
                      No staff members match the current search criteria.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => (
                    <tr key={staff._id} className={staff.status === "suspended" ? "row-suspended" : ""}>
                      <td>
                        <div className="staff-user-cell">
                          <div className="staff-avatar">
                            {staff.name?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                          <div>
                            <span className="staff-name">{staff.name}</span>
                            <span className="staff-email">{staff.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${ROLE_BADGE_CLASSES[staff.role] || "badge-slate"}`}>
                          {ROLE_LABELS[staff.role] || staff.role}
                        </span>
                      </td>
                      <td>
                        {staff.role === "doctor"
                          ? staff.specialization || "General Medicine"
                          : staff.department || "Hospital Operations"}
                      </td>
                      <td>
                        <span className="staff-phone">{staff.phoneNumber || "—"}</span>
                      </td>
                      <td>
                        <span className={`status-tag status-${staff.status || "active"}`}>
                          {staff.status === "suspended" ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-group">
                          <button
                            className="btn-action btn-edit"
                            onClick={() => openEditModal(staff)}
                            title="Edit staff details"
                          >
                            <FiEdit2 /> Edit
                          </button>
                          {staff._id !== user?._id && staff.role !== "superadmin" && (
                            <button
                              className={`btn-action ${
                                staff.status === "suspended" ? "btn-activate" : "btn-deactivate"
                              }`}
                              onClick={() => openDeactivateModal(staff)}
                              title={
                                staff.status === "suspended"
                                  ? "Reactivate staff account"
                                  : "Deactivate account and revoke sessions"
                              }
                            >
                              {staff.status === "suspended" ? (
                                <>
                                  <FiUserCheck /> Activate
                                </>
                              ) : (
                                <>
                                  <FiUserX /> Deactivate
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Patient Registry */}
      {activeTab === "patients" && (
        <div className="tab-pane">
          <div className="toolbar-row">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search patient by name, email, phone..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={() => setShowPatientModal(true)}>
              <FiPlus /> Register New Patient
            </button>
          </div>

          <div className="table-responsive">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Contact Email</th>
                  <th>Phone Number</th>
                  <th>Gender / DOB</th>
                  <th>Blood Group</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {patientList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-table-state">
                      No patients registered in this hospital yet. Click "Register New Patient" to intake.
                    </td>
                  </tr>
                ) : (
                  patientList.map((pat) => (
                    <tr key={pat._id}>
                      <td>
                        <span className="staff-name">{pat.name}</span>
                      </td>
                      <td>{pat.email}</td>
                      <td>{pat.phoneNumber || "—"}</td>
                      <td>
                        {pat.gender || "—"} {pat.dateOfBirth ? `(${new Date(pat.dateOfBirth).toLocaleDateString()})` : ""}
                      </td>
                      <td>
                        <span className="badge badge-amber">{pat.bloodGroup || "—"}</span>
                      </td>
                      <td>{new Date(pat.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Hospital Settings */}
      {activeTab === "settings" && (
        <div className="tab-pane">
          <div className="settings-card">
            <h2>Hospital Operational Configuration</h2>
            <form onSubmit={handleSettingsSubmit} className="settings-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Hospital Address</label>
                  <input
                    type="text"
                    value={settingsForm.address}
                    onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={settingsForm.city}
                    onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>State / Province</label>
                  <input
                    type="text"
                    value={settingsForm.state}
                    onChange={(e) => setSettingsForm({ ...settingsForm, state: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    value={settingsForm.postalCode}
                    onChange={(e) => setSettingsForm({ ...settingsForm, postalCode: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    value={settingsForm.contactPhone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Emergency Line</label>
                  <input
                    type="text"
                    value={settingsForm.emergencyContact}
                    onChange={(e) => setSettingsForm({ ...settingsForm, emergencyContact: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Timezone</label>
                  <select
                    value={settingsForm.timezone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                    <option value="UTC">UTC (+0:00)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Operating Hours</label>
                  <div className="hours-row">
                    <input
                      type="text"
                      placeholder="Start (08:00 AM)"
                      value={settingsForm.operationalHours?.start || ""}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          operationalHours: { ...settingsForm.operationalHours, start: e.target.value },
                        })
                      }
                    />
                    <span>to</span>
                    <input
                      type="text"
                      placeholder="End (08:00 PM)"
                      value={settingsForm.operationalHours?.end || ""}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          operationalHours: { ...settingsForm.operationalHours, end: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Save Hospital Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Staff */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>
                <FiUserPlus /> Add Hospital Staff Member
              </h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleAddStaffSubmit} className="modal-form">
              <div className="form-group">
                <label>Staff Role *</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  required
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="lab_technician">Lab Technician</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="billing_staff">Billing Staff</option>
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ramesh Sharma"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@hospital.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Temporary Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={addForm.phoneNumber}
                    onChange={(e) => setAddForm({ ...addForm, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Cardiology, OPD, Pharmacy"
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                  />
                </div>
                {addForm.role === "doctor" && (
                  <div className="form-group">
                    <label>Medical Specialization</label>
                    <input
                      type="text"
                      placeholder="e.g. General Medicine, Orthopedics"
                      value={addForm.specialization}
                      onChange={(e) => setAddForm({ ...addForm, specialization: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {addForm.role === "doctor" && (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Experience (Years)</label>
                    <input
                      type="number"
                      min={0}
                      max={70}
                      value={addForm.experienceYears}
                      onChange={(e) => setAddForm({ ...addForm, experienceYears: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Consultation Fee (INR)</label>
                    <input
                      type="number"
                      min={0}
                      value={addForm.consultationFee}
                      onChange={(e) => setAddForm({ ...addForm, consultationFee: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Invite Staff */}
      {showInviteModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>
                <FiMail /> Generate Staff Invitation
              </h3>
              <button className="modal-close-btn" onClick={() => setShowInviteModal(false)}>
                <FiX />
              </button>
            </div>

            {!createdInviteLink ? (
              <form onSubmit={handleInviteStaffSubmit} className="modal-form">
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="invitee@hospital.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Candidate Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Sister Maria"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Assigned Role *</label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                      required
                    >
                      <option value="doctor">Doctor</option>
                      <option value="nurse">Nurse</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="lab_technician">Lab Technician</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="billing_staff">Billing Staff</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Link Expiration</label>
                    <select
                      value={inviteForm.expiryDays}
                      onChange={(e) => setInviteForm({ ...inviteForm, expiryDays: e.target.value })}
                    >
                      <option value={3}>3 Days</option>
                      <option value={7}>7 Days (Standard)</option>
                      <option value={14}>14 Days</option>
                    </select>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Generate Invitation Link
                  </button>
                </div>
              </form>
            ) : (
              <div className="invite-link-display">
                <p className="invite-success-text">
                  <FiCheckCircle className="icon-success" /> Single-use secure invitation link generated:
                </p>
                <div className="link-copy-box">
                  <input type="text" readOnly value={createdInviteLink} />
                  <button className="btn-primary btn-copy" onClick={copyInviteToClipboard}>
                    <FiCopy /> {copiedLink ? "Copied!" : "Copy Link"}
                  </button>
                </div>
                <p className="link-note">
                  Share this link with the staff member. When they open it, they will set their password and activate
                  their account directly into your hospital.
                </p>
                <div className="modal-actions">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setCreatedInviteLink(null);
                      setShowInviteModal(false);
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Staff */}
      {showEditModal && selectedStaff && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>
                <FiEdit2 /> Edit Staff Profile: {selectedStaff.name}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleEditStaffSubmit} className="modal-form">
              <div className="form-group">
                <label>Staff Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="lab_technician">Lab Technician</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="billing_staff">Billing Staff</option>
                  <option value="hospital_admin">Hospital Admin</option>
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  />
                </div>
                {editForm.role === "doctor" && (
                  <div className="form-group">
                    <label>Specialization</label>
                    <input
                      type="text"
                      value={editForm.specialization}
                      onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Deactivate / Reactivate Confirmation */}
      {showDeactivateModal && selectedStaff && (
        <div className="modal-backdrop">
          <div className="modal-dialog modal-dialog-sm">
            <div className="modal-header">
              <h3>
                {selectedStaff.status === "suspended" ? (
                  <>
                    <FiUserCheck /> Reactivate Staff Member
                  </>
                ) : (
                  <>
                    <FiUserX /> Deactivate Staff & Revoke Sessions
                  </>
                )}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowDeactivateModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body-content">
              {selectedStaff.status === "suspended" ? (
                <p>
                  Are you sure you want to reactivate <strong>{selectedStaff.name}</strong>? They will regain access to
                  the hospital platform.
                </p>
              ) : (
                <>
                  <p>
                    Are you sure you want to deactivate <strong>{selectedStaff.name}</strong>?
                  </p>
                  <div className="callout-alert">
                    <FiShield />
                    <span>
                      Immediate Session Revocation: This action immediately invalidates all active login sessions and
                      JWT tokens. Historical medical, appointment, and prescription records will remain intact.
                    </span>
                  </div>
                  <div className="form-group" style={{ marginTop: "1rem" }}>
                    <label>Reason for deactivation:</label>
                    <input
                      type="text"
                      placeholder="e.g. Leave of absence, contract termination"
                      value={deactivateReason}
                      onChange={(e) => setDeactivateReason(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDeactivateModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={selectedStaff.status === "suspended" ? "btn-primary" : "btn-danger"}
                onClick={handleDeactivateSubmit}
              >
                {selectedStaff.status === "suspended" ? "Confirm Reactivation" : "Confirm Deactivation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Register Patient */}
      {showPatientModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>
                <FiUserPlus /> Direct Patient Intake / Registration
              </h3>
              <button className="modal-close-btn" onClick={() => setShowPatientModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleRegisterPatientSubmit} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={patientForm.name}
                    onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="patient@email.com"
                    value={patientForm.email}
                    onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={patientForm.phoneNumber}
                    onChange={(e) => setPatientForm({ ...patientForm, phoneNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={patientForm.dateOfBirth}
                    onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Blood Group</label>
                  <select
                    value={patientForm.bloodGroup}
                    onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Street Address</label>
                <input
                  type="text"
                  placeholder="Address"
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPatientModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalAdminDashboard;

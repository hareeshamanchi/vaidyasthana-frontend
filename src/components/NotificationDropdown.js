import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiCheck,
  FiCalendar,
  FiFileText,
  FiShield,
  FiTrash2,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";
import { notificationsAPI } from "../services/api";
import { getSocket } from "../services/socket";
import { useLanguage } from "../context/LanguageContext";
import "./NotificationDropdown.css";

const formatRelativeTime = (dateString, isTelugu = false) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSec = Math.floor((now - date) / 1000);

  if (diffInSec < 30) return isTelugu ? "ఇప్పుడే" : "Just now";
  if (diffInSec < 60) return isTelugu ? `${diffInSec}సె క్రితం` : `${diffInSec}s ago`;
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return isTelugu ? `${diffInMin}ని క్రితం` : `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInSec / 60);
  if (diffInHours < 24) return isTelugu ? `${diffInHours}గం క్రితం` : `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return isTelugu ? `${diffInDays}రో క్రితం` : `${diffInDays}d ago`;
  return date.toLocaleDateString(isTelugu ? "te-IN" : "en-US", { month: "short", day: "numeric" });
};

const getNotificationIcon = (type) => {
  switch (type) {
    case "appointment_booked":
    case "appointment_confirmed":
    case "appointment_rejected":
    case "appointment_cancelled":
    case "appointment_completed":
      return <FiCalendar className="notif-icon-svg appointment" />;
    case "report_uploaded":
    case "report_analyzed":
      return <FiFileText className="notif-icon-svg report" />;
    case "security_alert":
      return <FiShield className="notif-icon-svg security" />;
    default:
      return <FiAlertCircle className="notif-icon-svg general" />;
  }
};

const NotificationDropdown = ({ user }) => {
  const { t, isTelugu } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Load unread count from server
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsAPI.getUnreadCount();
      if (res.data && typeof res.data.unreadCount === "number") {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      // Quietly fail or log warning if unauthenticated / offline
      console.warn("Failed to fetch notification unread count:", err.message);
    }
  }, [user]);

  // Load notifications list when opened
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsAPI.getNotifications({ limit: 25 });
      if (res.data && res.data.notifications) {
        setNotifications(res.data.notifications);
        if (typeof res.data.unreadCount === "number") {
          setUnreadCount(res.data.unreadCount);
        }
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(t("notifications.error", "Unable to load notifications. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  // Initial load & window focus listener
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    fetchUnreadCount();

    const handleFocus = () => {
      fetchUnreadCount();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, fetchUnreadCount]);

  // Real-time socket updates
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (data) => {
      if (data?.notification) {
        setNotifications((prev) => [
          data.notification,
          ...prev.filter((n) => n._id !== data.notification._id),
        ]);
      }
      if (typeof data?.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      } else {
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (notificationId, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 && notifications.every((n) => n.isRead)) return;
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const handleDeleteNotification = async (notificationId, e) => {
    if (e) e.stopPropagation();
    try {
      const target = notifications.find((n) => n._id === notificationId);
      await notificationsAPI.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif._id);
    }

    setIsOpen(false);

    if (notif.link) {
      navigate(notif.link);
    } else if (notif.type.startsWith("appointment_")) {
      navigate("/appointment");
    } else if (notif.type.startsWith("report_")) {
      navigate(user?.role === "doctor" ? "/doctor-dashboard" : "/dashboard");
    }
  };

  if (!user) return null;

  // Format count: > 99 becomes "99+"
  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        type="button"
        className={`notification-bell-btn ${isOpen ? "active" : ""}`}
        onClick={toggleDropdown}
        aria-label={`${t("notifications.title", "Notifications")} ${unreadCount > 0 ? `(${unreadCount} ${t("notifications.unreadCount", { count: unreadCount }, "unread")})` : ""}`}
        aria-expanded={isOpen}
        title={unreadCount > 0 ? `${unreadCount} ${t("notifications.unreadCount", { count: unreadCount }, "unread notification(s)")}` : t("notifications.title", "Notifications")}
      >
        <FiBell className="bell-icon" />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-live="polite">
            {displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown-panel" role="region" aria-label={t("notifications.title", "Notifications Panel")}>
          <div className="notification-panel-header">
            <div className="panel-title-wrap">
              <h3 className="panel-title">{t("notifications.title", "Notifications")}</h3>
              {unreadCount > 0 && (
                <span className="panel-unread-pill">{t("notifications.unreadCount", { count: unreadCount }, `${unreadCount} unread`)}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn-mark-all-read"
                onClick={handleMarkAllAsRead}
                title={t("notifications.markAllAsRead", "Mark all read")}
              >
                <FiCheckCircle size={14} /> {t("notifications.markAllAsRead", "Mark all read")}
              </button>
            )}
          </div>

          <div className="notification-list-body">
            {loading ? (
              <div className="notification-loading-state">
                <div className="notif-spinner"></div>
                <span>{t("notifications.checking", "Checking latest updates...")}</span>
              </div>
            ) : error ? (
              <div className="notification-error-state">
                <FiAlertCircle size={24} />
                <p>{error}</p>
                <button
                  type="button"
                  className="btn-retry-notifs"
                  onClick={fetchNotifications}
                >
                  {t("common.retry", "Retry")}
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty-state">
                <div className="empty-bell-icon-wrap">
                  <FiBell size={28} />
                </div>
                <h4 className="empty-title">{t("notifications.noNotifications", "No notifications yet")}</h4>
                <p className="empty-desc">
                  {t("notifications.caughtUpDesc", "You are all caught up! New appointment updates, report alerts, and messages will appear here.")}
                </p>
              </div>
            ) : (
              <ul className="notification-items-list">
                {notifications.map((notif) => (
                  <li
                    key={notif._id}
                    className={`notification-item ${!notif.isRead ? "unread" : "read"}`}
                    onClick={() => handleNotificationClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleNotificationClick(notif);
                      }
                    }}
                  >
                    <div className="notification-icon-col">
                      <div className={`notif-icon-badge ${notif.type}`}>
                        {getNotificationIcon(notif.type)}
                      </div>
                    </div>

                    <div className="notification-content-col">
                      <div className="notif-item-header">
                        <span className="notif-item-title">{notif.title}</span>
                        <span className="notif-item-time">
                          {formatRelativeTime(notif.createdAt, isTelugu)}
                        </span>
                      </div>
                      <p className="notif-item-message">{notif.message}</p>
                    </div>

                    <div className="notification-actions-col">
                      {!notif.isRead && (
                        <button
                          type="button"
                          className="btn-action-read"
                          onClick={(e) => handleMarkAsRead(notif._id, e)}
                          title={t("notifications.markAllAsRead", "Mark as read")}
                          aria-label={t("notifications.markAllAsRead", "Mark as read")}
                        >
                          <span className="unread-dot" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-action-delete"
                        onClick={(e) => handleDeleteNotification(notif._id, e)}
                        title={t("common.delete", "Remove notification")}
                        aria-label={t("common.delete", "Remove notification")}
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-panel-footer">
              <span className="footer-status-text">
                {t("notifications.encryptedUpdates", "Encrypted clinical alerts & updates")}
              </span>
              {unreadCount === 0 && (
                <span className="footer-all-read">
                  <FiCheck size={13} /> {t("notifications.allCaughtUp", "All caught up")}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;

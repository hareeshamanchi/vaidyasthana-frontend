/**
 * Vaidyasthana Background Service Worker
 * Handles Web Push events for medication dose reminders when the browser tab is closed.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Medication Reminder - Vaidyasthana",
    body: "Time for your scheduled medication dose. Open Vaidyasthana to take or snooze.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "medication-due-reminder",
    data: { url: "/medications" },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch (e) {
      payload.body = event.data.text() || payload.body;
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || "/favicon.ico",
    badge: payload.badge || "/favicon.ico",
    tag: payload.tag || "medication-due-reminder",
    renotify: true, // Re-triggers OS chime/vibrate on repeating reminders
    requireInteraction: true, // Remains on screen until patient takes action
    data: payload.data || { url: "/medications" },
    actions: [
      { action: "open", title: "Open Reminders" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/medications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a tab is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // If no tab is open, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

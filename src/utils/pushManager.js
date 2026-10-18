/**
 * Vaidyasthana Web Push Manager
 * Orchestrates Service Worker registration, VAPID key conversion, and Push API subscriptions.
 */

import { pushAPI } from "../services/api";

const PUSH_SUBSCRIBED_KEY = "vaidyasthana_push_subscribed";

/**
 * Checks whether Web Push and Service Workers are supported in the current browser.
 */
export const isPushSupported = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return Boolean(
    "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
  );
};

/**
 * Converts a URL-safe Base64 string into a Uint8Array buffer for applicationServerKey.
 */
export const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Registers the background service worker (/sw.js).
 */
export const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (error) {
    console.warn("[PUSH_MANAGER] Service Worker registration failed:", error.message);
    return null;
  }
};

/**
 * Retrieves the current push subscription if active.
 */
export const getActivePushSubscription = async () => {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.warn("[PUSH_MANAGER] Error checking push subscription:", error.message);
    return null;
  }
};

/**
 * Requests notification permission, registers service worker, and subscribes to push notifications.
 */
export const subscribeUserToPush = async (vapidKeyOverride) => {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported on this browser.");
  }

  // 1. Request browser notification permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied or dismissed.");
  }

  // 2. Fetch VAPID public key from backend if not passed
  let publicKey = vapidKeyOverride;
  if (!publicKey) {
    try {
      const res = await pushAPI.getVapidKey();
      if (res.data?.success && res.data.publicKey) {
        publicKey = res.data.publicKey;
      }
    } catch (err) {
      console.warn("[PUSH_MANAGER] Could not fetch VAPID key from backend, using fallback:", err.message);
    }
  }

  if (!publicKey) {
    publicKey =
      "BD22SpLbtSvX8TsZBJS09Zf7v5oTnOYxncR_2uCbW-hLneNFm-4x2KAXyqZJaaPaQfnw_ZHVJjydt45Gy0CIq34";
  }

  // 3. Ensure Service Worker is registered and ready
  await registerServiceWorker();
  const registration = await navigator.serviceWorker.ready;

  // 4. Check for existing subscription or create a new one
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const convertedVapidKey = urlBase64ToUint8Array(publicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
  }

  // 5. Send subscription to backend
  if (subscription) {
    const rawSub = subscription.toJSON();
    await pushAPI.subscribe(rawSub);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(PUSH_SUBSCRIBED_KEY, "true");
    }
  }

  return subscription;
};

/**
 * Unsubscribes the user from push notifications and deletes backend subscription.
 */
export const unsubscribeUserFromPush = async () => {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      try {
        await pushAPI.unsubscribe(endpoint);
      } catch (e) {
        // Safe ignore backend cleanup error
      }
    }

    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(PUSH_SUBSCRIBED_KEY);
    }
    return true;
  } catch (error) {
    console.warn("[PUSH_MANAGER] Error unsubscribing:", error.message);
    return false;
  }
};

/**
 * Checks overall status of push notifications.
 */
export const checkPushStatus = async () => {
  const supported = isPushSupported();
  if (!supported) {
    return {
      isSupported: false,
      permission: "unsupported",
      isSubscribed: false,
    };
  }

  const permission = Notification.permission;
  let isSubscribed = false;

  try {
    const sub = await getActivePushSubscription();
    isSubscribed = Boolean(sub);
  } catch {
    isSubscribed = false;
  }

  return {
    isSupported: true,
    permission,
    isSubscribed,
  };
};

import {
  isPushSupported,
  urlBase64ToUint8Array,
  registerServiceWorker,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  checkPushStatus,
} from "./pushManager";
import { pushAPI } from "../services/api";

jest.mock("../services/api", () => ({
  pushAPI: {
    getVapidKey: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    testPush: jest.fn(),
  },
}));

describe("pushManager utility suite", () => {
  let mockSubscription;
  let mockPushManager;
  let mockRegistration;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    mockSubscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/fake-token-123",
      toJSON: jest.fn().mockReturnValue({
        endpoint: "https://fcm.googleapis.com/fcm/send/fake-token-123",
        keys: { p256dh: "key123", auth: "auth123" },
      }),
      unsubscribe: jest.fn().mockResolvedValue(true),
    };

    mockPushManager = {
      getSubscription: jest.fn().mockResolvedValue(null),
      subscribe: jest.fn().mockResolvedValue(mockSubscription),
    };

    mockRegistration = {
      scope: "/",
      pushManager: mockPushManager,
    };

    Object.defineProperty(global, "Notification", {
      value: {
        permission: "granted",
        requestPermission: jest.fn().mockResolvedValue("granted"),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global.navigator, "serviceWorker", {
      value: {
        register: jest.fn().mockResolvedValue(mockRegistration),
        ready: Promise.resolve(mockRegistration),
      },
      writable: true,
      configurable: true,
    });

    window.PushManager = {};
  });

  test("urlBase64ToUint8Array converts URL-safe base64 string to Uint8Array buffer", () => {
    const testBase64 = "BD22SpLbtSvX8TsZBJS09Zf7v5oTnOYxncR_2uCbW-hLneNFm-4x2KAXyqZJaaPaQfnw_ZHVJjydt45Gy0CIq34";
    const buffer = urlBase64ToUint8Array(testBase64);
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
  });

  test("isPushSupported returns true when browser capabilities are present", () => {
    const supported = isPushSupported();
    expect(typeof supported).toBe("boolean");
    expect(supported).toBe(true);
  });

  test("registerServiceWorker calls navigator.serviceWorker.register with /sw.js", async () => {
    const reg = await registerServiceWorker();
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
    });
    expect(reg).toBe(mockRegistration);
  });

  test("subscribeUserToPush requests permission, subscribes, and saves to backend API", async () => {
    pushAPI.getVapidKey.mockResolvedValueOnce({
      data: {
        success: true,
        publicKey: "BD22SpLbtSvX8TsZBJS09Zf7v5oTnOYxncR_2uCbW-hLneNFm-4x2KAXyqZJaaPaQfnw_ZHVJjydt45Gy0CIq34",
      },
    });
    pushAPI.subscribe.mockResolvedValueOnce({
      data: { success: true },
    });

    const sub = await subscribeUserToPush();
    expect(Notification.requestPermission).toHaveBeenCalled();
    expect(mockPushManager.subscribe).toHaveBeenCalled();
    expect(pushAPI.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "https://fcm.googleapis.com/fcm/send/fake-token-123",
      })
    );
    expect(localStorage.getItem("vaidyasthana_push_subscribed")).toBe("true");
    expect(sub).toBe(mockSubscription);
  });

  test("unsubscribeUserFromPush calls unsubscribe and informs backend API", async () => {
    mockPushManager.getSubscription.mockResolvedValueOnce(mockSubscription);
    pushAPI.unsubscribe.mockResolvedValueOnce({ data: { success: true } });

    const res = await unsubscribeUserFromPush();
    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    expect(pushAPI.unsubscribe).toHaveBeenCalledWith(mockSubscription.endpoint);
    expect(localStorage.getItem("vaidyasthana_push_subscribed")).toBe(null);
    expect(res).toBe(true);
  });

  test("checkPushStatus returns comprehensive device support state", async () => {
    mockPushManager.getSubscription.mockResolvedValueOnce(mockSubscription);

    const status = await checkPushStatus();
    expect(status.isSupported).toBe(true);
    expect(status.permission).toBe("granted");
    expect(status.isSubscribed).toBe(true);
  });
});

import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";

let socketInstance = null;

/**
 * Initializes or returns the existing Socket.IO connection.
 * Authenticates using the JWT token stored in localStorage.
 */
export const getSocket = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
    return null;
  }

  // If instance exists, verify token matches
  if (socketInstance) {
    if (socketInstance.auth?.token !== token) {
      socketInstance.disconnect();
      socketInstance = null;
    } else if (socketInstance.connected) {
      return socketInstance;
    }
  }

  const SOCKET_URL = API_BASE_URL;

  socketInstance = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socketInstance.on("connect", () => {
    // Connected to Socket.IO server
  });

  socketInstance.on("connect_error", (err) => {
    console.warn("Socket connection error:", err.message);
  });

  return socketInstance;
};

/**
 * Disconnect and tear down the socket instance (e.g. on logout)
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

// src/socket.js
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export const socket = io(SERVER_URL, {
  transports: ["websocket"],
  reconnection: true,
});

socket.on("connect", () => console.log("✅ Connesso al server:", socket.id));
socket.on("disconnect", () => console.log("❌ Disconnesso dal server"));

export default socket;

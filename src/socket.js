// src/socket.js
import { io } from "socket.io-client";

const socket = io("https://fortuna-online-server.onrender.com", {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

socket.on("connect", () => {
  console.log("🔌 Connesso al server Socket.IO:", socket.id);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnesso dal server Socket.IO");
});

export default socket;

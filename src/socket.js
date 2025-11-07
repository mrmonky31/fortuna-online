// src/socket.js
import { io } from "socket.io-client";

const SERVER_URL = "https://fortuna-online-server.onrender.com";

const socket = io(SERVER_URL, {
  reconnection: true,
});

socket.on("connect", () => {
  console.log("✅ Connesso al server:", socket.id);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnesso dal server");
});

export default socket;

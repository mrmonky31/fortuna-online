import { io } from "socket.io-client";

export const socket = io("https://fortuna-online-server.onrender.com", {
  transports: ["websocket"],
  reconnection: true,
});

socket.on("connect", () => console.log("✅ Connesso al server:", socket.id));
socket.on("disconnect", () => console.log("❌ Disconnesso dal server"));

export default socket;

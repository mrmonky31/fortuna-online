import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// 🔥 RIMOSSO React.StrictMode perché causa doppia esecuzione degli useEffect
// in development, creando conflitti con il lucchetto del Time Challenge
ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);

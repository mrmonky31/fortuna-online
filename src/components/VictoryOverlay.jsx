// src/components/VictoryOverlay.jsx
import React from "react";
import "../styles/effects.css";

export default function VictoryOverlay({ show, winnerName }) {
  if (!show) return null;
  return (
    <div className="victory-overlay">
      <div className="victory-burst" />
      <div className="victory-text">VITTORIA{winnerName ? `: ${winnerName}` : ""}</div>
    </div>
  );
}

// src/components/PlayersPanel.jsx
import React from "react";
import "../styles/game-layout.css";

export default function PlayersPanel({ players, currentIndex }) {
  return (
    <div className="players-panel">
      {players.map((p, idx) => (
        <div
          key={idx}
          className={`player-box ${idx === currentIndex ? "active" : ""}`}
        >
          <div className="player-name">{p.name}</div>
          <div className="player-round">Round: <strong>{p.roundScore}</strong></div>
          <div className="player-total">Totale: <strong>{p.totalScore}</strong></div>
        </div>
      ))}
    </div>
  );
}

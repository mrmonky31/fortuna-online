// src/compmonents/FinalScoreboard.jsx
import React from "react";

export default function FinalScoreboard({ players = [], onRestartGame, onBackToLobby }) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 20 }}>
      <h2>Classifica finale</h2>
      <div style={{ width: 380 }}>
        {sorted.map((p, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.9)",
            color: "#000", marginBottom: 8, border: "2px solid #000"
          }}>
            <div style={{ fontWeight: 900 }}>{i + 1}</div>
            <div style={{ fontWeight: 700 }}>{p.name}</div>
            <div style={{ fontWeight: 900 }}>{p.totalScore}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6 }}>
        <button className="btn-primary" onClick={onRestartGame}>Ricomincia partita</button>
        <button className="btn-secondary" style={{ marginLeft: 8 }} onClick={onBackToLobby}>Menu principale</button>
      </div>
    </div>
  );
}
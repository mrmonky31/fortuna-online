// src/components/OnlinePlayers.jsx
import React from "react";

export default function OnlinePlayers({ room, playerName, role, roomCode }) {
  if (!room) return null;

  const players = room.players || [];
  const spectators = room.spectators || [];
  const totalRounds = room.totalRounds || 3;

  return (
    <div className="online-players-container">
      {/* Codice Stanza */}
      <div className="room-code-display">
        🎯 STANZA: {roomCode || "N/A"}
      </div>

      {/* Info Round */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: "10px 0", fontSize: "1.2rem", color: "#00d4aa" }}>
          🎲 Round: {totalRounds}
        </h3>
      </div>

      {/* Giocatori */}
      {players.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3>👥 Giocatori ({players.length})</h3>
          <ul>
            {players.map((p, idx) => (
              <li key={idx} style={{
                background: p.name === playerName ? "rgba(0, 255, 85, 0.2)" : "rgba(0, 255, 85, 0.1)"
              }}>
                {p.name === playerName ? "👉 " : ""}
                {p.name || `Giocatore ${idx + 1}`}
                {p.isHost && " 👑"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Spettatori */}
      {spectators.length > 0 && (
        <div>
          <h3>👀 Spettatori ({spectators.length})</h3>
          <ul>
            {spectators.map((s, idx) => (
              <li key={idx} style={{ opacity: 0.7 }}>
                {s.name || `Spettatore ${idx + 1}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Messaggio in attesa */}
      {role === "player" && players.length === 1 && (
        <p style={{
          textAlign: "center",
          color: "#00d4aa",
          marginTop: "20px",
          fontSize: "1.1rem",
          fontStyle: "italic"
        }}>
          ⏳ In attesa di altri giocatori...
        </p>
      )}

      {role === "host" && (
        <p style={{
          textAlign: "center",
          color: "#ffcc00",
          marginTop: "20px",
          fontSize: "1rem",
          fontWeight: "bold"
        }}>
          👑 Sei l'host - Premi "INIZIA PARTITA" quando pronti
        </p>
      )}
    </div>
  );
}
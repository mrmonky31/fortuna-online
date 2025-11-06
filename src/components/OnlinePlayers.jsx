// src/components/OnlinePlayers.jsx
import React from "react";

export default function OnlinePlayers({ room, playerName, role, roomCode }) {
  return (
    <div className="online-players">
      <h3>Stanza pronta</h3>
      {roomCode && (
        <p className="room-code">
          Codice stanza: <strong>{roomCode}</strong>
        </p>
      )}
      <p>
        Tu sei <strong>{playerName}</strong> ({role})
      </p>

      <div className="online-cols">
        <div>
          <h4>Giocatori ({room.players.length}/4)</h4>
          <ul>
            {room.players.map((p, i) => (
              <li key={i}>{p.name}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4>Spettatori ({room.spectators.length}/10)</h4>
          <ul>
            {room.spectators.map((s, i) => (
              <li key={i}>{s.name}</li>
            ))}
          </ul>
        </div>
      </div>

      <p>Round totali: {room.totalRounds}</p>
    </div>
  );
}

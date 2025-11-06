// src/components/LobbyForm.jsx
import React, { useState } from "react";

export default function LobbyForm({ onCreate, onJoin, onSpectate, error }) {
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [rounds, setRounds] = useState(3);

  const handleCreateClick = () => {
    onCreate(name || "Giocatore", rounds, roomName || null);
  };

  const handleJoinClick = () => {
    if (!roomCode) return;
    onJoin(name || "Giocatore", roomCode);
  };

  const handleSpectateClick = () => {
    if (!roomCode) return;
    onSpectate(name || "Spettatore", roomCode);
  };

  return (
    <div className="lobby-form">
      <h2>RUOTA DELLA FORTUNA ONLINE</h2>

      <div className="lobby-field">
        <label>Il tuo nome</label>
        <input
          type="text"
          placeholder="Marco, Zia, Kimberly..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="lobby-field">
        <label>Nome stanza ()</label>
        <input
        
          type="text"
          
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
      </div>

      <div className="lobby-field">
        <label>Round totali</label>
        <input
          type="number"
          min={1}
          max={10}
          value={rounds}
          onChange={(e) => setRounds(Number(e.target.value) || 3)}
        />
      </div>

      <button onClick={handleCreateClick}>🌀 Crea stanza</button>

      <hr />

      <div className="lobby-field">
       <label>Codice stanza o invito</label>
       <input
          type="text"
          placeholder="ABCD o nome"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />
      </div>

      <div className="lobby-buttons-row">
        <button onClick={handleJoinClick}>🎮 Entra come giocatore</button>
        <button onClick={handleSpectateClick}>👀 Entra come spettatore</button>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}

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
  if (!roomCode) {
    console.log("❌ Nessun codice stanza inserito");
    return;
  }
  console.log("➡️ Tentativo di ingresso stanza:", roomCode);
  onJoin(name || "Giocatore", roomCode);
};

  const handleSpectateClick = () => {
    if (!roomCode) return;
    onSpectate(name || "Spettatore", roomCode);
  };

  return (
    <div className="lobby-form" style={{ textAlign: "center", lineHeight: "1.6em" }}>
      <h2>RUOTA DELLA FORTUNA ONLINE</h2>

      <div className="lobby-field" style={{ marginBottom: "12px" }}>
        <label>Il tuo nome</label>
        <br />
        <input
          type="text"
          placeholder="Marco, Zia, Kimberly..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="lobby-field" style={{ marginBottom: "12px" }}>
        <label>Nome stanza (facoltativo)</label>
        <br />
        <input
          type="text"
          placeholder="es. ORCHIDEA o NATALE"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
      </div>

      <div className="lobby-field" style={{ marginBottom: "15px" }}>
        <label>Round totali</label>
        <br />
        <input
          type="number"
          min={1}
          max={10}
          value={rounds}
          onChange={(e) => setRounds(Number(e.target.value) || 3)}
        />
      </div>

      <button style={{ marginBottom: "20px" }} onClick={handleCreateClick}>
        🌀 Crea stanza
      </button>

      <hr style={{ margin: "25px 0" }} />

      <div className="lobby-field" style={{ marginBottom: "15px" }}>
        <label>Codice stanza o invito</label>
        <br />
        <input
          type="text"
          placeholder="ABCD o nome stanza"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />
      </div>

      <div className="lobby-buttons-row" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button onClick={handleJoinClick}>🎮 Entra come giocatore</button>
        <button onClick={handleSpectateClick}>👀 Entra come spettatore</button>
      </div>

      {error && <p className="error" style={{ color: "red", marginTop: "20px" }}>{error}</p>}
    </div>
  );
}

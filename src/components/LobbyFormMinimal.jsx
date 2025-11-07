// src/components/LobbyFormMinimal.jsx
import React, { useState } from "react";

export default function LobbyFormMinimal({ onCreate, onJoin, onSpectate, error }) {
  const [step, setStep] = useState("home"); // home | create-name | create-role | join-name | join-role
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");

  const handleCreate = () => {
    if (!roomName.trim()) return;
    setStep("create-role");
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    setStep("join-role");
  };

  const handleEnterAsPlayer = (isJoin) => {
    if (!playerName.trim()) return;
    if (isJoin) {
      onJoin(playerName, roomCode);
    } else {
      onCreate(playerName, 3, roomName);
    }
  };

  const handleEnterAsSpectator = (isJoin) => {
    if (isJoin) {
      onSpectate("Spettatore", roomCode);
    } else {
      onSpectate("Spettatore", roomName);
    }
  };

  return (
    <div className="lobby-form-minimal" style={{ textAlign: "center", lineHeight: "1.6em" }}>
      <h2>RUOTA DELLA FORTUNA ONLINE</h2>

      {step === "home" && (
        <>
          <button onClick={() => setStep("create-name")} style={{ marginBottom: "10px" }}>
            🌀 Crea stanza
          </button>
          <br />
          <button onClick={() => setStep("join-name")}>🎮 Unisciti a stanza</button>
        </>
      )}

      {step === "create-name" && (
        <>
          <label>Nome stanza</label>
          <br />
          <input
            type="text"
            placeholder="es. ORCHIDEA"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <br />
          <button onClick={handleCreate} style={{ marginTop: "15px" }}>
            Continua ➜
          </button>
          <br />
          <button onClick={() => setStep("home")} style={{ marginTop: "10px" }}>
            ⬅️ Indietro
          </button>
        </>
      )}

      {step === "create-role" && (
        <>
          <p>Entra come:</p>
          <button onClick={() => setStep("create-player")} style={{ marginBottom: "10px" }}>
            🎮 Giocatore
          </button>
          <br />
          <button onClick={() => handleEnterAsSpectator(false)}>👀 Spettatore</button>
          <br />
          <button onClick={() => setStep("create-name")} style={{ marginTop: "10px" }}>
            ⬅️ Indietro
          </button>
        </>
      )}

      {step === "create-player" && (
        <>
          <label>Nome giocatore</label>
          <br />
          <input
            type="text"
            placeholder="es. Marco"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <br />
          <button onClick={() => handleEnterAsPlayer(false)} style={{ marginTop: "15px" }}>
            Entra in gioco
          </button>
          <br />
          <button onClick={() => setStep("create-role")} style={{ marginTop: "10px" }}>
            ⬅️ Indietro
          </button>
        </>
      )}

      {step === "join-name" && (
        <>
          <label>Codice o nome stanza</label>
          <br />
          <input
            type="text"
            placeholder="es. ORCHIDEA"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
          />
          <br />
          <button onClick={handleJoin} style={{ marginTop: "15px" }}>
            Continua ➜
          </button>
          <br />
          <button onClick={() => setStep("home")} style={{ marginTop: "10px" }}>
            ⬅️ Indietro
          </button>
        </>
      )}

      {step === "join-role" && (
        <>
          <p>Entra come:</p>
          <button onClick={() => setStep("join-player")} style={{ marginBottom: "10px" }}>
            🎮 Giocatore
          </button>
          <br />
          <button onClick={() => handleEnterAsSpectator(true)}>👀 Spettatore</button>
          <br />
          <button onClick={() => setStep("join-name")} style={{ marginTop: "10px" }}>
            ⬅️ Indietro
          </button>
        </>
      )}

      {step === "join-player" && (
        <>
          <label>Nome giocatore</label>
          <br />
          <input
            type="text"
            placeholder="es. Marco"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <br />
          <button onClick={() => handleEnterAsPlayer(true)} style={{ marginTop: "15px" }}>
            Entra in gioco
          </button>
          <br />
          <button onClick={() => setStep("join-role")} style={{ marginTop: "10px" }}>
            ⬅️ Indietro
          </button>
        </>
      )}

      {error && <p className="error" style={{ color: "red", marginTop: "20px" }}>{error}</p>}
    </div>
  );
}

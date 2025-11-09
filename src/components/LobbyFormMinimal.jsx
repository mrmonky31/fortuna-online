// src/components/LobbyFormMinimal.jsx
import React, { useState, useEffect, useRef } from "react";

export default function LobbyFormMinimal({ onCreate, onJoin, onSpectate, error }) {
  const [step, setStep] = useState("home");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  
  // Refs per auto-focus
  const roomNameInputRef = useRef(null);
  const roomCodeInputRef = useRef(null);
  const playerNameInputRef = useRef(null);

  // Auto-focus quando cambia lo step
  useEffect(() => {
    const focusTimeout = setTimeout(() => {
      if (step === "create-name" && roomNameInputRef.current) {
        roomNameInputRef.current.focus();
      } else if (step === "join-name" && roomCodeInputRef.current) {
        roomCodeInputRef.current.focus();
      } else if ((step === "create-player" || step === "join-player") && playerNameInputRef.current) {
        playerNameInputRef.current.focus();
      }
    }, 100); // Piccolo delay per assicurare il render

    return () => clearTimeout(focusTimeout);
  }, [step]);

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

  // Handler per premere Enter negli input
  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="lobby-form-minimal">
      <h1>🎡 RUOTA DELLA FORTUNA</h1>
      <h2>ONLINE</h2>

      {step === "home" && (
        <div className="inputs-row">
          <button onClick={() => setStep("create-name")}>
            🌀 CREA STANZA
          </button>
          <button onClick={() => setStep("join-name")}>
            🎮 UNISCITI A STANZA
          </button>
        </div>
      )}

      {step === "create-name" && (
        <div className="inputs-row">
          <label className="form-label">Nome della stanza</label>
          <input
            ref={roomNameInputRef}
            type="text"
            placeholder="es. ORCHIDEA"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleCreate)}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <button onClick={handleCreate} disabled={!roomName.trim()}>
            CONTINUA ➜
          </button>
          <button onClick={() => setStep("home")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>
      )}

      {step === "create-role" && (
        <div className="inputs-row">
          <h2>Entra come:</h2>
          <button onClick={() => setStep("create-player")}>
            🎮 GIOCATORE
          </button>
          <button onClick={() => handleEnterAsSpectator(false)}>
            👀 SPETTATORE
          </button>
          <button onClick={() => setStep("create-name")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>
      )}

      {step === "create-player" && (
        <div className="inputs-row">
          <label className="form-label">Il tuo nome</label>
          <input
            ref={playerNameInputRef}
            type="text"
            placeholder="es. Marco"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, () => handleEnterAsPlayer(false))}
            autoComplete="off"
          />
          <button onClick={() => handleEnterAsPlayer(false)} disabled={!playerName.trim()}>
            ENTRA IN GIOCO
          </button>
          <button onClick={() => setStep("create-role")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>
      )}

      {step === "join-name" && (
        <div className="inputs-row">
          <label className="form-label">Codice stanza</label>
          <input
            ref={roomCodeInputRef}
            type="text"
            placeholder="es. ORCHIDEA"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => handleKeyPress(e, handleJoin)}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <button onClick={handleJoin} disabled={!roomCode.trim()}>
            CONTINUA ➜
          </button>
          <button onClick={() => setStep("home")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>
      )}

      {step === "join-role" && (
        <div className="inputs-row">
          <h2>Entra come:</h2>
          <button onClick={() => setStep("join-player")}>
            🎮 GIOCATORE
          </button>
          <button onClick={() => handleEnterAsSpectator(true)}>
            👀 SPETTATORE
          </button>
          <button onClick={() => setStep("join-name")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>
      )}

      {step === "join-player" && (
        <div className="inputs-row">
          <label className="form-label">Il tuo nome</label>
          <input
            ref={playerNameInputRef}
            type="text"
            placeholder="es. Marco"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, () => handleEnterAsPlayer(true))}
            autoComplete="off"
          />
          <button onClick={() => handleEnterAsPlayer(true)} disabled={!playerName.trim()}>
            ENTRA IN GIOCO
          </button>
          <button onClick={() => setStep("join-role")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
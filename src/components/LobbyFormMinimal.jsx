// src/components/LobbyFormMinimal.jsx
import React, { useState, useEffect, useRef } from "react";

export default function LobbyFormMinimal({ onCreate, onJoin, onSpectate, error }) {
  const [step, setStep] = useState("home");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false); // ← NUOVO stato loading
  
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
      } else if ((step === "create-role" || step === "join-role") && playerNameInputRef.current) {
        playerNameInputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(focusTimeout);
  }, [step]);

  const handleCreate = () => {
    if (!roomName.trim()) return;
    // ← Avvia il check del server
    fetch(`${import.meta.env.VITE_SERVER_URL || 'https://fortunaonline.onrender.com'}/health`)
      .catch(() => {}); // Silent check, non serve gestire la risposta
    setStep("create-role");
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    // ← Avvia il check del server
    fetch(`${import.meta.env.VITE_SERVER_URL || 'https://fortunaonline.onrender.com'}/health`)
      .catch(() => {}); // Silent check, non serve gestire la risposta
    setStep("join-role");
  };

  const handleEnterAsPlayer = async (isJoin) => {
    if (!playerName.trim()) return;
    
    setLoading(true); // Mostra loading
    
    try {
      // Aspetta che il server risponda
      await fetch(`${import.meta.env.VITE_SERVER_URL || 'https://fortunaonline.onrender.com'}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Server pronto, procedi
      if (isJoin) {
        onJoin(playerName, roomCode);
      } else {
        onCreate(playerName, 3, roomName);
      }
    } catch (error) {
      // Se il server non risponde, riprova
      setTimeout(() => handleEnterAsPlayer(isJoin), 2000);
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
            🎮 ENTRA COME GIOCATORE
          </button>
          <button onClick={() => handleEnterAsSpectator(false)}>
            👀 ENTRA COME SPETTATORE
          </button>
          <button onClick={() => setStep("create-name")} className="btn-secondary">
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
            🎮 ENTRA COME GIOCATORE
          </button>
          <button onClick={() => handleEnterAsSpectator(true)}>
            👀 ENTRA COME SPETTATORE
          </button>
          <button onClick={() => setStep("join-name")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {/* Overlay loading che appare sopra tutto */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11, 11, 15, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            border: '6px solid rgba(0, 255, 85, 0.2)',
            borderTop: '6px solid #00ff55',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{
            marginTop: '30px',
            fontSize: '1.2rem',
            color: '#fff',
            fontWeight: 600
          }}>
            🛠️ Sto oliando la ruota...
          </div>
        </div>
      )}
    </div>
  );
}
// src/components/LobbyFormMinimal.jsx
import React, { useState, useEffect, useRef } from "react";

export default function LobbyFormMinimal({ onCreate, onJoin, onSpectate, error }) {
  const [step, setStep] = useState("home");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false); // ← NUOVO: per mostrare scritta
  const [totalRounds, setTotalRounds] = useState(3); // ← NUOVO: numero di round
  
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
    setStep("create-role");
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    setStep("join-role");
  };

  const handleEnterAsPlayer = (isJoin) => {
    if (!playerName.trim()) return;
    
    setLoading(true); // ← Mostra scritta
    
    // Chiama subito onCreate/onJoin
    if (isJoin) {
      onJoin(playerName, roomCode);
    } else {
      onCreate(playerName, totalRounds, roomName); // ← Passa totalRounds
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
          
          <label className="form-label" style={{ marginTop: '20px' }}>Numero di round</label>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '20px',
            margin: '10px 0'
          }}>
            <button 
              onClick={() => setTotalRounds(prev => Math.max(1, prev - 1))}
              style={{
                width: '60px',
                height: '60px',
                fontSize: '2rem',
                padding: '0',
                minWidth: 'auto'
              }}
            >
              −
            </button>
            <div style={{
              fontSize: '3rem',
              fontWeight: '900',
              color: '#00ff55',
              minWidth: '80px',
              textAlign: 'center'
            }}>
              {totalRounds}
            </div>
            <button 
              onClick={() => setTotalRounds(prev => Math.min(10, prev + 1))}
              style={{
                width: '60px',
                height: '60px',
                fontSize: '2rem',
                padding: '0',
                minWidth: 'auto'
              }}
            >
              +
            </button>
          </div>
          
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
          <button onClick={() => handleEnterAsPlayer(false)} disabled={!playerName.trim() || loading}>
            🎮 ENTRA COME GIOCATORE
          </button>
          <button onClick={() => handleEnterAsSpectator(false)}>
            👀 ENTRA COME SPETTATORE
          </button>
          <button onClick={() => setStep("create-name")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
          
          {/* Scritta che appare quando loading è true */}
          {loading && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: 'rgba(0, 255, 85, 0.1)',
              border: '2px solid #00ff55',
              borderRadius: '10px',
              color: '#00ff55',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              🛠️ Sto oliando la ruota... Un attimo di pazienza!
            </div>
          )}
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
          <button onClick={() => handleEnterAsPlayer(true)} disabled={!playerName.trim() || loading}>
            🎮 ENTRA COME GIOCATORE
          </button>
          <button onClick={() => handleEnterAsSpectator(true)}>
            👀 ENTRA COME SPETTATORE
          </button>
          <button onClick={() => setStep("join-name")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
          
          {/* Scritta che appare quando loading è true */}
          {loading && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: 'rgba(0, 255, 85, 0.1)',
              border: '2px solid #00ff55',
              borderRadius: '10px',
              color: '#00ff55',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              🛠️ Sto oliando la ruota... Un attimo di pazienza!
            </div>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
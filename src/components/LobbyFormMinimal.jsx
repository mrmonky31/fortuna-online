// src/components/LobbyFormMinimal.jsx
import React, { useState, useEffect, useRef } from "react";

export default function LobbyFormMinimal({ onCreate, onJoin, onSpectate, error }) {
  const [step, setStep] = useState("home");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalRounds, setTotalRounds] = useState(3);
  const [gameMode, setGameMode] = useState("classic"); // classic | presenter | timeChallenge
  
  // Time Challenge settings
  const [numFrasi, setNumFrasi] = useState(1);
  const [numMatch, setNumMatch] = useState(1);
  const [timerFrase, setTimerFrase] = useState(0);
  const [timerMatch, setTimerMatch] = useState(0);
  
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
    setStep("select-mode"); // Prima scegli modalità
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    setStep("join-role");
  };

  const handleEnterAsPlayer = (isJoin) => {
    if (!playerName.trim()) return;
    
    setLoading(true);
    
    if (isJoin) {
      onJoin(playerName, roomCode);
    } else {
      const timeChallengeSettings = gameMode === "timeChallenge" ? {
        numFrasi,
        numMatch,
        timerFrase,
        timerMatch
      } : null;
      
      onCreate(playerName, totalRounds, roomName, gameMode, timeChallengeSettings);
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

      {step === "select-mode" && (
        <div className="inputs-row">
          <h2>Scegli modalità:</h2>
          <button 
            onClick={() => {
              setGameMode("classic");
              setStep("create-role");
            }}
            style={{
              padding: '20px',
              fontSize: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '2rem' }}>🎮</div>
            <div style={{ fontWeight: 'bold' }}>CLASSICA</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Tutti giocano normalmente</div>
          </button>
          
          <button 
            onClick={() => {
              setGameMode("presenter");
              setPlayerName("Presentatore");
              setLoading(true);
              onCreate("Presentatore", totalRounds, roomName, "presenter");
            }}
            style={{
              padding: '20px',
              fontSize: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '2rem' }}>🎙️</div>
            <div style={{ fontWeight: 'bold' }}>PRESENTATORE</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>L'host gestisce il gioco</div>
          </button>
          
          <button 
            onClick={() => {
              setGameMode("timeChallenge");
              setStep("time-challenge-settings");
            }}
            style={{
              padding: '20px',
              fontSize: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '2rem' }}>⏱️</div>
            <div style={{ fontWeight: 'bold' }}>SFIDA A TEMPO</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Gara contro il tempo</div>
          </button>
          
          {loading && (
            <div style={{
              margin: '15px 0',
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
          
          <button onClick={() => setStep("create-name")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>
      )}

      {step === "time-challenge-settings" && (
        <div className="inputs-row">
          <h2>Configura Partita:</h2>
          
          <label className="form-label">Numero di FRASI</label>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '20px',
            margin: '10px 0'
          }}>
            <button 
              onClick={() => setNumFrasi(prev => Math.max(1, prev - 1))}
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
              {numFrasi}
            </div>
            <button 
              onClick={() => setNumFrasi(prev => Math.min(50, prev + 1))}
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

          <label className="form-label" style={{ marginTop: '20px' }}>Numero di MATCH</label>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '20px',
            margin: '10px 0'
          }}>
            <button 
              onClick={() => setNumMatch(prev => Math.max(1, prev - 1))}
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
              {numMatch}
            </div>
            <button 
              onClick={() => setNumMatch(prev => Math.min(10, prev + 1))}
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

          <label className="form-label" style={{ marginTop: '20px' }}>Timer FRASE (secondi)</label>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '20px',
            margin: '10px 0'
          }}>
            <button 
              onClick={() => setTimerFrase(prev => Math.max(0, prev - 30))}
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
              minWidth: '120px',
              textAlign: 'center'
            }}>
              {timerFrase === 0 ? '∞' : timerFrase}
            </div>
            <button 
              onClick={() => setTimerFrase(prev => prev + 30)}
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

          <label className="form-label" style={{ marginTop: '20px' }}>Timer MATCH (secondi)</label>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '20px',
            margin: '10px 0'
          }}>
            <button 
              onClick={() => setTimerMatch(prev => Math.max(0, prev - 60))}
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
              minWidth: '120px',
              textAlign: 'center'
            }}>
              {timerMatch === 0 ? '∞' : timerMatch}
            </div>
            <button 
              onClick={() => setTimerMatch(prev => prev + 60)}
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

          <button onClick={() => setStep("create-role")} style={{ marginTop: '30px' }}>
            CONTINUA ➜
          </button>
          <button onClick={() => setStep("select-mode")} className="btn-secondary">
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
          
          {/* Scritta che appare quando loading è true - SOPRA IL PULSANTE */}
          {loading && (
            <div style={{
              margin: '15px 0',
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
          
          <button onClick={() => handleEnterAsPlayer(false)} disabled={!playerName.trim() || loading}>
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
          
          {/* Scritta che appare quando loading è true - SOPRA IL PULSANTE */}
          {loading && (
            <div style={{
              margin: '15px 0',
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
          
          <button onClick={() => handleEnterAsPlayer(true)} disabled={!playerName.trim() || loading}>
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
    </div>
  );
}
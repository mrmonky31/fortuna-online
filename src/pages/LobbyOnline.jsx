// src/pages/LobbyOnline.jsx - SENZA PULSANTE FULLSCREEN
import React, { useState, useEffect } from "react";
import socket from "../socket";
import LobbyFormMinimal from "../components/LobbyFormMinimal";
import OnlinePlayers from "../components/OnlinePlayers";
import "../styles/lobby.css";

export default function LobbyOnline({ onGameStart }) {
  const [lobbyMode, setLobbyMode] = useState("home"); // "home" | "singlePlayer" | "multiPlayer" | "singleNew" | "singleContinue"
  const [room, setRoom] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [joinRequest, setJoinRequest] = useState(null);
  
  // ✅ NUOVI: Stati per Giocatore Singolo
  const [singlePlayerId, setSinglePlayerId] = useState("");
  const [singlePlayerPin, setSinglePlayerPin] = useState("");
  const [singlePlayerLoading, setSinglePlayerLoading] = useState(false);
  const [top30Data, setTop30Data] = useState([]);
  const [loadingTop30, setLoadingTop30] = useState(false);
  
  // ✅ PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false); // ← Popup istruzioni

  // ✅ Carica TOP 30 quando si entra nella schermata singlePlayer
  useEffect(() => {
    if (lobbyMode === "singlePlayer") {
      setLoadingTop30(true);
      socket.emit("getLeaderboard", { limit: 30 }, (res) => {
        setLoadingTop30(false);
        if (res && res.ok) {
          setTop30Data(res.leaderboard || []);
        }
      });
    }
  }, [lobbyMode]);
  
  // ✅ Listener per PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  // ✅ Handler per installare PWA
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  useEffect(() => {
    function handleRoomUpdate({ room: updatedRoom, roomCode: code }) {
      setRoom({ ...updatedRoom, roomCode: code || roomCode });
    }

    function handleGameState({ state }) {
      console.log("📡 gameState (lobby):", state);
    }

    // ✅ NUOVO: Listener richieste join
    function handleJoinRequest(request) {
      console.log("🔔 Richiesta join:", request);
      setJoinRequest(request);
    }

    function handleJoinRequestResolved({ playerId }) {
      if (joinRequest && joinRequest.playerId === playerId) {
        setJoinRequest(null);
      }
    }

    function handleJoinRequestAccepted({ room: updatedRoom, roomCode: code, playerName: name }) {
      console.log("✅ Richiesta accettata");
      
      // ✅ Se partita in corso, vai DIRETTAMENTE a Game
      if (updatedRoom.gameState && !updatedRoom.gameState.gameOver) {
        console.log("🎮 Partita in corso, vado direttamente in Game");
        
        if (onGameStart) {
          onGameStart({
            room: updatedRoom,
            roomCode: code,
            gameState: updatedRoom.gameState
          });
        }
        return;
      }
      
      // ✅ Altrimenti vai in lobby normale
      setRoom(updatedRoom);
      setRoomCode(code);
      setPlayerName(name);
      setRole("player");
      setError("");
    }

    function handleJoinRequestRejected({ message }) {
      console.log("❌ Richiesta rifiutata");
      setError(message || "Richiesta rifiutata");
      setRoom(null);
      setRoomCode("");
      setPlayerName("");
      setRole(null);
    }

    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("gameState", handleGameState);
    socket.on("joinRequest", handleJoinRequest);
    socket.on("joinRequestResolved", handleJoinRequestResolved);
    socket.on("joinRequestAccepted", handleJoinRequestAccepted);
    socket.on("joinRequestRejected", handleJoinRequestRejected);

    return () => {
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("gameState", handleGameState);
      socket.off("joinRequest", handleJoinRequest);
      socket.off("joinRequestResolved", handleJoinRequestResolved);
      socket.off("joinRequestAccepted", handleJoinRequestAccepted);
      socket.off("joinRequestRejected", handleJoinRequestRejected);
    };
  }, [roomCode, joinRequest]);

  // ✅ QUESTA È L'UNICA MODIFICA NECESSARIA!
  useEffect(() => {
    const handleGameStart = (payload) => {
      console.log("🚀 Partita avviata dal server:", payload);
      console.log("🔍 Payload.room:", payload.room);
      console.log("🔍 Payload.gameState:", payload.gameState);
      
      if (onGameStart) {
        // ✅ CORRETTO: Passa i dati nel formato che Game.jsx si aspetta
        onGameStart({
          room: payload.room,
          roomCode: payload.roomCode,
          phrase: payload.gameState?.phrase,
          category: payload.gameState?.category,
          gameState: payload.gameState, // ✅ IMPORTANTE: Passa gameState completo
        });
      }
    };

    socket.on("gameStart", handleGameStart);

    return () => {
      socket.off("gameStart", handleGameStart);
    };
  }, [onGameStart]);

  const handleCreate = (name, rounds, customRoomName, gameMode = "classic", timeChallengeSettings = null) => {
    setError("");
    socket.emit(
      "createRoom",
      { playerName: name, totalRounds: rounds, roomName: customRoomName, gameMode, timeChallengeSettings },
      (res) => {
        if (!res || !res.ok) {
          setError(res?.error || "Errore creazione stanza");
          return;
        }
        setRoom(res.room);
        setRoomCode(res.roomName || res.roomCode || "");
        setPlayerName(res.playerName);
        setRole("host");
      }
    );
  };

  const handleJoin = (name, code) => {
    setError("");
    const upper = String(code || "").toUpperCase();
    setRoomCode(upper);
    socket.emit("joinRoom", { roomCode: upper, playerName: name }, (res) => {
      if (!res || !res.ok) {
        if (res?.pending) {
          setError("⏳ In attesa di approvazione...");
          setPlayerName(name);
        } else {
          setError(res?.error || "Errore ingresso stanza");
        }
        return;
      }
      if (!res.pending) {
        setRoom(res.room);
        setPlayerName(res.playerName);
        setRole("player");
      }
    });
  };

  const handleSpectate = (name, code) => {
    setError("");
    const upper = String(code || "").toUpperCase();
    setRoomCode(upper);
    socket.emit(
      "joinAsSpectator",
      { roomCode: upper, name },
      (res) => {
        if (!res || !res.ok) {
          setError(res?.error || "Errore ingresso spettatore");
          return;
        }
        setRoom(res.room);
        setPlayerName(name);
        setRole("spectator");
      }
    );
  };

  const handleStartGame = () => {
    if (!roomCode) return;
    socket.emit("startGame", { roomCode }, (res) => {
      if (!res || !res.ok) {
        setError(res?.error || "Errore avvio partita");
      }
    });
  };

  // ✅ NUOVO: Gestione richieste join
  const handleAcceptJoin = () => {
    if (!joinRequest) return;
    socket.emit("acceptJoinRequest", {
      playerId: joinRequest.playerId,
      playerName: joinRequest.playerName,
      roomCode: joinRequest.roomCode,
      type: joinRequest.type,
      isReconnection: joinRequest.isReconnection || false // ✅ Passa flag
    });
    setJoinRequest(null);
  };

  const handleRejectJoin = () => {
    if (!joinRequest) return;
    socket.emit("rejectJoinRequest", {
      playerId: joinRequest.playerId,
      roomCode: joinRequest.roomCode
    });
    setJoinRequest(null);
  };

  // ✅ GIOCATORE SINGOLO: NUOVA PARTITA
  const handleSinglePlayerCreate = () => {
    setError("");
    
    if (!singlePlayerId.trim() || singlePlayerId.trim().length < 3) {
      setError("ID deve essere almeno 3 caratteri");
      return;
    }
    
    if (singlePlayerPin.length !== 4 || !/^\d{4}$/.test(singlePlayerPin)) {
      setError("PIN deve essere 4 cifre");
      return;
    }
    
    setSinglePlayerLoading(true);
    
    socket.emit("singlePlayerCreate", {
      playerId: singlePlayerId.trim(),
      pin: singlePlayerPin
    }, (res) => {
      if (!res || !res.ok) {
        setSinglePlayerLoading(false);
        setError(res?.error || "Errore creazione giocatore");
        return;
      }
      
      console.log("✅ Giocatore singolo creato:", res.player);
      
      // ✅ Avvia partita con room virtuale sul server
      socket.emit("startSinglePlayerGame", {
        playerId: res.player.id,
        level: res.player.level,
        totalScore: res.player.totalScore
      }, (gameRes) => {
        setSinglePlayerLoading(false);
        
        if (!gameRes || !gameRes.ok) {
          setError(gameRes?.error || "Errore avvio partita");
          return;
        }
        
        console.log("🎮 Partita avviata:", gameRes);
        
        // ✅ Il server emetterà "gameStart" che verrà gestito da useEffect esistente
      });
    });
  };

  // ✅ GIOCATORE SINGOLO: CONTINUA PARTITA
  const handleSinglePlayerAuth = () => {
    setError("");
    
    if (!singlePlayerId.trim()) {
      setError("Inserisci il tuo ID");
      return;
    }
    
    if (singlePlayerPin.length !== 4) {
      setError("Inserisci il tuo PIN (4 cifre)");
      return;
    }
    
    setSinglePlayerLoading(true);
    
    socket.emit("singlePlayerAuth", {
      playerId: singlePlayerId.trim(),
      pin: singlePlayerPin
    }, (res) => {
      if (!res || !res.ok) {
        setSinglePlayerLoading(false);
        setError(res?.error || "Errore autenticazione");
        return;
      }
      
      console.log("✅ Giocatore autenticato:", res.player);
      
      // ✅ Avvia partita dal livello salvato
      socket.emit("startSinglePlayerGame", {
        playerId: res.player.id,
        level: res.player.level,
        totalScore: res.player.totalScore
      }, (gameRes) => {
        setSinglePlayerLoading(false);
        
        if (!gameRes || !gameRes.ok) {
          setError(gameRes?.error || "Errore avvio partita");
          return;
        }
        
        console.log("🎮 Partita ripresa dal livello:", res.player.level);
        
        // ✅ Il server emetterà "gameStart" che verrà gestito da useEffect esistente
      });
    });
  };

  return (
    <div className="lobby-container">
      {/* SCHERMATA HOME - SELEZIONE MODALITÀ */}
      {lobbyMode === "home" && (
        <>
          {/* 📱 PULSANTE INSTALLAZIONE FISSO IN ALTO A DESTRA - SOLO SCHERMATA HOME */}
          <button 
            onClick={() => setShowInstallInstructions(true)}
            style={{
              position: 'fixed',
              top: 'max(15px, env(safe-area-inset-top, 15px))',
              right: 'max(15px, env(safe-area-inset-right, 15px))',
              padding: '10px 20px',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              background: '#00ff55',
              color: '#000',
              border: '2px solid #00ff88',
              borderRadius: '8px',
              cursor: 'pointer',
              zIndex: 9999,
              boxShadow: '0 4px 12px rgba(0, 255, 85, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            📱 INSTALLAZIONE
          </button>

          {/* 📋 POPUP ISTRUZIONI INSTALLAZIONE */}
          {showInstallInstructions && (
            <div 
              onClick={() => setShowInstallInstructions(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.9)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10000,
                padding: '20px'
              }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#11131a',
                  border: '3px solid #00ff55',
                  borderRadius: '15px',
                  padding: '30px',
                  maxWidth: '500px',
                  width: '90vw',
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  color: '#fff'
                }}
              >
                <h2 style={{ 
                  color: '#00ff55', 
                  marginTop: 0,
                  fontSize: '1.8rem',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  📱 Come installare sulla Home
                </h2>
                
                <div style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                  <h3 style={{ color: '#00ff55', fontSize: '1.4rem', marginTop: '20px' }}>
                    🍎 iOS (iPhone/iPad)
                  </h3>
                  <ol style={{ paddingLeft: '20px' }}>
                    <li>Apri il gioco in <strong>Safari</strong></li>
                    <li>Tocca il pulsante <strong>"Condividi"</strong> (quadrato con freccia in alto) in basso</li>
                    <li>Scorri e seleziona <strong>"Aggiungi a Home"</strong></li>
                    <li>Tocca <strong>"Aggiungi"</strong> in alto a destra</li>
                    <li>L'icona apparirà sulla tua Home! 🎉</li>
                  </ol>

                  <h3 style={{ color: '#00ff55', fontSize: '1.4rem', marginTop: '25px' }}>
                    🤖 Android (Chrome)
                  </h3>
                  <ol style={{ paddingLeft: '20px' }}>
                    <li>Apri il gioco in <strong>Chrome</strong></li>
                    <li>Tocca il menu <strong>⋮</strong> (3 puntini) in alto a destra</li>
                    <li>Seleziona <strong>"Aggiungi a schermata Home"</strong> o <strong>"Installa app"</strong></li>
                    <li>Tocca <strong>"Aggiungi"</strong></li>
                    <li>L'icona apparirà sulla tua Home! 🎉</li>
                  </ol>

                  <div style={{
                    marginTop: '25px',
                    padding: '15px',
                    background: 'rgba(0, 255, 85, 0.1)',
                    border: '2px solid #00ff55',
                    borderRadius: '10px'
                  }}>
                    <strong>💡 Perché installare?</strong>
                    <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                      <li>Accesso rapido senza browser</li>
                      <li>Esperienza fullscreen</li>
                      <li>Funziona offline</li>
                      <li>Come un'app vera! 🚀</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setShowInstallInstructions(false)}
                  style={{
                    width: '100%',
                    marginTop: '25px',
                    padding: '15px',
                    fontSize: '1.3rem',
                    fontWeight: 'bold',
                    background: '#00ff55',
                    color: '#000',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  ✅ HO CAPITO
                </button>
              </div>
            </div>
          )}
        
          <div className="lobby-form-minimal">
          <h1>🎡 RUOTA DELLA FORTUNA</h1>
          <h2>ONLINE</h2>
          
          <div className="inputs-row">
            <button onClick={() => setLobbyMode("singlePlayer")}>
              🎮 GIOCATORE SINGOLO
            </button>
            <button onClick={() => setLobbyMode("multiPlayer")}>
              👥 MULTI GIOCATORE
            </button>
          </div>
          
          {/* ✅ PULSANTE INSTALLA PWA */}
          {showInstallButton && (
            <button 
              onClick={handleInstallClick}
              style={{
                marginTop: '30px',
                padding: '15px 30px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: '2px solid #34d399',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              📲 INSTALLA APP
            </button>
          )}
        </div>
        </>
      )}

      {/* MODALITÀ MULTI GIOCATORE - FORM ESISTENTE */}
      {lobbyMode === "multiPlayer" && !room && (
        <>
          <LobbyFormMinimal
            onCreate={handleCreate}
            onJoin={handleJoin}
            onSpectate={handleSpectate}
            error={error}
          />
          <button 
            onClick={() => setLobbyMode("home")} 
            className="btn-secondary"
            style={{ 
              fontSize: '1rem', 
              padding: '10px 20px', 
              marginTop: '15px',
              minWidth: '150px'
            }}
          >
            ⬅️ INDIETRO
          </button>
        </>
      )}

      {/* MODALITÀ GIOCATORE SINGOLO - MENU PRINCIPALE */}
      {lobbyMode === "singlePlayer" && (
        <div className="lobby-form-minimal">
          <h1>🎮 GIOCATORE SINGOLO</h1>
          
          <div className="inputs-row">
            <button onClick={() => setLobbyMode("singleNew")}>
              ✨ NUOVA PARTITA
            </button>
            <button onClick={() => setLobbyMode("singleContinue")}>
              ▶️ CONTINUA PARTITA
            </button>
          </div>

          {/* TOP 30 CLASSIFICA */}
          <div style={{
            marginTop: '30px',
            width: '90%',
            maxWidth: '600px',
            background: 'rgba(17, 19, 26, 0.9)',
            border: '2px solid #00ff55',
            borderRadius: '12px',
            padding: '20px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <h3 style={{ 
              color: '#00ff55', 
              marginBottom: '15px', 
              fontSize: '1.3rem',
              textAlign: 'center',
              textShadow: '0 0 10px rgba(0, 255, 85, 0.5)'
            }}>
              🏆 TOP 30
            </h3>
            
            {loadingTop30 ? (
              <div style={{ 
                color: '#aaa', 
                fontSize: '1rem',
                textAlign: 'center',
                padding: '20px'
              }}>
                ⏳ Caricamento...
              </div>
            ) : top30Data.length === 0 ? (
              <div style={{ 
                color: '#aaa', 
                fontSize: '1rem',
                textAlign: 'center',
                padding: '20px'
              }}>
                Nessun giocatore in classifica
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {top30Data.map((player, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 15px',
                    background: index < 3 
                      ? `linear-gradient(315deg, ${
                          index === 0 ? '#ffd700' : 
                          index === 1 ? '#c0c0c0' : 
                          '#cd7f32'
                        }, rgba(0,0,0,0.3))`
                      : 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    border: index < 3 ? '2px solid rgba(255,255,255,0.2)' : 'none',
                    fontSize: '0.95rem',
                    fontWeight: index < 10 ? 'bold' : 'normal'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      color: index < 3 ? '#000' : '#fff',
                      flex: 1
                    }}>
                      <span style={{ 
                        fontSize: '1.1rem',
                        minWidth: '30px',
                        fontWeight: 'bold'
                      }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <span>{player.id}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{ 
                        color: index < 3 ? 'rgba(0,0,0,0.6)' : '#88ccff',
                        fontSize: '0.85rem',
                        opacity: 0.8
                      }}>
                        Lv.{player.level || 1}
                      </span>
                      <span style={{ 
                        color: index < 3 ? '#000' : '#00ff88',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}>
                        {player.totalScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => setLobbyMode("home")} 
            className="btn-secondary"
            style={{ 
              fontSize: '1rem', 
              padding: '10px 20px',
              minWidth: '150px',
              marginTop: '20px'
            }}
          >
            ⬅️ INDIETRO
          </button>
        </div>
      )}

      {/* NUOVA PARTITA - FORM */}
      {lobbyMode === "singleNew" && (
        <div className="lobby-form-minimal">
          <h1>✨ NUOVA PARTITA</h1>
          
          <div className="inputs-row">
            <label className="form-label">Crea ID</label>
            <input
              type="text"
              placeholder="es. MARCO2024"
              value={singlePlayerId}
              onChange={(e) => setSinglePlayerId(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={singlePlayerLoading}
            />
            
            <label className="form-label">Crea PIN (4 cifre)</label>
            <input
              type="text"
              placeholder="es. 1234"
              value={singlePlayerPin}
              onChange={(e) => setSinglePlayerPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              autoComplete="off"
              inputMode="numeric"
              disabled={singlePlayerLoading}
            />
            
            {error && <p className="error">{error}</p>}
            
            <button 
              onClick={handleSinglePlayerCreate}
              disabled={singlePlayerLoading}
            >
              {singlePlayerLoading ? "⏳ CREAZIONE..." : "🚀 INIZIA PARTITA"}
            </button>
            
            <button 
              onClick={() => {
                setLobbyMode("singlePlayer");
                setError("");
                setSinglePlayerId("");
                setSinglePlayerPin("");
              }}
              className="btn-secondary"
              style={{ fontSize: '1rem', padding: '10px 20px', minWidth: '150px' }}
              disabled={singlePlayerLoading}
            >
              ⬅️ INDIETRO
            </button>
          </div>
        </div>
      )}

      {/* CONTINUA PARTITA - FORM */}
      {lobbyMode === "singleContinue" && (
        <div className="lobby-form-minimal">
          <h1>▶️ CONTINUA PARTITA</h1>
          
          <div className="inputs-row">
            <label className="form-label">Inserisci ID</label>
            <input
              type="text"
              placeholder="Il tuo ID"
              value={singlePlayerId}
              onChange={(e) => setSinglePlayerId(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={singlePlayerLoading}
            />
            
            <label className="form-label">Inserisci PIN</label>
            <input
              type="text"
              placeholder="Il tuo PIN (4 cifre)"
              value={singlePlayerPin}
              onChange={(e) => setSinglePlayerPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              autoComplete="off"
              inputMode="numeric"
              disabled={singlePlayerLoading}
            />
            
            {error && <p className="error">{error}</p>}
            
            <button 
              onClick={handleSinglePlayerAuth}
              disabled={singlePlayerLoading}
            >
              {singlePlayerLoading ? "⏳ ACCESSO..." : "✅ ACCEDI"}
            </button>
            
            <button 
              onClick={() => {
                setLobbyMode("singlePlayer");
                setError("");
                setSinglePlayerId("");
                setSinglePlayerPin("");
              }}
              className="btn-secondary"
              style={{ fontSize: '1rem', padding: '10px 20px', minWidth: '150px' }}
              disabled={singlePlayerLoading}
            >
              ⬅️ INDIETRO
            </button>
          </div>
        </div>
      )}

      {lobbyMode === "multiPlayer" && room && (
        <div className="lobby-room">
          <OnlinePlayers
            room={room}
            playerName={playerName}
            role={role}
            roomCode={roomCode}
          />
          {role === "host" && (
            <button className="start-btn" onClick={handleStartGame}>
              🚀 INIZIA PARTITA
            </button>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {/* ✅ POPUP RICHIESTA JOIN */}
      {joinRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '30px',
            borderRadius: '12px',
            border: '2px solid #00ff55',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <h2 style={{ color: '#00ff55', marginBottom: '20px' }}>🔔 Nuova Richiesta</h2>
            <p style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '10px', color: 'white' }}>
              {joinRequest.playerName}
            </p>
            <p style={{ fontSize: '1rem', marginBottom: '30px', color: '#aaa' }}>
              {joinRequest.isReconnection 
                ? '🔄 sta riprendendo il suo giocatore'
                : `vuole unirsi come ${joinRequest.type === 'player' ? '🎮 GIOCATORE' : '👀 SPETTATORE'}`
              }
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={handleAcceptJoin} style={{
                padding: '12px 30px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                background: '#00ff55',
                color: 'black',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                ✅ ACCETTA
              </button>
              <button onClick={handleRejectJoin} style={{
                padding: '12px 30px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                background: '#ff3333',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                ❌ RIFIUTA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
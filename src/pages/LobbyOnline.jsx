// src/pages/LobbyOnline.jsx - VERSIONE CORRETTA (MODIFICA MINIMA)
import React, { useState, useEffect, useRef } from "react";
import socket from "../socket";
import LobbyFormMinimal from "../components/LobbyFormMinimal";
import OnlinePlayers from "../components/OnlinePlayers";
import "../styles/lobby.css";

export default function LobbyOnline({ onGameStart }) {
  const [room, setRoom] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  
  // ✅ NUOVO: Gestione richieste join
  const [joinRequest, setJoinRequest] = useState(null);
  
  // ✅ NUOVO: Salva sessionToken solo quando sei in lobby
  const [sessionToken, setSessionToken] = useState(null);
  
  useEffect(() => {
    // Salva in localStorage solo se hai room E sessionToken
    if (room && roomCode && playerName && sessionToken) {
      const sessionData = {
        roomCode,
        playerName,
        role: role || "player",
        sessionToken,
        timestamp: Date.now()
      };
      localStorage.setItem("gameSession", JSON.stringify(sessionData));
      console.log("💾 Sessione salvata in localStorage:", sessionData);
    } else {
      console.log("⏸️ Non salvo ancora:", { room: !!room, roomCode: !!roomCode, playerName: !!playerName, sessionToken: !!sessionToken });
    }
  }, [room, roomCode, playerName, sessionToken, role]);

  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        window.navigator.standalone
      );
    };
    
    checkFullscreen();
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    
    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
    };
  }, []);

  const enterFullscreen = () => {
    const elem = containerRef.current || document.documentElement;

    if (!elem) return;

    const request =
      elem.requestFullscreen ||
      elem.webkitRequestFullscreen ||
      elem.mozRequestFullScreen ||
      elem.msRequestFullscreen;

    if (!request) {
      alert(
        "Il tuo browser non permette il fullscreen forzato. " +
        "Prova a ruotare lo schermo o aggiungere il sito alla schermata Home."
      );
      return;
    }

    try {
      const result = request.call(elem);
      if (result && typeof result.then === "function") {
        result.then(() => {
          setIsFullscreen(true);
        }).catch((err) => {
          console.error("Errore attivando il fullscreen:", err);
        });
      } else {
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error("Errore attivando il fullscreen:", err);
    }
  };

  useEffect(() => {
    function handleRoomUpdate({ room: updatedRoom, roomCode: code }) {
      setRoom({ ...updatedRoom, roomCode: code || roomCode });
    }

    function handleGameState({ state }) {
      console.log("📡 gameState (lobby):", state);
    }

    // ✅ NUOVO: Listener per richieste join (solo per host)
    function handleJoinRequest(request) {
      console.log("🔔 Richiesta join ricevuta:", request);
      setJoinRequest(request);
    }

    // ✅ Quando qualcun altro accetta, chiudi il popup
    function handleJoinRequestResolved({ playerId }) {
      if (joinRequest && joinRequest.playerId === playerId) {
        console.log("✅ Richiesta già gestita da un altro giocatore");
        setJoinRequest(null);
      }
    }

    // ✅ NUOVO: Richiesta accettata
    function handleJoinRequestAccepted({ room: updatedRoom, roomCode: code, playerName: name }) {
      console.log("✅ Richiesta accettata!");
      
      // ✅ Recupera sessionToken da localStorage (lo avevamo già salvato durante il pending)
      const savedSession = localStorage.getItem("gameSession");
      let sessionToken = null;
      if (savedSession) {
        try {
          sessionToken = JSON.parse(savedSession).sessionToken;
        } catch (e) {}
      }
      
      // ✅ Aggiorna sessione completa
      localStorage.setItem("gameSession", JSON.stringify({
        roomCode: code,
        playerName: name,
        role: "player",
        sessionToken: sessionToken,
        timestamp: Date.now()
      }));
      
      // ✅ Se la partita è già iniziata, vai direttamente a Game
      if (updatedRoom.gameState && !updatedRoom.gameState.gameOver) {
        console.log("🎮 Partita in corso, entro direttamente in Game");
        
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

    // ✅ NUOVO: Richiesta rifiutata
    function handleJoinRequestRejected({ message }) {
      console.log("❌ Richiesta rifiutata");
      setError(message || "Richiesta rifiutata dall'host");
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
      
      if (onGameStart) {
        // ✅ CORRETTO: Passa i dati nel formato che Game.jsx si aspetta
        onGameStart({
          room: payload.room,
          roomCode: payload.roomCode,
          phrase: payload.gameState?.phrase,
          category: payload.gameState?.category,
        });
      }
    };

    socket.on("gameStart", handleGameStart);

    return () => {
      socket.off("gameStart", handleGameStart);
    };
  }, [onGameStart]);

  const handleCreate = (name, rounds, customRoomName) => {
    setError("");
    console.log("🔧 handleCreate chiamato con:", { name, rounds, customRoomName });
    
    // ✅ Controlla se socket è connesso
    if (!socket.connected) {
      setError("⏳ Connessione al server in corso...");
      console.log("⏳ Socket non connesso, aspetto connessione...");
      
      // Aspetta connessione
      const waitForConnection = () => {
        if (socket.connected) {
          console.log("✅ Socket connesso, procedo con createRoom");
          setError("");
          doCreateRoom(name, rounds, customRoomName);
        } else {
          setTimeout(waitForConnection, 500);
        }
      };
      waitForConnection();
      return;
    }
    
    doCreateRoom(name, rounds, customRoomName);
  };
  
  const doCreateRoom = (name, rounds, customRoomName) => {
    // ✅ Genera sessionToken unico per questo giocatore
    const token = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    socket.emit(
      "createRoom",
      { playerName: name, totalRounds: rounds, roomName: customRoomName, sessionToken: token },
      (res) => {
        console.log("📥 Risposta createRoom:", res);
        
        if (!res || !res.ok) {
          setError(res?.error || "Errore creazione stanza");
          return;
        }
        const code = res.roomName || res.roomCode || "";
        
        console.log("✅ Stanza creata, setto stati...");
        setRoom(res.room);
        setRoomCode(code);
        setPlayerName(res.playerName);
        setRole("host");
        setSessionToken(token); // ✅ Salva token nello stato (che triggerà useEffect)
      }
    );
  };

  const handleJoin = (name, code) => {
    setError("");
    const upper = String(code || "").toUpperCase();
    setRoomCode(upper);
    
    // ✅ Genera sessionToken unico
    const token = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    socket.emit("joinRoom", { roomCode: upper, playerName: name, sessionToken: token }, (res) => {
      if (!res || !res.ok) {
        if (res?.pending) {
          setError("⏳ In attesa di approvazione...");
          setPlayerName(name);
          setSessionToken(token); // ✅ Salva anche in pending
        } else {
          setError(res?.error || "Errore ingresso stanza");
        }
        return;
      }
      
      if (!res.pending) {
        setRoom(res.room);
        setPlayerName(res.playerName);
        setRole("player");
        setSessionToken(token); // ✅ Salva token nello stato
      }
    });
  };

  const handleSpectate = (name, code) => {
    setError("");
    const upper = String(code || "").toUpperCase();
    setRoomCode(upper);
    
    // ✅ Genera sessionToken unico
    const token = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    socket.emit(
      "joinAsSpectator",
      { roomCode: upper, name, sessionToken: token },
      (res) => {
        if (!res || !res.ok) {
          if (res?.pending) {
            setError("⏳ In attesa di approvazione...");
            setPlayerName(name);
            setSessionToken(token); // ✅ Salva anche in pending
          } else {
            setError(res?.error || "Errore ingresso spettatore");
          }
          return;
        }
        
        if (!res.pending) {
          setRoom(res.room);
          setPlayerName(name);
          setRole("spectator");
          setSessionToken(token); // ✅ Salva token nello stato
        }
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

  // ✅ NUOVO: Accetta richiesta join
  const handleAcceptJoin = () => {
    if (!joinRequest) return;
    socket.emit("acceptJoinRequest", {
      playerId: joinRequest.playerId,
      playerName: joinRequest.playerName,
      sessionToken: joinRequest.sessionToken,
      roomCode: joinRequest.roomCode,
      type: joinRequest.type,
      isReconnection: joinRequest.isReconnection || false // ✅ Passa flag riconnessione
    });
    setJoinRequest(null);
  };

  // ✅ NUOVO: Rifiuta richiesta join
  const handleRejectJoin = () => {
    if (!joinRequest) return;
    socket.emit("rejectJoinRequest", {
      playerId: joinRequest.playerId,
      playerName: joinRequest.playerName
    });
    setJoinRequest(null);
  };

  return (
    <div className="lobby-container" ref={containerRef}>
      {!isFullscreen && !room && (
        <button className="fullscreen-btn" onClick={enterFullscreen}>
          🖥️ FULLSCREEN
        </button>
      )}

      {!room && (
        <LobbyFormMinimal
          onCreate={handleCreate}
          onJoin={handleJoin}
          onSpectate={handleSpectate}
          error={error}
        />
      )}

      {room && (
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

      {/* ✅ POPUP RICHIESTA JOIN (solo per host) */}
      {joinRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#11131a',
            border: '3px solid #00ff55',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '400px',
            width: '90vw',
            textAlign: 'center'
          }}>
            <h2 style={{ 
              color: '#00ff55', 
              marginBottom: '20px',
              fontSize: '1.5rem'
            }}>
              🔔 Nuova Richiesta
            </h2>
            <p style={{ 
              fontSize: '1.2rem', 
              marginBottom: '10px',
              color: '#fff'
            }}>
              <strong>{joinRequest.playerName}</strong>
            </p>
            <p style={{ 
              fontSize: '1rem', 
              marginBottom: '30px',
              color: '#aaa'
            }}>
              {joinRequest.isReconnection 
                ? '🔄 sta riprendendo il suo giocatore'
                : `vuole unirsi come ${joinRequest.type === 'player' ? '🎮 GIOCATORE' : '👀 SPETTATORE'}`
              }
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '15px',
              justifyContent: 'center'
            }}>
              <button 
                onClick={handleAcceptJoin}
                style={{
                  padding: '15px 30px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  background: '#00ff55',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ✅ ACCETTA
              </button>
              <button 
                onClick={handleRejectJoin}
                style={{
                  padding: '15px 30px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  background: '#ff3333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ❌ RIFIUTA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
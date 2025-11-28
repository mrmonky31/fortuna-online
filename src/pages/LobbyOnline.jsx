// src/pages/LobbyOnline.jsx - SENZA PULSANTE FULLSCREEN
import React, { useState, useEffect } from "react";
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
  const [joinRequest, setJoinRequest] = useState(null);

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

  const handleCreate = (name, rounds, customRoomName, gameMode = "classic") => {
    setError("");
    socket.emit(
      "createRoom",
      { playerName: name, totalRounds: rounds, roomName: customRoomName, gameMode },
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

  return (
    <div className="lobby-container">
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
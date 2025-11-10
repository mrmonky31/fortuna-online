// src/pages/LobbyOnline.jsx
import React, { useState, useEffect, useRef } from "react";
import socket from "../socket";
import LobbyFormMinimal from "../components/LobbyFormMinimal";
import OnlinePlayers from "../components/OnlinePlayers";
import "../styles/lobby.css"; // ⭐ IMPORTA IL CSS!

export default function LobbyOnline({ onGameStart }) {
  const [room, setRoom] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);


  // Controlla se già in fullscreen
  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        window.navigator.standalone // PWA su iOS
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

    // Funzione per entrare in fullscreen
  const enterFullscreen = () => {
    const elem = containerRef.current || document.documentElement;

    if (!elem) return;

    const request =
      elem.requestFullscreen ||
      elem.webkitRequestFullscreen ||
      elem.mozRequestFullScreen ||
      elem.msRequestFullscreen;

    if (!request) {
      // Fallback: su alcuni browser (es. Safari iOS in modalità normale)
      // il fullscreen non è disponibile via API
      alert(
        "Il tuo browser non permette il fullscreen forzato. " +
        "Prova a ruotare lo schermo o aggiungere il sito alla schermata Home."
      );
      return;
    }

    try {
      const result = request.call(elem);
      // In molti browser requestFullscreen ritorna una Promise
      if (result && typeof result.then === "function") {
        result.then(() => {
          setIsFullscreen(true);
        }).catch((err) => {
          console.error("Errore attivando il fullscreen:", err);
        });
      } else {
        // Browser vecchi / senza Promise
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error("Errore attivando il fullscreen:", err);
    }
  };


  // Aggiornamenti di lobby (giocatori / spettatori / rounds)
  useEffect(() => {
    function handleRoomUpdate({ room: updatedRoom, roomCode: code }) {
      setRoom({ ...updatedRoom, roomCode: code || roomCode });
    }

    function handleGameState({ state }) {
      console.log("📡 gameState (lobby):", state);
    }

    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("gameState", handleGameState);

    return () => {
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("gameState", handleGameState);
    };
  }, [roomCode]);

  // Avvio partita sincronizzato
  useEffect(() => {
    const handleGameStart = (payload) => {
      console.log("🚀 Partita avviata dal server:", payload);
      if (onGameStart) onGameStart(payload);
    };

    socket.on("gameStart", handleGameStart);

    return () => {
      socket.off("gameStart", handleGameStart);
    };
  }, [onGameStart]);

  const handleCreate = (name, rounds, customRoomName) => {
    setError("");
    socket.emit(
      "createRoom",
      { playerName: name, totalRounds: rounds, roomName: customRoomName },
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
        setError(res?.error || "Errore ingresso stanza");
        return;
      }
      setRoom(res.room);
      setPlayerName(res.playerName);
      setRole("player");
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

  return (
        <div className="lobby-container" ref={containerRef}>
      {/* Pulsante Fullscreen (solo se non già in fullscreen e non in stanza) */}
      {!isFullscreen && !room && (
        <button className="fullscreen-btn" onClick={enterFullscreen}>
          🖥️ FULLSCREEN
        </button>
      )}

      {/* Form iniziale - nascosto quando c'è room */}
      {!room && (
        <LobbyFormMinimal
          onCreate={handleCreate}
          onJoin={handleJoin}
          onSpectate={handleSpectate}
          error={error}
        />
      )}

      {/* Schermata stanza - mostrata solo con room */}
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
    </div>
  );
}
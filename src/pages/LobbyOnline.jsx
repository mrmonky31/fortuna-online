// src/pages/LobbyOnline.jsx
import React, { useState, useEffect } from "react";
import socket from "../socket";
import LobbyFormMinimal from "../components/LobbyFormMinimal";
import OnlinePlayers from "../components/OnlinePlayers";

export default function LobbyOnline({ onGameStart }) {
  const [room, setRoom] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  // Aggiornamenti di lobby (giocatori / spettatori / rounds)
  useEffect(() => {
    function handleRoomUpdate({ room: updatedRoom, roomCode: code }) {
      setRoom({ ...updatedRoom, roomCode: code || roomCode });
    }

    function handleGameState({ state }) {
      console.log("📡 gameState (lobby):", state);
      // Non avviamo la partita da qui, serve solo log
    }

    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("gameState", handleGameState);

    return () => {
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("gameState", handleGameState);
    };
  }, [roomCode]);

  // Avvio partita sincronizzato: il server emette "gameStart"
  useEffect(() => {
    const handleGameStart = (payload) => {
      console.log("🚀 Partita avviata dal server:", payload);
      // payload: { room, roomCode, phrase, category, totalRounds? }
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
    <div className="lobby-online">
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
    </div>
  );
}

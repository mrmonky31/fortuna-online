import React, { useState, useEffect } from "react";
import "./App.css";
import Setup from "./pages/Setup";
import LobbyOnline from "./pages/LobbyOnline.jsx";
import Game from "./pages/Game";
import socket from "./socket";

function App() {
  const [screen, setScreen] = useState("setup");
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState(1);
  const [gameState, setGameState] = useState(null);
  const [reconnecting, setReconnecting] = useState(true);

  // ✅ Tentativo riconnessione al mount
  useEffect(() => {
    const savedSession = localStorage.getItem("gameSession");
    
    if (!savedSession) {
      setReconnecting(false);
      return;
    }

    try {
      const { roomCode, timestamp } = JSON.parse(savedSession);
      
      // Scarta sessioni vecchie (>30 minuti)
      if (Date.now() - timestamp > 30 * 60 * 1000) {
        localStorage.removeItem("gameSession");
        setReconnecting(false);
        return;
      }

      console.log("🔄 Tentativo riconnessione a:", roomCode);
      
      // Prova a fare rejoin
      socket.emit("rejoinRoom", { roomCode }, (res) => {
        if (res?.ok && res.room) {
          console.log("✅ Riconnesso a stanza:", roomCode);
          
          // Ricostruisci lo stato
          setPlayers(res.room.players.map(p => ({ name: p.name })));
          setRounds(res.room.totalRounds || 3);
          
          if (res.room.gameState) {
            setGameState({
              room: res.room,
              roomCode: roomCode,
              gameState: res.room.gameState
            });
            setScreen("game");
          } else {
            setScreen("setup");
          }
        } else {
          console.log("❌ Riconnessione fallita");
          localStorage.removeItem("gameSession");
        }
        setReconnecting(false);
      });
    } catch (e) {
      console.error("Errore riconnessione:", e);
      localStorage.removeItem("gameSession");
      setReconnecting(false);
    }
  }, []);

  // Offline (Setup)
  const startGame = (playersList, totalRounds) => {
    setPlayers(playersList);
    setRounds(totalRounds);
    setScreen("game");
  };

  // Online – chiamato da LobbyOnline quando il server emette "gameStart"
  const handleOnlineGameStart = (payload) => {
    if (payload && payload.room) {
      const room = payload.room;
      if (Array.isArray(room.players) && room.players.length) {
        setPlayers(
          room.players.map((p) => ({
            name: p.name || "GIOCATORE",
          }))
        );
      }
      if (typeof room.totalRounds === "number" && room.totalRounds > 0) {
        setRounds(room.totalRounds);
      } else if (
        typeof payload.totalRounds === "number" &&
        payload.totalRounds > 0
      ) {
        setRounds(payload.totalRounds);
      }
    }
    setGameState(payload);
    setScreen("game");
  };

  // ✅ NUOVO: Gestisce uscita dalla partita
  const handleExitToLobby = () => {
    localStorage.removeItem("gameSession");
    setScreen("setup");
    setPlayers([]);
    setRounds(1);
    setGameState(null);
  };

  if (reconnecting) {
    return (
      <div className="app-fullscreen" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#00ff55',
        fontSize: '1.5rem',
        fontWeight: 'bold'
      }}>
        🔄 Riconnessione in corso...
      </div>
    );
  }

  return (
    <div className="app-fullscreen">
      {screen === "setup" && (
        <LobbyOnline onGameStart={handleOnlineGameStart} />
      )}
      {screen === "game" && (
        <Game 
          players={players} 
          totalRounds={rounds} 
          state={gameState}
          onExitToLobby={handleExitToLobby}
        />
      )}
    </div>
  );
}

export default App;
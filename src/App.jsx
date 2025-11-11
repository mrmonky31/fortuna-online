import React, { useState } from "react";
import "./App.css";
import Setup from "./pages/Setup";
import LobbyOnline from "./pages/LobbyOnline.jsx";
import Game from "./pages/Game";

function App() {
  const [screen, setScreen] = useState("setup");
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState(1);
  const [gameState, setGameState] = useState(null);

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
    setScreen("setup");
    setPlayers([]);
    setRounds(1);
    setGameState(null);
  };

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
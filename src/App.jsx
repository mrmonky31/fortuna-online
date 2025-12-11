import React, { useState, useEffect } from "react";
import "./App.css";
import Setup from "./pages/Setup";
import LobbyOnline from "./pages/LobbyOnline.jsx";
import Game from "./pages/Game";
import TimeChallengeResults from "./components/TimeChallengeResults";
import socket from "./socket";

function App() {
  const [screen, setScreen] = useState("setup");
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState(1);
  const [gameState, setGameState] = useState(null);
  const [timeChallengeResults, setTimeChallengeResults] = useState(null);

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
    setTimeChallengeResults(null);
  };

  // ✅ Socket listener per Time Challenge Results
  useEffect(() => {
    socket.on("showTimeChallengeResults", (data) => {
      setTimeChallengeResults(data);
      setScreen("timeChallengeResults");
    });

    return () => {
      socket.off("showTimeChallengeResults");
    };
  }, []);

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
          isSinglePlayer={gameState?.room?.gameMode === "singlePlayer" || false}
          singlePlayerId={gameState?.gameState?.singlePlayerId || null}
          singlePlayerLevel={gameState?.gameState?.singlePlayerLevel || 1}
        />
      )}
      {screen === "timeChallengeResults" && timeChallengeResults && (
        <TimeChallengeResults
          results={timeChallengeResults.results}
          currentMatch={timeChallengeResults.currentMatch}
          totalMatches={timeChallengeResults.totalMatches}
          onBackToLobby={handleExitToLobby}
        />
      )}
    </div>
  );
}

export default App;
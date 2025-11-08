import React, { useState } from "react";
import "./App.css"; // assicurati che il file esista
import Setup from "./pages/Setup";
import LobbyOnline from "./pages/LobbyOnline.jsx";
import Game from "./pages/Game";

function App() {
  const [screen, setScreen] = useState("setup");
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState(1);
  const [gameState, setGameState] = useState(null); // stato iniziale ricevuto dalla lobby/server

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

  return (
    <div
      className="app-fullscreen"
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        backgroundColor: "#0b0b0f",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {screen === "setup" && (
        <LobbyOnline onGameStart={handleOnlineGameStart} />
      )}

      {screen === "game" && (
        <Game players={players} totalRounds={rounds} state={gameState} />
      )}
    </div>
  );
}

export default App;

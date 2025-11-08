import React, { useState } from "react";
import Setup from "./pages/Setup";
import LobbyOnline from "./pages/LobbyOnline.jsx";
import Game from "./pages/Game";

function App() {
  const [screen, setScreen] = useState("setup");
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState(1);
  const [gameState, setGameState] = useState(null); // stato iniziale ricevuto dalla lobby/server

  // Offline (Setup) – lo lasciamo intatto per eventuale uso futuro
  const startGame = (playersList, totalRounds) => {
    setPlayers(playersList);
    setRounds(totalRounds);
    setScreen("game");
  };

  // Online – chiamato da LobbyOnline quando il server emette "gameStart"
  const handleOnlineGameStart = (payload) => {
    // payload atteso: { room, roomCode, phrase, category, totalRounds? }
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

    setGameState(payload); // passo TUTTO a Game tramite prop "state"
    setScreen("game");
  };

  return (
    <>
      {screen === "setup" && (
        <LobbyOnline onGameStart={handleOnlineGameStart} />
      )}

      {screen === "game" && (
        <Game
          players={players}
          totalRounds={rounds}
          state={gameState}
        />
      )}
    </>
  );
}

export default App;

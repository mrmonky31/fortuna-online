import { useState } from "react";
import Setup from "./pages/Setup";
import LobbyOnline from "./pages/LobbyOnline.jsx";
import Game from "./pages/Game";

function App() {
  const [screen, setScreen] = useState("setup");
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState(1);

  const startGame = (playersList, totalRounds) => {
    setPlayers(playersList);
    setRounds(totalRounds);
    setScreen("game");
  };

  return (
    <>
      {screen === "setup" && (
          <LobbyOnline
            onGameStart={(state) => {
              setGameState(state);
              setScreen("game");
            }}
          />
        )} />}
      {screen === "game" && <Game players={players} totalRounds={rounds} />}
    </>
  );
}

export default App;

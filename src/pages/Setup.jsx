import React, { useState } from "react";
import "../styles/setup.css";

export default function Setup({ onStart }) {
  const [players, setPlayers] = useState([{ id: 1, name: "", score: 0 }]);
  const [rounds, setRounds] = useState(3);

  const addPlayer = () => {
    if (players.length < 5)
      setPlayers([...players, { id: Date.now(), name: "", score: 0 }]);
  };

  const removePlayer = (id) => {
    if (players.length > 1)
      setPlayers(players.filter((p) => p.id !== id));
  };

  const updateName = (id, value) => {
    setPlayers(players.map((p) =>
      p.id === id ? { ...p, name: value.slice(0, 12) } : p
    ));
  };

  const startGame = () => {
    const finalPlayers = players.map((p, i) => ({
      ...p,
      name: p.name.trim() || `GIOCATORE ${i + 1}`,
    }));
    onStart(finalPlayers, rounds);
  };

  return (
    <div className="setup-container">
      <h1>NUOVA PARTITA</h1>

      <div className="players-section">
        <h2>Giocatori</h2>
        {players.map((p) => (
          <div key={p.id} className="player-card">
            <input
              type="text"
              value={p.name}
              onChange={(e) => updateName(p.id, e.target.value)}
              placeholder="Nome giocatore"
              maxLength={12}
            />
            <span className="score">Punti Round: {p.score}</span>
            {players.length > 1 && (
              <button className="remove-btn" onClick={() => removePlayer(p.id)}>
                ✖
              </button>
            )}
          </div>
        ))}

        {players.length < 5 && (
          <button className="add-btn" onClick={addPlayer}>
            + Aggiungi giocatore
          </button>
        )}
      </div>

      <div className="rounds-section">
        <h2>Numero di frasi (round):</h2>
        <div className="rounds-options">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n}>
              <input
                type="radio"
                name="rounds"
                value={n}
                checked={rounds === n}
                onChange={() => setRounds(n)}
              />
              {n}
            </label>
          ))}
        </div>
      </div>

      <button className="start-btn" onClick={startGame}>
        INIZIA PARTITA
      </button>
    </div>
  );
}

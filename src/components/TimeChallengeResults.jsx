// src/components/TimeChallengeResults.jsx
import React from "react";

export default function TimeChallengeResults({ results, onBackToLobby, currentMatch, totalMatches }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getPlaceBackground = (index) => {
    if (index === 0) return "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"; // Gold
    if (index === 1) return "linear-gradient(135deg, #C0C0C0 0%, #808080 100%)"; // Silver
    if (index === 2) return "linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)"; // Bronze
    return "rgba(0, 255, 85, 0.1)";
  };

  const getPlaceEmoji = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}°`;
  };

  const isLastMatch = currentMatch >= totalMatches;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
    }}>
      <h1 style={{
        fontSize: '3rem',
        color: '#00ff55',
        marginBottom: '20px',
        textAlign: 'center',
        textShadow: '0 0 20px rgba(0, 255, 85, 0.5)'
      }}>
        {isLastMatch ? '🏆 CLASSIFICA FINALE 🏆' : `📊 CLASSIFICA MATCH ${currentMatch}`}
      </h1>

      {!isLastMatch && (
        <div style={{
          fontSize: '1.2rem',
          color: '#ffcc00',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          Match {currentMatch} / {totalMatches}
        </div>
      )}

      <div style={{
        width: '100%',
        maxWidth: '800px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
      }}>
        {results.map((player, index) => (
          <div
            key={index}
            style={{
              background: getPlaceBackground(index),
              padding: '25px',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: index < 3 ? '0 8px 20px rgba(0, 0, 0, 0.4)' : 'none',
              transform: index < 3 ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: index < 3 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 255, 85, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: index < 3 ? '#fff' : '#00ff55'
              }}>
                {getPlaceEmoji(index)}
              </div>

              <div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: index < 3 ? '#000' : '#fff'
                }}>
                  {player.playerName}
                </div>
                <div style={{
                  fontSize: '1rem',
                  color: index < 3 ? '#333' : '#aaa',
                  marginTop: '5px'
                }}>
                  Frasi completate: {player.phrasesCompleted}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: index < 3 ? '#000' : '#00ff55'
              }}>
                {formatTime(player.finalTime)}
              </div>
              <div style={{
                fontSize: '0.9rem',
                color: index < 3 ? '#444' : '#888',
                marginTop: '5px'
              }}>
                Tempo: {formatTime(player.totalTime)} | Penalità: +{player.totalPenalties}s
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onBackToLobby}
        style={{
          marginTop: '40px',
          padding: '15px 40px',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          color: '#fff',
          background: 'linear-gradient(135deg, #00ff55 0%, #00cc44 100%)',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0, 255, 85, 0.4)',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 85, 0.6)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 85, 0.4)';
        }}
      >
        {isLastMatch ? 'TORNA ALLA LOBBY' : 'PROSSIMO MATCH ➜'}
      </button>
    </div>
  );
}

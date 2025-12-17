// src/components/TimeChallengeResults.jsx
import React from "react";
import socket from "../socket";

export default function TimeChallengeResults({ results, onBackToLobby, currentMatch, totalMatches, waiting = false, myPlayerData = null, roomCode = null, isHost = false }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ✅ Handler per nuova partita
  const handleNewMatch = () => {
    console.log("🔄 handleNewMatch chiamato");
    console.log("   isHost:", isHost);
    console.log("   roomCode:", roomCode);
    
    if (!isHost || !roomCode) {
      console.log("   ❌ Blocco: isHost o roomCode mancante");
      return;
    }
    
    console.log("   ✅ Emetto evento timeChallengeNewMatch");
    socket.emit("timeChallengeNewMatch", { roomCode }, (res) => {
      console.log("   📥 Risposta server:", res);
      if (!res?.ok) {
        console.error("   ❌ Errore avvio nuova partita:", res?.error);
      }
    });
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

  // ✅ MODALITÀ WAITING: Giocatore ha finito, aspetta gli altri
  if (waiting && myPlayerData) {
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
        {/* Titolo */}
        <h1 style={{
          fontSize: '3rem',
          color: '#00ff55',
          marginBottom: '20px',
          textAlign: 'center',
          textShadow: '0 0 20px rgba(0, 255, 85, 0.5)'
        }}>
          🎉 HAI FINITO! 🎉
        </h1>

        {/* Match info */}
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

        {/* Card con il tuo risultato */}
        <div style={{
          width: '100%',
          maxWidth: '600px',
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 8px 30px rgba(255, 215, 0, 0.4)',
          marginBottom: '40px'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#000',
              marginBottom: '10px'
            }}>
              {myPlayerData.playerName}
            </div>
            <div style={{
              fontSize: '1.2rem',
              color: '#333'
            }}>
              Frasi completate: {myPlayerData.phrasesCompleted}
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '20px',
            borderRadius: '15px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              color: '#000',
              marginBottom: '10px'
            }}>
              {formatTime(myPlayerData.finalTime)}
            </div>
            <div style={{
              fontSize: '1.1rem',
              color: '#333'
            }}>
              Tempo: {formatTime(myPlayerData.totalTime)} | Penalità: +{myPlayerData.totalPenalties}s
            </div>
          </div>
        </div>

        {/* Messaggio attesa */}
        <div style={{
          background: 'rgba(255, 204, 0, 0.15)',
          border: '3px solid #ffcc00',
          borderRadius: '15px',
          padding: '20px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '2rem',
            marginBottom: '10px'
          }}>
            ⏳
          </div>
          <div style={{
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#ffcc00',
            marginBottom: '10px',
            textTransform: 'uppercase'
          }}>
            ⚠️ NON LASCIARE QUESTA PAGINA ⚠️
          </div>
          <div style={{
            fontSize: '1rem',
            color: '#fff',
            lineHeight: '1.4'
          }}>
            Attendi che anche gli altri giocatori<br />
            completino il loro match...
          </div>
          
          {/* Animazione loading */}
          <div style={{
            marginTop: '15px',
            display: 'flex',
            justifyContent: 'center',
            gap: '10px'
          }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ffcc00',
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Pulsanti azione */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginTop: '20px'
        }}>
          {isHost && (
            <button
              onClick={handleNewMatch}
              style={{
                flex: 1,
                padding: '15px 30px',
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
              🔄 NUOVA PARTITA
            </button>
          )}
          
          <button
            onClick={onBackToLobby}
            style={{
              flex: 1,
              padding: '15px 30px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#fff',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.6)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.4)';
            }}
          >
            🏠 TORNA ALLA LOBBY
          </button>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 0.3;
              transform: scale(0.8);
            }
            50% {
              opacity: 1;
              transform: scale(1.2);
            }
          }
        `}</style>
      </div>
    );
  }

  // ✅ MODALITÀ NORMALE: Classifica completa
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
        gap: '10px'
      }}>
        {results.map((player, index) => (
          <div
            key={index}
            style={{
              background: getPlaceBackground(index),
              padding: '15px 20px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: index < 3 ? '0 4px 15px rgba(0, 0, 0, 0.3)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: index < 3 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 255, 85, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: index < 3 ? '#fff' : '#00ff55'
              }}>
                {getPlaceEmoji(index)}
              </div>

              <div>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: index < 3 ? '#000' : '#fff'
                }}>
                  {player.playerName}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: index < 3 ? '#333' : '#aaa',
                  marginTop: '2px'
                }}>
                  Frasi completate: {player.phrasesCompleted}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: index < 3 ? '#000' : '#00ff55'
              }}>
                {formatTime(player.finalTime)}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: index < 3 ? '#444' : '#888',
                marginTop: '2px'
              }}>
                Tempo: {formatTime(player.totalTime)} | Penalità: +{player.totalPenalties}s
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pulsanti azione */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginTop: '40px',
        width: '100%',
        maxWidth: '600px'
      }}>
        {isHost && (
          <button
            onClick={handleNewMatch}
            style={{
              flex: 1,
              padding: '15px 30px',
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
            🔄 NUOVA PARTITA
          </button>
        )}
        
        <button
          onClick={onBackToLobby}
          style={{
            flex: 1,
            padding: '15px 30px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#fff',
            background: 'linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%)',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.6)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.4)';
          }}
        >
          🏠 TORNA ALLA LOBBY
        </button>
      </div>
    </div>
  );
}

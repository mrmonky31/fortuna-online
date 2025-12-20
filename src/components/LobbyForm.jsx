import React, { useState } from "react";

export default function LobbyForm({ onCreate, onJoin, onSpectate, error }) {
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [rounds, setRounds] = useState(3);

  const handleCreateClick = () => {
    onCreate(name || "Giocatore", rounds, roomName || null);
  };

  const handleJoinClick = () => {
    if (!roomCode) {
      console.log("❌ Nessun codice stanza inserito");
      return;
    }
    console.log("➡️ Tentativo di ingresso stanza:", roomCode);
    onJoin(name || "Giocatore", roomCode);
  };

  const handleSpectateClick = () => {
    if (!roomCode) return;
    onSpectate(name || "Spettatore", roomCode);
  };

  return (
    <div style={{
      maxWidth: "500px",
      margin: "0 auto",
      padding: "30px",
      background: "rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(10px)",
      borderRadius: "20px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)"
    }}>
      
      {/* TITOLO */}
      <h2 style={{
        fontSize: "1.6rem",
        fontWeight: "700",
        textAlign: "center",
        marginBottom: "30px",
        background: "linear-gradient(135deg, #0066ff 0%, #6b2dd8 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text"
      }}>
        CREA O ENTRA IN STANZA
      </h2>

      {/* SEZIONE CREA STANZA */}
      <div style={{
        background: "rgba(0, 102, 255, 0.08)",
        borderRadius: "15px",
        padding: "20px",
        marginBottom: "25px",
        border: "1px solid rgba(0, 102, 255, 0.2)"
      }}>
        <h3 style={{
          fontSize: "1.1rem",
          fontWeight: "600",
          color: "#0066ff",
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>🌀</span> Crea nuova stanza
        </h3>

        {/* Nome giocatore */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{
            display: "block",
            fontSize: "0.85rem",
            fontWeight: "500",
            color: "#ccc",
            marginBottom: "6px"
          }}>
            Il tuo nome
          </label>
          <input
            type="text"
            placeholder="Marco, Zia, Kimberly..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 15px",
              fontSize: "0.95rem",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "10px",
              color: "white",
              outline: "none",
              transition: "all 0.3s ease"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#0066ff";
              e.target.style.background = "rgba(0, 0, 0, 0.4)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255, 255, 255, 0.15)";
              e.target.style.background = "rgba(0, 0, 0, 0.3)";
            }}
          />
        </div>

        {/* Nome stanza */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{
            display: "block",
            fontSize: "0.85rem",
            fontWeight: "500",
            color: "#ccc",
            marginBottom: "6px"
          }}>
            Nome stanza <span style={{ color: "#666", fontSize: "0.8rem" }}>(facoltativo)</span>
          </label>
          <input
            type="text"
            placeholder="es. ORCHIDEA o NATALE"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 15px",
              fontSize: "0.95rem",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "10px",
              color: "white",
              outline: "none",
              transition: "all 0.3s ease"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#0066ff";
              e.target.style.background = "rgba(0, 0, 0, 0.4)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255, 255, 255, 0.15)";
              e.target.style.background = "rgba(0, 0, 0, 0.3)";
            }}
          />
        </div>

        {/* Round totali */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            fontSize: "0.85rem",
            fontWeight: "500",
            color: "#ccc",
            marginBottom: "6px"
          }}>
            Round totali
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={rounds}
            onChange={(e) => setRounds(Number(e.target.value) || 3)}
            style={{
              width: "100%",
              padding: "12px 15px",
              fontSize: "0.95rem",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "10px",
              color: "white",
              outline: "none",
              transition: "all 0.3s ease"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#0066ff";
              e.target.style.background = "rgba(0, 0, 0, 0.4)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255, 255, 255, 0.15)";
              e.target.style.background = "rgba(0, 0, 0, 0.3)";
            }}
          />
        </div>

        {/* Bottone Crea */}
        <button
          onClick={handleCreateClick}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "1rem",
            fontWeight: "600",
            background: "linear-gradient(135deg, #0066ff 0%, #0052cc 100%)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 15px rgba(0, 102, 255, 0.3)"
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 20px rgba(0, 102, 255, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 15px rgba(0, 102, 255, 0.3)";
          }}
        >
          🌀 Crea stanza
        </button>
      </div>

      {/* SEPARATORE */}
      <div style={{
        height: "1px",
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
        margin: "25px 0"
      }}></div>

      {/* SEZIONE ENTRA IN STANZA */}
      <div style={{
        background: "rgba(107, 45, 216, 0.08)",
        borderRadius: "15px",
        padding: "20px",
        border: "1px solid rgba(107, 45, 216, 0.2)"
      }}>
        <h3 style={{
          fontSize: "1.1rem",
          fontWeight: "600",
          color: "#6b2dd8",
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>🎮</span> Entra in stanza
        </h3>

        {/* Codice stanza */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            fontSize: "0.85rem",
            fontWeight: "500",
            color: "#ccc",
            marginBottom: "6px"
          }}>
            Codice stanza o invito
          </label>
          <input
            type="text"
            placeholder="ABCD o nome stanza"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 15px",
              fontSize: "0.95rem",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "10px",
              color: "white",
              outline: "none",
              transition: "all 0.3s ease"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#6b2dd8";
              e.target.style.background = "rgba(0, 0, 0, 0.4)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255, 255, 255, 0.15)";
              e.target.style.background = "rgba(0, 0, 0, 0.3)";
            }}
          />
        </div>

        {/* Bottoni Entra */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={handleJoinClick}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "1rem",
              fontWeight: "600",
              background: "linear-gradient(135deg, #6b2dd8 0%, #5424a8 100%)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(107, 45, 216, 0.3)"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(107, 45, 216, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 15px rgba(107, 45, 216, 0.3)";
            }}
          >
            🎮 Entra come giocatore
          </button>

          <button
            onClick={handleSpectateClick}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "1rem",
              fontWeight: "600",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#ccc",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.12)";
              e.target.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.08)";
              e.target.style.color = "#ccc";
            }}
          >
            👀 Entra come spettatore
          </button>
        </div>
      </div>

      {/* ERRORE */}
      {error && (
        <div style={{
          marginTop: "20px",
          padding: "12px 15px",
          background: "rgba(255, 51, 51, 0.1)",
          border: "1px solid rgba(255, 51, 51, 0.3)",
          borderRadius: "10px",
          color: "#ff6666",
          fontSize: "0.9rem",
          textAlign: "center"
        }}>
          {error}
        </div>
      )}

    </div>
  );
}

import React from "react";

export default function LobbyFormMinimal({
  onSelectClassic,
  onSelectPresenter,
  onSelectSinglePlayer,
  onSelectTimeChallenge,
  onSelectBossRoom,
  serverStatus
}) {
  const isServerDown = serverStatus === "down";

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        maxWidth: "480px",
        width: "100%",
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(10px)",
        borderRadius: "20px",
        padding: "40px 30px",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        
        {/* TITOLO */}
        <h1 style={{
          fontSize: "1.8rem",
          fontWeight: "700",
          textAlign: "center",
          marginBottom: "10px",
          background: "linear-gradient(135deg, #0066ff 0%, #6b2dd8 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          RUOTA DELLA FORTUNA
        </h1>

        <p style={{
          textAlign: "center",
          color: "#aaa",
          fontSize: "0.9rem",
          marginBottom: "35px",
          fontWeight: "400"
        }}>
          Scegli la tua modalità di gioco
        </p>

        {/* STATO SERVER */}
        {isServerDown && (
          <div style={{
            background: "rgba(255, 149, 0, 0.15)",
            border: "1px solid #ff9500",
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "25px",
            textAlign: "center"
          }}>
            <p style={{
              color: "#ff9500",
              fontSize: "0.9rem",
              margin: 0,
              fontWeight: "500"
            }}>
              🛠️ Sto oliando la ruota... Un attimo di pazienza!
            </p>
          </div>
        )}

        {/* BOTTONI MODALITÀ */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          
          <button
            onClick={onSelectClassic}
            style={{
              padding: "16px 24px",
              fontSize: "1rem",
              fontWeight: "600",
              background: "linear-gradient(135deg, #0066ff 0%, #0052cc 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(0, 102, 255, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px"
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
            <span style={{ fontSize: "1.3rem" }}>🌀</span>
            <span>Modalità Classica</span>
          </button>

          <button
            onClick={onSelectPresenter}
            style={{
              padding: "16px 24px",
              fontSize: "1rem",
              fontWeight: "600",
              background: "linear-gradient(135deg, #6b2dd8 0%, #5424a8 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(107, 45, 216, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px"
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
            <span style={{ fontSize: "1.3rem" }}>🎤</span>
            <span>Modalità Presentatore</span>
          </button>

          <button
            onClick={onSelectSinglePlayer}
            style={{
              padding: "16px 24px",
              fontSize: "1rem",
              fontWeight: "600",
              background: "linear-gradient(135deg, #ff9500 0%, #cc7700 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(255, 149, 0, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(255, 149, 0, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 15px rgba(255, 149, 0, 0.3)";
            }}
          >
            <span style={{ fontSize: "1.3rem" }}>🎯</span>
            <span>Giocatore Singolo</span>
          </button>

          <button
            onClick={onSelectTimeChallenge}
            style={{
              padding: "16px 24px",
              fontSize: "1rem",
              fontWeight: "600",
              background: "linear-gradient(135deg, #00d4aa 0%, #00a885 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(0, 212, 170, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(0, 212, 170, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 15px rgba(0, 212, 170, 0.3)";
            }}
          >
            <span style={{ fontSize: "1.3rem" }}>⏱️</span>
            <span>Sfida a Tempo</span>
          </button>

          {/* SEPARATORE */}
          <div style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
            margin: "15px 0"
          }}></div>

          {/* STANZA DEL CAPO */}
          <button
            onClick={onSelectBossRoom}
            style={{
              padding: "14px 20px",
              fontSize: "0.95rem",
              fontWeight: "600",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#aaa",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.08)";
              e.target.style.color = "white";
              e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.05)";
              e.target.style.color = "#aaa";
              e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>👔</span>
            <span>Addetti ai Lavori</span>
          </button>

        </div>

        {/* FOOTER */}
        <p style={{
          textAlign: "center",
          color: "#666",
          fontSize: "0.75rem",
          marginTop: "30px",
          fontWeight: "400"
        }}>
          Versione 4.0 • © 2025
        </p>

      </div>
    </div>
  );
}

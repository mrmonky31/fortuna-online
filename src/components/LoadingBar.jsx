// src/components/LoadingBar.jsx - RUOTA CHE GIRA
import React, { useEffect } from "react";

export default function LoadingBar({ onComplete }) {
  useEffect(() => {
    // Chiama il server e aspetta la risposta reale
    const waitForServer = async () => {
      try {
        // Prova a contattare il server
        await fetch(`${import.meta.env.VITE_SERVER_URL || 'https://fortunaonline.onrender.com'}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Server ha risposto → procedi
        if (onComplete) onComplete();
      } catch (error) {
        // Server non risponde → riprova dopo 2 secondi
        setTimeout(() => waitForServer(), 2000);
      }
    };

    waitForServer();
  }, [onComplete]);

  // Stili inline
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #0b0b0f 0%, #1a1d2e 100%)',
      zIndex: 9999
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '90vw',
      maxWidth: '500px',
      padding: '40px 20px'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 900,
      color: '#00ff55',
      textAlign: 'center',
      marginBottom: '40px',
      textShadow: '0 0 20px rgba(0, 255, 85, 0.5)',
      letterSpacing: '2px'
    },
    wheel: {
      width: '150px',
      height: '150px',
      border: '8px solid rgba(0, 255, 85, 0.2)',
      borderTop: '8px solid #00ff55',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    message: {
      fontSize: '1.3rem',
      fontWeight: 600,
      color: '#fff',
      textAlign: 'center',
      marginTop: '40px',
      opacity: 0.9
    }
  };

  // Aggiungi keyframe per rotazione
  if (!document.getElementById('loading-spin-animation')) {
    const style = document.createElement('style');
    style.id = 'loading-spin-animation';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <h1 style={styles.title}>🎡 RUOTA DELLA FORTUNA</h1>
        <div style={styles.wheel}></div>
        <div style={styles.message}>🛠️ Sto oliando la ruota...</div>
      </div>
    </div>
  );
}
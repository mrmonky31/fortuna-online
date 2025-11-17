// src/components/LoadingBar.jsx - CON STILI INLINE
import React, { useState, useEffect } from "react";

export default function LoadingBar({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [loadingTime, setLoadingTime] = useState(20000); // Default 20 secondi
  const [message, setMessage] = useState("🛠️ Sto oliando la ruota...");

  useEffect(() => {
    // Verifica se il server è attivo
    const checkServer = async () => {
      try {
        const startTime = Date.now();
        const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'https://fortunaonline.onrender.com'}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.ok && responseTime < 5000) {
          // Server attivo e veloce - 1 secondo
          setLoadingTime(5000);
          setMessage("⚡ Sto oliando la ruota...");
        } else {
          // Server lento o in risveglio - 20 secondi
          setLoadingTime(5000);
          setMessage("🛠️ Sto oliando la ruota...");
        }
      } catch (error) {
        // Server non raggiungibile, probabilmente dormiente - 20 secondi
        setLoadingTime(20000);
        setMessage("🛠️ Sto oliando la ruota...");
      }
    };

    checkServer();
  }, []);

  useEffect(() => {
    const interval = 50; // Aggiorna ogni 50ms
    const increment = (interval / loadingTime) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 300);
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [loadingTime, onComplete]);

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
      marginBottom: '20px',
      textShadow: '0 0 20px rgba(0, 255, 85, 0.5)',
      letterSpacing: '2px',
      animation: 'pulse-glow 2s infinite'
    },
    message: {
      fontSize: '1.3rem',
      fontWeight: 600,
      color: '#fff',
      textAlign: 'center',
      marginBottom: '30px',
      opacity: 0.9
    },
    barContainer: {
      width: '100%',
      height: '30px',
      background: 'rgba(17, 19, 26, 0.8)',
      border: '3px solid #00ff55',
      borderRadius: '15px',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 0 20px rgba(0, 255, 85, 0.3)'
    },
    barFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #00ff55 0%, #00cc44 50%, #00ff55 100%)',
      backgroundSize: '200% 100%',
      transition: 'width 0.3s ease',
      boxShadow: '0 0 15px rgba(0, 255, 85, 0.6)',
      borderRadius: '12px',
      animation: 'loading-gradient 2s linear infinite'
    },
    percentage: {
      fontSize: '2rem',
      fontWeight: 900,
      color: '#00ff55',
      marginTop: '20px',
      textShadow: '0 0 10px rgba(0, 255, 85, 0.5)'
    }
  };

  // Aggiungi keyframes per le animazioni
  const styleSheet = document.styleSheets[0];
  
  // Controlla se le animazioni esistono già
  if (!document.getElementById('loading-animations')) {
    const style = document.createElement('style');
    style.id = 'loading-animations';
    style.textContent = `
      @keyframes pulse-glow {
        0%, 100% { text-shadow: 0 0 20px rgba(0, 255, 85, 0.5); }
        50% { text-shadow: 0 0 30px rgba(0, 255, 85, 0.8); }
      }
      @keyframes loading-gradient {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
    `;
    document.head.appendChild(style);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <h1 style={styles.title}>🎡 RUOTA DELLA FORTUNA</h1>
        <div style={styles.message}>{message}</div>
        <div style={styles.barContainer}>
          <div 
            style={{...styles.barFill, width: `${progress}%`}}
          />
        </div>
        <div style={styles.percentage}>{Math.round(progress)}%</div>
      </div>
    </div>
  );
}
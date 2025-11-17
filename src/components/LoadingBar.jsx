// src/components/LoadingBar.jsx
import React, { useState, useEffect } from "react";
// import "../styles/loading-bar.css"; // TODO: Creare questo file!

export default function LoadingBar({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [loadingTime, setLoadingTime] = useState(20000); // Default 20 secondi
  const [message, setMessage] = useState("🔄 Risveglio del server...");

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
        
        if (response.ok && responseTime < 2000) {
          // Server attivo e veloce
          setLoadingTime(1000);
          setMessage("✅ Server pronto!");
        } else {
          // Server lento o in risveglio
          setLoadingTime(20000);
          setMessage("⏳ Attendi il risveglio del server...");
        }
      } catch (error) {
        // Server non raggiungibile, probabilmente dormiente
        setLoadingTime(20000);
        setMessage("💤 Il server si sta svegliando...");
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

  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <h1 className="loading-title">🎡 RUOTA DELLA FORTUNA</h1>
        <div className="loading-message">{message}</div>
        <div className="loading-bar-container">
          <div 
            className="loading-bar-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="loading-percentage">{Math.round(progress)}%</div>
      </div>
    </div>
  );
}
// src/components/InputModal.jsx
import React, { useEffect, useRef, useState } from "react";
import "../styles/modal.css";

export default function InputModal({
  title = "",
  type = "letter", // "letter" o "solution"
  onConfirm,
  onClose,
  compulsory = false, // 🔥 aggiunto: popup obbligatorio (no chiusura)
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  // Autofocus AGGRESSIVO - focus immediato e reattivo
  useEffect(() => {
    if (inputRef.current) {
      // Focus immediato
      inputRef.current.focus();
      
      // Focus ritardato per mobile/browser lenti (50ms)
      const timer1 = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Seleziona tutto il testo (utile se c'è già qualcosa)
          inputRef.current.select();
        }
      }, 50);
      
      // Terzo tentativo dopo 150ms (per sicurezza massima)
      const timer2 = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);

      // Cleanup timers
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, []);

  // Gestione tastiera
  const handleKeyDown = (e) => {
    if (e.key === "Escape" && !compulsory) {
      onClose && onClose();
    }
    if (e.key === "Enter") {
      if (value.trim() !== "") {
        handleConfirm();
      }
    }
  };

  // Gestione invio
  const handleConfirm = () => {
    if (!value.trim()) return;
    onConfirm && onConfirm(value.trim());
    setValue("");
  };

  // Gestione input singolo carattere per lettera
  const handleChange = (e) => {
    let val = e.target.value.toUpperCase();
    if (type === "letter") {
      val = val.replace(/[^A-ZÀ-ÖØ-Ý]/gi, ""); // solo lettere
      if (val.length > 1) val = val.slice(-1); // max 1 carattere
    }
    setValue(val);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3>{title}</h3>
          {!compulsory && (
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
        <div className="modal-body">
          {type === "letter" ? (
            <input
              ref={inputRef}
              type="text"
              maxLength={1}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="modal-input"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck="false"
            />
          ) : (
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              maxLength={80}
              className="modal-textarea"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck="false"
            />
          )}
        </div>
        <div className="modal-footer">
          <button
            className="modal-ok"
            onClick={handleConfirm}
            disabled={!value.trim()} // 🔥 Bottone bloccato finché vuoto
          >
            OK
          </button>
          {!compulsory && (
            <button className="modal-cancel" onClick={onClose}>
              ANNULLA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

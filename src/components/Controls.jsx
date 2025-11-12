// src/components/Controls.jsx - CORRETTO
import React, { useEffect, useRef, useState } from "react";

export default function Controls({
  onSpin,
  onConsonant,
  onVowel,
  onSolution,
  onPassTurn,
  lastTarget,
  forceConsonant,
  disabled = false,
  onPanelChange,
}) {
  const [panel, setPanel] = useState(null);
  const [cons, setCons] = useState("");
  const [vow, setVow] = useState("");
  const [sol, setSol] = useState("");

  const consRef = useRef(null);
  const vowRef = useRef(null);
  const solRef = useRef(null);

  useEffect(() => {
    if (onPanelChange) {
      onPanelChange(panel);
    }
  }, [panel, onPanelChange]);

  useEffect(() => {
    if (panel === "cons" && consRef.current) consRef.current.focus();
    if (panel === "vow" && vowRef.current) vowRef.current.focus();
    if (panel === "sol" && solRef.current) solRef.current.focus();
  }, [panel]);

  useEffect(() => {
    if (forceConsonant && panel === null && !disabled) setPanel("cons");
    if (!forceConsonant && panel === "cons") setPanel(null);
  }, [forceConsonant, disabled]);

  const handleSpinClick = () => {
    if (disabled) return;
    setPanel(null);
    onSpin && onSpin();
  };

  const submitConsonant = () => {
    if (disabled) return;
    const letter = (cons || "").trim().toUpperCase();
    if (!letter) return;
    setCons("");
    onConsonant && onConsonant(letter);
    setPanel(null);
  };

  const submitVowel = () => {
    if (disabled) return;
    const letter = (vow || "").trim().toUpperCase();
    if (!letter) return;
    setVow("");
    onVowel && onVowel(letter);
    setPanel(null);
  };

  const submitSolution = () => {
    if (disabled) return;
    const text = (sol || "").trim();
    if (!text) return;
    setSol("");
    onSolution && onSolution(text);
    setPanel(null);
  };

  const handlePassTurn = () => {
    if (disabled) return;
    setPanel(null);
    onPassTurn && onPassTurn();
  };

  const onKeyDownCons = (e) => {
    if (e.key === "Enter" && !disabled) submitConsonant();
  };
  const onKeyDownVow = (e) => {
    if (e.key === "Enter" && !disabled) submitVowel();
  };
  const onKeyDownSol = (e) => {
    if (e.key === "Enter" && !disabled) submitSolution();
  };

  const vowEnabled = !disabled;
  const solEnabled = !disabled;

  return (
    <div className="controls-root">
      {/* RIGA 1: Gira la ruota + Target */}
      <div className="controls-buttons">
        <button
          className="btn-primary"
          onClick={handleSpinClick}
          disabled={disabled}
          title={disabled ? "Non è il tuo turno" : "Gira la ruota"}
        >
          Gira la ruota
        </button>

        <div className="target-box">
          <div className="target-title">Target:</div>
          <div className="target-value">{String(lastTarget ?? "—")}</div>
        </div>
      </div>

      {/* RIGA 2: Consonante + Vocali + Soluzione + Passa Turno */}
      <div className="controls-row-secondary">
        <button
          className="btn-secondary btn-compact"
          onClick={() => !disabled && setPanel(panel === "cons" ? null : "cons")}
          disabled={disabled || !forceConsonant}
          title={disabled ? "Non è il tuo turno" : "Gioca una consonante"}
        >
          Consonante
        </button>

        <button
          className="btn-secondary btn-compact"
          onClick={() => !disabled && setPanel(panel === "vow" ? null : "vow")}
          disabled={!vowEnabled}
          title={disabled ? "Non è il tuo turno" : "Compra una vocale"}
        >
          Vocali
        </button>

        <button
          className="btn-secondary btn-compact"
          onClick={() => !disabled && setPanel(panel === "sol" ? null : "sol")}
          disabled={!solEnabled}
          title={disabled ? "Non è il tuo turno" : "Prova a risolvere"}
        >
          Soluzione
        </button>

        <button
          className="btn-secondary btn-compact btn-pass"
          onClick={handlePassTurn}
          disabled={disabled}
          title={disabled ? "Non è il tuo turno" : "Passa il turno al prossimo giocatore"}
        >
          Passa Turno
        </button>
      </div>

      <div className="controls-panels">
        {/* Pannello Consonanti */}
        {panel === "cons" && (
          <div className="panel panel-cons panel-game">
            <label className="panel-label">Consonante</label>
            <input
              ref={consRef}
              type="text"
              maxLength={1}
              value={cons}
              onChange={(e) =>
                setCons(e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, ""))
              }
              onKeyDown={onKeyDownCons}
              disabled={disabled}
              className="panel-input panel-input-game"
              placeholder="Inserisci consonante"
            />
            <button className="btn-ok" onClick={submitConsonant} disabled={disabled}>
              OK
            </button>
          </div>
        )}

        {/* Pannello Vocali */}
        {panel === "vow" && (
          <div className="panel panel-vow panel-game">
            <label className="panel-label">Vocale</label>
            <input
              ref={vowRef}
              type="text"
              maxLength={1}
              value={vow}
              onChange={(e) =>
                setVow(e.target.value.replace(/[^AEIOUaeiouÀ-ÖØ-öø-ÿ]/g, ""))
              }
              onKeyDown={onKeyDownVow}
              disabled={disabled}
              className="panel-input panel-input-game"
              placeholder="A, E, I, O, U"
            />
            <button className="btn-ok" onClick={submitVowel} disabled={disabled}>
              OK
            </button>
          </div>
        )}

        {/* Pannello Soluzione */}
        {panel === "sol" && (
          <div className="panel panel-sol panel-game">
            <label className="panel-label">Soluzione</label>
            <input
              ref={solRef}
              type="text"
              value={sol}
              onChange={(e) => setSol(e.target.value)}
              onKeyDown={onKeyDownSol}
              disabled={disabled}
              className="panel-input panel-input-game"
              placeholder="Scrivi la frase"
            />
            <button className="btn-ok" onClick={submitSolution} disabled={disabled}>
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
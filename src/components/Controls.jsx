// src/components/Controls.jsx - MODALITÀ PRESENTATORE
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
  isPresenter = false,  // ✅ Flag modalità presentatore
  gameMode = "classic",  // ✅ classic | presenter
  showPhrase = false,    // ✅ NUOVO: stato toggle frase
  onViewPhrase,          // ✅ Callback per vedere la frase
  onCorrectSolution,     // ✅ Callback soluzione corretta
  onWrongSolution,       // ✅ Callback soluzione sbagliata
  awaitingSolutionCheck = false, // ✅ In attesa di verifica soluzione
  activeLetterType = null, // ✅ NUOVO: tipo pulsante attivo per sincronizzazione
  onCancelSolution,      // ✅ TIME CHALLENGE: Callback chiusura pannello (+5s penalità)
  isTimeChallenge = false, // ✅ TIME CHALLENGE: Flag per mostrare warning penalità
}) {
  const [panel, setPanel] = useState(null);
  const [cons, setCons] = useState("");
  const [vow, setVow] = useState("");
  const [sol, setSol] = useState("");
  
  // 🔒 LUCCHETTO: Impedisce doppio submit della soluzione
  const [isSubmitting, setIsSubmitting] = useState(false);

  const consRef = useRef(null);
  const vowRef = useRef(null);
  const solRef = useRef(null);

  useEffect(() => {
    if (onPanelChange) {
      onPanelChange(panel);
    }
    
    // 🔒 Reset lucchetto quando si chiude il pannello soluzione
    if (panel !== "sol") {
      setIsSubmitting(false);
    }
  }, [panel, onPanelChange]);

  // ✅ FOCUS AGGRESSIVO sui pannelli input
  useEffect(() => {
    if (isPresenter) return; // Presentatore non ha pannelli

    let focusTarget = null;
    
    if (panel === "cons" && consRef.current) {
      focusTarget = consRef.current;
    } else if (panel === "vow" && vowRef.current) {
      focusTarget = vowRef.current;
    } else if (panel === "sol" && solRef.current) {
      focusTarget = solRef.current;
    }

    if (focusTarget) {
      // Focus immediato
      focusTarget.focus();
      
      // Focus ritardato per mobile (50ms)
      const timer1 = setTimeout(() => {
        if (focusTarget) {
          focusTarget.focus();
          focusTarget.select();
        }
      }, 50);
      
      // Terzo tentativo (150ms)
      const timer2 = setTimeout(() => {
        if (focusTarget) {
          focusTarget.focus();
        }
      }, 150);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [panel, isPresenter]);

  // ✅ Apertura automatica consonante SOLO in modalità classica
  useEffect(() => {
    if (gameMode === "presenter") return; // Disabilita per presentatore
    
    if (forceConsonant && panel === null && !disabled) setPanel("cons");
    if (!forceConsonant && panel === "cons") setPanel(null);
  }, [forceConsonant, disabled, gameMode]);

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
    
    // 🔒 LUCCHETTO: Blocca se già in corso un submit
    if (isSubmitting) return;
    
    const text = (sol || "").trim();
    if (!text) return;
    
    // 🔒 ATTIVA LUCCHETTO
    setIsSubmitting(true);
    
    setSol("");
    onSolution && onSolution(text);
    setPanel(null);
    
    // 🔒 SBLOCCA dopo 500ms
    setTimeout(() => {
      setIsSubmitting(false);
    }, 500);
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

      {/* ✅ PRESENTATORE: Mostra pulsanti verifica soluzione */}
      {isPresenter && awaitingSolutionCheck && (
        <div className="solution-check-buttons">
          <button
            className="btn-solution-correct"
            onClick={() => onCorrectSolution && onCorrectSolution()}
          >
            ✅ CORRETTA
          </button>
          <button
            className="btn-solution-wrong"
            onClick={() => onWrongSolution && onWrongSolution()}
          >
            ❌ SBAGLIATA
          </button>
        </div>
      )}

      {/* RIGA 2: Pulsanti secondari */}
      {!awaitingSolutionCheck && (
        <div className="controls-row-secondary">
          <button
            className={`btn-secondary btn-compact ${activeLetterType === "consonant" ? "btn-active" : ""}`}
            onClick={() => {
              if (disabled) return;
              // ✅ PRESENTATORE NON GIOCATORE: chiama direttamente callback SENZA aprire pannello
              if (gameMode === "presenter" && !isPresenter) {
                onConsonant && onConsonant(null);
              } else {
                setPanel(panel === "cons" ? null : "cons");
              }
            }}
            disabled={disabled || !forceConsonant}
            title={disabled ? "Non è il tuo turno" : "Gioca una consonante"}
          >
            Consonante
          </button>

          <button
            className={`btn-secondary btn-compact ${activeLetterType === "vowel" ? "btn-active" : ""}`}
            onClick={() => {
              if (disabled) return;
              // ✅ PRESENTATORE NON GIOCATORE: chiama direttamente callback SENZA aprire pannello
              if (gameMode === "presenter" && !isPresenter) {
                onVowel && onVowel(null);
              } else {
                setPanel(panel === "vow" ? null : "vow");
              }
            }}
            disabled={!vowEnabled}
            title={disabled ? "Non è il tuo turno" : "Compra una vocale"}
          >
            Vocali
          </button>

          <button
            className={`btn-secondary btn-compact ${activeLetterType === "solution" ? "btn-active" : ""}`}
            onClick={() => {
              if (disabled) return;
              // ✅ PRESENTATORE NON GIOCATORE: chiama direttamente callback SENZA aprire pannello
              if (gameMode === "presenter" && !isPresenter) {
                onSolution && onSolution(null);
              } else {
                setPanel(panel === "sol" ? null : "sol");
              }
            }}
            disabled={!solEnabled}
            title={disabled ? "Non è il tuo turno" : "Prova a risolvere"}
          >
            Soluzione
          </button>

          {/* ✅ PRESENTATORE: Pulsante "MOSTRA/NASCONDI FRASE" invece di "PASSA TURNO" */}
          {isPresenter ? (
            <button
              className="btn-secondary btn-compact btn-view-phrase"
              onClick={() => onViewPhrase && onViewPhrase()}
              title={showPhrase ? "Nascondi la frase" : "Mostra la frase completa"}
            >
              {showPhrase ? "🙈 Nascondi Frase" : "👁️ Mostra Frase"}
            </button>
          ) : (
            <button
              className="btn-secondary btn-compact btn-pass"
              onClick={handlePassTurn}
              disabled={disabled}
              title={disabled ? "Non è il tuo turno" : "Passa il turno al prossimo giocatore"}
            >
              Passa Turno
            </button>
          )}
        </div>
      )}

      {/* ✅ PANNELLI INPUT: Solo per NON presentatori */}
      {!isPresenter && (
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
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck="false"
                inputMode="text"
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
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck="false"
                inputMode="text"
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
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck="false"
                inputMode="text"
              />
              
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button 
                  className="btn-ok" 
                  onClick={submitSolution} 
                  disabled={disabled}
                  style={{ flex: 1 }}
                >
                  OK
                </button>
                
                {/* ✅ TIME CHALLENGE: Pulsante CHIUDI con penalità */}
                {isTimeChallenge && onCancelSolution && (
                  <button 
                    onClick={() => {
                      setPanel(null);
                      onCancelSolution();
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                      border: '2px solid #ff6666',
                      color: '#fff',
                      fontWeight: 'bold',
                      padding: '12px 20px',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      flex: 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'scale(1.05)';
                      e.target.style.boxShadow = '0 4px 12px rgba(255, 68, 68, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    ✖ CHIUDI (+5s)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

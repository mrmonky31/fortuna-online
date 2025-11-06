// src/components/Controls.jsx
import React, { useEffect, useRef, useState } from "react";

export default function Controls({
  onSpin,
  onConsonant,
  onVowel,
  onSolution,
  lastTarget,
  forceConsonant, // ✅ ora viene da gameState.awaitingConsonant
}) {
  // UI locale (quale pannello è aperto)
  const [panel, setPanel] = useState(null); // 'cons' | 'vow' | 'sol' | null

  // input controllati
  const [cons, setCons] = useState("");
  const [vow, setVow] = useState("");
  const [sol, setSol]   = useState("");

  // ref per focus automatico
  const consRef = useRef(null);
  const vowRef  = useRef(null);
  const solRef  = useRef(null);

  // quando si apre un pannello metti il focus
  useEffect(() => {
    if (panel === "cons" && consRef.current) consRef.current.focus();
    if (panel === "vow"  && vowRef.current)  vowRef.current.focus();
    if (panel === "sol"  && solRef.current)  solRef.current.focus();
  }, [panel]);

  // Se cambia la possibilità di giocare una consonante, apri/chiudi pannello di conseguenza
  useEffect(() => {
    // Se diventa possibile giocare consonante e non c'è un pannello aperto → apri consonanti
    if (forceConsonant && panel === null) setPanel("cons");
    // Se NON è più possibile giocare consonante e il pannello era aperto → chiudi pannello cons
    if (!forceConsonant && panel === "cons") setPanel(null);
  }, [forceConsonant]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- HANDLERS ---

  const handleSpinClick = () => {
    // chiudi i pannelli prima di girare
    setPanel(null);
    onSpin && onSpin();
  };

  const submitConsonant = () => {
    const letter = (cons || "").trim().toUpperCase();
    if (!letter) return;
    setCons("");
    onConsonant && onConsonant(letter);
    // Dopo aver giocato la consonante, chiudiamo il pannello. Se serve, si riaprirà da logica.
    setPanel(null);
  };

  const submitVowel = () => {
    const letter = (vow || "").trim().toUpperCase();
    if (!letter) return;
    setVow("");
    onVowel && onVowel(letter);
    // Le vocali consumano il turno: chiudo il pannello e lascio alla logica decidere il resto
    setPanel(null);
  };

  const submitSolution = () => {
    const text = (sol || "").trim();
    if (!text) return;
    setSol("");
    onSolution && onSolution(text);
    // Chiudi pannello soluzione
    setPanel(null);
  };

  // enter per i tre input
  const onKeyDownCons = (e) => { if (e.key === "Enter") submitConsonant(); };
  const onKeyDownVow  = (e) => { if (e.key === "Enter") submitVowel(); };
  const onKeyDownSol  = (e) => { if (e.key === "Enter") submitSolution(); };

  // Abilitazioni
  const consEnabled = Boolean(forceConsonant); // ✅ solo quando la ruota ha dato "punti/doppio"
  const vowEnabled  = true;                    // puoi sempre provare a comprare, la logica farà i check
  const solEnabled  = true;

  return (
    <div className="controls-root">
      {/* riga pulsanti principali */}
      <div className="controls-buttons">
        <button className="btn-primary" onClick={handleSpinClick}>
          Gira la ruota
        </button>

        <button
          className="btn-secondary"
          onClick={() => setPanel(panel === "cons" ? null : "cons")}
          disabled={!consEnabled}
          title={consEnabled ? "Inserisci una consonante" : "Gira la ruota e ottieni un valore prima di giocare una consonante"}
        >
          Consonanti
        </button>

        <button
          className="btn-secondary"
          onClick={() => setPanel(panel === "vow" ? null : "vow")}
          disabled={!vowEnabled}
          title="Compra una vocale (verrà verificato il punteggio)"
        >
          Vocali
        </button>

        <button
          className="btn-secondary"
          onClick={() => setPanel(panel === "sol" ? null : "sol")}
          disabled={!solEnabled}
          title="Prova a risolvere la frase"
        >
          Soluzione
        </button>

        {/* Target a destra dei pulsanti */}
        <div className="target-box">
          <div className="target-title">Target:</div>
          <div className="target-value">{String(lastTarget ?? "—")}</div>
        </div>
      </div>

      {/* pannelli inline, non spostano layout esterno (stili già presenti nel tuo CSS) */}
      <div className="controls-panels">
        {/* Pannello Consonanti */}
        {panel === "cons" && (
          <div className={`panel panel-cons ${consEnabled ? "" : "disabled"}`}>
            <label className="panel-label">Consonante</label>
            <input
              ref={consRef}
              type="text"
              maxLength={1}
              value={cons}
              onChange={(e) => setCons(e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, ""))}
              onKeyDown={onKeyDownCons}
              disabled={!consEnabled}
              className="panel-input"
              placeholder="Inserisci una consonante"
            />
            <button className="btn-ok" onClick={submitConsonant} disabled={!consEnabled}>
              OK
            </button>
          </div>
        )}

        {/* Pannello Vocali */}
        {panel === "vow" && (
          <div className="panel panel-vow">
            <label className="panel-label">Vocale</label>
            <input
              ref={vowRef}
              type="text"
              maxLength={1}
              value={vow}
              onChange={(e) => setVow(e.target.value.replace(/[^AEIOUaeiouÀ-ÖØ-öø-ÿ]/g, ""))}
              onKeyDown={onKeyDownVow}
              className="panel-input"
              placeholder="A, E, I, O, U"
            />
            <button className="btn-ok" onClick={submitVowel}>OK</button>
          </div>
        )}

        {/* Pannello Soluzione */}
        {panel === "sol" && (
          <div className="panel panel-sol">
            <label className="panel-label">Soluzione</label>
            <input
              ref={solRef}
              type="text"
              value={sol}
              onChange={(e) => setSol(e.target.value)}
              onKeyDown={onKeyDownSol}
              className="panel-input"
              placeholder="Scrivi tutta la frase"
            />
            <button className="btn-ok" onClick={submitSolution}>OK</button>
          </div>
        )}
      </div>
    </div>
  );
}

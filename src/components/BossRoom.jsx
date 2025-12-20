// src/components/BossRoom.jsx
import React, { useState, useEffect } from "react";
import socket from "../socket";
import "../styles/boss-room.css";

export default function BossRoom({ onBack }) {
  const [mode, setMode] = useState("menu"); // "menu" | "create" | "list" | "pinPrompt"
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [phrases, setPhrases] = useState([]);
  
  // Form nuova lista
  const [newListName, setNewListName] = useState("");
  const [newListPin, setNewListPin] = useState(""); // ✅ NUOVO: PIN per nuova lista
  
  // Form nuova frase
  const [newPhrase, setNewPhrase] = useState("");
  const [newCategory, setNewCategory] = useState("");
  
  // ✅ NUOVO: Gestione PIN per accesso liste protette
  const [pinPromptList, setPinPromptList] = useState(null); // Lista che richiede PIN
  const [enteredPin, setEnteredPin] = useState(""); // PIN inserito dall'utente
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ Carica liste quando si entra
  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = () => {
    setLoading(true);
    socket.emit("getPhraseLists", {}, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setLists(res.lists || []);
      } else {
        setError(res?.error || "Errore caricamento liste");
      }
    });
  };

  const handleCreateList = () => {
    if (!newListName.trim()) {
      setError("Inserisci un nome per la lista");
      return;
    }

    // ✅ Validazione PIN (se inserito, deve essere 4 cifre)
    if (newListPin && (newListPin.length !== 4 || !/^\d{4}$/.test(newListPin))) {
      setError("Il PIN deve essere 4 cifre (o lascia vuoto per lista pubblica)");
      return;
    }

    setLoading(true);
    setError("");
    
    socket.emit("createPhraseList", { 
      name: newListName.trim(),
      pin: newListPin || null // ✅ Invia PIN solo se presente
    }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setSuccess(newListPin ? "✅ Lista protetta creata!" : "✅ Lista creata!");
        setNewListName("");
        setNewListPin(""); // ✅ Reset PIN
        loadLists();
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(res?.error || "Errore creazione lista");
      }
    });
  };

  const handleSelectList = (list) => {
    // ✅ Se la lista è protetta, controlla se abbiamo già il PIN salvato
    if (list.isProtected) {
      const savedPins = JSON.parse(sessionStorage.getItem('listPins') || '{}');
      const savedPin = savedPins[list._id];
      
      if (savedPin) {
        // ✅ PIN già salvato, accedi direttamente
        setSelectedList({ ...list, verifiedPin: savedPin });
        setMode("list");
        loadPhrases(list._id, savedPin);
        return;
      }
      
      // ❌ PIN non salvato, chiedi PIN
      setPinPromptList(list);
      setEnteredPin("");
      setError("");
      setMode("pinPrompt");
      return;
    }
    
    // Lista pubblica, accesso diretto
    setSelectedList(list);
    setMode("list");
    loadPhrases(list._id, null);
  };

  const loadPhrases = (listId, pin = null) => {
    setLoading(true);
    socket.emit("getPhrasesByList", { listId, pin }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setPhrases(res.phrases || []);
      } else {
        setError(res?.error || "Errore caricamento frasi");
      }
    });
  };

  // ✅ NUOVO: Verifica PIN e accedi alla lista protetta
  const handlePinSubmit = () => {
    if (!enteredPin || enteredPin.length !== 4) {
      setError("Inserisci un PIN di 4 cifre");
      return;
    }

    if (!pinPromptList) return;

    setLoading(true);
    setError("");

    // Verifica PIN caricando le frasi
    socket.emit("getPhrasesByList", { 
      listId: pinPromptList._id, 
      pin: enteredPin 
    }, (res) => {
      setLoading(false);
      
      if (res && res.ok) {
        // ✅ PIN corretto! Salva in sessionStorage per non chiederlo più
        const savedPins = JSON.parse(sessionStorage.getItem('listPins') || '{}');
        savedPins[pinPromptList._id] = enteredPin;
        sessionStorage.setItem('listPins', JSON.stringify(savedPins));
        
        setSelectedList({ ...pinPromptList, verifiedPin: enteredPin });
        setPhrases(res.phrases || []);
        setMode("list");
        setPinPromptList(null);
        setEnteredPin("");
      } else {
        // ❌ PIN errato
        setError("PIN errato!");
        setEnteredPin("");
      }
    });
  };

  const handleAddPhrase = () => {
    if (!newPhrase.trim()) {
      setError("Inserisci una frase");
      return;
    }

    if (!newCategory.trim()) {
      setError("Inserisci una categoria");
      return;
    }

    if (!selectedList) {
      setError("Seleziona una lista");
      return;
    }

    setLoading(true);
    setError("");

    socket.emit("addPhraseToList", {
      listId: selectedList._id,
      phrase: newPhrase.trim().toUpperCase(),
      category: newCategory.trim(),
      pin: selectedList.verifiedPin || null // ✅ Invia PIN se lista protetta
    }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setSuccess("✅ Frase aggiunta!");
        setNewPhrase("");
        setNewCategory("");
        loadPhrases(selectedList._id, selectedList.verifiedPin);
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(res?.error || "Errore aggiunta frase");
      }
    });
  };

  const handleDeletePhrase = (phraseId) => {
    if (!confirm("Sei sicuro di voler eliminare questa frase?")) return;

    setLoading(true);
    socket.emit("deletePhrase", { 
      phraseId,
      pin: selectedList.verifiedPin || null // ✅ PIN per liste protette
    }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setSuccess("✅ Frase eliminata!");
        loadPhrases(selectedList._id, selectedList.verifiedPin);
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(res?.error || "Errore eliminazione frase");
      }
    });
  };

  const handleDeleteList = (listId) => {
    if (!confirm("Sei sicuro di voler eliminare questa lista e TUTTE le sue frasi?")) return;

    setLoading(true);
    socket.emit("deletePhraseList", { 
      listId,
      pin: selectedList.verifiedPin || null // ✅ PIN per liste protette
    }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setSuccess("✅ Lista eliminata!");
        loadLists();
        setSelectedList(null);
        setPhrases([]);
        setMode("menu");
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(res?.error || "Errore eliminazione lista");
      }
    });
  };

  // ============ RENDER ============

  // ✅ NUOVO: Prompt PIN per liste protette
  if (mode === "pinPrompt" && pinPromptList) {
    return (
      <div className="boss-room">
        <h1>🔒 LISTA PROTETTA</h1>
        <h2 style={{ color: '#00ff55', marginBottom: '30px' }}>{pinPromptList.name}</h2>
        
        <div className="boss-form">
          <label>Inserisci PIN</label>
          <input
            type="text"
            placeholder="4 cifre"
            value={enteredPin}
            onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            maxLength={4}
            disabled={loading}
            inputMode="numeric"
            autoFocus
          />
          
          <button onClick={handlePinSubmit} disabled={loading || enteredPin.length !== 4}>
            {loading ? "⏳ VERIFICA..." : "✅ ACCEDI"}
          </button>
          
          <button 
            onClick={() => {
              setMode("list");
              setPinPromptList(null);
              setEnteredPin("");
              setError("");
            }} 
            className="btn-secondary"
          >
            ⬅️ ANNULLA
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (mode === "menu") {
    // ✅ Controlla se ci sono PIN salvati
    const savedPins = JSON.parse(sessionStorage.getItem('listPins') || '{}');
    const hasSavedPins = Object.keys(savedPins).length > 0;
    
    return (
      <div className="boss-room">
        <h1>👑 STANZA DEL CAPO</h1>
        
        <div className="boss-menu">
          <button onClick={() => setMode("create")} className="boss-btn">
            ➕ CREA LISTA
          </button>
          
          <button onClick={() => setMode("list")} className="boss-btn">
            📋 GESTISCI LISTE
          </button>
          
          {/* ✅ Pulsante reset PIN - appare solo se ci sono PIN salvati */}
          {hasSavedPins && (
            <button 
              onClick={() => {
                if (confirm("Cancellare tutti i PIN salvati? Dovrai reinserirli per accedere alle liste protette.")) {
                  sessionStorage.removeItem('listPins');
                  setSuccess("✅ PIN cancellati!");
                  setTimeout(() => setSuccess(""), 2000);
                }
              }} 
              className="boss-btn"
              style={{
                background: '#ff6b00',
                border: '2px solid #ff9500'
              }}
            >
              🔓 DIMENTICA PIN SALVATI
            </button>
          )}
          
          <button onClick={onBack} className="boss-btn btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="boss-room">
        <h1>➕ CREA NUOVA LISTA</h1>
        
        <div className="boss-form">
          <label>Nome lista</label>
          <input
            type="text"
            placeholder="es. NATALE, FILM, CIBO..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value.toUpperCase())}
            disabled={loading}
          />
          
          {/* ✅ NUOVO: Campo PIN opzionale */}
          <label>PIN protezione (opzionale)</label>
          <input
            type="text"
            placeholder="4 cifre (lascia vuoto per lista pubblica)"
            value={newListPin}
            onChange={(e) => setNewListPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            maxLength={4}
            disabled={loading}
            inputMode="numeric"
          />
          <p style={{ color: '#888', fontSize: '0.85rem', margin: '5px 0 15px 0' }}>
            🔒 Se inserisci un PIN, solo chi lo conosce potrà vedere e modificare la lista
          </p>
          
          <button onClick={handleCreateList} disabled={loading}>
            {loading ? "⏳ CREAZIONE..." : "✅ CREA LISTA"}
          </button>
          
          <button onClick={() => setMode("menu")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    );
  }

  if (mode === "list") {
    if (selectedList) {
      return (
        <div className="boss-room">
          <h1>📋 {selectedList.name}</h1>
          <p style={{ color: '#aaa', marginBottom: '20px' }}>
            {phrases.length} frasi
          </p>
          
          {/* FORM AGGIUNGI FRASE */}
          <div className="boss-form" style={{ marginBottom: '30px' }}>
            <h3>➕ Aggiungi frase</h3>
            
            <label>Frase</label>
            <input
              type="text"
              placeholder="LA FRASE DA INDOVINARE"
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value.toUpperCase())}
              disabled={loading}
            />
            
            <label>Categoria</label>
            <input
              type="text"
              placeholder="es. Film, Luoghi, Cibo..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              disabled={loading}
            />
            
            <button onClick={handleAddPhrase} disabled={loading}>
              {loading ? "⏳ AGGIUNTA..." : "✅ AGGIUNGI FRASE"}
            </button>
          </div>

          {/* LISTA FRASI */}
          <div className="phrases-list">
            {phrases.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center' }}>
                Nessuna frase in questa lista
              </p>
            ) : (
              phrases.map((p) => (
                <div key={p._id} className="phrase-item">
                  <div>
                    <div className="phrase-text">{p.phrase}</div>
                    <div className="phrase-category">{p.category}</div>
                  </div>
                  <button 
                    onClick={() => handleDeletePhrase(p._id)}
                    className="btn-delete"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button 
              onClick={() => {
                setSelectedList(null);
                setPhrases([]);
              }} 
              className="btn-secondary"
            >
              ⬅️ INDIETRO
            </button>
            
            <button 
              onClick={() => handleDeleteList(selectedList._id)}
              className="btn-delete"
            >
              🗑️ ELIMINA LISTA
            </button>
          </div>

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        </div>
      );
    }

    // Lista delle liste disponibili
    return (
      <div className="boss-room">
        <h1>📋 LE TUE LISTE</h1>
        
        {loading ? (
          <p>⏳ Caricamento...</p>
        ) : lists.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>
            Nessuna lista creata. Creane una!
          </p>
        ) : (
          <div className="lists-grid">
            {lists.map((list) => {
              // ✅ Controlla se abbiamo PIN salvato per questa lista
              const savedPins = JSON.parse(sessionStorage.getItem('listPins') || '{}');
              const hasSavedPin = list.isProtected && savedPins[list._id];
              
              return (
                <div 
                  key={list._id} 
                  className={`list-card ${list.isProtected ? 'protected' : ''}`}
                  onClick={() => handleSelectList(list)}
                >
                  <h3>
                    {list.isProtected && <span className="lock-icon">{hasSavedPin ? '🔓' : '🔒'} </span>}
                    {list.name}
                  </h3>
                  <p>
                    {list.phrasesCount || 0} frasi
                    {hasSavedPin && <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#00ff88' }}>✓ Accesso salvato</span>}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => setMode("menu")} className="btn-secondary">
          ⬅️ INDIETRO
        </button>

        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return null;
}

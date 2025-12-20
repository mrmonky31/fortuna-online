// src/components/BossRoom.jsx
import React, { useState, useEffect } from "react";
import socket from "../socket";
import "../styles/boss-room.css";

// ✅ PIN GLOBALE per accedere a "Gestisci Liste"
const MANAGE_PIN = "0000"; // ← Cambia questo con il tuo PIN

export default function BossRoom({ onBack }) {
  const [mode, setMode] = useState("menu"); // "menu" | "create" | "manageAuth" | "manage" | "addPhrase" | "pinPrompt"
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  
  // Form nuova lista
  const [newListName, setNewListName] = useState("");
  const [newListPin, setNewListPin] = useState(""); // PIN per aggiungere frasi
  
  // Form nuova frase
  const [newPhrase, setNewPhrase] = useState("");
  const [newCategory, setNewCategory] = useState("");
  
  // PIN globale per gestire liste
  const [managePinInput, setManagePinInput] = useState("");
  
  // PIN per aggiungere frase a lista protetta
  const [pinPromptList, setPinPromptList] = useState(null);
  const [enteredPin, setEnteredPin] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ Carica liste quando necessario
  useEffect(() => {
    if (mode === "manage" || mode === "addPhrase") {
      loadLists();
    }
  }, [mode]);

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

  // ============ CREA LISTA ============
  
  const handleCreateList = () => {
    if (!newListName.trim()) {
      setError("Inserisci un nome per la lista");
      return;
    }

    if (newListName.trim().length > 20) {
      setError("Nome lista max 20 caratteri");
      return;
    }

    if (newListPin && (newListPin.length !== 4 || !/^\d{4}$/.test(newListPin))) {
      setError("Il PIN deve essere 4 cifre (o lascia vuoto per lista pubblica)");
      return;
    }

    setLoading(true);
    setError("");
    
    socket.emit("createPhraseList", { 
      name: newListName.trim(),
      pin: newListPin || null
    }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setSuccess(newListPin ? "✅ Lista protetta creata!" : "✅ Lista pubblica creata!");
        setNewListName("");
        setNewListPin("");
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(res?.error || "Errore creazione lista");
      }
    });
  };

  // ============ AGGIUNGI FRASE ============
  
  const handleSelectListForPhrase = (list) => {
    if (list.isProtected) {
      // Controlla se abbiamo PIN salvato
      const savedPins = JSON.parse(sessionStorage.getItem('listPins') || '{}');
      const savedPin = savedPins[list._id];
      
      if (savedPin) {
        setSelectedList({ ...list, verifiedPin: savedPin });
        return;
      }
      
      // Chiedi PIN
      setPinPromptList(list);
      setEnteredPin("");
      setError("");
      setMode("pinPrompt");
      return;
    }
    
    // Lista pubblica
    setSelectedList(list);
  };

  const handlePinSubmit = () => {
    if (!enteredPin || enteredPin.length !== 4) {
      setError("Inserisci un PIN di 4 cifre");
      return;
    }

    if (!pinPromptList) return;

    // Verifica PIN
    if (enteredPin !== pinPromptList.pin) {
      setError("PIN errato!");
      setEnteredPin("");
      return;
    }

    // ✅ PIN corretto! Salva in sessionStorage
    const savedPins = JSON.parse(sessionStorage.getItem('listPins') || '{}');
    savedPins[pinPromptList._id] = enteredPin;
    sessionStorage.setItem('listPins', JSON.stringify(savedPins));
    
    setSelectedList({ ...pinPromptList, verifiedPin: enteredPin });
    setMode("addPhrase");
    setPinPromptList(null);
    setEnteredPin("");
  };

  const handleAddPhrase = () => {
    if (!selectedList) {
      setError("Seleziona una lista");
      return;
    }

    if (!newPhrase.trim()) {
      setError("Inserisci una frase");
      return;
    }

    if (newPhrase.trim().length > 50) {
      setError("Frase max 50 caratteri");
      return;
    }

    if (!newCategory.trim()) {
      setError("Inserisci una categoria");
      return;
    }

    setLoading(true);
    setError("");

    socket.emit("addPhraseToList", {
      listId: selectedList._id,
      phrase: newPhrase.trim().toUpperCase(),
      category: newCategory.trim(),
      pin: selectedList.verifiedPin || null
    }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setSuccess("✅ Frase aggiunta!");
        setNewPhrase("");
        setNewCategory("");
        setSelectedList(null); // Reset selezione
        loadLists(); // Ricarica per aggiornare conteggio
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(res?.error || "Errore aggiunta frase");
      }
    });
  };

  // ============ GESTISCI LISTE ============
  
  const handleManagePinSubmit = () => {
    if (managePinInput === MANAGE_PIN) {
      setMode("manage");
      setManagePinInput("");
      setError("");
    } else {
      setError("PIN errato!");
      setManagePinInput("");
    }
  };

  const handleDeleteList = (listId) => {
    if (!confirm("Eliminare questa lista e TUTTE le sue frasi?")) return;

    setLoading(true);
    socket.emit("deletePhraseList", { listId }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setSuccess("✅ Lista eliminata!");
        loadLists();
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(res?.error || "Errore eliminazione");
      }
    });
  };

  // ============ RENDER ============

  // PROMPT PIN per lista protetta (aggiungere frase)
  if (mode === "pinPrompt" && pinPromptList) {
    return (
      <div className="boss-room">
        <h1>🔒 LISTA PROTETTA</h1>
        <h2 style={{ color: '#00ff55', marginBottom: '30px' }}>{pinPromptList.name}</h2>
        
        <div className="boss-form">
          <label>Inserisci PIN per aggiungere frasi</label>
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
              setMode("addPhrase");
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

  // MENU PRINCIPALE
  if (mode === "menu") {
    return (
      <div className="boss-room">
        <h1>👑 STANZA DEL CAPO</h1>
        
        <div className="boss-menu">
          <button onClick={() => setMode("create")} className="boss-btn">
            ➕ CREA LISTA
          </button>
          
          <button onClick={() => setMode("addPhrase")} className="boss-btn">
            ✏️ AGGIUNGI FRASE
          </button>
          
          <button onClick={() => setMode("manageAuth")} className="boss-btn">
            📋 GESTISCI LISTE
          </button>
          
          <button onClick={onBack} className="boss-btn btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    );
  }

  // CREA LISTA
  if (mode === "create") {
    return (
      <div className="boss-room">
        <h1>➕ CREA NUOVA LISTA</h1>
        
        <div className="boss-form">
          <label>Nome lista (max 20 caratteri)</label>
          <input
            type="text"
            placeholder="es. NATALE, FILM..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value.toUpperCase().slice(0, 20))}
            maxLength={20}
            disabled={loading}
          />
          <p style={{ color: '#666', fontSize: '0.8rem', margin: '-10px 0 10px 0', textAlign: 'right' }}>
            {newListName.length}/20
          </p>
          
          <label>PIN per aggiungere frasi (opzionale)</label>
          <input
            type="text"
            placeholder="4 cifre"
            value={newListPin}
            onChange={(e) => setNewListPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            maxLength={4}
            disabled={loading}
            inputMode="numeric"
          />
          <p style={{ color: '#888', fontSize: '0.75rem', margin: '5px 0 15px 0' }}>
            🔒 Solo chi conosce il PIN potrà aggiungere frasi
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

  // AUTENTICAZIONE GESTISCI LISTE
  if (mode === "manageAuth") {
    return (
      <div className="boss-room">
        <h1>🔐 ACCESSO GESTIONE</h1>
        
        <div className="boss-form">
          <label>PIN Gestione</label>
          <input
            type="text"
            placeholder="4 cifre"
            value={managePinInput}
            onChange={(e) => setManagePinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            maxLength={4}
            inputMode="numeric"
            autoFocus
          />
          
          <button onClick={handleManagePinSubmit} disabled={managePinInput.length !== 4}>
            ✅ ACCEDI
          </button>
          
          <button onClick={() => setMode("menu")} className="btn-secondary">
            ⬅️ INDIETRO
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  // GESTISCI LISTE (richiede PIN globale)
  if (mode === "manage") {
    return (
      <div className="boss-room">
        <h1>📋 GESTISCI LISTE</h1>
        
        {loading ? (
          <p>⏳ Caricamento...</p>
        ) : lists.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>
            Nessuna lista creata
          </p>
        ) : (
          <div className="lists-grid">
            {lists.map((list) => {
              const savedPins = JSON.parse(sessionStorage.getItem('listPins') || '{}');
              const hasSavedPin = list.isProtected && savedPins[list._id];
              
              return (
                <div 
                  key={list._id} 
                  className={`list-card ${list.isProtected ? 'protected' : ''}`}
                >
                  <h3>
                    {list.isProtected && <span className="lock-icon">{hasSavedPin ? '🔓' : '🔒'} </span>}
                    {list.name}
                  </h3>
                  <p>
                    {list.phrasesCount || 0} frasi
                    {hasSavedPin && <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#00ff88' }}>✓ Salvato</span>}
                  </p>
                  <button 
                    onClick={() => handleDeleteList(list._id)}
                    className="btn-delete"
                    style={{ marginTop: '10px' }}
                  >
                    🗑️ ELIMINA
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => setMode("menu")} className="btn-secondary" style={{ marginTop: '20px' }}>
          ⬅️ INDIETRO
        </button>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    );
  }

  // AGGIUNGI FRASE
  if (mode === "addPhrase") {
    return (
      <div className="boss-room">
        <h1>✏️ AGGIUNGI FRASE</h1>
        
        {!selectedList ? (
          // STEP 1: Seleziona lista
          <>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>
              Seleziona la lista dove aggiungere la frase
            </p>
            
            {loading ? (
              <p>⏳ Caricamento...</p>
            ) : lists.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center' }}>
                Nessuna lista disponibile. Creane una!
              </p>
            ) : (
              <div className="lists-grid">
                {lists.map((list) => {
                  const savedPins = JSON.parse(sessionStorage.getItem('listPins') || '{}');
                  const hasSavedPin = list.isProtected && savedPins[list._id];
                  
                  return (
                    <div 
                      key={list._id} 
                      className={`list-card ${list.isProtected ? 'protected' : ''}`}
                      onClick={() => handleSelectListForPhrase(list)}
                    >
                      <h3>
                        {list.isProtected && <span className="lock-icon">{hasSavedPin ? '🔓' : '🔒'} </span>}
                        {list.name}
                      </h3>
                      <p>
                        {list.phrasesCount || 0} frasi
                        {hasSavedPin && <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#00ff88' }}>✓ Salvato</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          // STEP 2: Aggiungi frase alla lista selezionata
          <>
            <h2 style={{ color: '#00ff55', marginBottom: '20px' }}>
              {selectedList.isProtected && '🔓 '}{selectedList.name}
            </h2>
            
            <div className="boss-form">
              <label>Frase (max 50 caratteri)</label>
              <input
                type="text"
                placeholder="LA FRASE DA INDOVINARE"
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value.toUpperCase().slice(0, 50))}
                maxLength={50}
                disabled={loading}
              />
              <p style={{ color: '#666', fontSize: '0.8rem', margin: '-10px 0 10px 0', textAlign: 'right' }}>
                {newPhrase.length}/50
              </p>
              
              <label>Categoria (max 20 caratteri)</label>
              <input
                type="text"
                placeholder="Film, Luoghi, Cibo..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value.slice(0, 20))}
                maxLength={20}
                disabled={loading}
              />
              <p style={{ color: '#666', fontSize: '0.8rem', margin: '-10px 0 10px 0', textAlign: 'right' }}>
                {newCategory.length}/20
              </p>
              
              <button onClick={handleAddPhrase} disabled={loading}>
                {loading ? "⏳ AGGIUNTA..." : "✅ AGGIUNGI FRASE"}
              </button>
              
              <button 
                onClick={() => setSelectedList(null)} 
                className="btn-secondary"
              >
                ⬅️ CAMBIA LISTA
              </button>
            </div>
          </>
        )}

        <button 
          onClick={() => {
            setMode("menu");
            setSelectedList(null);
            setNewPhrase("");
            setNewCategory("");
          }} 
          className="btn-secondary" 
          style={{ marginTop: '20px' }}
        >
          ⬅️ MENU
        </button>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    );
  }

  return null;
}

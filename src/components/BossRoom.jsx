// src/components/BossRoom.jsx
import React, { useState, useEffect } from "react";
import socket from "../socket";
import "../styles/boss-room.css";

// ✅ PIN GLOBALE per accedere a "Gestisci Liste"
const MANAGE_PIN = "9999"; // ← Cambia questo con il tuo PIN

export default function BossRoom({ onBack }) {
  const [mode, setMode] = useState("menu"); // "menu" | "create" | "manageAuth" | "manage" | "manageListDetail" | "addPhrase" | "pinPrompt"
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [phrases, setPhrases] = useState([]); // ✅ Frasi della lista selezionata in gestione
  
  // Form nuova lista
  const [newListName, setNewListName] = useState("");
  const [newListPin, setNewListPin] = useState(""); // PIN per aggiungere frasi
  
  // Form nuova frase
  const [newPhrase, setNewPhrase] = useState("");
  const [newCategory, setNewCategory] = useState("");
  
  // ✅ NUOVO: Modifica frase esistente
  const [editingPhrase, setEditingPhrase] = useState(null);
  const [editPhraseText, setEditPhraseText] = useState("");
  const [editPhraseCategory, setEditPhraseCategory] = useState("");
  
  // ✅ NUOVO: Riordino frasi
  const [reorderMode, setReorderMode] = useState(false); // Modalità riordino attiva
  const [selectedPhraseToMove, setSelectedPhraseToMove] = useState(null); // Frase selezionata da spostare
  
  // ✅ NUOVO: Modifica PIN lista
  const [editingListPin, setEditingListPin] = useState(false);
  const [newListPinEdit, setNewListPinEdit] = useState("");
  
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

  // ✅ NUOVO: Apri dettaglio lista
  const handleOpenListDetail = (list) => {
    setSelectedList(list);
    setMode("manageListDetail");
    loadPhrases(list._id);
  };

  // ✅ NUOVO: Carica frasi di una lista
  const loadPhrases = (listId) => {
    setLoading(true);
    socket.emit("getPhrasesByList", { listId }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setPhrases(res.phrases || []);
      } else {
        setError(res?.error || "Errore caricamento frasi");
      }
    });
  };

  // ✅ NUOVO: Modifica PIN lista
  const handleUpdateListPin = () => {
    if (newListPinEdit && (newListPinEdit.length !== 4 || !/^\d{4}$/.test(newListPinEdit))) {
      setError("Il PIN deve essere 4 cifre (o lascia vuoto per rimuovere)");
      return;
    }

    setLoading(true);
    socket.emit("updateListPin", {
      listId: selectedList._id,
      pin: newListPinEdit || null
    }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setSuccess(newListPinEdit ? "✅ PIN aggiornato!" : "✅ PIN rimosso!");
        setSelectedList({ ...selectedList, pin: newListPinEdit || null, isProtected: !!newListPinEdit });
        setEditingListPin(false);
        setNewListPinEdit("");
        loadLists();
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(res?.error || "Errore aggiornamento PIN");
      }
    });
  };

  // ✅ NUOVO: Inizia modifica frase
  const handleStartEditPhrase = (phrase) => {
    setEditingPhrase(phrase._id);
    setEditPhraseText(phrase.phrase);
    setEditPhraseCategory(phrase.category);
  };

  // ✅ NUOVO: Salva modifica frase
  const handleSaveEditPhrase = (phraseId) => {
    if (!editPhraseText.trim()) {
      setError("Inserisci una frase");
      return;
    }

    if (editPhraseText.trim().length > 50) {
      setError("Frase max 50 caratteri");
      return;
    }

    if (!editPhraseCategory.trim()) {
      setError("Inserisci una categoria");
      return;
    }

    setLoading(true);
    socket.emit("updatePhrase", {
      phraseId,
      phrase: editPhraseText.trim().toUpperCase(),
      category: editPhraseCategory.trim()
    }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setSuccess("✅ Frase aggiornata!");
        setEditingPhrase(null);
        loadPhrases(selectedList._id);
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(res?.error || "Errore aggiornamento frase");
      }
    });
  };

  // ✅ NUOVO: Elimina singola frase
  const handleDeletePhrase = (phraseId) => {
    if (!confirm("Eliminare questa frase?")) return;

    setLoading(true);
    socket.emit("deletePhrase", { phraseId }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setSuccess("✅ Frase eliminata!");
        loadPhrases(selectedList._id);
        loadLists(); // Aggiorna conteggio
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(res?.error || "Errore eliminazione");
      }
    });
  };

  // ✅ NUOVO: Gestione riordino frasi
  const handleToggleReorderMode = () => {
    setReorderMode(!reorderMode);
    setSelectedPhraseToMove(null);
    setEditingPhrase(null); // Disattiva modifica quando entri in riordino
  };

  const handleSelectPhraseToMove = (phrase) => {
    if (selectedPhraseToMove && selectedPhraseToMove._id === phrase._id) {
      // Deseleziona se clicchi sulla stessa
      setSelectedPhraseToMove(null);
    } else {
      setSelectedPhraseToMove(phrase);
    }
  };

  const handleMovePhrase = (targetPhrase) => {
    if (!selectedPhraseToMove) return;
    if (selectedPhraseToMove._id === targetPhrase._id) return; // Stesso elemento

    // Trova gli indici
    const fromIndex = phrases.findIndex(p => p._id === selectedPhraseToMove._id);
    const toIndex = phrases.findIndex(p => p._id === targetPhrase._id);

    if (fromIndex === -1 || toIndex === -1) return;

    // Crea nuovo array riordinato
    const newPhrases = [...phrases];
    const [movedPhrase] = newPhrases.splice(fromIndex, 1);
    
    // Inserisci DOPO la posizione target
    const insertIndex = toIndex >= fromIndex ? toIndex : toIndex + 1;
    newPhrases.splice(insertIndex, 0, movedPhrase);

    // Aggiorna lo stato locale immediatamente per feedback visivo
    setPhrases(newPhrases);

    // Crea array di ID nell'ordine corretto
    const newOrder = newPhrases.map(p => p._id);

    // Invia al server
    setLoading(true);
    socket.emit("reorderPhrases", {
      listId: selectedList._id,
      newOrder
    }, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setSuccess("✅ Ordine aggiornato!");
        setSelectedPhraseToMove(null);
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(res?.error || "Errore riordino");
        // Ricarica frasi in caso di errore
        loadPhrases(selectedList._id);
      }
    });
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
        <h2 style={{ color: '#0066ff', marginBottom: '30px' }}>{pinPromptList.name}</h2>
        
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
                  <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                    <button 
                      onClick={() => handleOpenListDetail(list)}
                      className="btn-secondary"
                      style={{ 
                        flex: 1, 
                        fontSize: '0.65rem', 
                        padding: '5px 4px', 
                        lineHeight: '1.2',
                        minWidth: 0,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      📂 APRI
                    </button>
                    <button 
                      onClick={() => handleDeleteList(list._id)}
                      className="btn-delete"
                      style={{ 
                        flex: 1, 
                        fontSize: '0.65rem', 
                        padding: '5px 4px', 
                        lineHeight: '1.2',
                        minWidth: 0,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      🗑️ ELIMINA
                    </button>
                  </div>
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
            <h2 style={{ color: '#0066ff', marginBottom: '20px' }}>
              {selectedList.isProtected && '🔓 '}{selectedList.name}
            </h2>
            
            <div className="boss-form">
              <label>Frase (max 50 caratteri)</label>
              <textarea
                placeholder="LA FRASE DA INDOVINARE"
                value={newPhrase}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  if (value.length <= 50) {
                    setNewPhrase(value);
                  }
                }}
                disabled={loading}
                rows={2}
                style={{
                  resize: 'none',
                  minHeight: '60px',
                  maxHeight: '120px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
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

  // ✅ NUOVO: DETTAGLIO LISTA (dentro Gestisci Liste)
  if (mode === "manageListDetail" && selectedList) {
    return (
      <div className="boss-room">
        <h1>📂 {selectedList.name}</h1>
        
        {/* SEZIONE PIN */}
        <div className="boss-form" style={{ marginBottom: '30px', background: 'rgba(255,149,0,0.1)', padding: '15px', borderRadius: '8px' }}>
          <h3>🔐 PIN Lista</h3>
          
          {!editingListPin ? (
            <>
              <p style={{ color: '#aaa', marginBottom: '10px' }}>
                {selectedList.isProtected ? (
                  <>PIN attuale: <strong style={{ color: '#0066ff' }}>{selectedList.pin}</strong></>
                ) : (
                  <>Nessun PIN impostato (lista pubblica)</>
                )}
              </p>
              <button onClick={() => {
                setEditingListPin(true);
                setNewListPinEdit(selectedList.pin || "");
              }}>
                {selectedList.isProtected ? "✏️ MODIFICA PIN" : "🔒 AGGIUNGI PIN"}
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="4 cifre (vuoto per rimuovere)"
                value={newListPinEdit}
                onChange={(e) => setNewListPinEdit(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                inputMode="numeric"
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={handleUpdateListPin} disabled={loading}>
                  {loading ? "⏳..." : "✅ SALVA"}
                </button>
                <button 
                  onClick={() => {
                    setEditingListPin(false);
                    setNewListPinEdit("");
                  }}
                  className="btn-secondary"
                >
                  ❌ ANNULLA
                </button>
              </div>
            </>
          )}
        </div>

        {/* SEZIONE FRASI */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>📝 Frasi ({phrases.length})</h3>
          
          {phrases.length > 1 && (
            <button 
              onClick={handleToggleReorderMode}
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                background: reorderMode ? '#ff9500' : '#0066ff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {reorderMode ? "✅ FINE RIORDINO" : "🔄 ORDINA FRASI"}
            </button>
          )}
        </div>

        {reorderMode && (
          <p style={{ 
            color: '#ff9500', 
            fontSize: '0.9rem', 
            marginBottom: '15px',
            padding: '10px',
            background: 'rgba(255,149,0,0.1)',
            borderRadius: '6px'
          }}>
            ℹ️ <strong>Modalità riordino:</strong> Clicca su una frase per selezionarla, poi clicca su un'altra frase per inserire DOPO di essa
          </p>
        )}
        
        {loading ? (
          <p>⏳ Caricamento...</p>
        ) : phrases.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>Nessuna frase in questa lista</p>
        ) : (
          <div className="phrases-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {phrases.map((phrase, index) => {
              const isSelected = selectedPhraseToMove && selectedPhraseToMove._id === phrase._id;
              
              return (
                <div 
                  key={phrase._id} 
                  className={`phrase-item ${reorderMode ? 'reorder-mode' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    if (reorderMode) {
                      if (!selectedPhraseToMove) {
                        handleSelectPhraseToMove(phrase);
                      } else {
                        handleMovePhrase(phrase);
                      }
                    }
                  }}
                  style={{
                    cursor: reorderMode ? 'pointer' : 'default',
                    background: isSelected ? 'rgba(255,149,0,0.2)' : undefined,
                    border: isSelected ? '2px solid #ff9500' : undefined,
                    position: 'relative'
                  }}
                >
                  {reorderMode && (
                    <div style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      color: isSelected ? '#ff9500' : '#666'
                    }}>
                      {isSelected ? '👆' : index + 1}
                    </div>
                  )}
                  
                  {editingPhrase === phrase._id && !reorderMode ? (
                    // MODALITÀ MODIFICA
                    <div style={{ flex: 1, marginLeft: reorderMode ? '40px' : '0' }}>
                      <textarea
                        value={editPhraseText}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          if (value.length <= 50) {
                            setEditPhraseText(value);
                          }
                        }}
                        style={{
                          width: '100%',
                          minHeight: '50px',
                          marginBottom: '5px',
                          resize: 'none',
                          padding: '8px',
                          fontSize: '0.95rem'
                        }}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'right', margin: '0 0 10px 0' }}>
                        {editPhraseText.length}/50
                      </p>
                      <input
                        type="text"
                        value={editPhraseCategory}
                        onChange={(e) => setEditPhraseCategory(e.target.value.slice(0, 20))}
                        maxLength={20}
                        placeholder="Categoria"
                        style={{ width: '100%', marginBottom: '10px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleSaveEditPhrase(phrase._id)}
                          style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                        >
                          ✅ SALVA
                        </button>
                        <button 
                          onClick={() => setEditingPhrase(null)}
                          className="btn-secondary"
                          style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                        >
                          ❌ ANNULLA
                        </button>
                      </div>
                    </div>
                  ) : (
                    // MODALITÀ VISUALIZZAZIONE
                    <>
                      <div style={{ flex: 1, marginLeft: reorderMode ? '40px' : '0' }}>
                        <div className="phrase-text">{phrase.phrase}</div>
                        <div className="phrase-category">{phrase.category}</div>
                      </div>
                      {!reorderMode && (
                        <div style={{ display: 'flex', gap: '3px' }}>
                          <button 
                            onClick={() => handleStartEditPhrase(phrase)}
                            style={{ 
                              padding: '4px 3px', 
                              fontSize: '0.7rem', 
                              lineHeight: '1',
                              minWidth: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDeletePhrase(phrase._id)}
                            className="btn-delete"
                            style={{ 
                              padding: '4px 3px', 
                              fontSize: '0.7rem', 
                              lineHeight: '1',
                              minWidth: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button 
          onClick={() => {
            setMode("manage");
            setSelectedList(null);
            setPhrases([]);
            setEditingPhrase(null);
            setEditingListPin(false);
          }} 
          className="btn-secondary" 
          style={{ marginTop: '20px' }}
        >
          ⬅️ INDIETRO
        </button>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    );
  }

  return null;
}

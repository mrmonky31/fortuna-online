// src/pages/Game.jsx - MODALITÀ PRESENTATOREe
import React, { useEffect, useState, useRef } from "react";
import "../styles/game-layout.css";
import "../styles/controls.css";
import "../styles/tiles.css";
import "../styles/letter-grid.css";

import Controls from "../components/Controls";
import PhraseManager from "../components/PhraseManager";
import Wheel from "../components/Wheel";
import FinalScoreboard from "../components/FinalScoreboard";
import LetterGrid from "../components/LetterGrid";

import { buildGridWithCoordinates, maskGrid } from "../game/GameEngine";
import socket from "../socket";

export default function Game({ 
  players = [], 
  totalRounds = 3, 
  state, 
  onExitToLobby,
  // ✅ NUOVI: Props per modalità giocatore singolo
  isSinglePlayer = false,
  singlePlayerId = null,
  singlePlayerLevel = 1,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mySocketId, setMySocketId] = useState(socket.id);
  const [roomCode, setRoomCode] = useState(state?.roomCode || null);
  const [joinRequest, setJoinRequest] = useState(null);
  
  // ✅ NUOVO: Stati per modalità presentatore
  const [showPhrase, setShowPhrase] = useState(false);
  const [awaitingSolutionCheck, setAwaitingSolutionCheck] = useState(false);
  const [activeLetterType, setActiveLetterType] = useState(null); // "consonant" | "vowel" | null
  
  // ✅ NUOVO: Stato per salvataggio giocatore singolo
  const [savingProgress, setSavingProgress] = useState(false);
  
  // ✅ NUOVO: Stato per TOP 10 popup
  const [showTop10, setShowTop10] = useState(false);
  const [top10Data, setTop10Data] = useState([]);
  
  // ✅ NUOVO: Stato per popup REGOLE
  const [showRules, setShowRules] = useState(false);
  
  // ✅ NUOVO: Animazione punteggio
  const [animatedScore, setAnimatedScore] = useState(0);
  
  // ✅ NUOVO: Time Challenge - copre tabellone quando pannello soluzione aperto
  const [solutionPanelOpen, setSolutionPanelOpen] = useState(false);
  
  // ✅ NUOVO: Time Challenge - timer e penalità
  const [timeChallengeTimer, setTimeChallengeTimer] = useState(0);
  const [timeChallengePenalties, setTimeChallengePenalties] = useState(0);
  const timeChallengeTimerRef = useRef(null);

  const [gameState, setGameState] = useState(() => {
    if (!state) return null;
    
    // ✅ Se il server ha già un gameState (partita in corso), usalo!
    if (state.gameState) {
// console.log("🎮 Usando gameState dal server (partita in corso)");
      return {
        ...state.gameState,
        roomCode: state.roomCode
      };
    }
    
    // ✅ Altrimenti crea nuovo gameState (partita appena iniziata)
// console.log("🆕 Creando nuovo gameState");
    return {
      players: (state.room?.players || []).map(p => ({
        name: p.name,
        id: p.id,
        totalScore: 0,
        roundScore: 0
      })),
      totalRounds: state.room?.totalRounds || totalRounds || 3,
      currentRound: 1,
      currentPlayerIndex: 0,
      currentPlayerId: (state.room?.players || [])[0]?.id,
      
      phrase: state.phrase || "",
     rows: Array.isArray(state.rows) ? state.rows : [],
      category: state.category || "",
      
      revealedLetters: [],
      usedLetters: [],
      
      wheel: [],
      spinning: false,
      mustSpin: true,
      awaitingConsonant: false,
      pendingDouble: false,
      lastSpinTarget: 0,
      
      gameMessage: { type: "info", text: "🎬 Inizia il gioco!" },
      gameOver: false,
      
      roomCode: state.roomCode
    };
  });

  const [grid, setGrid] = useState(null);
  const [maskedGrid, setMaskedGrid] = useState(null);
  const [revealQueue, setRevealQueue] = useState([]);
  const [pendingLetter, setPendingLetter] = useState(null); // ✅ Lettera in attesa di animazione
  const [turnTimer, setTurnTimer] = useState(60);
  const [timerPaused, setTimerPaused] = useState(false);
  const [betweenRounds, setBetweenRounds] = useState(false);
  const [roundCountdown, setRoundCountdown] = useState(0);
  const [winnerName, setWinnerName] = useState("");
  
  // Stati per tracciare consonanti/vocali finite
  const [consonantsFinished, setConsonantsFinished] = useState(false);
  const [vowelsFinished, setVowelsFinished] = useState(false);

  // ⭐ NUOVO: Stati per sincronizzazione animazione ruota
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelSpinSeed, setWheelSpinSeed] = useState(null);
  const [wheelForcedTarget, setWheelForcedTarget] = useState(null); // ← Target forzato PASSA/BANCAROTTA

  // ✅ NUOVO: Colore random per round (mai bianco/nero)
  const [roundColor, setRoundColor] = useState(() => {
    const colors = [
      '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', 
      '#FFFF00', '#FF6600', '#FF0066', '#6600FF', '#00FF66',
      '#FF3300', '#33FF00', '#0033FF', '#FF0033', '#3300FF'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  });

  // ✅ Calcola dinamicamente se sei presentatore dal gameState
  const isPresenter = state?.room?.gameMode === "presenter" && 
                      gameState?.players?.find(p => p.id === mySocketId)?.isHost;
  
  // ✅ Calcola se modalità giocatore singolo
  const isSinglePlayerMode = state?.room?.gameMode === "singlePlayer" || isSinglePlayer;

  // Funzione toggle fullscreen
  const toggleFullscreen = async () => {
    const wrapper = document.querySelector('.game-wrapper');
    
    if (!isFullscreen) {
      try {
        wrapper?.classList.add('fullscreen-mode');
        const element = document.documentElement;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch (error) {
        console.error('Errore fullscreen:', error);
        wrapper?.classList.remove('fullscreen-mode');
      }
    } else {
      try {
        wrapper?.classList.remove('fullscreen-mode');
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        setIsFullscreen(false);
      } catch (error) {
        console.error('Errore uscita fullscreen:', error);
      }
    }
  };

  useEffect(() => {
    if (roomCode && mySocketId) {
      localStorage.setItem("gameSession", JSON.stringify({
        roomCode,
        socketId: mySocketId,
        timestamp: Date.now()
      }));
    }
  }, [roomCode, mySocketId]);

  useEffect(() => {
    const savedSession = localStorage.getItem("gameSession");
    if (savedSession) {
      try {
        const { roomCode: savedRoom, timestamp } = JSON.parse(savedSession);
        if (Date.now() - timestamp < 10 * 60 * 1000) {
// console.log("🔄 Tentativo riconnessione a:", savedRoom);
          setRoomCode(savedRoom);
        } else {
          localStorage.removeItem("gameSession");
        }
      } catch (e) {
        console.error("Errore parsing sessione:", e);
      }
    }
  }, []);

  useEffect(() => {
    setMySocketId(socket.id);
  }, []);

  // Listener per uscita fullscreen con ESC
  useEffect(() => {
    const handleChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFull && isFullscreen) {
        document.querySelector('.game-wrapper')?.classList.remove('fullscreen-mode');
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, [isFullscreen]);

  // ✅ NUOVO: Riconnessione socket quando torni sull'app (fix crash)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Riconnetti socket se disconnesso
        if (!socket.connected) {
// console.log("🔄 Riconnessione socket...");
          socket.connect();
          
          // Richiedi aggiornamento stato
          if (roomCode) {
            socket.emit("requestGameState", { roomCode });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomCode]);

  // ✅ NUOVO: Listener per richieste join durante partita
  useEffect(() => {
    function handleJoinRequest(request) {
// console.log("🔔 Richiesta join:", request);
      setJoinRequest(request);
    }

    function handleJoinRequestResolved({ playerId }) {
      if (joinRequest && joinRequest.playerId === playerId) {
// console.log("✅ Richiesta già gestita");
        setJoinRequest(null);
      }
    }

    socket.on("joinRequest", handleJoinRequest);
    socket.on("joinRequestResolved", handleJoinRequestResolved);
    
    return () => {
      socket.off("joinRequest", handleJoinRequest);
      socket.off("joinRequestResolved", handleJoinRequestResolved);
    };
  }, [joinRequest]);

  useEffect(() => {
    function handleGameStart({ gameState: serverState }) {
// console.log("🚀 GameStart dal server:", serverState);
      if (serverState) {
        setGameState(serverState);
        setTurnTimer(60);
        setBetweenRounds(false);
      }
    }

    socket.on("gameStart", handleGameStart);
    return () => socket.off("gameStart", handleGameStart);
  }, []);

  // ⭐ NUOVO: Listener per wheelSpinStart
  useEffect(() => {
    function handleWheelSpinStart({ spinning, spinSeed, forcedTarget }) {
// console.log("🎡 wheelSpinStart ricevuto:", { spinning, spinSeed, forcedTarget });
      setWheelSpinning(spinning);
      setWheelSpinSeed(spinSeed);
      setWheelForcedTarget(forcedTarget || null);
    }

    socket.on("wheelSpinStart", handleWheelSpinStart);
    return () => socket.off("wheelSpinStart", handleWheelSpinStart);
  }, []);

  useEffect(() => {
    function handleGameStateUpdate({ gameState: serverState, revealQueue: newRevealQueue, letterToReveal }) {
      if (serverState) {
        setGameState(serverState);
        
        // ✅ TIME CHALLENGE: Traccia penalità su errori
        const isTimeChallenge = serverState?.isTimeChallenge === true;
        if (isTimeChallenge && serverState.gameMessage) {
          const msg = serverState.gameMessage.text || "";
          // Errori che danno +5s penalità
          if (
            msg.includes("già usata") ||
            msg.includes("Nessuna") ||
            msg.includes("non corretta")
          ) {
            setTimeChallengePenalties(prev => prev + 5);
          }
        }
        
        // ✅ Aggiorna revealQueue se presente
        if (newRevealQueue && newRevealQueue.length > 0) {
          // ✅ CONVERSIONE: {r, c, ch} → {x, y, char}
          const converted = newRevealQueue.map(coord => ({
            x: coord.c || coord.x,
            y: coord.r || coord.y,
            char: coord.ch || coord.char
          }));
          setRevealQueue(converted);
          
          // ✅ Salva lettera da confermare dopo animazione
          if (letterToReveal) {
            setPendingLetter(letterToReveal);
          }
        }
        
        // ⭐ NUOVO: Ferma spinning quando finisce
        if (serverState && !serverState.spinning) {
          setWheelSpinning(false);
        }
        
        // ✅ PRESENTATORE: Reset griglia dopo azione completata
        if (isPresenter) {
          setActiveLetterType(null);
        }
        
        setTurnTimer(60);
      }
    }

    socket.on("gameStateUpdate", handleGameStateUpdate);
    return () => socket.off("gameStateUpdate", handleGameStateUpdate);
  }, []);

  useEffect(() => {
    function handleRoundWon({ winnerName, countdown }) {
// console.log("🎉 Round vinto da:", winnerName);
      setWinnerName(winnerName);
      setBetweenRounds(true);
      setRoundCountdown(countdown);
      
      // ✅ Reset animazione punteggio
      setAnimatedScore(0);
      
      // ✅ Genera nuovo colore per il prossimo round
      const colors = [
        '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', 
        '#FFFF00', '#FF6600', '#FF0066', '#6600FF', '#00FF66',
        '#FF3300', '#33FF00', '#0033FF', '#FF0033', '#3300FF'
      ];
      setRoundColor(colors[Math.floor(Math.random() * colors.length)]);
    }

    socket.on("roundWon", handleRoundWon);
    return () => socket.off("roundWon", handleRoundWon);
  }, []);

  useEffect(() => {
    // ✅ In modalità singlePlayer NON avviare countdown automatico
    if (isSinglePlayerMode) return;
    
    if (!betweenRounds || roundCountdown <= 0) return;

    const id = setInterval(() => {
      setRoundCountdown((prev) => {
        if (prev <= 1) {
          setBetweenRounds(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [betweenRounds, roundCountdown, isSinglePlayerMode]);

  // ✅ Animazione conteggio punteggio (modalità singlePlayer)
  useEffect(() => {
    if (!betweenRounds || !isSinglePlayerMode) return;
    
    const targetScore = gameState?.lastRoundScore || 0;
    if (targetScore === 0) return;
    
    // Durata animazione: 2 secondi
    const duration = 2000;
    const fps = 60;
    const totalFrames = (duration / 1000) * fps;
    const increment = targetScore / totalFrames;
    
    let currentFrame = 0;
    
    const animation = setInterval(() => {
      currentFrame++;
      
      if (currentFrame >= totalFrames) {
        setAnimatedScore(targetScore);
        clearInterval(animation);
      } else {
        setAnimatedScore(Math.floor(increment * currentFrame));
      }
    }, 1000 / fps);
    
    return () => clearInterval(animation);
  }, [betweenRounds, isSinglePlayerMode, gameState?.lastRoundScore]);

  // ✅ NUOVO: Costruisci grid dalla frase
  useEffect(() => {
    if (!gameState || !gameState.phrase) {
      setGrid(null);
      setMaskedGrid(null);
      return;
    }

    try {
      // Costruisci grid con coordinate
      const newGrid = buildGridWithCoordinates(gameState.phrase, 16, 5); // ✅ 16 cols, 5 rows
      setGrid(newGrid);
      
      // Maschera grid
      const revealed = gameState.revealedLetters || [];
      const masked = maskGrid(newGrid, revealed);
      setMaskedGrid(masked);
    } catch (error) {
      console.error("❌ Errore costruzione grid:", error);
      setGrid(null);
      setMaskedGrid(null);
    }
  }, [gameState?.phrase, gameState?.revealedLetters]);

  // Calcola se consonanti e vocali sono finite
  useEffect(() => {
    if (!gameState) return;
    
    const phrase = gameState.phrase || "";
    const revealedLetters = gameState.revealedLetters || [];
    
    // Normalizza e estrai tutte le lettere dalla frase
    const allLetters = phrase.toUpperCase().replace(/[^A-ZÀÈÉÌÒÙ]/g, '').split('');
    
    // Vocali italiane
    const vowels = ['A', 'E', 'I', 'O', 'U', 'À', 'È', 'É', 'Ì', 'Ò', 'Ù'];
    
    // Lettere rivelate normalizzate
    const revealed = revealedLetters.map(l => l.toUpperCase());
    
    // Trova vocali e consonanti uniche nella frase
    const uniqueVowels = [...new Set(allLetters.filter(l => vowels.includes(l)))];
    const uniqueConsonants = [...new Set(allLetters.filter(l => !vowels.includes(l)))];
    
    // Controlla se tutte le vocali sono state rivelate
    const allVowelsRevealed = uniqueVowels.every(v => revealed.includes(v));
    setVowelsFinished(allVowelsRevealed);
    
    // Controlla se tutte le consonanti sono state rivelate
    const allConsonantsRevealed = uniqueConsonants.every(c => revealed.includes(c));
    setConsonantsFinished(allConsonantsRevealed);
    
  }, [gameState?.phrase, gameState?.revealedLetters]);

  useEffect(() => {
    if (!gameState) return;
    if (timerPaused) return;
    
    // ✅ MODALITÀ SINGOLO: Timer disabilitato
    if (isSinglePlayerMode) return;
    
    // ✅ MODALITÀ TIME CHALLENGE: Timer disabilitato (turni disabilitati)
    const isTimeChallenge = gameState?.isTimeChallenge === true;
    if (isTimeChallenge) return;

    const isMyTurn = gameState.currentPlayerId === mySocketId;
    if (!isMyTurn) return;

    const id = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          handlePassTurn();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [gameState, timerPaused, mySocketId, isSinglePlayerMode]);

  // ✅ TIME CHALLENGE: Timer locale
  useEffect(() => {
    if (!gameState) return;
    const isTimeChallenge = gameState?.isTimeChallenge === true;
    if (!isTimeChallenge) return;

    // Avvia timer
    timeChallengeTimerRef.current = setInterval(() => {
      setTimeChallengeTimer(prev => prev + 1);
    }, 1000);

    return () => {
      if (timeChallengeTimerRef.current) {
        clearInterval(timeChallengeTimerRef.current);
      }
    };
  }, [gameState]);
  
  // ✅ TIME CHALLENGE: Reset timer quando cambia frase
  useEffect(() => {
    if (!gameState) return;
    const isTimeChallenge = gameState?.isTimeChallenge === true;
    if (!isTimeChallenge) return;
    
    setTimeChallengeTimer(0);
    setTimeChallengePenalties(0);
  }, [gameState?.phrase]);

  const handleRevealDone = () => {
    // ✅ Manda conferma al server
    if (pendingLetter && roomCode) {
      socket.emit("animationComplete", { 
        roomCode: roomCode, 
        letter: pendingLetter 
      });
      setPendingLetter(null);
    }
    setRevealQueue([]);
  };

  const handlePanelChange = (panelName) => {
    setTimerPaused(panelName !== null);
    setSolutionPanelOpen(panelName === "sol"); // ✅ TIME CHALLENGE: copre tabellone
  };

  const handleExitRoom = () => {
    const confirmed = window.confirm("Sei sicuro di voler abbandonare la partita?");
    
    if (confirmed) {
      localStorage.removeItem("gameSession");
      if (roomCode) {
        socket.emit("leaveRoom", { roomCode });
      }
      if (onExitToLobby) {
        onExitToLobby();
      } else {
        window.location.reload();
      }
    }
  };

  // ✅ NUOVO: Gestione richieste join
  const handleAcceptJoin = () => {
    if (!joinRequest) return;
    socket.emit("acceptJoinRequest", {
      playerId: joinRequest.playerId,
      playerName: joinRequest.playerName,
      roomCode: joinRequest.roomCode,
      type: joinRequest.type,
      isReconnection: joinRequest.isReconnection || false // ✅ Passa flag
    });
    setJoinRequest(null);
  };

  const handleRejectJoin = () => {
    if (!joinRequest) return;
    socket.emit("rejectJoinRequest", {
      playerId: joinRequest.playerId,
      roomCode: joinRequest.roomCode
    });
    setJoinRequest(null);
  };

  // ✅ NUOVO: Handler modalità presentatore
  const handleViewPhrase = () => {
    setShowPhrase(!showPhrase); // Toggle on/off
  };

  const handleCorrectSolution = () => {
    if (!roomCode) return;
    socket.emit("presenterSolutionCheck", {
      roomCode,
      isCorrect: true
    });
    setAwaitingSolutionCheck(false);
  };

  const handleWrongSolution = () => {
    if (!roomCode) return;
    socket.emit("presenterSolutionCheck", {
      roomCode,
      isCorrect: false
    });
    setAwaitingSolutionCheck(false);
  };

  const handleLetterClick = (letter) => {
    if (!roomCode || !gameState) return;
    
    // Determina se è consonante o vocale
    const vowels = ["A", "E", "I", "O", "U"];
    const isVowel = vowels.includes(letter);
    
    if (isVowel) {
      socket.emit("playVowel", { roomCode, letter });
    } else {
      socket.emit("playConsonant", { roomCode, letter });
    }
    
    setActiveLetterType(null);
  };

  // ✅ NUOVO: Listener per richieste soluzione (presentatore)
  useEffect(() => {
    if (!isPresenter) return;
    
    function handleSolutionAttempt() {
// console.log("🎯 Giocatore ha tentato soluzione - attesa verifica");
      setAwaitingSolutionCheck(true);
    }
    
    socket.on("solutionAttempt", handleSolutionAttempt);
    return () => socket.off("solutionAttempt", handleSolutionAttempt);
  }, [isPresenter]);

  // ✅ NUOVO: Listener per mostrare griglia (presentatore)
  useEffect(() => {
    if (!isPresenter) return;
    
    function handleShowLetterGrid({ type }) {
// console.log("🔤 Mostra griglia:", type);
      setActiveLetterType(type); // "consonant" | "vowel"
    }
    
    socket.on("showLetterGrid", handleShowLetterGrid);
    return () => socket.off("showLetterGrid", handleShowLetterGrid);
  }, [isPresenter]);

  // ✅ NUOVO: Listener sincronizza stato pulsanti per TUTTI i client
  useEffect(() => {
    function handleButtonStateSync({ type, playerId }) {
// console.log("🔘 Sincronizza pulsante:", type, playerId);
      
      // Se sono il giocatore che ha premuto O sono il presentatore, illumino
      if (mySocketId === playerId || isPresenter) {
        setActiveLetterType(type); // "consonant" | "vowel" | "solution"
      }
    }
    
    socket.on("buttonStateSync", handleButtonStateSync);
    return () => socket.off("buttonStateSync", handleButtonStateSync);
  }, [mySocketId, isPresenter]);

  const handleSpin = () => {
    if (!roomCode) return;
    socket.emit("spinWheel", { roomCode }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore spin");
    });
  };

  const handleWheelStop = (outcome) => {
// console.log("🎡 Ruota fermata, invio outcome al server:", outcome);
    
    // ✅ Invia l'outcome calcolato dal client al server
    socket.emit("wheelOutcome", { roomCode, outcome }, (res) => {
      if (!res?.ok) {
        console.error("❌ Errore invio outcome:", res?.error);
      }
    });
  };

  const handleConsonant = (letter) => {
    if (!roomCode) return;
    
    // ✅ MODALITÀ PRESENTATORE: Giocatore NON passa lettera, server notifica presentatore
    if (state?.room?.gameMode === "presenter" && !isPresenter) {
      setActiveLetterType("consonant"); // Illumina pulsante
      socket.emit("playConsonant", { roomCode, letter: null }, (res) => {
        if (!res?.ok) alert(res?.error || "Errore consonante");
      });
      return;
    }
    
    // ✅ Modalità normale o presentatore che clicca lettera
    socket.emit("playConsonant", { roomCode, letter }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore consonante");
    });
  };

  const handleVowel = (letter) => {
    if (!roomCode) return;
    
    // ✅ MODALITÀ PRESENTATORE: Giocatore NON passa lettera, server notifica presentatore
    if (state?.room?.gameMode === "presenter" && !isPresenter) {
      setActiveLetterType("vowel"); // Illumina pulsante
      socket.emit("playVowel", { roomCode, letter: null }, (res) => {
        if (!res?.ok) alert(res?.error || "Errore vocale");
      });
      return;
    }
    
    // ✅ Modalità normale o presentatore che clicca lettera
    socket.emit("playVowel", { roomCode, letter }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore vocale");
    });
  };

  const handleSolution = (text) => {
    if (!roomCode) return;
    
    // ✅ MODALITÀ PRESENTATORE: Giocatore NON passa testo, server notifica presentatore
    if (state?.room?.gameMode === "presenter" && !isPresenter) {
      setActiveLetterType("solution"); // Illumina pulsante
      socket.emit("trySolution", { roomCode, text: "" }, (res) => {
        if (!res?.ok) alert(res?.error || "Errore soluzione");
      });
      return;
    }
    
    // ✅ TIME CHALLENGE: Passa tempo e penalità
    const isTimeChallenge = gameState?.isTimeChallenge === true;
    if (isTimeChallenge) {
      socket.emit("trySolution", { 
        roomCode, 
        text,
        timeChallengeData: {
          time: timeChallengeTimer,
          penalties: timeChallengePenalties
        }
      }, (res) => {
        if (!res?.ok && res?.error) alert(res.error);
      });
      return;
    }
    
    // ✅ Modalità normale: Giocatore passa il testo della soluzione
    socket.emit("trySolution", { roomCode, text }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore soluzione");
    });
  };

  const handlePassTurn = () => {
    if (!roomCode) return;
    socket.emit("passTurn", { roomCode }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore passa turno");
    });
  };

  const handleChangePhrase = () => {
    if (!roomCode) return;
    // ✅ Reset animazione, showPhrase e griglia lettere prima di cambiare frase
    setRevealQueue([]);
    setShowPhrase(false);
    setActiveLetterType(null);
    socket.emit("changePhrase", { roomCode }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore cambio frase");
    });
  };

  const handleRestartGame = () => {
    if (!roomCode) return;
    socket.emit("startGame", { roomCode }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore riavvio partita");
    });
  };

  // ✅ GIOCATORE SINGOLO: Salva progressi
  const handleSaveProgress = () => {
    if (!isSinglePlayerMode) return;
    
    const playerId = gameState?.singlePlayerId || state?.room?.players?.[0]?.name;
    if (!playerId) return;
    
    setSavingProgress(true);
    
    const currentLevel = gameState?.singlePlayerLevel || 1;
    const currentScore = gameState.players[0]?.totalScore || 0;
    
    socket.emit("singlePlayerSave", {
      playerId: playerId,
      level: currentLevel,
      totalScore: currentScore
    }, (res) => {
      setSavingProgress(false);
      
      if (res && res.ok) {
// console.log("✅ Progressi salvati");
        // Mostra messaggio temporaneo
        const prevMsg = gameState.gameMessage;
        setGameState(prev => ({
          ...prev,
          gameMessage: { type: "success", text: "💾 Progressi salvati!" }
        }));
        
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            gameMessage: prevMsg
          }));
        }, 2000);
      } else {
        console.error("❌ Errore salvataggio:", res?.error);
      }
    });
  };

  // ✅ GIOCATORE SINGOLO: Prossimo livello
  const handleNextLevel = () => {
    if (!isSinglePlayerMode || !roomCode) return;
    
// console.log("🎮 Caricamento prossimo livello...");
    
    // Chiudi popup
    setBetweenRounds(false);
    setRoundCountdown(0);
    
    // Richiedi prossimo livello al server
    socket.emit("nextLevel", { roomCode }, (res) => {
      if (!res || !res.ok) {
        console.error("❌ Errore caricamento livello:", res?.error);
        return;
      }
      
// console.log("✅ Prossimo livello caricato");
    });
  };

  // ✅ GIOCATORE SINGOLO: Apri TOP 10
  const handleOpenTop10 = () => {
// console.log("🏆 Caricamento TOP 10...");
    
    socket.emit("getLeaderboard", { limit: 10 }, (res) => {
      if (res && res.ok) {
        setTop10Data(res.leaderboard || []);
        setShowTop10(true);
      } else {
        console.error("❌ Errore caricamento classifica:", res?.error);
      }
    });
  };

  if (!gameState) {
    return (
      <div className="game-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Errore: dati partita mancanti</p>
        <button onClick={() => window.location.reload()}>Ricarica</button>
      </div>
    );
  }

  if (gameState.gameOver) {
    // ✅ TIME CHALLENGE: Non mostra FinalScoreboard (usa TimeChallengeResults in App.jsx)
    const isTimeChallenge = gameState?.isTimeChallenge === true;
    if (isTimeChallenge) {
      // Non renderizzare nulla, App.jsx gestisce TimeChallengeResults
      return null;
    }
    
    return (
      <div className="game-wrapper">
        <FinalScoreboard 
          players={gameState.players} 
          onRestartGame={handleRestartGame}
          onBackToLobby={handleExitRoom} 
        />
      </div>
    );
  }

  // ✅ TIME CHALLENGE: Sempre il tuo turno (turni disabilitati)
  const isTimeChallenge = gameState?.isTimeChallenge === true;
  const isMyTurn = isTimeChallenge ? true : (gameState.currentPlayerId === mySocketId);
  
  // ✅ DEBUG modalità singlePlayer
  if (isSinglePlayerMode && !isMyTurn) {
    // console.log("⚠️ DEBUG isMyTurn:", {
    //   currentPlayerId: gameState.currentPlayerId,
    //   mySocketId: mySocketId,
    //   match: gameState.currentPlayerId === mySocketId,
    //   isSinglePlayerMode: isSinglePlayerMode
    // });
  }
  
  const flashType = betweenRounds ? "success" : 
    gameState.gameMessage?.type === "error" &&
    gameState.gameMessage?.text === "Soluzione non corretta."
      ? "error"
      : null;

  return (
    <div className="game-wrapper">
      <button className="btn-exit-room" onClick={handleExitRoom} title="Esci dalla stanza">
        ❌ Esci
      </button>

      <button 
        className="btn-fullscreen" 
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          top: '1vh',
          right: '12vw',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 'bold',
          background: '#4299e1',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          zIndex: 1001
        }}
        title={isFullscreen ? "Esci da fullscreen" : "Vai fullscreen"}
      >
        {isFullscreen ? '⊡' : '⛶'}
      </button>

      <div className="game-players">
        {isSinglePlayerMode ? (
          // ✅ MODALITÀ SINGOLO: Box orizzontale arcade style
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2px',
            padding: '8px 8px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            border: '3px solid #00d9ff',
            borderRadius: '10px',
            boxShadow: '0 0 20px rgba(0, 217, 255, 0.4), inset 0 0 20px rgba(0, 217, 255, 0.1)',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            textShadow: '0 0 8px rgba(0, 255, 136, 0.6)',
            width: '690px',
            maxWidth: '90vw',
            margin: '0 auto',
            Top: '300px',  // ← AGGIUNGI QUESTA (puoi usare 30px, 40px, ecc.)
          }}>
            {/* ID Giocatore */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              width: '140px',
              minWidth: '140px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#88ccff',
                textShadow: '0 0 5px rgba(136, 204, 255, 0.6)',
                letterSpacing: '1px'
              }}>
                PLAYER
              </div>
              <div style={{ 
                fontSize: 'clamp(1rem, 2vw, 1.3rem)',
                color: '#ffff00',
                textShadow: '0 0 10px rgba(255, 255, 0, 0.8)',
                letterSpacing: '1px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
                textAlign: 'center'
              }}>
                {gameState.players[0].name}
              </div>
            </div>

            {/* Separatore */}
            <div style={{
              width: '2px',
              height: '50px',
              background: 'linear-gradient(180deg, transparent, #00d9ff, transparent)',
              boxShadow: '0 0 10px rgba(0, 217, 255, 0.6)',
              flexShrink: 0
            }}></div>

            {/* Round Score */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              width: '100px',
              minWidth: '100px'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#88ccff',
                textShadow: '0 0 5px rgba(136, 204, 255, 0.6)',
                letterSpacing: '1px'
              }}>
                ROUND
              </div>
              <div style={{ 
                fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
                color: '#00ff88',
                textShadow: '0 0 10px rgba(0, 255, 136, 0.8)',
                letterSpacing: '1px'
              }}>
                {gameState.players[0].roundScore}
              </div>
            </div>

            {/* Separatore */}
            <div style={{
              width: '2px',
              height: '50px',
              background: 'linear-gradient(180deg, transparent, #00d9ff, transparent)',
              boxShadow: '0 0 10px rgba(0, 217, 255, 0.6)',
              flexShrink: 0
            }}></div>

            {/* Total Score */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              width: '100px',
              minWidth: '100px'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#88ccff',
                textShadow: '0 0 5px rgba(136, 204, 255, 0.6)',
                letterSpacing: '1px'
              }}>
                TOTAL
              </div>
              <div style={{ 
                fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
                color: '#ff00ff',
                textShadow: '0 0 10px rgba(255, 0, 255, 0.8)',
                letterSpacing: '1px'
              }}>
                {gameState.players[0].totalScore}
              </div>
            </div>
          </div>
        ) : (
          // ✅ MODALITÀ MULTIPLAYER: Box verticali originali
          gameState.players
            .filter(p => !p.isHost || state?.room?.gameMode !== "presenter")
            .map((p, i) => {
              const actualIndex = gameState.players.findIndex(player => player.id === p.id);
              return (
                <div
                  key={i}
                  className={`player-box ${
                    actualIndex === gameState.currentPlayerIndex ? "player-active" : ""
                  }`}
                >
                  <div className="player-name">
                    {p.name}
                    {p.id === mySocketId && " (Tu)"}
                  </div>
                  <div className="player-round">{p.roundScore} pt</div>
                  <div className="player-total">Tot: {p.totalScore}</div>
                </div>
              );
            })
        )}
      </div>

      <div>
        <div className="game-round-info">
          {isSinglePlayerMode 
            ? `🎮 LIVELLO ${gameState.singlePlayerLevel || 1}` 
            : `ROUND ${gameState.currentRound} / ${gameState.totalRounds}`
          }
        </div>

        {/* ✅ NUOVO: Info box nome stanza */}
        <div className="game-room-name">
          🏠 {roomCode}
        </div>

        {/* ✅ PRESENTATORE: Griglia QWERTY completa SEMPRE visibile */}
        {isPresenter && (
          <LetterGrid
            usedLetters={gameState.usedLetters || []}
            onLetterClick={handleLetterClick}
            onPassTurn={handlePassTurn}
            disabled={!activeLetterType} // Disabilitata finché giocatore non preme pulsante
            activeLetterType={activeLetterType}
          />
        )}

        {/* ✅ GIOCATORI: Ruota SEMPRE visibile */}
        {!isPresenter && (
          <div className="game-wheel-area">
            <Wheel
              slices={gameState.wheel}
              spinning={wheelSpinning}
              spinSeed={wheelSpinSeed}
              forcedTarget={wheelForcedTarget}
              onStop={handleWheelStop}
            />
          </div>
        )}

        <div className="controls-area">
          <Controls
            onSpin={handleSpin}
            onConsonant={handleConsonant}
            onVowel={handleVowel}
            onSolution={handleSolution}
            onPassTurn={handlePassTurn}
            onPanelChange={handlePanelChange}
            lastTarget={gameState.lastSpinTarget}
            forceConsonant={gameState.awaitingConsonant === true}
            disabled={!isMyTurn || betweenRounds}
            isPresenter={isPresenter}
            gameMode={state?.room?.gameMode || "classic"}
            showPhrase={showPhrase}
            onViewPhrase={handleViewPhrase}
            onCorrectSolution={handleCorrectSolution}
            onWrongSolution={handleWrongSolution}
            awaitingSolutionCheck={awaitingSolutionCheck}
            activeLetterType={activeLetterType}
          />
        </div>
        
        {/* ✅ PULSANTE SALVA per modalità Giocatore Singolo - LIBERO */}
        {isSinglePlayerMode && (
          <button
            onClick={handleSaveProgress}
            disabled={savingProgress}
            className="btn-save-progress"
            style={{
              position: 'absolute',
              top: '71%',
              left: '10%',
              transform: 'translateY(-50%)',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              padding: '0',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              background: savingProgress ? '#718096' : 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
              color: 'white',
              border: '3px solid rgba(66, 153, 225, 0.3)',
              cursor: savingProgress ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: savingProgress ? 'none' : '0 4px 15px rgba(66, 153, 225, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 500
            }}
            title={savingProgress ? 'Salvataggio in corso...' : 'Salva progressi'}
          >
            {savingProgress ? '⏳' : '💾'}
          </button>
        )}

        {/* ✅ PULSANTE REGOLE per modalità Giocatore Singolo - AL CENTRO */}
        {isSinglePlayerMode && (
          <button
            onClick={() => setShowRules(true)}
            className="btn-rules"
            style={{
              position: 'absolute',
              top: '64%',
              left: '72%',
              transform: 'translate(-50%, -50%)',
              width: '35px',
              height: '35px',
              borderRadius: '50%',
              padding: '0',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              border: '3px solid rgba(139, 92, 246, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 500
            }}
            title="Regole del gioco"
          >
            📖
          </button>
        )}

        {/* ✅ PULSANTE TOP 10 per modalità Giocatore Singolo */}
        {isSinglePlayerMode && (
          <button
            onClick={handleOpenTop10}
            className="btn-top10"
            style={{
              position: 'absolute',
              top: '71%',
              right: '10%',
              transform: 'translateY(-50%)',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              padding: '0',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: '3px solid rgba(245, 158, 11, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 500
            }}
            title="Visualizza TOP 10"
          >
            🏆
          </button>
        )}

        {/* Scritte consonanti/vocali finite */}
        {consonantsFinished && (
          <div className="consonants-finished">
            CONSONANTI FINITE
          </div>
        )}
        
        {vowelsFinished && (
          <div className="vowels-finished">
            VOCALI FINITE
          </div>
        )}

        <div className="game-board-area">
          {/* ✅ TIME CHALLENGE: Copre tabellone quando pannello soluzione aperto */}
          {isTimeChallenge && solutionPanelOpen && (
            <div style={{
              position: 'absolute',
              top: '0%',
              left: '20%',
              width: '300vw',
              height: '120vh',
              background: '#000',
              zIndex: 9998
            }} />
          )}
          
          <PhraseManager
            grid={showPhrase && isPresenter ? grid : maskedGrid}
            revealQueue={revealQueue}
            onRevealDone={handleRevealDone}
            category={gameState.category || "-"}
            onChangePhrase={handleChangePhrase}
            flash={flashType}
            roundColor={roundColor}
            phrase={gameState.phrase || ""}
            isSinglePlayer={isSinglePlayerMode}
          />
        </div>
      </div>

      <div>
        <div className="game-alerts">
          {gameState.gameMessage ? (
            <div className={`alert alert-enlarged ${gameState.gameMessage.type}`}>
              {gameState.gameMessage.text}
            </div>
          ) : (
            <div className="alert-placeholder">—</div>
          )}

          {!isMyTurn && !betweenRounds && (
            <div className="alert warning">
              ⏸️ Turno di {gameState.players[gameState.currentPlayerIndex]?.name}
            </div>
          )}
        </div>
      </div>

      {isMyTurn && turnTimer <= 10 && turnTimer > 0 && !betweenRounds && !isSinglePlayerMode && (
        <div className="turn-timer">{turnTimer}</div>
      )}

      {betweenRounds && (
        <div className="round-won-overlay">
          <div className="round-won-box">
            {isSinglePlayerMode ? (
              <>
                <div className="round-won-title">🎉 LIVELLO COMPLETATO! 🎉</div>
                
                {/* Resoconto caselle */}
                {gameState?.lastRoundDetails && (
                  <div style={{
                    fontSize: '1.1rem',
                    color: '#ffffff',
                    margin: '15px 0 10px 0',
                    textAlign: 'center',
                    lineHeight: '1.8'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ color: '#88ccff' }}>
                        {gameState.lastRoundDetails.singleCells} caselle x 1pt
                      </span>
                      {gameState.lastRoundDetails.singleCells > 0 && (
                        <span style={{ color: '#aaa', fontSize: '0.9rem', marginLeft: '8px' }}>
                          = {gameState.lastRoundDetails.singleCells}pt
                        </span>
                      )}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ color: '#ffaa44' }}>
                        {gameState.lastRoundDetails.doubleCells} caselle x 2pt
                      </span>
                      {gameState.lastRoundDetails.doubleCells > 0 && (
                        <span style={{ color: '#aaa', fontSize: '0.9rem', marginLeft: '8px' }}>
                          = {gameState.lastRoundDetails.doubleCells * 2}pt
                        </span>
                      )}
                    </div>
                    {gameState.lastRoundDetails.bonusPoints > 0 && (
                      <div style={{ 
                        marginTop: '12px',
                        padding: '8px',
                        background: 'rgba(255, 215, 0, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 215, 0, 0.3)'
                      }}>
                        <span style={{ color: '#ffd700' }}>
                          💰 Round Score: {gameState.lastRoundDetails.roundScore}pt
                        </span>
                        <span style={{ color: '#aaa', fontSize: '0.9rem', marginLeft: '8px' }}>
                          = +{gameState.lastRoundDetails.bonusPoints}pt bonus
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Mostra punteggio ottenuto con ANIMAZIONE */}
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#ffd700',
                  margin: '20px 0',
                  textShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
                  letterSpacing: '2px'
                }}>
                  +{animatedScore} PUNTI
                </div>
                
                <div className="round-won-winner" style={{ fontSize: '1.2rem' }}>
                  Punteggio totale: {gameState?.players?.[0]?.totalScore || 0}
                </div>
                
                {/* Pulsante Prossimo Livello */}
                <button
                  onClick={handleNextLevel}
                  style={{
                    marginTop: '30px',
                    padding: '15px 40px',
                    fontSize: '1.3rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #00ff55 0%, #00cc44 100%)',
                    color: 'black',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0, 255, 85, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  ➡️ PROSSIMO LIVELLO
                </button>
              </>
            ) : (
              <>
                <div className="round-won-title">🎉 FRASE INDOVINATA! 🎉</div>
                <div className="round-won-winner">{winnerName} ha vinto il round!</div>
                <div className="round-won-countdown">
                  Il prossimo round inizia tra <span className="countdown-number">{roundCountdown}</span> secondi...
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ✅ POPUP RICHIESTA JOIN */}
      {joinRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '30px',
            borderRadius: '12px',
            border: '2px solid #00ff55',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <h2 style={{ color: '#00ff55', marginBottom: '20px', fontSize: '1.5rem' }}>
              🔔 Nuova Richiesta
            </h2>
            <p style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '10px', color: 'white' }}>
              {joinRequest.playerName}
            </p>
            <p style={{ fontSize: '1rem', marginBottom: '30px', color: '#aaa' }}>
              {joinRequest.isReconnection 
                ? '🔄 sta riprendendo il suo giocatore'
                : `vuole unirsi come ${joinRequest.type === 'player' ? '🎮 GIOCATORE' : '👀 SPETTATORE'}`
              }
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={handleAcceptJoin} style={{
                padding: '12px 30px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                background: '#00ff55',
                color: 'black',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                ✅ ACCETTA
              </button>
              <button onClick={handleRejectJoin} style={{
                padding: '12px 30px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                background: '#ff3333',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                ❌ RIFIUTA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ POPUP TOP 10 */}
      {showTop10 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '30px',
            borderRadius: '15px',
            border: '3px solid #ffd700',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
            maxWidth: '500px',
            width: '90vw',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ 
              color: '#ffd700', 
              marginBottom: '25px', 
              fontSize: '2rem',
              textAlign: 'center',
              textShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
              fontFamily: 'monospace',
              letterSpacing: '2px'
            }}>
              🏆 TOP 10 🏆
            </h2>
            
            {top10Data.length === 0 ? (
              <p style={{ 
                textAlign: 'center', 
                color: '#888', 
                fontSize: '1.2rem',
                padding: '30px'
              }}>
                Nessun dato disponibile
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {top10Data.map((player, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '15px 20px',
                    background: index < 3 
                      ? `linear-gradient(135deg, ${
                          index === 0 ? '#ffd700' : 
                          index === 1 ? '#c0c0c0' : 
                          '#cd7f32'
                        }, rgba(0,0,0,0.3))`
                      : 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    border: index < 3 ? '2px solid rgba(255,255,255,0.3)' : 'none',
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '15px',
                      color: index < 3 ? '#000' : '#fff',
                      flex: 1
                    }}>
                      <span style={{ 
                        fontSize: '1.3rem',
                        minWidth: '30px'
                      }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <span>{player.id}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px'
                    }}>
                      <span style={{ 
                        color: index < 3 ? '#000' : '#88ccff',
                        fontSize: '0.9rem',
                        opacity: 0.8
                      }}>
                        Lv.{player.level || 1}
                      </span>
                      <span style={{ 
                        color: index < 3 ? '#000' : '#00ff88',
                        textShadow: index < 3 ? 'none' : '0 0 8px rgba(0, 255, 136, 0.6)',
                        fontSize: '1.2rem'
                      }}>
                        {player.totalScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setShowTop10(false)}
              style={{
                marginTop: '25px',
                width: '100%',
                padding: '15px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #ff3333 0%, #cc0000 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(255, 51, 51, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              ❌ CHIUDI
            </button>
          </div>
        </div>
      )}

      {/* ✅ POPUP REGOLE */}
      {showRules && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          overflowY: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '30px',
            borderRadius: '15px',
            border: '3px solid #8b5cf6',
            boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
            maxWidth: '700px',
            width: '90vw',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ 
              color: '#8b5cf6', 
              marginBottom: '25px', 
              fontSize: '2rem',
              textAlign: 'center',
              textShadow: '0 0 15px rgba(139, 92, 246, 0.8)',
              fontFamily: 'monospace',
              letterSpacing: '2px'
            }}>
              📖 REGOLE DEL GIOCO
            </h2>
            
            <div style={{ 
              color: '#ffffff', 
              fontSize: '1rem',
              lineHeight: '1.8',
              textAlign: 'left'
            }}>
              {/* OBIETTIVO */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#00ff88', fontSize: '1.3rem', marginBottom: '10px' }}>
                  🎯 OBIETTIVO
                </h3>
                <p style={{ color: '#cccccc' }}>
                  Completa tutti i <strong style={{ color: '#ffd700' }}>600+ livelli</strong> indovinando le frasi nascoste! 
                  Ogni livello completato ti avvicina alla vetta della classifica e ti prepara per le sfide multiplayer.
                </p>
              </div>

              {/* COME SI GIOCA */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#00ff88', fontSize: '1.3rem', marginBottom: '10px' }}>
                  🎮 COME SI GIOCA
                </h3>
                <ul style={{ color: '#cccccc', paddingLeft: '20px' }}>
                  <li><strong style={{ color: '#88ccff' }}>Gira la ruota</strong> per determinare il valore del tuo turno</li>
                  <li><strong style={{ color: '#88ccff' }}>Scegli una consonante</strong> (gratis) o <strong style={{ color: '#88ccff' }}>compra una vocale</strong> (500pt)</li>
                  <li>Ogni lettera corretta ti fa guadagnare punti round</li>
                  <li>Quando sei sicuro, <strong style={{ color: '#ffd700' }}>proponi la soluzione!</strong></li>
                </ul>
              </div>

              {/* PUNTEGGIO */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#00ff88', fontSize: '1.3rem', marginBottom: '10px' }}>
                  💰 PUNTEGGIO A FINE LIVELLO
                </h3>
                <div style={{ 
                  background: 'rgba(0,255,136,0.1)', 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid rgba(0,255,136,0.3)',
                  marginBottom: '10px'
                }}>
                  <p style={{ color: '#cccccc', marginBottom: '8px' }}>
                    📊 Più caselle lasci <strong style={{ color: '#ffd700' }}>bianche</strong> (non rivelate), più punti guadagni:
                  </p>
                  <ul style={{ paddingLeft: '20px', color: '#88ccff' }}>
                    <li>Prime 2 caselle consecutive: <strong style={{ color: '#ffd700' }}>1pt</strong> ciascuna</li>
                    <li>Dalla 3ª casella in poi: <strong style={{ color: '#ffd700' }}>2pt</strong> ciascuna</li>
                  </ul>
                </div>
                <div style={{ 
                  background: 'rgba(255,215,0,0.1)', 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid rgba(255,215,0,0.3)'
                }}>
                  <p style={{ color: '#ffd700' }}>
                    ⚡ <strong>BONUS 500:</strong> Ogni 500 punti round score = <strong>+2pt extra!</strong>
                  </p>
                  <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '5px' }}>
                    Esempio: 1500 round score = 3 x 2pt = +6pt bonus
                  </p>
                </div>
              </div>

              {/* REGOLE SPECIALI */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#00ff88', fontSize: '1.3rem', marginBottom: '10px' }}>
                  ⚠️ REGOLE SPECIALI
                </h3>
                <ul style={{ color: '#cccccc', paddingLeft: '20px' }}>
                  <li><strong style={{ color: '#ff6b6b' }}>BANCAROTTA:</strong> Azzera solo round score (non total score)</li>
                  <li><strong style={{ color: '#ff9f43' }}>PASSA:</strong> -200 punti dal round score</li>
                  <li><strong style={{ color: '#ff9f43' }}>Errori:</strong> -200 punti (lettera già usata, assente, soluzione sbagliata)</li>
                  <li><strong style={{ color: '#ff9f43' }}>Vocale errata:</strong> -700 punti totali (500 costo + 200 penalità)</li>
                </ul>
              </div>

              {/* VANTAGGIO MULTIPLAYER */}
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(124,58,237,0.2) 100%)',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid rgba(139,92,246,0.5)',
                marginBottom: '20px'
              }}>
                <h3 style={{ color: '#ffd700', fontSize: '1.4rem', marginBottom: '10px', textAlign: 'center' }}>
                  🚀 VANTAGGIO MULTIPLAYER
                </h3>
                <p style={{ color: '#ffffff', textAlign: 'center', fontSize: '1.1rem' }}>
                  <strong>Più livelli completi, più probabilità hai di incontrare le stesse frasi nelle sfide multiplayer online!</strong>
                </p>
                <p style={{ color: '#cccccc', textAlign: 'center', marginTop: '10px', fontSize: '0.95rem' }}>
                  Allenati in modalità singola per dominare contro altri giocatori! 💪
                </p>
              </div>

              {/* MOTIVAZIONE */}
              <div style={{ 
                textAlign: 'center',
                padding: '15px',
                background: 'rgba(0,217,255,0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(0,217,255,0.3)'
              }}>
                <p style={{ color: '#00d9ff', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  🏆 Scala la classifica e diventa il campione della Ruota della Fortuna!
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowRules(false)}
              style={{
                marginTop: '25px',
                width: '100%',
                padding: '15px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              ✅ HO CAPITO!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
#!/bin/bash
# reset-dev.command - versione corretta con apertura automatica del browser
# Posizionare questo file nella root del progetto (dove c'è package.json).
set -e

# ----- CONFIG -----
# URL che vogliamo aprire dopo l'avvio (modifica se usi porta diversa)
DEV_URL="http://localhost:5173"
# Timeout massimo per attendere il server (secondi)
WAIT_TIMEOUT=30
# ------------------

# Vai nella cartella dove è posizionato lo script
cd "$(dirname "$0")"

echo "====================================="
echo " RESET DEV (CORRETTO) - CLEAN START"
echo "====================================="
echo ""

# Controllo package.json
if [ ! -f "package.json" ]; then
  echo "❌ Errore: package.json non trovato nella cartella $(pwd)"
  echo "Assicurati di aver posizionato lo script nella root del progetto."
  exit 1
fi

echo "🔪 Chiudo eventuali processi Vite già attivi..."
pkill -f "vite" 2>/dev/null || true

echo ""
echo "🧹 Pulizia cache Vite (node_modules/.vite)..."
rm -rf node_modules/.vite || true

echo "🧹 Pulizia cache npm (verify + clean --force)..."
npm cache verify || true
npm cache clean --force || true

echo ""
echo "📦 Installazione dipendenze (solo se necessario)..."
if [ ! -d "node_modules" ]; then
  echo "→ node_modules non trovata: eseguo npm install (verbose)..."
  npm install
else
  echo "→ node_modules trovata: salto npm install"
fi

echo ""
echo "🚀 Avvio progetto in background (npm run dev)..."
# Avvia in background reindirizzando output su file log
nohup npm run dev > dev-server.log 2>&1 &

# Attendi che la porta risponda (timeout)
echo ""
echo "⏳ Attendo che il server risponda su $DEV_URL (timeout ${WAIT_TIMEOUT}s)..."
SECONDS=0
while true; do
  # prova a connetterti (usiamo curl silenzioso)
  if curl -s --head "$DEV_URL" >/dev/null 2>&1; then
    echo "✅ Server attivo!"
    break
  fi
  sleep 1
  if [ "$SECONDS" -ge "$WAIT_TIMEOUT" ]; then
    echo "⚠️ Timeout: il server non ha risposto entro ${WAIT_TIMEOUT}s."
    echo "Controlla dev-server.log nella cartella del progetto per i dettagli."
    # apriamo comunque il log per ispezione (non apriamo browser)
    open dev-server.log 2>/dev/null || true
    exit 2
  fi
done

# Apri il browser sulla URL di sviluppo (macOS)
echo "🌐 Apro il browser su $DEV_URL ..."
open "$DEV_URL" 2>/dev/null || echo "→ Non è stato possibile aprire automaticamente il browser."

echo ""
echo "✅ Reset e avvio completati. Log: dev-server.log"
echo ""
# Fine
exit 0

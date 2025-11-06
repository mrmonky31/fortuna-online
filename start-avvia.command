#!/bin/bash
# start-dev.command - avvio RUOTA DELLA FORTUNA ONLINE (server + client)
set -e

DEV_URL="http://localhost:5173"
WAIT_TIMEOUT=40

cd "$(dirname "$0")"

echo "====================================="
echo "   AVVIO RUOTA DELLA FORTUNA ONLINE  "
echo "====================================="
echo ""
echo "Cartella corrente: $(pwd)"
echo ""

if [ ! -d "server" ]; then
  echo "❌ ERRORE: cartella 'server' non trovata."
  exit 1
fi

echo "▶️ Avvio SERVER (Node) in background..."
cd server

if [ ! -f "package.json" ]; then
  echo "❌ ERRORE: nessun package.json in ./server"
  exit 1
fi

npm start > ../server.log 2>&1 &
SERVER_PID=$!
cd ..

echo "   → SERVER PID: $SERVER_PID (log in server.log)"
echo ""

echo "▶️ Avvio CLIENT (Vite) in background..."
if [ ! -f "package.json" ]; then
  echo "❌ ERRORE: nessun package.json nella root del progetto."
  exit 1
fi

npm run dev > dev-server.log 2>&1 &
CLIENT_PID=$!

echo "   → CLIENT PID: $CLIENT_PID (log in dev-server.log)"
echo ""

echo "⏳ Attendo che il client sia raggiungibile su $DEV_URL ..."

START_TIME=$(date +%s)
while true; do
  if curl -sSf "$DEV_URL" >/dev/null 2>&1; then
    echo "✅ Client attivo!"
    break;
  fi

  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TIME))
  if [ "$ELAPSED" -ge "$WAIT_TIMEOUT" ]; then
    echo "⚠️ Timeout di $WAIT_TIMEOUT secondi in attesa del client."
    echo "   Puoi provare ad aprire manualmente: $DEV_URL"
    break
  fi

  sleep 1
done

echo ""
echo "🌐 Apro il browser su $DEV_URL ..."
open "$DEV_URL" 2>/dev/null || echo "→ Impossibile aprire automaticamente il browser."

echo ""
echo "====================================="
echo "   SERVER PID : $SERVER_PID"
echo "   CLIENT PID : $CLIENT_PID"
echo "   Per fermare tutto chiudi questa finestra"
echo "   oppure usa 'kill PID' da terminale."
echo "====================================="
echo ""

wait

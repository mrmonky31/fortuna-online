c#!/bin/bash
cd "$(dirname "$0")"

echo "🔄 Spostamento nella cartella del progetto..."
cd ~/fortuna-online

echo "📦 Aggiungo tutte le modifiche..."
git add .

echo "🧱 Creo commit locale..."
git commit -m "fix definitivo: sincronizzazione forzata con GitHub"

echo "🚀 Invio forzato su GitHub (branch main)..."
git push origin main --force

echo "✅ Aggiornamento completato! Ora GitHub, Render e Vercel rigenereranno il deploy."

#!/bin/bash

echo "=========================================="
echo "🚀 GIT PUSH COMPLETO"
echo "=========================================="
echo ""

# Verifica che siamo in una directory Git
if [ ! -d .git ]; then
    echo "❌ ERRORE: Non sei in una directory Git!"
    echo "   Esegui questo script dalla root del progetto"
    exit 1
fi

echo "📂 Directory corrente: $(pwd)"
echo ""

# Mostra status
echo "📊 Status attuale:"
git status --short
echo ""

# Chiedi conferma
echo "⚠️  ATTENZIONE: Stai per pushare TUTTI i file!"
read -p "Vuoi continuare? Scrivi 'SI' per confermare: " conferma

if [ "$conferma" != "SI" ]; then
    echo "❌ Operazione annullata"
    exit 0
fi

echo ""
echo "🔄 Esecuzione comandi Git..."
echo ""

# Add tutti i file
echo "1️⃣  git add -A"
git add -A

if [ $? -ne 0 ]; then
    echo "❌ Errore durante git add"
    exit 1
fi

# Commit
echo ""
echo "2️⃣  git commit"
git commit -m "Time Challenge: fix startPhraseIndex + nuovo match sequenziale"

if [ $? -ne 0 ]; then
    echo "⚠️  Nessun cambiamento da committare o errore"
    # Non esco, potrebbe essere già committato
fi

# Push
echo ""
echo "3️⃣  git push"
git push

if [ $? -ne 0 ]; then
    echo "❌ Errore durante git push"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ PUSH COMPLETATO CON SUCCESSO!"
echo "=========================================="
echo ""
echo "🌐 Vercel farà il deploy automaticamente tra 1-2 minuti"
echo ""

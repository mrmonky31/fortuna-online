===========================================
🎡 RUOTA DELLA FORTUNA ONLINE V2 - README
===========================================

Cartella progetto: fortuna-online-v2

💻 Requisiti:
- macOS con Node.js installato (consigliato Node 18+)
- Connessione Internet (solo per la prima installazione)

-------------------------------------------
🧩 PRIMA CONFIGURAZIONE (UNA SOLA VOLTA)
-------------------------------------------

1. Apri il Terminale nella cartella del progetto:
   cd /percorso/della/cartella/fortuna-online-v2

2. Installa le dipendenze del client e del server:

   npm install
   cd server && npm install && cd ..

3. Dai il permesso di esecuzione al launcher:

   chmod +x start-dev.command

-------------------------------------------
▶️ AVVIO AUTOMATICO (METODO CONSIGLIATO)
-------------------------------------------

Dopo la prima configurazione, basta:

   doppio click su: start-dev.command

Lo script avvierà automaticamente:
- il server Node (porta 3001)
- il client React/Vite (porta 5173)
- aprirà il browser su: http://localhost:5173

I log vengono salvati in:
- server.log
- dev-server.log

-------------------------------------------
💡 AVVIO MANUALE (SOLO SE SERVE)
-------------------------------------------

1. Apri due tab del terminale.

Tab 1 → server:
   cd /percorso/della/cartella/fortuna-online-v2/server
   npm start

Tab 2 → client:
   cd /percorso/della/cartella/fortuna-online-v2
   npm run dev

Poi apri nel browser:
   http://localhost:5173

-------------------------------------------
⛔ CHIUSURA
-------------------------------------------

Per fermare il gioco:

- Se hai usato start-dev.command:
  chiudi la finestra del terminale che si è aperta.

- Se hai avviato manualmente:
  premi CTRL + C nei terminali dove girano server e client.

-------------------------------------------
🔧 NOTE TECNICHE
-------------------------------------------

- Max 4 giocatori attivi
- Max 10 spettatori
- L’host è sempre anche giocatore
- Il server mantiene il turno e sincronizza tutto
- Logica di gioco riutilizzata dai file:
  - server/game/GameLogic.js
  - server/game/GameEngine.js
  - server/game/spinPatterns.js
  - server/game/phrases.js
  - server/game/phrases_orchidea.js (esempio codice segreto)

-------------------------------------------
🔐 CODICE SEGRETO BASATO SUL NOME STANZA
-------------------------------------------

Quando crei una stanza dalla lobby online:

- Se imposti un "Nome stanza" che corrisponde a un file
  nella cartella server/game con nome:

    phrases_<nome>.js

  (dove <nome> è il nome stanza normalizzato in minuscolo
   e spazi sostituiti da underscore)

  allora il server caricherà QUELLE frasi:

  - in ordine SEQUENZIALE (non casuale)
  - una per round

Esempio:

- Nome stanza: ORCHIDEA
- File richiesto: server/game/phrases_orchidea.js

Il file deve esportare:

  export const testPhrases = [
    { category: "TITOLO", text: "LA TUA FRASE QUI" },
    ...
  ];

Se il file NON esiste, viene usato il set standard:
  server/game/phrases.js (in modo casuale).

-------------------------------------------
🌍 DEPLOY ONLINE (GIOCO PUBBLICO)
-------------------------------------------

Per pubblicare il gioco online:

1. Inizializza git nella cartella fortuna-online-v2:

   git init
   git add .
   git commit -m "Fortuna Online V2"

2. Crea un repository su GitHub (es. fortuna-online).
   Collega e fai push:

   git remote add origin https://github.com/TUO-UTENTE/fortuna-online.git
   git branch -M main
   git push -u origin main

3. Su Render.com:
   - New → Web Service
   - Collega il repo
   - Root Directory: server
   - Build Command: npm install
   - Start Command: npm start
   - Environment: Node
   - Piano: Free

   Otterrai un URL tipo:
   https://fortuna-online-server.onrender.com

4. Su Vercel.com:
   - New Project → seleziona lo stesso repo
   - Root Directory: (vuota, client in root)
   - Framework: Vite
   - Build Command: npm run build
   - Output Directory: dist

   - Variabile ambiente:
       Nome: VITE_SERVER_URL
       Valore: URL del server Render
              (es. https://fortuna-online-server.onrender.com)

   - Deploy.

5. Vercel ti darà un link pubblico, tipo:
   https://fortuna-online.vercel.app

Condividi quel link per giocare con familiari e amici.

-------------------------------------------
🔁 AGGIORNARE IL GIOCO ONLINE
-------------------------------------------

Ogni volta che modifichi il progetto in locale:

   git add .
   git commit -m "Aggiornamento"
   git push

Render e Vercel ricostruiranno automaticamente
la nuova versione.

-------------------------------------------
✅ RIEPILOGO FINALE
-------------------------------------------

- start-dev.command → avvio locale 1-click
- Lobby con nome stanza personalizzato
- Codice segreto: phrases_<nome_stanza>.js
- Frasi segrete SEQUENZIALI per partite tematizzate
- Layout mobile con ruota a metà, timer 10→0 solo a fine turno.

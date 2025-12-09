// phrases-sfidanatale.js - File frasi custom per Torneo di Natale
// 📍 Posizionare in: server/game/phrases-sfidanatale.js

// Modalità di selezione quando NON si usa un set specifico
export const phraseMode = "random"; // "random" o "sequential"

// Lista completa frasi disponibili (usata quando roomName = "sfidanatale")
export const testPhrases = [
  { category: 'TRADIZIONI', text: 'ALBERO DI NATALE' },
  { category: 'TRADIZIONI', text: 'PRESEPE VIVENTE' },
  { category: 'TRADIZIONI', text: 'CALZA DELLA BEFANA' },
  { category: 'TRADIZIONI', text: 'CORONA DI AVVENTO' },
  { category: 'CIBO', text: 'PANETTONE E PANDORO' },
  { category: 'CIBO', text: 'TORRONE CROCCANTE' },
  { category: 'CIBO', text: 'ZAMPONE E LENTICCHIE' },
  { category: 'CIBO', text: 'COTECHINO CON PURÈ' },
  { category: 'PERSONAGGI', text: 'BABBO NATALE' },
  { category: 'PERSONAGGI', text: 'RENNA RUDOLPH' },
  { category: 'PERSONAGGI', text: 'ELFI DI BABBO NATALE' },
  { category: 'PERSONAGGI', text: 'LA BEFANA' },
  { category: 'CANZONI', text: 'JINGLE BELLS' },
  { category: 'CANZONI', text: 'TU SCENDI DALLE STELLE' },
  { category: 'CANZONI', text: 'ASTRO DEL CIEL' },
  { category: 'CANZONI', text: 'BIANCO NATALE' },
  { category: 'FILM', text: 'MAMMA HO PERSO L AEREO' },
  { category: 'FILM', text: 'UNA POLTRONA PER DUE' },
  { category: 'FILM', text: 'IL GRINCH' },
  { category: 'FILM', text: 'POLAR EXPRESS' },
  { category: 'DECORAZIONI', text: 'GHIRLANDA DI AGRIFOGLIO' },
  { category: 'DECORAZIONI', text: 'PALLA DI VETRO' },
  { category: 'DECORAZIONI', text: 'STELLA COMETA' },
  { category: 'DECORAZIONI', text: 'LUCI COLORATE' },
  { category: 'REGALI', text: 'CARTA DA REGALO' },
  { category: 'REGALI', text: 'FIOCCO ROSSO' },
  { category: 'REGALI', text: 'BIGLIETTO DI AUGURI' },
  { category: 'REGALI', text: 'PACCO SOTTO L ALBERO' },
  { category: 'EVENTI', text: 'MESSA DI MEZZANOTTE' },
  { category: 'EVENTI', text: 'CENONE DELLA VIGILIA' },
  { category: 'EVENTI', text: 'PRANZO DI NATALE' },
  { category: 'EVENTI', text: 'VEGLIONE DI CAPODANNO' }
];

// Set predefiniti per tornei (roomName = "sfidanatale_1", "sfidanatale_2", ecc)
export const phraseSets = {
  // Set 1 - Girone A
  1: [
    { category: 'TRADIZIONI', text: 'PRESEPE VIVENTE' },
    { category: 'CIBO', text: 'PANETTONE E PANDORO' },
    { category: 'PERSONAGGI', text: 'BABBO NATALE' },
    { category: 'CANZONI', text: 'JINGLE BELLS' },
    { category: 'FILM', text: 'MAMMA HO PERSO L AEREO' }
  ],
  
  // Set 2 - Girone B
  2: [
    { category: 'DECORAZIONI', text: 'GHIRLANDA DI AGRIFOGLIO' },
    { category: 'REGALI', text: 'CARTA DA REGALO' },
    { category: 'EVENTI', text: 'CENONE DELLA VIGILIA' },
    { category: 'CIBO', text: 'TORRONE CROCCANTE' },
    { category: 'FILM', text: 'UNA POLTRONA PER DUE' }
  ],
  
  // Set 3 - Semifinale
  3: [
    { category: 'PERSONAGGI', text: 'RENNA RUDOLPH' },
    { category: 'CANZONI', text: 'TU SCENDI DALLE STELLE' },
    { category: 'DECORAZIONI', text: 'PALLA DI VETRO' },
    { category: 'REGALI', text: 'FIOCCO ROSSO' },
    { category: 'EVENTI', text: 'MESSA DI MEZZANOTTE' }
  ],
  
  // Set 4 - Finale
  4: [
    { category: 'TRADIZIONI', text: 'CORONA DI AVVENTO' },
    { category: 'CIBO', text: 'ZAMPONE E LENTICCHIE' },
    { category: 'FILM', text: 'POLAR EXPRESS' }
  ],
  
  // Set 5 - Spareggio
  5: [
    { category: 'PERSONAGGI', text: 'ELFI DI BABBO NATALE' },
    { category: 'CANZONI', text: 'ASTRO DEL CIEL' },
    { category: 'DECORAZIONI', text: 'STELLA COMETA' }
  ]
};

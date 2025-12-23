// phrases-sfidanatale.js - File frasi custom per Torneo di Natale
// 📍 Posizionare in: server/game/phrases-sfidanatale.js

// Modalità di selezione quando NON si usa un set specifico
export const phraseMode = "sequential"; // "random" o "sequential"

// Lista completa frasi disponibili (usata quando roomName = "sfidanatale")
export const testPhrases = [
 
    { categoria: "PERCHÉ", frase: "LE SCARPE CALZANO MA LE CALZE NON SCARPANO?" },
    { categoria: "SUPPOSTE", frase: "SE HAI LA FACCIA DA CULO PUOI ANCHE MANGIARLE" },
    { categoria: "GOLD FINGER", frase: "IL SOPRANNOME DEL PROCTOLOGO PIÙ FAMOSO AL MONDO" },
    { categoria: "ALL’ESTERO NON PUOI", frase: "SCORREGGIARE PENSANDO CHE NON CAPISCANO LA TUA LINGUA" },
    
    { categoria: "I GALLI", frase: "POSSONO ESSERE MANGIATI DAI PAPPAGALLI" },
    
    { categoria: "PORTA A PORTA", frase: "È IL PROGRAMMA PREFERITO DAI TESTIMONI DI GEOVA" },
    { categoria: "MEDIOEVO", frase: "IL GIOCO PIÙ DIFFUSO ERANO LE PAROLE CROCIATE" },
    { categoria: "VIVI DA SOLA", frase: "SE HAI PAURA CHIAMI IL FABBRO E TI FAI SBARRARE LA FINESTRA" },
    { categoria: "COERENZA", frase: "PER ESSERLO CON LA TUA FACCIA DOVRESTI MANGIARE SUPPOSTE" },
    { categoria: "ABITUDINI SPAZIALI", frase: "GLI ASTRONAUTI PRANZANO SEMPRE A LUNA" },
    { categoria: "IMPIEGATI COMUNALI", frase: "DI POMERIGGIO SONO CHIUSI E DI MATTINA NON LAVORANO" },
    { categoria: "LIDO", frase: "DISSE IL CINESE CHE SI ERA MOLTO DIVERTITO" },
    { categoria: "AFFERMAZIONE OPINABILE", frase: "IL CONTRARIO DI MELODIA È SE LO TENGA" },
    
    { categoria: "NO PAPESSE", frase: "NON SONO IN GRADO DI GUIDARE LE AUTO FIGURIAMOCI I FEDELI" },
    { categoria: "TRADIZIONI", frase: "FINISCE SEMPRE A SCHIFIO GIOCANDO A MAZZETTI" },
    { categoria: "BOTTA DI CULO", frase: "SE REALE PUÒ ANCHE SCHIACCIARTI LE VERTEBRE" },
    { categoria: "AUTO VA CONTRO ALBERO", frase: "IL CONDUTCENTE RESTA ILLESO L’ACERO CONTUSO" },
    { categoria: "L’ALBERO DI NATALE", frase: "E’ SEMPRE ATTORRONATO PERCHÉ TUTTI GLI TOCCANO LE PALLE" },
    
    
    { categoria: "GELATERIE", frase: "IN CINA QUELLE GRANDI SONO ESAGGELATE" },
    { categoria: "LE MUCCHE", frase: "QUANDO SONO STANCHE FANNO IL LATTE STREMATO" },
    { categoria: "IL TIMBALLO", frase: "E’ IL PIATTO PREFERITO DAI MAGAZZINIERI" },
    { categoria: "NUTELLA BIANCA", frase: "CREATA PER FAR SPORCARE LE MANI AI BAMBINI NERI" },
    
  
  { category: 'TRADIZIONI NOSTRE ', text: 'GIOCARE A MAZZETTI' },
  { category: 'TRADIZIONI', text: 'PARLARE TUTTI ALLO STESSO MOMENTO' },
  { category: 'TRADIZIONI', text: 'NON SAPERE COSA MANGIARE' },
  { category: 'TRAMONTI ', text: 'PER TERESINA SONO SEMPRE SUGGESTIVI' },
  { category: 'CIBO', text: 'I BOCCONCINI DI MIRACOLINI' },
  { category: 'CIBO', text: 'TORRONE CROCCANTE' },
  { category: 'CIBO', text: 'ZAMPONE E LENTICCHIE' },
  { category: 'CIBO', text: 'COTECHINO CON PURÈ' },
  { category: 'LIDO', text: 'DISSE IL CINESE DIVERTITO' },
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

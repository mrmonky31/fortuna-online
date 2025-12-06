// 🎡 Fortuna Project — Pattern predefiniti della ruota
// ✨ NUOVO: Supporto _HALF per mezzi spicchi separati

export const SPIN_PATTERNS = [
  // 🌀 PATTERN 1 — Classico equilibrato (con _HALF separati)
  [
    100, 200, 300, 400, 500, 600, 700,
    "PASSA_HALF",
    "BANCAROTTA_HALF",
    800, 1000, 200, 400,
    "RADDOPPIA_HALF",
    "PASSA_HALF",
    500, 300, 700, 800, 1000
  ],

  // 💰 PATTERN 2 — Ricco (più valori alti, mix _HALF e divisioni classiche)
  [
    200, 400, 600,
    "PASSA_HALF",
    "BANCAROTTA_HALF",
    800, 1000, 1000, 700,
    "RADDOPPIA_HALF",
    "PASSA_HALF",
    500, 300, 400,
    "BANCAROTTA/RADDOPPIA",  // ✅ Formato classico ancora supportato
    800, 700, 600, 500, 300
  ],

  // ⚡ PATTERN 3 — Rischioso (più malus ma premi grandi, _HALF ben distribuiti)
  [
    100,
    "PASSA_HALF",
    5000,
    "BANCAROTTA_HALF",
    800, 1000, 400,
    "PASSA_HALF",
    300,
    "BANCAROTTA_HALF",
    700,
    "RADDOPPIA_HALF",
    1000,
    "PASSA_HALF",
    600, 200, 400, 500, 300, 700, 800
  ],
 
  // 🌈 PATTERN 4 — Leggero (valori bassi, round facile, solo _HALF)
  [
    100, 200, 300,
    "PASSA_HALF",
    "BANCAROTTA_HALF",
    400, 500, 600,
    "RADDOPPIA_HALF",
    "PASSA_HALF",
    300, 400, 500, 600, 700,
    "BANCAROTTA_HALF",
    200,
    "RADDOPPIA_HALF",
    300, 400, 500
  ],
];

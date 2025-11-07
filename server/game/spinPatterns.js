// 🎡 Fortuna Project — Pattern predefiniti della ruota

export const SPIN_PATTERNS = [
  // 🌀 PATTERN 1 — Classico equilibrato
  [
    100, 200, 300, 400, 500, 600, 700, "PASSA",
    800, 1000, "BANCAROTTA", 200, 400, "RADDOPPIA",
    500, 300, "PASSA/BANCAROTTA", 700, 800, 1000,
  ],

  // 💰 PATTERN 2 — Ricco (più valori alti)
  [
    200, 400, 600, "PASSA",
    800, 1000, 1000, 700, "RADDOPPIA",
    500, "BANCAROTTA", 300, 400,
    "PASSA/BANCAROTTA", 800, 700, 600, 500, 300, "BANCAROTTA/RADDOPPIA",
  ],

  // ⚡ PATTERN 3 — Rischioso (più malus ma premi grandi)
  [
    100, "PASSA", 5000, "BANCAROTTA", 800, 1000,
    400, "PASSA/BANCAROTTA", 300, 700,
    "RADDOPPIA", 1000, 600, "BANCAROTTA/RADDOPPIA",
    200, 400, 500, 300, 700, 800,
  ],
 
  // 🌈 PATTERN 4 — Leggero (valori bassi, round facile)
  [
    100, 200, 300, "PASSA",
    400, 500, 600, "PASSA/BANCAROTTA",
    300, 400, "RADDOPPIA", 500, 600, 700,
    "BANCAROTTA", 200, 300, 400, 500, "BANCAROTTA/RADDOPPIA",
  ],
];

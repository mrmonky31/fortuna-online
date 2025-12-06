// 🎡 VERSIONE A: SEED SINCRONIZZATO
// ✅ FIX OFFSET: Rimosso -9.9° e allineato con calcolo server

import React, { useEffect, useRef, useState } from "react";
import "../styles/wheel.css";

const SLICE_COUNT = 20;
const SLICE_DEG = 360 / SLICE_COUNT; // 18°

const COLORS = {
  100: "#4F8EF7", 200: "#1E88E5", 300: "#26C6DA", 400: "#00BFA5",
  500: "#43A047", 600: "#F9A825", 700: "#EF6C00", 800: "#8E24AA",
  1000: "#C62828", 5000: "#FF1744",
  PASSA: "#FFFFFF", BANCAROTTA: "#000000", RADDOPPIA: "#D4AF37",
};

const TEXT_COLOR = (bg) => {
  const darkish = ["#000000", "#C62828", "#8E24AA", "#1E88E5", "#4F8EF7", "#43A047", "#EF6C00", "#FF1744"].includes(bg);
  return darkish ? "#FFFFFF" : "#000000";
};

const toRad = (deg) => (Math.PI / 180) * deg;

// Generatore random con seed
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// 🆕 Preprocessing pattern: converte _HALF in spicchi divisi
function preprocessPattern(pattern) {
  if (!Array.isArray(pattern) || pattern.length === 0) return pattern;
  
  const result = [];
  let i = 0;
  
  while (i < pattern.length) {
    const current = pattern[i];
    
    // Controlla se è un half slice
    if (typeof current === "string" && current.includes("_HALF")) {
      // Cerca il prossimo elemento
      const next = pattern[i + 1];
      
      if (next && typeof next === "string" && next.includes("_HALF")) {
        // Due half consecutivi → combina in uno spicchio diviso
        const a = current.replace("_HALF", "").trim();
        const b = next.replace("_HALF", "").trim();
        result.push(`${a}/${b}`);
        console.log(`🔄 Combinati half slices: ${a}_HALF + ${b}_HALF → ${a}/${b}`);
        i += 2; // Salta entrambi
      } else {
        // Half singolo senza coppia → Errore!
        console.error(`❌ ERRORE: ${current} non ha un half slice accoppiato!`);
        // Usa come spicchio intero (fallback)
        result.push(current.replace("_HALF", "").trim());
        i++;
      }
    } else {
      // Elemento normale (numero o stringa senza _HALF)
      result.push(current);
      i++;
    }
  }
  
  return result;
}

// Validazione pattern
function validatePattern(pattern) {
  if (!Array.isArray(pattern)) return false;
  
  const halfCount = pattern.filter(s => 
    typeof s === "string" && s.includes("_HALF")
  ).length;
  
  if (halfCount % 2 !== 0) {
    console.error(`❌ Pattern invalido: numero dispari di _HALF slices (${halfCount})`);
    console.error("Ogni _HALF deve essere accoppiato con un altro _HALF!");
    return false;
  }
  
  console.log(`✅ Pattern valido: ${halfCount} half slices (${halfCount/2} coppie)`);
  return true;
}

export default function WheelVersionA({ slices = [], spinning = false, onStop, spinSeed = null }) {
  const wheelRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const size = 380;
  const cx = size / 2, cy = size / 2;
  const R = 170;

  // 🎲 Valori di rotazione predefiniti (numero di giri completi)
  const SPIN_ROTATIONS = [3.4, 4.5, 3.7, 4.2, 3.3, 4.7, 3.9];

  // ✅ Pattern di default (se non passati slices)
  const defaultPattern = [
    100, 200, 300, 400, 500, 600, 700, "PASSA",
    800, 1000, "BANCAROTTA", 200, 400, "RADDOPPIA",
    500, 300, "PASSA/BANCAROTTA", 700, 800, 1000,
  ];

  // 🔄 Preprocessa pattern: converte _HALF in spicchi divisi
  const rawPattern = slices.length ? slices : defaultPattern;
  
  // Validazione
  if (!validatePattern(rawPattern)) {
    console.warn("⚠️ Pattern non valido, uso pattern di default");
  }
  
  // Preprocessing
  const processedPattern = preprocessPattern(rawPattern);
  
  // ✅ USA il pattern processato
  const values = processedPattern;

  const arcPath = (startDeg, sweepDeg) => {
    const endDeg = startDeg + sweepDeg;
    const x1 = cx + R * Math.cos(toRad(startDeg));
    const y1 = cy + R * Math.sin(toRad(startDeg));
    const x2 = cx + R * Math.cos(toRad(endDeg));
    const y2 = cy + R * Math.sin(toRad(endDeg));
    const largeArc = sweepDeg > 180 ? 1 : 0;
    return `M ${cx},${cy} L ${x1},${y1} A ${R},${R} 0 ${largeArc} 1 ${x2},${y2} Z`;
  };

  const labelPos = (midDeg, radiusFactor = 0.62) => {
    const r = R * radiusFactor;
    return {
      x: cx + r * Math.cos(toRad(midDeg)),
      y: cy + r * Math.sin(toRad(midDeg)),
    };
  };

  const sectors = values.map((label, i) => {
    const start = -90 + i * SLICE_DEG;
    const mid = start + SLICE_DEG / 2;
    return { i, label, start, mid };
  });

  const renderSector = ({ label, start, mid }, idx) => {
    if (typeof label === "string" && label.includes("/")) {
      const [a, b] = label.split("/");
      const half = SLICE_DEG / 2;
      
      const colorFor = (t) => COLORS[t] || (t === "PASSA" ? COLORS.PASSA : t === "BANCAROTTA" ? COLORS.BANCAROTTA : t === "RADDOPPIA" ? COLORS.RADDOPPIA : "#ddd");
      
      const colA = colorFor(a);
      const colB = colorFor(b);
      
      const startA = start;
      const midA = startA + half / 2;
      const pathA = arcPath(startA, half);
      const posA = labelPos(midA, 0.68);
      const tcA = TEXT_COLOR(colA);
      
      const startB = start + half;
      const midB = startB + half / 2;
      const pathB = arcPath(startB, half);
      const posB = labelPos(midB, 0.68);
      const tcB = TEXT_COLOR(colB);
      
      return (
        <g key={`split-${idx}`}>
          <path d={pathA} fill={colA} stroke="#ffffff" strokeWidth="2" />
          <text x={posA.x} y={posA.y} fontFamily="system-ui, Arial" fontSize="10" fontWeight="900" fill={tcA} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${midA} ${posA.x} ${posA.y})`}>{a}</text>
          <path d={pathB} fill={colB} stroke="#ffffff" strokeWidth="2" />
          <text x={posB.x} y={posB.y} fontFamily="system-ui, Arial" fontSize="10" fontWeight="900" fill={tcB} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${midB} ${posB.x} ${posB.y})`}>{b}</text>
          <line x1={cx} y1={cy} x2={cx + R * Math.cos(toRad(start + half))} y2={cy + R * Math.sin(toRad(start + half))} stroke="#ffffff" strokeWidth="1.5" />
        </g>
      );
    }

    const bg = COLORS[label] || "#dddddd";
    const d = arcPath(start, SLICE_DEG);
    const { x, y } = labelPos(mid);
    const tc = TEXT_COLOR(bg);

    return (
      <g key={`sec-${idx}`}>
        <path d={d} fill={bg} stroke="#fff" strokeWidth="2" />
        <text x={x} y={y} fontFamily="system-ui, Arial" fontSize="14" fontWeight="900" fill={tc} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid} ${x} ${y})`}>{String(label)}</text>
      </g>
    );
  };

  // ✅ SPIN con rotazione casuale + rimbalzo realistico
  useEffect(() => {
    if (!spinning || isSpinning) return;
    
    setIsSpinning(true);
    
    // Reset
    if (wheelRef.current) {
      wheelRef.current.style.transition = "none";
      setAngle(0);
    }

    setTimeout(() => {
      // 🎲 Scegli casualmente una rotazione dalla lista predefinita
      const randomFromSeed = seededRandom(spinSeed || Date.now());
      const rotationIndex = Math.floor(randomFromSeed * SPIN_ROTATIONS.length);
      const numberOfRotations = SPIN_ROTATIONS[rotationIndex];
      
      // 🎲 Angolo casuale finale (0-360°) per variare dove si ferma
      const randomFinalAngle = seededRandom(spinSeed + 100) * 360;
      
      // ⏱️ Durata casuale tra 3-4.5 secondi
      const duration = 3 + randomFromSeed * 1.5;
      
      // 🎯 FASE 1: Rotazione principale con overshoot (va oltre il target di 3.6°)
      const overshoot = 3.6; // 18°/5 = 3.6° (1/5 di spicchio)
      const totalRotationWithOvershoot = numberOfRotations * 360 + randomFinalAngle + overshoot;

      if (wheelRef.current) {
        // Animazione principale con overshoot
        wheelRef.current.style.transition = `transform ${duration}s cubic-bezier(0.12, 0.64, 0.24, 1)`;
        setAngle(totalRotationWithOvershoot);
      }

      // 🎯 FASE 2: Dopo l'overshoot, rimbalza indietro di 3.6°
      setTimeout(() => {
        const bounceBackDuration = 0.3; // 300ms per il rimbalzo
        const finalRotation = numberOfRotations * 360 + randomFinalAngle;
        
        if (wheelRef.current) {
          wheelRef.current.style.transition = `transform ${bounceBackDuration}s cubic-bezier(0.36, 0, 0.66, 0.04)`;
          setAngle(finalRotation);
        }

        // 🎯 FASE 3: Calcola outcome in base alla posizione finale sotto il puntatore
        setTimeout(() => {
          setIsSpinning(false);
          
          // ⚙️ CALIBRAZIONE PUNTATORE
          // ========================================
          // 🎯 MODIFICA QUESTA RIGA PER CALIBRARE:
          const POINTER_ANGLE = 350;  // ← Puntatore a ore 12 = 0° (modifica questo valore per calibrare)
          // ========================================
          // Esempi:
          //   0° = ore 12 (↑)
          //  90° = ore 3  (→)
          // 180° = ore 6  (↓)
          // 270° = ore 9  (←)
          
          const normalizedAngle = finalRotation % 360;
          
          // Calcola quale spicchio è sotto il puntatore
          // Gli spicchi partono da -90° (indice 0 a ore 12)
          const angleUnderPointer = (POINTER_ANGLE - normalizedAngle + 360) % 360;
          const adjustedAngle = (angleUnderPointer + 90) % 360;
          const sliceIndex = Math.floor(adjustedAngle / SLICE_DEG) % values.length;
          const slice = values[sliceIndex];

          let outcome;
          if (typeof slice === "string" && slice.includes("/")) {
            // Spicchio diviso
            const [a, b] = slice.split("/");
            const localAngle = adjustedAngle - (sliceIndex * SLICE_DEG);
            const chosen = localAngle < SLICE_DEG / 2 ? a : b;
            
            if (chosen === "PASSA") outcome = { type: "pass", label: "PASSA" };
            else if (chosen === "BANCAROTTA") outcome = { type: "bankrupt", label: "BANCAROTTA" };
            else if (chosen === "RADDOPPIA") outcome = { type: "double", label: "RADDOPPIA" };
            else if (!isNaN(Number(chosen))) outcome = { type: "points", value: Number(chosen), label: chosen };
            else outcome = { type: "custom", label: chosen };
          } else if (typeof slice === "number") {
            outcome = { type: "points", value: slice, label: slice };
          } else if (slice === "PASSA") {
            outcome = { type: "pass", label: "PASSA" };
          } else if (slice === "BANCAROTTA") {
            outcome = { type: "bankrupt", label: "BANCAROTTA" };
          } else if (slice === "RADDOPPIA") {
            outcome = { type: "double", label: "RADDOPPIA" };
          } else {
            outcome = { type: "custom", label: String(slice) };
          }

          onStop && onStop(outcome);
        }, bounceBackDuration * 1000);
      }, duration * 1000);
    }, 50);
  }, [spinning]);

  return (
    <div className="wheel-wrap-svg">
      <div 
        className="wheel-svg" 
        ref={wheelRef} 
        style={{ 
          transform: `rotate(${angle}deg)`,
          transformOrigin: 'center center'  // ← Ridondante ma esplicito
        }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%">
          <circle cx={cx} cy={cy} r={R + 4} fill="#0b0b0f" stroke="#fff" strokeWidth="4" />
          {sectors.map(renderSector)}
          <circle cx={cx} cy={cy} r={26} fill="#0b0b0f" stroke="#fff" strokeWidth="2" />
        </svg>
      </div>
      <div className="wheel-pointer-6" />
    </div>
  );
}

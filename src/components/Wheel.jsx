// 🎡 VERSIONE A: SEED SINCRONIZZATO
// ✅ TUE POSIZIONI (non toccate)
// ✅ TUOI PATTERN (ordine rispettato)
// ✅ Perno fisso (transform-origin)
// ✅ Sincronizzazione tramite seed

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

export default function WheelVersionA({ slices = [], spinning = false, onStop, spinSeed = null, targetAngle = null }) {
  const wheelRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const size = 380;
  const cx = size / 2, cy = size / 2;
  const R = 170;

  // ✅ USA I TUOI PATTERN nell'ORDINE ESATTO
  const values = slices.length ? slices : [
    100, 200, 300, 400, 500, 600, 700, "PASSA",
    800, 1000, "BANCAROTTA", 200, 400, "RADDOPPIA",
    500, 300, "PASSA/BANCAROTTA", 700, 800, 1000,
  ];

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

  // ✅ SPIN con angolo target preciso + rimbalzo realistico
  useEffect(() => {
    if (!spinning || isSpinning || targetAngle === null) return;
    
    setIsSpinning(true);
    
    // Reset
    if (wheelRef.current) {
      wheelRef.current.style.transition = "none";
      setAngle(0);
    }

    setTimeout(() => {
      const randomFromSeed = seededRandom(spinSeed || Date.now());
      const extraSpins = Math.floor(randomFromSeed * 2 + 3); // 3-5 giri completi
      const duration = 3 + randomFromSeed * 1.5; // 3-4.5 secondi
      
      // ✅ NUOVO: Aggiungi variazione casuale ±9° per non fermarsi sempre al centro
      const variation = (seededRandom(spinSeed + 100) - 0.5) * 18; // ±9° (metà spicchio)
      
      // ✅ Lo spicchio target deve finire sotto il puntatore fisso (ore 12)
      // Il puntatore è nell'asse invisibile fisso, la ruota gira
      // Gli spicchi nella ruota partono da -90° (indice 0 a ore 12 quando angle=0)
      // Per far finire lo spicchio N sotto il puntatore:
      const finalAngle = 360 - targetAngle + variation - 9.9 ;
      
      // ✅ FASE 1: Rotazione principale con overshoot (va oltre il target)
      const overshoot = 3.6; // Gradi di overshoot (0.2 spicchi = 3.6°)
      const totalRotationWithOvershoot = extraSpins * 360 + finalAngle + overshoot;

      if (wheelRef.current) {
        // Animazione principale con overshoot
        wheelRef.current.style.transition = `transform ${duration}s cubic-bezier(0.12, 0.64, 0.24, 1)`;
        setAngle(totalRotationWithOvershoot);
      }

      // ✅ FASE 2: Dopo l'overshoot, rimbalza indietro al punto esatto
      setTimeout(() => {
        const bounceBackDuration = 0.3; // 300ms per il rimbalzo
        const finalRotation = extraSpins * 360 + finalAngle;
        
        if (wheelRef.current) {
          wheelRef.current.style.transition = `transform ${bounceBackDuration}s cubic-bezier(0.36, 0, 0.66, 0.04)`;
          setAngle(finalRotation);
        }

        // ✅ FASE 3: Calcola outcome dopo il rimbalzo
        setTimeout(() => {
          setIsSpinning(false);
          
          // Calcola quale spicchio è sotto il puntatore fisso
          const normalizedAngle = finalRotation % 360;
          
          // Il puntatore fisso è a 90° (ore 12)
          // Gli spicchi partono da -90° quando angle=0
          // Spicchio sotto puntatore = (90 + angle) / SLICE_DEG
          const angleUnderPointer = (90 + normalizedAngle) % 360;
          const sliceIndex = Math.floor(angleUnderPointer / SLICE_DEG) % values.length;
          const slice = values[sliceIndex];

          let outcome;
          if (typeof slice === "string" && slice.includes("/")) {
            const [a, b] = slice.split("/");
            const localAngle = angleUnderPointer - (sliceIndex * SLICE_DEG);
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
  }, [spinning, targetAngle]);

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
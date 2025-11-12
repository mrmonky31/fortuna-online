// 🎡 VERSIONE A: SEED SINCRONIZZATO
// - Server invia seed comune
// - Tutti i client generano stessa rotazione
// - Perno FISSO assoluto
// - Calcolo spicchio PRECISO

import React, { useEffect, useRef, useState } from "react";
import "../styles/wheel.css";

const SLICE_COUNT = 20;
const SLICE_DEG = 360 / SLICE_COUNT; // 18°

const COLORS = {
  100: "#4F8EF7", 200: "#1E88E5", 300: "#26C6DA", 400: "#00BFA5",
  500: "#43A047", 600: "#F9A825", 700: "#EF6C00", 800: "#8E24AA",
  1000: "#C62828", PASSA: "#FFFFFF", BANCAROTTA: "#000000", RADDOPPIA: "#D4AF37",
};

const TEXT_COLOR = (bg) => {
  const darkish = ["#000000", "#C62828", "#8E24AA", "#1E88E5", "#4F8EF7", "#43A047", "#EF6C00"].includes(bg);
  return darkish ? "#FFFFFF" : "#000000";
};

const toRad = (deg) => (Math.PI / 180) * deg;

// ✅ Generatore random con seed
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export default function WheelVersionA({ slices = [], spinning = false, onStop, spinSeed = null }) {
  const wheelRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const size = 400;
  const cx = size / 2, cy = size / 2;
  const R = 170;

  const values = slices.length ? slices : [
    100, 200, 300, 400, 500, 600, 700, 800, 1000, 1000,
    "PASSA", "PASSA/BANCAROTTA", "BANCAROTTA/RADDOPPIA",
    "BANCAROTTA", "RADDOPPIA", 200, 400, 500, 300, 800,
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
          <text x={posA.x} y={posA.y} fontFamily="Arial" fontSize="10" fontWeight="900" fill={tcA} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${midA} ${posA.x} ${posA.y})`}>{a}</text>
          <path d={pathB} fill={colB} stroke="#ffffff" strokeWidth="2" />
          <text x={posB.x} y={posB.y} fontFamily="Arial" fontSize="10" fontWeight="900" fill={tcB} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${midB} ${posB.x} ${posB.y})`}>{b}</text>
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
        <text x={x} y={y} fontFamily="Arial" fontSize="14" fontWeight="900" fill={tc} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid} ${x} ${y})`}>{String(label)}</text>
      </g>
    );
  };

  // ✅ SPIN con SEED sincronizzato
  useEffect(() => {
    if (!spinning || isSpinning || !spinSeed) return;
    
    setIsSpinning(true);
    
    // Reset
    if (wheelRef.current) {
      wheelRef.current.style.transition = "none";
      setAngle(0);
    }

    setTimeout(() => {
      // ✅ Usa seed per generare rotazione identica su tutti i client
      const randomFromSeed = seededRandom(spinSeed);
      const extraSpins = Math.floor(randomFromSeed * 2 + 3); // 3-5 giri
      const randomAngle = seededRandom(spinSeed + 1) * 360;
      const duration = 3 + randomFromSeed * 1.5; // 3-4.5 secondi
      
      const totalRotation = extraSpins * 360 + randomAngle;

      if (wheelRef.current) {
        wheelRef.current.style.transition = `transform ${duration}s cubic-bezier(0.12, 0.64, 0.24, 1)`;
        setAngle(totalRotation);
      }

      setTimeout(() => {
        setIsSpinning(false);
        
        // ✅ CALCOLO SPICCHIO CORRETTO
        const finalAngle = totalRotation % 360;
        const pointerAngle = 90; // Puntatore fisso in alto (ore 12)
        const relativeAngle = (pointerAngle - finalAngle + 360) % 360;
        const sliceIndex = Math.floor(relativeAngle / SLICE_DEG);
        const slice = values[sliceIndex];

        let outcome;
        if (typeof slice === "string" && slice.includes("/")) {
          const [a, b] = slice.split("/");
          const localAngle = relativeAngle - sliceIndex * SLICE_DEG;
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
      }, duration * 1000);
    }, 50);
  }, [spinning, spinSeed]);

  return (
    <div className="wheel-wrap-fixed">
      <div className="wheel-svg-fixed" ref={wheelRef} style={{ transform: `rotate(${angle}deg)` }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <circle cx={cx} cy={cy} r={R + 4} fill="#0b0b0f" stroke="#fff" strokeWidth="4" />
          {sectors.map(renderSector)}
          <circle cx={cx} cy={cy} r={26} fill="#0b0b0f" stroke="#fff" strokeWidth="2" />
        </svg>
      </div>
      <div className="wheel-pointer-fixed" />
    </div>
  );
}
// src/components/Wheel.jsx - CORRETTO
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/wheel.css";

const SLICE_COUNT = 20;
const SLICE_DEG = 360 / SLICE_COUNT;

const BOUNCE_FRACTION = 0.25;
const BOUNCE_DEG = SLICE_DEG * BOUNCE_FRACTION;
const BOUNCE_TIME = 0.4;
const EASING_SPIN = "cubic-bezier(.12,.64,.24,1)";
const BOUNCE_EASING = "cubic-bezier(.25,1,.5,1)";
const TARGET_POINTER_DEG = 90;
const MICRO_JITTER_DEG = 0.2;
const EDGE_EPS = 1e-6;

const DURATIONS = [2.8, 3.0, 3.2, 3.4, 3.6, 3.8, 4.0];

const COLORS = {
  100: "#4F8EF7",
  200: "#1E88E5",
  300: "#26C6DA",
  400: "#00BFA5",
  500: "#43A047",
  600: "#F9A825",
  700: "#EF6C00",
  800: "#8E24AA",
  1000: "#C62828",
  PASSA: "#FFFFFF",
  BANCAROTTA: "#000000",
  RADDOPPIA: "#D4AF37",
};

const TEXT_COLOR = (bg) => {
  const hex = (bg || "").toUpperCase();
  const darkish = ["#000000", "#C62828", "#8E24AA", "#1E88E5", "#4F8EF7", "#43A047", "#EF6C00"].includes(hex);
  return darkish ? "#FFFFFF" : "#000000";
};

const toRad = (deg) => (Math.PI / 180) * deg;
const norm360 = (deg) => ((deg % 360) + 360) % 360;

export default function Wheel({ slices = [], spinning = false, onStop, shuffleKey = 0 }) {
  const ref = useRef(null);
  const [angle, setAngle] = useState(0);
  const spinningRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const baseValues = slices.length
    ? slices
    : [
        100, 200, 300, 400, 500, 600, 700, 800,
        1000, 1000,
        "PASSA",
        "PASSA/BANCAROTTA",
        "BANCAROTTA/RADDOPPIA",
        "BANCAROTTA",
        "RADDOPPIA",
        200, 400, 500, 300, 800,
      ];

  const values = useMemo(() => baseValues, [baseValues]);

  const size = 380;
  const cx = size / 2, cy = size / 2;
  const R = 170;

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

  const renderSplitSector = (start, idx, a, b) => {
    const half = SLICE_DEG / 2;
    const colorFor = (t) =>
      COLORS[t] ||
      (t === "PASSA" ? COLORS.PASSA : t === "BANCAROTTA" ? COLORS.BANCAROTTA : t === "RADDOPPIA" ? COLORS.RADDOPPIA : "#ddd");

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
        <text
          x={posA.x}
          y={posA.y}
          fontFamily="system-ui, Arial, Roboto, sans-serif"
          fontSize="10"
          fontWeight="900"
          fill={tcA}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(${midA} ${posA.x} ${posA.y})`}
        >
          {a}
        </text>

        <path d={pathB} fill={colB} stroke="#ffffff" strokeWidth="2" />
        <text
          x={posB.x}
          y={posB.y}
          fontFamily="system-ui, Arial, Roboto, sans-serif"
          fontSize="10"
          fontWeight="900"
          fill={tcB}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(${midB} ${posB.x} ${posB.y})`}
        >
          {b}
        </text>

        <line
          x1={cx}
          y1={cy}
          x2={cx + R * Math.cos(toRad(start + half))}
          y2={cy + R * Math.sin(toRad(start + half))}
          stroke="#ffffff"
          strokeWidth="1.5"
        />
      </g>
    );
  };

  const renderSector = ({ label, start, mid }, idx) => {
    if (typeof label === "string" && label.includes("/")) {
      const [a, b] = label.split("/");
      return renderSplitSector(start, idx, a, b);
    }

    const bg = COLORS[label] || "#dddddd";
    const d = arcPath(start, SLICE_DEG);
    const { x, y } = labelPos(mid);
    const tc = TEXT_COLOR(bg);

    return (
      <g key={`sec-${idx}`}>
        <path d={d} fill={bg} stroke="#fff" strokeWidth="2" />
        <text
          x={x}
          y={y}
          fontFamily="system-ui, Arial, Roboto, sans-serif"
          fontSize="14"
          fontWeight="900"
          fill={tc}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(${mid} ${x} ${y})`}
        >
          {String(label)}
        </text>
      </g>
    );
  };

  const doSpin = () => {
    if (!ref.current || spinningRef.current) return;
    spinningRef.current = true;

    ref.current.style.transition = "none";
    setAngle(0);

    setTimeout(() => {
      const dur = DURATIONS[Math.floor(Math.random() * DURATIONS.length)];
      const totalDeg = dur * 360;
      const randomOffset = Math.random() * 360;
      const finalNoBounce = totalDeg + randomOffset;

      ref.current.style.transition = `transform ${dur}s ${EASING_SPIN}`;
      setAngle(finalNoBounce);

      const onMainEnd = () => {
        if (!ref.current) return;
        ref.current.removeEventListener("transitionend", onMainEnd);

        const finalBounce = finalNoBounce - BOUNCE_DEG;
        ref.current.style.transition = `transform ${BOUNCE_TIME}s ${BOUNCE_EASING}`;
        setAngle(finalBounce);

        setTimeout(() => {
          spinningRef.current = false;
          
          // ✅ FISSO: Considera rotazione base mobile nel calcolo
          const baseRotation = isMobile ? 180 : 0;
          const ang = norm360(finalBounce + baseRotation);
          let at = norm360(TARGET_POINTER_DEG - ang + 90);

          const posInSlice = at % SLICE_DEG;
          const dist = Math.min(posInSlice, SLICE_DEG - posInSlice);
          if (dist < EDGE_EPS) {
            at = norm360(at + (Math.random() < 0.5 ? MICRO_JITTER_DEG : -MICRO_JITTER_DEG));
          }

          const idx = Math.floor(at / SLICE_DEG) % SLICE_COUNT;
          const slice = values[idx];

          let outcome;
          if (typeof slice === "string" && slice.includes("/")) {
            const [a, b] = slice.split("/");
            let local = at - idx * SLICE_DEG;
            local = norm360(local);
            if (local >= SLICE_DEG) local -= SLICE_DEG;
            const chosen = local < SLICE_DEG / 2 ? a : b;

            if (chosen === "PASSA") outcome = { type: "pass", label: "PASSA" };
            else if (chosen === "BANCAROTTA") outcome = { type: "bankrupt", label: "BANCAROTTA" };
            else if (chosen === "RADDOPPIA") outcome = { type: "double", label: "RADDOPPIA" };
            else if (!Number.isNaN(Number(chosen))) outcome = { type: "points", value: Number(chosen), label: chosen };
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
        }, BOUNCE_TIME * 1000);
      };

      ref.current.addEventListener("transitionend", onMainEnd, { once: true });
    }, 25);
  };

  useEffect(() => {
    if (spinning) doSpin();
  }, [spinning, shuffleKey]);

  // ✅ FISSO: Rotazione base separata dallo spin
  const baseRotation = isMobile ? 180 : 0;
  const rotationStyle = `rotate(${baseRotation + angle}deg)`;

  return (
    <div className="wheel-wrap-svg">
      <div className="wheel-svg" ref={ref} style={{ transform: rotationStyle }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <circle cx={cx} cy={cy} r={R + 4} fill="#0b0b0f" stroke="#fff" strokeWidth="4" />
          {sectors.map(renderSector)}
          <circle cx={cx} cy={cy} r={26} fill="#0b0b0f" stroke="#fff" strokeWidth="2" />
        </svg>
      </div>
      <div className="wheel-pointer-6" />
    </div>
  );
}
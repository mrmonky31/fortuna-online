// src/components/Board.jsx
import React, { useEffect, useRef, useState } from "react";
import "../styles/board.css";

// rows: originali; maskedRows: con "_" / " " / segni; revealQueue: [{r,c,ch}]
export default function Board({ rows = [], maskedRows = [], revealQueue = [], onRevealDone }) {
  const [revealed, setRevealed] = useState(maskedRows);
  const timeouts = useRef([]);

  useEffect(() => {
    setRevealed(maskedRows);
  }, [maskedRows]);

  // reveal lento con glow
  useEffect(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    if (!revealQueue || revealQueue.length === 0) return;

    const local = [...revealQueue];
    let idx = 0;

    const step = () => {
      const hit = local[idx];
      if (!hit) {
        onRevealDone && onRevealDone();
        return;
      }
      setRevealed((prev) => {
        const next = prev.map((r) => r.split(""));
        next[hit.r][hit.c] = hit.ch;
        return next.map((r) => r.join(""));
      });
      idx++;
      const t = setTimeout(step, 200); // velocità reveal
      timeouts.current.push(t);
    };

    const t0 = setTimeout(step, 150);
    timeouts.current.push(t0);

    return () => {
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
    };
  }, [revealQueue, onRevealDone]);

  return (
    <div className="board">
      {revealed.map((row, ri) => (
        <div className="board-row" key={ri}>
          {row.split("").map((ch, ci) => {
            const isSpace = ch === " ";
            const isMask = ch === "_";
            const isPunct = ":!?".includes(ch);
            const cls = isSpace ? "cell space" : isMask ? "cell masked" : "cell revealed";
            return (
              <div className={cls} key={`${ri}-${ci}`}>
                {!isSpace && (isMask ? "" : ch)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// src/components/Timer.jsx
import React, { useEffect } from "react";

export default function Timer({
  seconds = 30,
  running = false,
  onTick = () => {},
  onExpire = () => {},
  stopOnSuccess = false,
}) {
  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const color = seconds <= 1 ? "#E53935" : seconds <= 4 ? "#FDD835" : "#43A047";
  const progress = Math.max(0, Math.min(1, seconds / 30));
  const dash = circ * progress;

  useEffect(() => {
    if (!running || stopOnSuccess) return;
    const id = setInterval(() => onTick(), 1000);
    return () => clearInterval(id);
  }, [running, stopOnSuccess, onTick]);

  useEffect(() => {
    if (running && seconds === 0 && !stopOnSuccess) onExpire();
  }, [running, seconds, stopOnSuccess, onExpire]);

  return (
    <div className="lr-timer">
      <div className="turn-timer">
        <svg width="48" height="48" viewBox="0 0 48 48" className={seconds <= 1 && running && !stopOnSuccess ? "timer-pulse" : ""}>
          <circle cx="24" cy="24" r={radius} stroke="#1b1b1b" strokeWidth="6" fill="none" />
          <circle
            cx="24" cy="24" r={radius}
            stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={circ} strokeDashoffset={circ - dash}
            transform="rotate(-90 24 24)" strokeLinecap="round"
          />
          <text x="24" y="27" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>
            {seconds}
          </text>
        </svg>
      </div>
    </div>
  );
}

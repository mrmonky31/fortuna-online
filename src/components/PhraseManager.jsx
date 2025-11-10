// src/components/PhraseManager.jsx
import React from "react";
import "../styles/phrase-manager.css";

function toCell(cell) {
  if (cell && typeof cell === "object" && "char" in cell) {
    const ch = String(cell.char ?? "");
    return { char: ch, visible: Boolean(cell.visible) };
  }
  const ch = String(cell ?? "");
  const isSpace = ch === " ";
  return { char: ch, visible: !isSpace && ch !== "" };
}

function toRow(row) {
  if (typeof row === "string") return row.split("").map(toCell);
  if (Array.isArray(row)) return row.map(toCell);
  return [];
}

export default function PhraseManager({
  rows = [],
  maskedRows = [],
  revealQueue = [],
  onRevealDone = () => {},
  category = "-",
  onChangePhrase = () => {},
  flash = null, // "success" | "error" | null
}) {
  const base = (Array.isArray(rows) && rows.length
    ? maskedRows?.length
      ? maskedRows
      : rows
    : []
  )
    .map(toRow)
    .filter((r) => r.length > 0);

  const flashClass =
    flash === "success"
      ? "tiles-flash-success"
      : flash === "error"
      ? "tiles-flash-error"
      : "";

  return (
    <div className={`phrase-manager ${flashClass}`}>
      {/* 🔹 HEADER ORDINATA: Cambia frase → Categoria */}
      <div
  className="pm-header"
  style={{
    width: "100%",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: "40px", // distanza tra pulsante e categoria
    marginBottom: 8,
  }}
>
  <button className="btn-secondary" onClick={onChangePhrase}>
    Cambia frase
  </button>

  <div className="pm-category">
    Categoria: <strong>{category || "-"}</strong>
  </div>
</div>


      {/* 🔥 WRAPPER ISOLATO PER IL TABELLONE */}
      <div className="pm-board-wrapper">
        <div className="pm-board">
          {base.length > 0 ? (
            base.map((row, r) => (
              <div key={r} className="pm-row">
                {row.map((cell, c) => (
                  
                 <div
  key={c}
  
  className={`pm-cell ${
    cell.char === " " ? "space" : cell.visible ? "vis" : ""
  }`}
  
>
  <span>{cell.visible ? cell.char : cell.char === "_" ? "\u00A0" : "\u00A0"}</span>

</div>

                ))}
              </div>
            ))
          ) : (
            <div className="pm-empty">—</div>
          )}
        </div>
      </div>
    </div>
  );
}

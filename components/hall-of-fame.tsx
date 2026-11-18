"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { GAMES, type ScoreRow, seededScores } from "@/lib/games";

// `realRows`: ranking real (Supabase) por id de juego. Los juegos ausentes usan seededScores.
export function HallOfFame({ realRows = {} }: { realRows?: Record<string, ScoreRow[]> }) {
  const { user } = useAuth();
  const [tab, setTab] = useState(GAMES[0].id);

  const real = realRows[tab];
  const isReal = real !== undefined;
  const seeded = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const rows = real ?? seeded;
  const game = GAMES.find((g) => g.id === tab) ?? GAMES[0];
  const youRank = user ? Math.floor(8 + (tab.length % 4)) : null;
  const youScore = user ? rows[5]?.score - 2400 : null;
  // Con ranking real faltan puestos de podio cuando hay menos de 3 filas.
  const podium = [rows[0], rows[1], rows[2]] as (ScoreRow | undefined)[];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{podium[1]?.name ?? "—"}</div>
          <div className="score">{podium[1]?.score.toLocaleString("es-ES") ?? "—"}</div>
          <div className="date">{podium[1]?.date ?? "—"}</div>
        </div>
        <div className="podium-slot gold">
          <div
            className="pixel"
            style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
          >
            CAMPEÓN
          </div>
          <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
            01
          </div>
          <div className="name">{podium[0]?.name ?? "—"}</div>
          <div className="score" style={{ fontSize: 20 }}>
            {podium[0]?.score.toLocaleString("es-ES") ?? "—"}
          </div>
          <div className="date">{podium[0]?.date ?? "—"}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{podium[2]?.name ?? "—"}</div>
          <div className="score">{podium[2]?.score.toLocaleString("es-ES") ?? "—"}</div>
          <div className="date">{podium[2]?.date ?? "—"}</div>
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {isReal && rows.length === 0 && (
          <div
            className="tr"
            style={{
              gridTemplateColumns: "1fr",
              textAlign: "center",
              letterSpacing: "0.16em",
              color: "var(--ink-faint)",
            }}
          >
            AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO
          </div>
        )}
        {rows.map((r, i) => (
          <div
            key={`${tab}-${r.name}-${i}`}
            className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {user && !isReal && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            <div className="tr you" style={{ animationDelay: `${rows.length * 50 + 50}ms` }}>
              <div className="rk" style={{ color: "var(--yellow)" }}>
                #{String(youRank).padStart(2, "0")}
              </div>
              <div className="pl" style={{ color: "var(--yellow)" }}>
                {user.name}
              </div>
              <div
                className="sc"
                style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
              >
                {(youScore || 9999).toLocaleString("es-ES")}
              </div>
              <div className="dt">11/05/2026</div>
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}

"use client";

// Mando virtual (SPEC 11): cruceta + hasta 2 botones. Emite KeyboardEvent sintéticos en `window`
// (lib/touch-input.ts), así los motores no cambian. Se muestra solo con puntero táctil (CSS).

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createKeyHold, type KeyHold } from "@/lib/touch-input";
import type { TouchDirection, TouchLayout } from "@/lib/playable-games";

const DIRECTION_CODES: Record<TouchDirection, string> = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
};

const DIRECTION_META: Record<TouchDirection, { glyph: string; aria: string }> = {
  left: { glyph: "◀", aria: "Izquierda" },
  right: { glyph: "▶", aria: "Derecha" },
  up: { glyph: "▲", aria: "Arriba" },
  down: { glyph: "▼", aria: "Abajo" },
};

interface TouchControlsProps {
  layout: TouchLayout;
  paused: boolean;
  over: boolean;
}

export function TouchControls({ layout, paused, over }: TouchControlsProps) {
  const holdRef = useRef<KeyHold | null>(null);
  // Un puntero por control: code -> pointerId activo.
  const activeRef = useRef<Map<string, number>>(new Map());
  const blockedRef = useRef(false);

  useEffect(() => {
    const hold = createKeyHold(window);
    const active = activeRef.current;
    holdRef.current = hold;
    const releaseAll = () => {
      hold.releaseAll();
      active.clear();
    };
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("blur", releaseAll);
      releaseAll();
      holdRef.current = null;
    };
  }, []);

  // Al pausar o terminar la partida no puede quedar ninguna tecla pegada.
  useEffect(() => {
    blockedRef.current = paused || over;
    if (paused || over) {
      holdRef.current?.releaseAll();
      activeRef.current.clear();
    }
  }, [paused, over]);

  const down = (code: string, repeat: boolean) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const active = activeRef.current;
    if (blockedRef.current || active.has(code)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    active.set(code, e.pointerId);
    holdRef.current?.press(code, repeat);
  };

  const up = (code: string) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    const active = activeRef.current;
    if (active.get(code) !== e.pointerId) return;
    active.delete(code);
    holdRef.current?.release(code);
  };

  const control = (
    code: string,
    repeat: boolean,
    className: string,
    aria: string,
    content: ReactNode,
    extra?: Record<string, string>,
  ) => (
    <button
      key={code}
      type="button"
      tabIndex={-1}
      className={className}
      aria-label={aria}
      onPointerDown={down(code, repeat)}
      onPointerUp={up(code)}
      onPointerCancel={up(code)}
      onLostPointerCapture={up(code)}
      {...extra}
    >
      {content}
    </button>
  );

  return (
    <div className="touch-controls" onContextMenu={(e) => e.preventDefault()}>
      <div className="touch-pad" role="group" aria-label="Cruceta">
        {layout.directions.map((dir) =>
          control(
            DIRECTION_CODES[dir],
            layout.repeat.includes(dir),
            "touch-key touch-dir",
            DIRECTION_META[dir].aria,
            <span aria-hidden="true">{DIRECTION_META[dir].glyph}</span>,
            { "data-dir": dir },
          ),
        )}
      </div>
      {layout.buttons.length > 0 && (
        <div className="touch-actions" role="group" aria-label="Botones">
          {layout.buttons.map((btn) =>
            control(
              btn.code,
              false,
              "touch-key touch-btn",
              btn.aria,
              <span aria-hidden="true">{btn.label}</span>,
              { "data-btn": btn.label },
            ),
          )}
        </div>
      )}
    </div>
  );
}

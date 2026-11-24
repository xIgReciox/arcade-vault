"use client";

import { SKINS, type SkinId } from "@/lib/skins";

interface SkinPickerProps {
  skins: readonly SkinId[];
  value: SkinId;
  onChange: (skin: SkinId) => void;
}

// Cada botón activo imita el carácter de su skin: clásico con brillo cian suave,
// neón con doble halo magenta/cian, retro plano en ámbar con sombra dura de 8-bit.
const ACTIVE: Record<SkinId, string> = {
  clasico:
    "aria-pressed:text-cyan aria-pressed:border-cyan aria-pressed:shadow-[0_0_10px_rgba(0,245,255,0.35)]",
  neon: "aria-pressed:text-white aria-pressed:border-magenta aria-pressed:bg-magenta/10 aria-pressed:[text-shadow:0_0_6px_#ff006e,0_0_14px_#ff006e] aria-pressed:shadow-[0_0_12px_rgba(255,0,110,0.6),0_0_28px_rgba(0,245,255,0.25),inset_0_0_10px_rgba(255,0,110,0.35)]",
  retro:
    "aria-pressed:text-[#ffb000] aria-pressed:border-[#ffb000] aria-pressed:bg-[#ffb000]/10 aria-pressed:shadow-[3px_3px_0_#6b4a00]",
};

// Selector de paleta del reproductor: fila de botones de "canal" bajo el monitor CRT.
export function SkinPicker({ skins, value, onChange }: SkinPickerProps) {
  return (
    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border border-white/5 bg-bg-2 px-3.5 py-3 max-[720px]:mt-2 max-[720px]:py-2">
      <div
        className="flex flex-wrap items-center gap-2.5"
        role="group"
        aria-label="Paleta de colores del juego"
      >
        <span className="mr-1 font-mono text-[11px] tracking-[0.08em] text-ink-dim" aria-hidden>
          Paleta
        </span>
        {skins.map((id) => {
          const meta = SKINS[id];
          return (
            <button
              key={id}
              type="button"
              aria-pressed={value === id}
              title={meta.description}
              onClick={(e) => {
                // blur(): Espacio debe disparar en el juego, no volver a pulsar el botón.
                e.currentTarget.blur();
                onChange(id);
              }}
              className={`group inline-flex cursor-pointer items-center gap-2.5 border border-ink-faint px-3.5 py-2.5 max-[720px]:px-2.5 max-[720px]:py-1.5 font-pixel text-[9px] tracking-[0.14em] text-ink-dim transition-[color,border-color,box-shadow,background-color] duration-150 hover:border-ink-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none ${ACTIVE[id]}`}
            >
              <span className="inline-flex gap-0.5" aria-hidden>
                {meta.swatch.map((c) => (
                  <i
                    key={c}
                    className="block h-3 w-1.5 opacity-45 transition-opacity group-hover:opacity-100 group-aria-pressed:opacity-100 motion-reduce:transition-none"
                    style={{ background: c }}
                  />
                ))}
              </span>
              {meta.label}
            </button>
          );
        })}
      </div>
      <p className="m-0 font-mono text-xs text-ink-dim max-[720px]:hidden" aria-live="polite">
        {SKINS[value].description}
      </p>
    </div>
  );
}

// Teclas sintéticas para el mando táctil. Solo cliente: despacha KeyboardEvent en `window`
// con los mismos `code` que ya entienden los motores (sin tocar ningún `lib/<id>/`).

export const REPEAT_DELAY_MS = 170;
export const REPEAT_INTERVAL_MS = 50;

export interface KeyHold {
  /** keydown inmediato; con `repeat`, keydown { repeat: true } tras 170 ms y cada 50 ms. */
  press(code: string, repeat: boolean): void;
  /** keyup y cancela el temporizador. */
  release(code: string): void;
  /** keyup de todo lo pulsado. */
  releaseAll(): void;
}

interface Held {
  delay: ReturnType<typeof setTimeout> | null;
  interval: ReturnType<typeof setInterval> | null;
}

// `key` coherente con `code` para motores que lean `e.key`.
function keyFor(code: string): string {
  if (code === "Space") return " ";
  if (code.startsWith("Key")) return code.slice(3).toLowerCase();
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

export function createKeyHold(target: Window = window): KeyHold {
  const held = new Map<string, Held>();

  const emit = (type: "keydown" | "keyup", code: string, repeat: boolean) => {
    target.dispatchEvent(
      new KeyboardEvent(type, {
        code,
        key: keyFor(code),
        bubbles: true,
        cancelable: true,
        repeat,
      }),
    );
  };

  const clearTimers = (h: Held) => {
    if (h.delay !== null) clearTimeout(h.delay);
    if (h.interval !== null) clearInterval(h.interval);
    h.delay = null;
    h.interval = null;
  };

  return {
    press(code, repeat) {
      if (held.has(code)) return; // ya pulsada: sin segundo keydown inicial
      const h: Held = { delay: null, interval: null };
      held.set(code, h);
      emit("keydown", code, false);
      if (!repeat) return;
      h.delay = setTimeout(() => {
        h.delay = null;
        emit("keydown", code, true);
        h.interval = setInterval(() => emit("keydown", code, true), REPEAT_INTERVAL_MS);
      }, REPEAT_DELAY_MS);
    },

    release(code) {
      const h = held.get(code);
      if (!h) return;
      clearTimers(h);
      held.delete(code);
      emit("keyup", code, false);
    },

    releaseAll() {
      for (const code of [...held.keys()]) this.release(code);
    },
  };
}

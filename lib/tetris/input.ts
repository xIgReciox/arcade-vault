// Entrada de teclado del juego TETRIS: cola de acciones discretas.
// Los listeners viven en `window` solo entre attach() y detach().

export type Action = "left" | "right" | "rotate" | "softDrop" | "hardDrop" | "pause";

const KEY_ACTIONS: Record<string, Action> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "rotate",
  KeyX: "rotate",
  ArrowDown: "softDrop",
  Space: "hardDrop",
  KeyP: "pause",
  Escape: "pause",
};

// Teclas que no deben hacer scroll ni activar el botón con foco.
const PREVENT_DEFAULT = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

// Acciones que ignoran el auto-repeat del navegador (una pulsación = una acción).
const NO_REPEAT = new Set<Action>(["hardDrop", "pause"]);

export class Input {
  // Cuando es false (p. ej. partida terminada) se ignoran las teclas y no se hace preventDefault.
  enabled = true;

  private queue: Action[] = [];
  private attached = false;

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    const action = KEY_ACTIONS[e.code];
    if (!action) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    if (e.repeat && NO_REPEAT.has(action)) return;
    this.queue.push(action);
  };

  // Evita acciones pendientes si la ventana pierde el foco.
  private onBlur = (): void => {
    this.clear();
  };

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("blur", this.onBlur);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("blur", this.onBlur);
    this.clear();
  }

  // Devuelve las acciones acumuladas desde la última llamada y vacía la cola.
  drain(): Action[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }

  clear(): void {
    this.queue = [];
  }
}

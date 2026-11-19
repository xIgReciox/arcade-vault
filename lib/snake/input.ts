// Entrada del juego SNAKE: cola de giros (máx. 2) y cola de pulsaciones discretas (pausa).
// Los listeners viven en `window` solo entre attach() y detach().

import { INPUT_QUEUE_MAX, START_DIR } from "./constants";
import { isOpposite, type Direction } from "./utils";

export type Press = "pause";

const PRESSES: Record<string, Press> = {
  KeyP: "pause",
  Escape: "pause",
};

const TURNS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

// Teclas que no deben hacer scroll ni activar el botón con foco.
const PREVENT_DEFAULT = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export class Input {
  // Cuando es false (p. ej. partida terminada) se ignora el teclado y no se hace preventDefault.
  enabled = true;

  private turns: Direction[] = [];
  private presses: Press[] = [];
  // Dirección que lleva la serpiente ahora mismo; referencia para validar el primer giro encolado.
  private current: Direction = START_DIR;
  private attached = false;

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();

    const turn = TURNS[e.code];
    if (turn) {
      this.pushTurn(turn);
      return;
    }
    const press = PRESSES[e.code];
    if (!press || e.repeat) return;
    this.presses.push(press);
  };

  // Valida contra la última dirección encolada (no contra la actual) para que dos pulsaciones
  // dentro del mismo tick no produzcan una inversión de 180°.
  private pushTurn(dir: Direction): void {
    if (this.turns.length >= INPUT_QUEUE_MAX) return;
    const last = this.turns.length > 0 ? this.turns[this.turns.length - 1] : this.current;
    if (dir === last || isOpposite(dir, last)) return;
    this.turns.push(dir);
  }

  // Evita pulsaciones pendientes si la ventana pierde el foco.
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

  // El motor informa de la dirección real de la serpiente (al iniciar o reiniciar).
  setDirection(dir: Direction): void {
    this.current = dir;
    this.turns = [];
  }

  // Consume un giro por tick; devuelve null si no hay ninguno pendiente.
  takeTurn(): Direction | null {
    const dir = this.turns.shift() ?? null;
    if (dir) this.current = dir;
    return dir;
  }

  // Devuelve las pulsaciones discretas acumuladas desde la última llamada y vacía la cola.
  drain(): Press[] {
    const out = this.presses;
    this.presses = [];
    return out;
  }

  // Vacía las colas (al pausar y al terminar). La dirección actual se conserva.
  clear(): void {
    this.turns = [];
    this.presses = [];
  }
}

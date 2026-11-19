// Entrada del juego ARKANOID: teclas mantenidas, cola de pulsaciones discretas y ratón.
// Los listeners viven en `window` y en el canvas solo entre attach() y detach().

export type Press = "pause" | "mute" | "level1" | "level2" | "level3" | "level4" | "level5";

const PRESSES: Record<string, Press> = {
  KeyP: "pause",
  Escape: "pause",
  KeyM: "mute",
  Digit1: "level1",
  Digit2: "level2",
  Digit3: "level3",
  Digit4: "level4",
  Digit5: "level5",
};

// Teclas que no deben hacer scroll ni activar el botón con foco.
const PREVENT_DEFAULT = new Set(["ArrowLeft", "ArrowRight"]);

export class Input {
  // Cuando es false (p. ej. partida terminada) se ignoran teclado y ratón y no se hace preventDefault.
  enabled = true;

  left = false;
  right = false;

  private queue: Press[] = [];
  private mouseX: number | null = null;
  private attached = false;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    if (e.code === "ArrowLeft") this.left = true;
    else if (e.code === "ArrowRight") this.right = true;
    const press = PRESSES[e.code];
    if (!press || e.repeat) return;
    this.queue.push(press);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === "ArrowLeft") this.left = false;
    else if (e.code === "ArrowRight") this.right = false;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.enabled) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    // Coordenadas internas: el canvas puede estar escalado por CSS.
    this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
  };

  // Evita teclas «atascadas» o pulsaciones pendientes si la ventana pierde el foco.
  private onBlur = (): void => {
    this.clear();
  };

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.clear();
  }

  // Devuelve las pulsaciones acumuladas desde la última llamada y vacía la cola.
  drain(): Press[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }

  // Última posición X del ratón (coordenadas internas) desde la última llamada; null si no se movió.
  takeMouseX(): number | null {
    const x = this.mouseX;
    this.mouseX = null;
    return x;
  }

  clear(): void {
    this.queue = [];
    this.left = false;
    this.right = false;
    this.mouseX = null;
  }
}

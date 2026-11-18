// Entrada de teclado del juego ASTEROIDS.
// Los listeners viven en `window` solo entre attach() y detach().

const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

export class Input {
  keys: Record<string, boolean> = {};
  justPressed: Record<string, boolean> = {};

  // Cuando es false (p. ej. modal abierto) se ignoran las teclas y no se hace preventDefault.
  enabled = true;

  private attached = false;

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!this.keys[e.code]) this.justPressed[e.code] = true;
    this.keys[e.code] = true;
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (GAME_KEYS.has(e.code) && this.enabled) e.preventDefault();
    this.keys[e.code] = false;
  };

  // Evita teclas "pegadas" si la ventana pierde el foco con una tecla pulsada.
  private onBlur = (): void => {
    this.clear();
  };

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.clear();
  }

  // Devuelve true una sola vez por cada pulsación nueva de `code`.
  pressed(code: string): boolean {
    const val = !!this.justPressed[code];
    this.justPressed[code] = false;
    return val;
  }

  clear(): void {
    this.keys = {};
    this.justPressed = {};
  }
}

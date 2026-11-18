// Constantes de validación de puntuaciones compartidas entre cliente y servidor.
// Sin "server-only": las usa el modal de GamePlayer (Client Component).

export const PLAYER_NAME_RE = /^[A-Z0-9_]{3,12}$/;
export const MAX_SCORE = 10_000_000;

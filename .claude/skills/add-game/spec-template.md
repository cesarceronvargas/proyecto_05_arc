# Esqueleto de spec de juego

Forma que debe tener la spec que escribe `/add-game`. Es el formato de `specs/05-juego-asteroides-rocas.md` y `specs/06-leaderboard-supabase.md`. **No se copia literal**: los `<…>` se sustituyen por datos reales, se borran las líneas que no apliquen y se añade todo lo específico del juego. Las listas del contrato están en `platform-contract.md`.

---

````markdown
# SPEC NN — Juego real de <género> (<TITLE>)

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** <fecha del contexto>
> **Objetivo:** <Una frase: portar/crear <juego> como motor TypeScript en `/games/<id>/jugar`, con HUD de React y puntuaciones en el leaderboard de Supabase.>

## Por qué existe esta spec

<Qué hay hoy: la entrada <TITLE> es una simulación / no existe. De dónde sale el juego: `references/started-games/<carpeta>/` (tamaño, qué usa: globals, listeners, rAF sin parar…) o diseño nuevo del usuario. Por qué no se puede montar tal cual. Qué deja: otro juego real siguiendo el contrato de SPEC 05 y con ranking de SPEC 06.>

## Alcance

**Dentro:**

- **Motor portado/creado en TypeScript** en `games/<engine>/`:
  - `games/<engine>/<archivo>.ts`: <constantes, utilidades, entidades; `draw` con `ctx` por parámetro>.
  - `games/<engine>/engine.ts`: `create<Name>Game(canvas, callbacks)` con el estado en un closure y un controlador con `start`, `pause`, `resume`, `end`, `restart` y `destroy`.
- **Mecánica <idéntica al original | con estos cambios>:** <valores numéricos clave: velocidades, puntos, vidas, niveles, tiempos>. <Desde cero, esta línea se sustituye por: **Mecánica fijada aquí:** reglas completas y tabla de valores confirmada por el usuario. Esta spec es la única fuente de verdad.>
- **Reglas del motor:** `emit()` antes de `onGameOver` y dentro de `end()`, para que el modal reciba los puntos del último frame; `onPauseChange(false)` en `end()` y `restart()` si estaba en pausa; `clearKeys()` al cambiar de estado y en `blur`; listener de `resize` que rehace el backing store; sin APIs de navegador en el nivel superior del módulo; puntuación entera con tope `MAX_SCORE`.
- **Se elimina del original:** <récords en `localStorage`, trucos que alteren la puntuación, overlays propios…>. <Borrar si es desde cero.>
- **HUD en React:** el canvas no pinta <lo que pintaba el original>. El `.player-hud` muestra Jugador, Puntuación, <stats> con datos reales.
- **Pantalla de inicio:** <fondo animado o tablero vacío> y overlay de React con el título, los controles y `<PULSA … PARA EMPEZAR>`. Empieza con <tecla> o con un clic.
- **Pausa:** botón PAUSA/REANUDAR, `P` o `Escape`, y pausa automática con `blur` y `visibilitychange`. Overlay `EN PAUSA` con `PULSA P O REANUDAR PARA CONTINUAR`.
- **Fin de partida:** <condición de derrota y, si tiene final, de victoria>. El motor llama a `onGameOver(score)` y React abre `GameOverModal` con `ranked`. JUGAR DE NUEVO llama a `restart()`. <Se elimina el overlay de game over del original.>
- **Botón FIN:** `end()` y abre el modal con la puntuación actual.
- **Estilo neón:** <colores por elemento>, como constantes en `games/<engine>/<archivo>.ts`; se fijan con `/frontend-design`.
- **Canvas nítido y escalado:** resolución lógica <W×H>, <cómo encaja en la CRT 4:3>, backing store × `devicePixelRatio`.
- **Teclado:** <teclas y acciones>. `preventDefault` solo en esas teclas y nunca con el foco en `input`, `textarea`, `button`, `select` o `contentEditable`.
- **Ratón:** <acciones>. Coordenadas lógicas con `(e.clientX - rect.left) * (W / rect.width)`, nunca con `canvas.width`. Listeners quitados en `destroy()`. <Borrar si no aplica.>
- **Imágenes:** <archivos> en `public/games/<engine>/`, cargadas dentro de `create<Name>Game`. Solo se dibujan si `img.complete && img.naturalWidth > 0`, con forma vectorial de respaldo. <Borrar si no aplica.>
- **Sonido:** <archivos> en `public/games/<engine>/`, con `.play().catch(() => {})`, y la extensión añadida al matcher de `proxy.ts`. <Borrar si no aplica.>
- **Aviso en pantallas táctiles:** `ESTE JUEGO NECESITA TECLADO` en el overlay de inicio.
- **Catálogo:** `GameEngine` pasa a `"asteroids" | "<engine>"`. <Entrada `<id>` existente gana `engine: "<engine>"` (y ajuste de `long`) | Entrada nueva con todos sus campos y clase `cover-<algo>` en `app/globals.css`>. `GamePlayer` monta `<Name>Player` cuando `game.engine === "<engine>"`.
- **Leaderboard:** migración `supabase/migrations/<ts>_game_<id>.sql` con la fila `<id>` en `public.games`, aplicada con el MCP de Supabase, y tipos regenerados. Con eso `submitScore`, `/games/<id>` y `/salon` lo incluyen sin cambios de código.

**Fuera de alcance (para futuras specs):**

- <Controles táctiles o gamepad.>
- <Sonido y música, si el original no los tiene o el usuario los dejó fuera.>
- `best` y `plays` del catálogo, la actividad de la Home y las etiquetas fijas de `/games/<id>`.
- <Mecánicas que el original no tiene.>
- Interfaz `GameEngine` compartida y refactor de ROCAS.
- Anti-trampas y tests automatizados.

## Modelo de datos

Fila nueva en Supabase:

```sql
-- supabase/migrations/<ts>_game_<id>.sql
insert into public.games (id, title) values ('<id>', '<TITLE>');
```

Tipos nuevos:

```ts
// lib/games.ts (cambio)
export type GameEngine = "asteroids" | "<engine>";

// games/<engine>/engine.ts
export type <Name>Callbacks = {
  onScore: (score: number) => void;
  // <onLives / onLevel / onLines / ...>: (value: number) => void;
  onPauseChange: (paused: boolean) => void;
  onStart: () => void;
  onGameOver: (score: number) => void;
};

export type <Name>State = "ready" | "playing" | "paused" | "gameover"; // + estados propios

export type <Name>Game = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  end: () => void;
  restart: () => void;
  destroy: () => void;
};

export function create<Name>Game(canvas: HTMLCanvasElement, callbacks: <Name>Callbacks): <Name>Game;
```

Convenciones:

- `games/<engine>/` solo contiene TypeScript del motor, sin `react`, `next/*` ni `@/lib/*`.
- El player vive en `components/<engine>-player.tsx` y copia la estructura de `components/asteroids-player.tsx`.
- Los callbacks solo se llaman cuando cambia el valor.
- Puntuación entera entre 0 y 10.000.000.

## Plan de implementación

<Plan tipo de `platform-contract.md` §5, con nombres reales y pasos propios del juego. Cada paso con su "Verificación:".>

## Criterios de aceptación

<Criterios estándar de `platform-contract.md` §6, adaptados, más los específicos: valores de puntos, velocidades, niveles, HUD, controles, encaje en la CRT.>

## Decisiones

- **Sí:** <decisión>. <Justificación breve.>
- **No:** <alternativa descartada>. <Por qué.>
- **Sí:** contrato de motor documentado (`start`/`pause`/`resume`/`end`/`restart`/`destroy` + callbacks), sin interfaz compartida ni refactor de ROCAS.
- **Sí:** la fila en `public.games` va en una migración versionada. Sin ella el insert de `scores` falla por la FK.

## Riesgos

| Riesgo                                                           | Mitigación                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Strict Mode o `<Activity>` dejan bucles o listeners duplicados   | Motor creado en `useLayoutEffect`, `destroy()` en el cleanup y reset del estado de React. |
| Las teclas del juego interfieren con el input del modal          | Sin `preventDefault` con foco en campos y entrada ignorada en `gameover`.                 |
| `dt` enorme al volver de otra pestaña                            | Pausa automática, `dt` reiniciado al reanudar y tope de 50 ms.                            |
| Falta la fila en `public.games`                                  | Migración en el plan y criterio que comprueba el guardado. El modal muestra el error.     |
| El modal guarda una puntuación vieja                             | `emit()` antes de `onGameOver` y en `end()`, con un criterio que lo comprueba.            |
| <Assets: un archivo no carga>                                    | <Guarda en `drawImage`, respaldo vectorial y `.play().catch()`.>                          |
| <Ratón: coordenadas mal escaladas con DPR o a 390 px>            | <Conversión con `W / rect.width` y criterio con DPR 2.>                                   |
| <Entrada reutilizada citada como simulada en una spec anterior>  | <Esta spec sustituye esos criterios; la simulación se verifica con otro juego.>           |
| <Riesgo propio del juego (encaje en 4:3, puntuaciones enormes…)> | <Mitigación>                                                                              |

## Lo que **no** está en esta spec

- <Resumen de lo que queda fuera.>

Cada uno de esos, si llega, va en su propia spec.
````

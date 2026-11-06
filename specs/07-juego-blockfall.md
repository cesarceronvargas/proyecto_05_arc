# SPEC 07 — Juego real de piezas que caen (BLOCKFALL)

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-06
> **Objetivo:** Portar el juego de piezas que caen de `references/started-games/03-tetris` a un motor TypeScript que se ejecuta en `/games/blockfall/jugar`, con HUD de React y puntuaciones en el leaderboard de Supabase.

## Por qué existe esta spec

Hoy la entrada simulada del catálogo para este género es `id: "caida"` (`title: "CAÍDA"`, `cat: "PUZZLE"`, `cover: "cover-tetro"`): `SimulatedPlayer` sube la puntuación con un `setInterval` y no hay ningún juego.
En `references/started-games/03-tetris/` hay un juego de piezas que caen completo en canvas (`index.html`, `style.css` y `game.js`, unas 330 líneas, sin dependencias). Usa variables globales, `document.getElementById`, un `keydown` en `document` que nunca se quita, un bucle `requestAnimationFrame` que nunca se detiene, un overlay de pausa y game over en el DOM y un tema claro/oscuro guardado en `localStorage` (`tetris-theme`). Su `README.md` dice que tiene 7 piezas, pero `game.js` añade una octava, la **N** (la "tuerca"), así que esta spec sigue el código.
Ese código no se puede montar tal cual en un Client Component: al navegar fuera, el bucle y los listeners seguirían vivos, y el HUD y el game over de la plataforma no sabrían nada de la partida.
Esta spec convierte ese juego en el segundo juego real de la plataforma, sobre la entrada del catálogo que pasa a llamarse **BLOCKFALL** (`id: "blockfall"`), siguiendo el contrato de motor, player y catálogo de SPEC 05 y el ranking de SPEC 06.

## Alcance

**Dentro:**

- **Motor portado a TypeScript** en `games/blockfall/`, en la raíz del repo:
  - `games/blockfall/pieces.ts`: constantes (`COLS`, `ROWS`, `BLOCK`, `LINE_SCORES`, `MAX_SCORE`, `PIECES`, paleta neón `COLORS`), `rotateCW(shape)` y `randomPiece()`.
  - `games/blockfall/board.ts`: funciones de tablero que reciben la matriz por parámetro (`createBoard`, `collide`, `merge`, `clearLines`) y de dibujo que reciben el `CanvasRenderingContext2D` por parámetro (`drawBlock`, `drawGrid`, `drawBoard`, `drawNext`). Ningún global.
  - `games/blockfall/engine.ts`: `createBlockfallGame(canvas, callbacks)` con el estado en un closure y un controlador con `start`, `pause`, `resume`, `end`, `restart` y `destroy`.
- **Mecánica idéntica al original:**
  - Tablero de 10 columnas × 20 filas, bloque de 30 px.
  - 8 piezas: las 7 estándar (I, O, T, S, Z, J, L) más la pieza **N** (anillo 3×3 con hueco, `[[8,8,8],[8,0,8],[8,8,8]]`). Cada una sale con probabilidad 1/8 (`Math.floor(Math.random() * 8) + 1`), sin bolsa.
  - Una pieza nace en `x = floor(COLS/2) − floor(ancho/2)`, `y = 0`. Si colisiona al nacer, la partida termina.
  - Rotación horaria (`rotateCW`: transponer e invertir filas) con _wall kicks_ en este orden: `[0, −1, +1, −2, +2]` columnas. Si ninguno cabe, no gira.
  - Puntuación: líneas `LINE_SCORES = [0, 100, 300, 500, 800]` × nivel (el nivel anterior a recalcularlo), caída forzada +2 por celda recorrida, caída suave +1 por fila.
  - Nivel = `floor(líneas / 10) + 1`. Intervalo de caída = `max(100, 1000 − (nivel − 1) × 90)` ms; empieza en 1000 ms.
  - Caída suave (`ArrowDown`): baja una fila (+1) y, si no puede bajar, bloquea la pieza. No hay retardo de bloqueo.
  - Pieza fantasma proyectada con `globalAlpha = 0.2`.
  - `dropAccum` solo se pone a 0 cuando salta la caída automática, como en el original.
  - `dt` limitado a 50 ms (el original no lo limita; es la regla del contrato).
- **Reglas del motor** (contrato de plataforma, fijadas aquí por escrito):
  - **Emisión de valores:** un objeto `sent` con los últimos valores enviados a React (iniciado en `-1`) y una función `emit()` que llama a `onScore`, `onLines` y `onLevel` solo si el valor cambió.
  - **`emit()` va antes de `onGameOver(score)` y dentro de `end()`.** El modal usa la puntuación del estado de React, no el argumento de `onGameOver`; sin esto, los puntos de la última caída forzada no llegan y se guarda una puntuación vieja.
  - **Pausa:** `end()` y `restart()` estando en pausa llaman a `onPauseChange(false)`, para que el overlay `EN PAUSA` no se quede debajo del modal.
  - **Entrada sin estado:** las acciones se ejecutan en el `keydown` y no se guarda qué teclas están pulsadas, así que no hay teclas pegadas ni hace falta `clearKeys()`. Todo `keydown` se ignora salvo en `playing`; en `ready` solo `Space` y `Enter` (inician), y `P`/`Escape` pausan solo en `playing` y `paused`.
  - **`resize`:** un listener de `window` rehace el backing store (`canvas.width/height` × `devicePixelRatio`), vuelve a aplicar `setTransform` y redibuja. Se quita en `destroy()`.
  - **Foco:** el motor no reacciona ni llama a `preventDefault` si el foco está en `input`, `textarea`, `button`, `select` o un elemento `contentEditable`.
  - **Sin navegador en el módulo:** `window`, `document` y `requestAnimationFrame` solo se usan dentro de `createBlockfallGame` y de las funciones que este llama; el nivel superior de `games/blockfall/*` no toca APIs del navegador, porque el player también se renderiza en el servidor.
  - **Un solo `onGameOver`:** se llama una vez por partida y no tras `end()`.
- **HUD en React:** el canvas no pinta `SCORE`, `LINES`, `LEVEL`, el título `NEXT` ni la lista de controles. El `.player-hud` muestra Jugador, Puntuación, Líneas y Nivel (`01`, `02`…) con datos reales. No hay vidas.
- **Siguiente pieza dibujada en el canvas:** un panel a la derecha del tablero, sin texto, solo la pieza centrada en una cuadrícula de 4×4 celdas. No hay callback `onNext`.
- **Pantalla de inicio:** el motor dibuja el tablero vacío con su cuadrícula y el panel de siguiente pieza vacío, sin ninguna pieza ni caída. React muestra encima un overlay con el título, los controles y `PULSA ESPACIO PARA EMPEZAR`. La partida empieza con `Space` o `Enter`, o con un clic en la pantalla. La pulsación que inicia no cuenta como caída forzada.
- **Pausa:** botón PAUSA/REANUDAR del HUD, `P` o `Escape`, y pausa automática con `blur` de la ventana o `visibilitychange` a oculto. En pausa se hace `cancelAnimationFrame` y al reanudar el `dt` se reinicia. Overlay `EN PAUSA` existente con `PULSA P O REANUDAR PARA CONTINUAR`.
- **Fin de partida:** cuando una pieza nueva colisiona al nacer, el motor hace `emit()`, llama a `onGameOver(score)` una sola vez y React abre `GameOverModal` con `ranked`. El tablero queda visible detrás del modal. JUGAR DE NUEVO llama a `restart()` y la partida empieza directamente. Se elimina el overlay `GAME OVER` / `Reiniciar` del DOM del original.
- **Botón FIN:** `end()` detiene la partida sin llamar a `onGameOver`, hace `emit()` y React abre el modal con la puntuación actual.
- **Se elimina del original:** el tema claro/oscuro y su clave `tetris-theme` en `localStorage`, el overlay de pausa y game over del DOM, los textos `SCORE`, `LINES`, `LEVEL` y `NEXT` y la lista de controles. El original no tiene trucos ni atajos de depuración.
- **Estilo neón:** cada pieza con su color neón de la paleta del sitio (I cian, O amarillo, T magenta, S verde, Z rojo/rosa, J azul, L naranja, N gris metálico/blanco), cuadrícula tenue, fantasma a alfa 0,2 y un leve glow solo en la pieza activa. Los colores exactos se fijan con `/frontend-design` durante la implementación y viven como constantes `COLORS` en `games/blockfall/pieces.ts`. El color de la cuadrícula es una constante, sustituye a `getComputedStyle(...).getPropertyValue('--grid-line')`.
- **Canvas nítido y encaje en la CRT 4:3:** resolución lógica **800×600**, igual que ROCAS. El tablero (300×600) se dibuja a escala 1:1 a la izquierda del centro, con `BOARD_X = 200`; el panel de siguiente pieza (120×120) va a su derecha, en `NEXT_X = 540`, `NEXT_Y = 60`. Sin bandas ni escalado no uniforme. El canvas ocupa el 100 % de la CRT por CSS y el backing store se multiplica por `devicePixelRatio` con `ctx.setTransform`.
- **Teclado:** `ArrowLeft`/`ArrowRight` mueven, `ArrowUp` o `KeyX` giran, `ArrowDown` es caída suave, `Space` es caída forzada, `P`/`Escape` pausan. `ArrowLeft`/`ArrowRight`/`ArrowDown` se repiten al mantenerlas; `ArrowUp`, `KeyX`, `Space`, `P` y `Escape` ignoran `e.repeat` (una acción por pulsación). `preventDefault` solo en esas teclas (y en `Enter` mientras el estado es `ready`) y nunca con el foco en un campo de formulario.
- **Aviso en pantallas táctiles:** `ESTE JUEGO NECESITA TECLADO` en el overlay de inicio. El juego no se bloquea.
- **Puntuación acotada:** la puntuación interna nunca pasa de `MAX_SCORE = 10_000_000`, el máximo que acepta el check de `public.scores`. Siempre es un entero.
- **Catálogo:** `GameEngine` pasa a `"asteroids" | "blockfall"`. La entrada simulada `caida` se convierte en `id: "blockfall"` y `title: "BLOCKFALL"`, con `engine: "blockfall"` y este `long`: _"Piezas geométricas descienden desde la oscuridad, y entre ellas acecha una tuerca con hueco. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas."_ `short`, `cover` (`cover-tetro`), `cat` y `color` no cambian. `GamePlayer` monta `BlockfallPlayer` cuando `game.engine === "blockfall"`. La ruta `/games/caida` deja de existir y devuelve 404; no hay puntuaciones guardadas con ese id.
- **Home:** en `lib/home.ts`, la fila de actividad de ejemplo con `gameId: "caida"` pasa a `gameId: "blockfall"`, porque la Home muestra `getGame(gameId)?.title` y sin este cambio el título quedaría vacío. Es el único cambio de la Home.
- **Leaderboard:** migración `supabase/migrations/20261106000000_game_blockfall.sql` con la fila `blockfall` en `public.games`, aplicada con el MCP de Supabase, y tipos regenerados. Con eso `submitScore`, `/games/blockfall` y `/salon` incluyen BLOCKFALL sin cambios de código.

**Fuera de alcance (para futuras specs):**

- Controles táctiles o gamepad.
- Sonido y música. El original no tiene.
- Mecánicas que el original no tiene: _hold_, bolsa de 7 piezas, retardo de bloqueo, _T-spin_, rotación antihoraria, sistema de rotación SRS.
- Animación de limpieza de líneas.
- Tema claro/oscuro del original.
- Cambiar el `best` y los `plays` mock de BLOCKFALL en `lib/games.ts` ni lo que los muestra (`components/game-card.tsx`), el resto de la actividad de la Home (`lib/home.ts`) y las etiquetas fijas de `/games/blockfall` (`TECLADO / TÁCTIL`, `RETRO 1985`, dificultad).
- Interfaz `GameEngine` compartida y refactor de ROCAS.
- Anti-trampas y tests automatizados.

## Modelo de datos

Fila nueva en Supabase:

```sql
-- supabase/migrations/20261106000000_game_blockfall.sql
insert into public.games (id, title) values ('blockfall', 'BLOCKFALL');
```

Tipos nuevos:

```ts
// lib/games.ts (cambio)
export type GameEngine = "asteroids" | "blockfall";

// games/blockfall/engine.ts
export type BlockfallCallbacks = {
  onScore: (score: number) => void;
  onLines: (lines: number) => void;
  onLevel: (level: number) => void;
  onPauseChange: (paused: boolean) => void; // también cuando la pausa es automática (blur/visibilidad)
  onStart: () => void; // la partida pasa de "ready" a "playing"
  onGameOver: (score: number) => void; // la pieza nueva colisiona al nacer; antes se hace emit()
};

export type BlockfallState = "ready" | "playing" | "paused" | "gameover";

export type BlockfallGame = {
  start: () => void; // ready -> playing; ignorada en cualquier otro estado
  pause: () => void;
  resume: () => void;
  end: () => void; // botón FIN: pasa a gameover sin llamar a onGameOver
  restart: () => void; // nueva partida directamente en "playing"
  destroy: () => void; // cancela el rAF y quita todos los listeners de window/document
};

export function createBlockfallGame(
  canvas: HTMLCanvasElement,
  callbacks: BlockfallCallbacks,
): BlockfallGame;

// games/blockfall/pieces.ts
export type Shape = number[][]; // 0 = vacío, 1..8 = índice de color
export type Piece = { type: number; shape: Shape; x: number; y: number };
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;
export const MAX_SCORE = 10_000_000;
```

Convenciones:

- `games/blockfall/` contiene solo TypeScript del motor, sin `react`, `next/*` ni `@/lib/*`.
- El player vive en `components/blockfall-player.tsx` y copia la estructura de `components/asteroids-player.tsx`.
- `onScore`, `onLines` y `onLevel` se llaman solo cuando cambia el valor. `restart()` los lleva a `0`, `0` y `1`.
- Puntuación entera entre 0 y 10.000.000.
- Coordenadas del tablero: `board[fila][columna]`, origen arriba a la izquierda. Una pieza usa `x`/`y` en celdas, no en píxeles.

## Plan de implementación

Antes del paso 1 se consultan en `node_modules/next/dist/docs/` las guías de Client Components y de `useEffect`/refs. La UI (overlays, colores del canvas y panel de siguiente pieza) se diseña con `/frontend-design`, según `CLAUDE.md`.

1. Crear `supabase/migrations/20261106000000_game_blockfall.sql`, aplicarla con el MCP de Supabase (`apply_migration`; si no conecta, desde el SQL Editor del dashboard) y regenerar `lib/supabase/database.types.ts`. Va primero: la fila es inocua sin el juego, y al revés BLOCKFALL tendría pestaña en `/salon` con el guardado fallando por la FK. Verificación: `select * from public.games` devuelve `rocas` y `blockfall`, y `npx tsc --noEmit` pasa.
2. Crear `games/blockfall/pieces.ts`: constantes, `PIECES` (8 tipos), paleta `COLORS`, `rotateCW` y `randomPiece`. Verificación: `npx tsc --noEmit` pasa.
3. Crear `games/blockfall/board.ts`: `createBoard`, `collide`, `merge`, `clearLines` (devuelve las líneas limpiadas) y las funciones de dibujo con `ctx` por parámetro. Verificación: `npx tsc --noEmit` pasa.
4. Crear `games/blockfall/engine.ts` con `createBlockfallGame`: estado en closure, máquina `BlockfallState`, bucle rAF con `dt` ≤ 50 ms, `dropAccum`/`dropInterval`, `emit()` con objeto `sent`, input en `window` con `preventDefault` selectivo y filtro de `e.repeat`, wall kicks, fantasma, siguiente pieza, pausa (P/Esc, `blur`, `visibilitychange`), escalado por `devicePixelRatio` con listener de `resize`, tope `MAX_SCORE` y `destroy()`. Sin HUD ni overlays en el canvas. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
5. Crear `components/blockfall-player.tsx` (Client Component): marco `.av-player`/`.player-hud`/`.crt`/`.crt-screen`/`.crt-bottom` con `<canvas className="game-canvas">`, HUD con Jugador, Puntuación, Líneas y Nivel, overlay de inicio con leyenda de teclas y aviso táctil, overlay `EN PAUSA`, botones PAUSA/FIN/SALIR (con `releaseFocus` y deshabilitados fuera de `playing`), `GameOverModal` con `ranked` y `onRestart` → `restart()`, y `destroy()` más reseteo del estado de React en el cleanup del `useLayoutEffect`. Verificación: `npx tsc --noEmit` pasa.
6. Catálogo, Home y player, todo junto para que el juego salga de golpe: en `lib/games.ts`, ampliar `GameEngine` y convertir la entrada `caida` en `blockfall` (`id`, `title`, `engine`, `long`); en `lib/home.ts`, cambiar `gameId: "caida"` por `"blockfall"`; en `components/game-player.tsx`, añadir `if (game.engine === "blockfall") return <BlockfallPlayer game={game} />;` junto a la rama de asteroids. Verificación: con `npm run dev`, `/games/blockfall/jugar` muestra el juego real, `/games/blockfall` el texto nuevo, la Home muestra `BLOCKFALL` en la fila de actividad, `/games/caida` da 404, `/games/rocas/jugar` sigue igual y `/games/serpentina/jugar` sigue con la simulación.
7. Pasada de diseño con `/frontend-design`: colores y glow del canvas, panel de siguiente pieza y overlays. Verificación visual en el navegador a 1280 px y a 390 px de ancho.

## Criterios de aceptación

**Estándar**

- [x] Existen `games/blockfall/pieces.ts`, `games/blockfall/board.ts`, `games/blockfall/engine.ts`, `components/blockfall-player.tsx` y `supabase/migrations/20261106000000_game_blockfall.sql`.
- [x] Ningún archivo de `games/blockfall/` importa `react`, `next/*` ni `@/lib/*`.
- [x] Ningún archivo de la app importa nada de `references/`.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores, también sin `.env.local`.
- [x] `/games/blockfall/jugar` muestra el canvas dentro de la CRT con el tablero vacío y el overlay `PULSA ESPACIO PARA EMPEZAR` con la leyenda de controles.
- [x] Al pulsar `Space` o `Enter`, o al hacer clic en la pantalla, aparece la primera pieza arriba y empieza a caer. Esa pulsación no la deja caer de golpe.
- [x] `←`, `→`, `↑`, `X`, `↓` y `Space` funcionan y ninguna hace scroll en la página.
- [x] El HUD de React muestra Jugador, Puntuación, Líneas y Nivel con datos reales y se actualiza al instante. El canvas no dibuja ningún texto de HUD.
- [x] El botón PAUSA, `P` y `Escape` pausan y reanudan, con el overlay `EN PAUSA`. Cambiar de pestaña o sacar el foco de la ventana pausa, y al volver la pieza no salta de posición.
- [x] Cuando una pieza nueva colisiona al nacer se abre `GameOverModal` con la puntuación real. FIN detiene la partida y abre el modal con la puntuación actual, también si estaba en pausa, y no queda el overlay `EN PAUSA` debajo.
- [x] Si la partida termina justo tras una caída forzada, la puntuación del modal incluye los puntos de esa caída y coincide con la del HUD y con la fila guardada.
- [x] Se pueden escribir las iniciales en el modal (incluida `P`) sin que el motor reaccione.
- [x] GUARDAR PUNTUACIÓN muestra `GUARDANDO…` y luego `▸ PUNTUACIÓN GUARDADA_`, y aparece una fila en `scores` con `game_id = 'blockfall'`.
- [x] Tras guardar, `/games/blockfall` muestra la puntuación en su leaderboard y "Mejor global" es la primera fila (o `—` sin puntuaciones), y ya no muestra `RANKING PRÓXIMAMENTE`.
- [x] `/salon` tiene una pestaña `BLOCKFALL` con sus marcas, y la marca también aparece en GLOBAL.
- [x] JUGAR DE NUEVO empieza una partida nueva con Puntuación 0, Líneas 0, Nivel 01 y el tablero vacío.
- [x] Navegar fuera con SALIR o con la Nav detiene el bucle y quita los listeners: las flechas y `Space` vuelven a hacer scroll y no hay errores en consola.
- [x] En desarrollo (Strict Mode) solo corre un bucle: la pieza no baja al doble de velocidad.
- [x] El canvas se ve nítido con `devicePixelRatio` 2, sigue nítido tras redimensionar la ventana y se adapta a 390 px de ancho sin scroll horizontal.
- [x] Con un puntero táctil (`pointer: coarse`) el overlay de inicio muestra `ESTE JUEGO NECESITA TECLADO`.
- [x] ROCAS sigue funcionando igual y los juegos simulados restantes (por ejemplo `/games/serpentina/jugar`) siguen mostrando la simulación y `ESTE JUEGO AÚN NO TIENE RANKING` en el modal.
- [x] No hay errores ni avisos de hidratación en la consola en `/games/blockfall` y `/games/blockfall/jugar`.

**Específicos de BLOCKFALL**

- [x] El tablero tiene 10 columnas y 20 filas, y ocupa 300×600 unidades lógicas dentro del lienzo de 800×600, con la siguiente pieza dibujada a su derecha.
- [x] Una pieza nueva aparece centrada en la fila superior: la I (ancho 4) en la columna 3, la O (ancho 2) en la 4 y las de ancho 3 (T, S, Z, J, L, N) en la 4.
- [x] En nivel 1 la pieza baja una fila cada 1000 ms; en nivel 2 cada 910 ms; a partir del nivel 11 cada 100 ms.
- [x] Completar 1, 2, 3 y 4 líneas de una vez en nivel 1 suma 100, 300, 500 y 800 puntos.
- [x] En nivel 2, completar 1 línea suma 200 puntos (100 × nivel).
- [x] La caída forzada con `Space` suma 2 puntos por celda recorrida y la caída suave con `↓` suma 1 punto por fila.
- [x] Al llegar a 10 líneas el Nivel del HUD pasa a `02`, y a 20 líneas a `03`.
- [x] Girar una pieza pegada a la pared izquierda o derecha la desplaza hasta 2 columnas para que quepa (kicks `0, −1, +1, −2, +2`); si no cabe en ninguna, no gira.
- [x] Mantener pulsada `←`, `→` o `↓` repite el movimiento. Mantener pulsada `↑`, `X` o `Space` actúa una sola vez.
- [x] La pieza fantasma aparece donde caería la pieza actual, con transparencia, y desaparece de la vista al solaparse con ella.
- [x] La pieza N (anillo 3×3 con hueco) aparece en las partidas y se coloca y gira como las demás.
- [x] El `id` de la entrada es `blockfall` y su `title` `BLOCKFALL`; su `short`, `cover`, `cat` y `color` no cambian y su `long` menciona la tuerca.
- [x] `/games/caida` devuelve 404, y la Home muestra `BLOCKFALL` en la fila de actividad de ejemplo que antes decía `CAÍDA`.
- [x] Con la puntuación en `10.000.000` el motor no la supera.
- [x] No queda ninguna referencia a `tetris-theme` ni a `localStorage` en `games/blockfall/` ni en `components/blockfall-player.tsx`.

## Decisiones

- **Sí:** reutilizar la entrada simulada de piezas que caen, que ya encaja por portada `cover-tetro`, categoría PUZZLE y descripción.
- **Sí:** cambiar su `id` y su `title` a `blockfall` y `BLOCKFALL`, sin nombres en español, como pidió el usuario. Solo `lib/games.ts` y una fila de ejemplo de `lib/home.ts` usaban `caida`, y no hay puntuaciones guardadas, así que no se pierde nada.
- **No:** mantener `id: "caida"`. Conservaba la URL, pero dejaba un id en español.
- **Sí:** título propio **BLOCKFALL** en lugar de "TETRIS" o "TETRIX". El usuario pidió "tetrix", pero es el nombre de un juego comercial con una letra cambiada, y la skill exige un título propio como CAÍDA o ROCAS. Se puede cambiar por otro nombre propio antes de aprobar la spec.
- **Sí:** el nombre del motor (`"blockfall"`, `games/blockfall/`, `components/blockfall-player.tsx`) coincide con el `id`, para no repetir en el código el nombre comercial.
- **Sí:** ajustar `long` para mencionar la tuerca. El texto anterior no prometía nada falso, pero ocultaba la pieza N, que es lo distintivo.
- **Sí:** mecánica idéntica al código del original, con la pieza N a 1/8. El README dice 7 piezas, pero manda `game.js`, y el port es verificable con sus constantes.
- **No:** bolsa de 7, _hold_, retardo de bloqueo ni SRS. Son mecánicas que el original no tiene y cada una cambia el balance de puntuación.
- **Sí:** HUD de React con Líneas y Nivel. Son los dos números que el original muestra además de la puntuación y alimentan `onLines` y `onLevel`.
- **Sí:** siguiente pieza dibujada dentro del canvas, en un panel sin texto. Mantiene la forma `createBlockfallGame(canvas, callbacks)` del contrato y evita un callback `onNext`.
- **No:** segundo canvas para la vista previa. Rompería la firma estándar del motor.
- **Sí:** lienzo lógico 800×600 con el tablero a escala 1:1 (`BOARD_X = 200`). Usa la CRT 4:3 completa sin bandas y deja sitio al panel de siguiente pieza.
- **No:** lienzo 300×600 con bandas negras. Desaprovecha la pantalla y el panel de siguiente pieza iría fuera del canvas.
- **Sí:** `Space` o `Enter` inician la partida, solo en `ready`, y esa pulsación no cuenta como caída forzada. `Space` ya es caída forzada en juego, y sin esta regla la primera pieza caería sola.
- **Sí:** `←`, `→` y `↓` se repiten, y `↑`, `X`, `Space`, `P` y `Escape` ignoran `e.repeat`. El original repetía todo, y mantener `Space` lanzaba varias piezas por accidente.
- **Sí:** entrada sin estado (acciones en `keydown`, sin mapa de teclas pulsadas). El juego no tiene movimiento continuo, así que no hay teclas pegadas que limpiar.
- **Sí:** `emit()` antes de `onGameOver` y en `end()`. El modal lee la puntuación del estado de React y, sin esto, la última caída forzada no se vería.
- **Sí:** acotar la puntuación a `MAX_SCORE = 10_000_000`. El check de `public.scores` lo exige; llegar es casi imposible, pero cuesta una línea.
- **Sí:** eliminar el tema claro/oscuro y `localStorage`. La plataforma tiene su propio tema y el ranking es el de Supabase.
- **No:** copiar `game.js` a `/public` y cargarlo con `<Script>`. No se limpia, no tiene tipos y no puede hablar con el HUD.
- **No:** sonido, controles táctiles ni animación de limpieza de líneas. Cada uno es su propia spec.
- **Sí:** contrato de motor documentado (`start`/`pause`/`resume`/`end`/`restart`/`destroy` + callbacks), sin interfaz compartida ni refactor de ROCAS.
- **Sí:** la fila en `public.games` va en una migración versionada y es el primer paso del plan. Sin ella el insert de `scores` falla por la FK.
- **Sí:** el cambio de catálogo, el de la Home y la rama de `GamePlayer` van en el mismo paso. Separados, el juego tendría ranking con la simulación montada, o la Home mostraría un título vacío.

## Riesgos

| Riesgo                                                                                                                                  | Mitigación                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Strict Mode o `<Activity>` dejan bucles o listeners duplicados                                                                          | Motor creado en `useLayoutEffect`, `destroy()` en el cleanup y reset del estado de React.                                                                                                              |
| Las teclas del juego interfieren con el input del modal                                                                                 | Sin `preventDefault` con foco en campos y entrada ignorada en `gameover`. Hay un criterio con la tecla `P`.                                                                                            |
| `dt` enorme al volver de otra pestaña hace caer varias filas de golpe                                                                   | Pausa automática, `dt` reiniciado al reanudar y tope de 50 ms.                                                                                                                                         |
| El modal guarda una puntuación vieja si la partida termina en una caída forzada                                                         | `emit()` antes de `onGameOver` y dentro de `end()`. Hay un criterio que lo comprueba.                                                                                                                  |
| El overlay `EN PAUSA` queda bajo el modal si se pulsa FIN o se reinicia en pausa                                                        | `end()` y `restart()` llaman a `onPauseChange(false)` si estaban en pausa. Hay un criterio que lo comprueba.                                                                                           |
| Falta la fila en `public.games` y el insert falla por la FK                                                                             | Migración como primer paso del plan y criterio que comprueba el guardado. El modal muestra `▸ NO SE PUDO GUARDAR · REINTENTAR`.                                                                        |
| El `Space` que inicia la partida también lanza la primera pieza, o una pulsación sobre el botón del overlay dispara dos veces `start()` | En `ready`, `Space`/`Enter` solo llaman a `start()` y consumen el evento. `start()` se ignora fuera de `ready`, así que clic y tecla a la vez no la duplican.                                          |
| Mantener `Space` o `↑` encadena caídas y giros                                                                                          | Se ignoran los `keydown` con `e.repeat` en esas teclas. Hay un criterio que lo comprueba.                                                                                                              |
| Un `canvas.width` asignado en `resize` borra el contexto y deja el canvas en blanco o borroso                                           | `resize` rehace `setTransform` y redibuja en la misma llamada. Hay un criterio que lo comprueba.                                                                                                       |
| Cambiar el `id` deja referencias rotas a `caida` (Home con título vacío, enlaces antiguos)                                              | La fila de la Home se actualiza en el mismo paso que el catálogo. `/games/caida` pasa a 404, con un criterio. Una búsqueda de `caida` en `app/`, `components/` y `lib/` no debe dar resultados.        |
| El tablero vertical queda pequeño en la CRT a 390 px                                                                                    | El lienzo es 800×600 escalado por CSS, así que el tablero mide ~37 % del ancho de la pantalla; se revisa en la pasada de diseño y, si no se lee, se ajusta `BOARD_X` y el panel sin cambiar la lógica. |
| SPEC 06 cita `caida` en sus criterios (`RANKING PRÓXIMAMENTE`, "Mejor global" `184.220`, modal sin ranking)                             | Esta spec los sustituye por los suyos y verifica la simulación con otro juego (`serpentina`). SPEC 06 queda como histórico.                                                                            |
| Mantener las colisiones y el reparto de puntos exactos del original al reescribir `clearLines` (revisar la misma fila tras `splice`)    | Los criterios fijan 100/300/500/800, ×nivel y +2/+1. `clearLines` devuelve el nº de líneas y el motor calcula puntos con el nivel previo.                                                              |

## Lo que **no** está en esta spec

- Controles táctiles, gamepad, sonido y música.
- _Hold_, bolsa de 7, retardo de bloqueo, SRS y cualquier mecánica que el original no tenga.
- Animación de limpieza de líneas y tema claro/oscuro.
- Cambios en `best`, `plays`, el resto de la actividad de la Home y las etiquetas fijas de `/games/blockfall`.
- Portar Arkanoid (`04-arkanoid`) y la interfaz genérica de motores.
- Anti-trampas y tests automatizados.

Cada uno de esos, si llega, va en su propia spec.

# SPEC 08 — Juego real de romper bloques (RUPTURA)

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-11-06
> **Objetivo:** Portar el Arkanoid de `references/started-games/04-arkanoid` a un motor TypeScript que se ejecuta en `/games/ruptura/jugar`, con HUD de React y puntuaciones en el leaderboard de Supabase.

## Por qué existe esta spec

Hoy el catálogo (`lib/games.ts`) solo contiene los dos juegos reales, BLOCKFALL y ROCAS; no hay ninguna entrada de romper bloques, ni simulada ni real. La clase CSS `cover-bricks` sigue en `app/globals.css` sin ninguna entrada que la use.
En `references/started-games/04-arkanoid/` hay un Arkanoid completo en canvas (`index.html`, `game.js` de unas 270 líneas, `levels.js` y un spritesheet con dos mp3, sin dependencias). Usa variables globales, `document.getElementById`, listeners en `document` y en el canvas que nunca se quitan, un bucle `requestAnimationFrame` que nunca se detiene, `new Audio(...)` en el nivel superior del módulo (rompe el prerender), un spritesheet cargado con `new Image` y overlays de pausa, game over y victoria dibujados en el canvas. La pausa incluye además un selector de nivel («Saltar al nivel») que permite alterar la puntuación competitiva.
Ese código no se puede montar tal cual en un Client Component: al navegar fuera, el bucle y los listeners seguirían vivos, y el HUD y el game over de la plataforma no sabrían nada de la partida.
Esta spec convierte ese juego en el tercer juego real de la plataforma, como entrada nueva **RUPTURA** (`id: "ruptura"`), siguiendo el contrato de motor, player y catálogo de SPEC 05 y SPEC 07 y el ranking de SPEC 06.

## Alcance

**Dentro:**

- **Motor portado a TypeScript** en `games/breakout/`, en la raíz del repo:
  - `games/breakout/entities.ts`: constantes (`W`, `H`, `BLOCK_COLS`, `BLOCK_ROWS`, `BLOCK_W`, `BLOCK_H`, `BLOCKS_ORIGIN_X`, `BLOCKS_ORIGIN_Y`, `PADDLE_W`, `PADDLE_H`, `PADDLE_Y`, `PADDLE_SPEED`, `BALL_SIZE`, `BASE_BALL_VX`, `BASE_BALL_VY`, `POINTS_PER_BLOCK`, `START_LIVES`, `EXPLOSION_MS`, `MAX_SCORE`, paleta neón `COLORS`), los tipos `Paddle`, `Ball`, `Block`, `Explosion` y funciones de dibujo que reciben el `CanvasRenderingContext2D` por parámetro (`drawBlock`, `drawPaddle`, `drawBall`, `drawExplosion`, `drawBackground`).
  - `games/breakout/levels.ts`: `LEVELS`, con la misma geometría y colores por fila que `levels.js` del original, pero como función pura (sin IIFE global) y tipada: `{ speed: number; blocks: { col: number; row: number; color: BlockColor }[] }[]`.
  - `games/breakout/engine.ts`: `createBreakoutGame(canvas, callbacks)` con el estado en un closure y un controlador con `start`, `pause`, `resume`, `end`, `restart` y `destroy`.
- **Mecánica idéntica al original** (valores fijados aquí; el original es la referencia para verificar):
  - Área lógica **800×600**. Bloques de **64×24** en una rejilla de **10 columnas × 6 filas** con origen `x = 80`, `y = 80` (`BLOCKS_ORIGIN_X = (800 − 10·64) / 2`).
  - Paddle de **81×14** en `y = 560`, centrado al empezar (`x = 359,5`). Velocidad con teclado **400 px/s**; se limita a `[0, 800 − 81]`.
  - Pelota de **16×16** (colisión AABB cuadrada de 16 px; se dibuja como círculo de 8 px de radio). Velocidad base `vx = 200`, `vy = −300` px/s, multiplicada por la `speed` del nivel. Al colocarla: `x = paddle.x + (81 − 16) / 2`, `y = 560 − 16`. Sale de inmediato, sin espera de lanzamiento, **al empezar la partida, tras perder una vida y al cargar cada nivel**; el paddle no se recoloca al cambiar de nivel ni al perder una vida.
  - Rebotes en pared izquierda, derecha y techo: `x = 0` + `vx = +|vx|`; `x = 800 − 16` + `vx = −|vx|`; `y = 0` + `vy = +|vy|`. Sin pared inferior.
  - Rebote en el paddle solo si `vy > 0`, hay solape horizontal (`ball.x + 16 > paddle.x` y `ball.x < paddle.x + 81`) y `ball.y + 16 ≥ 560` y `ball.y + 16 ≤ 560 + 14 + 8`: entonces `y = 560 − 16` y `vy = −|vy|`. `vx` no cambia (sin ángulo según el punto de impacto).
  - Colisión con bloques: se recorre `blocks` en orden y **solo se rompe el primer bloque vivo que solapa la pelota por frame** (AABB). Al romperlo: `alive = false`, **+10 puntos**, `vy = −vy` y explosión de 150 ms. Sin rebote horizontal.
  - Pelota perdida cuando `ball.y > 600`: `lives − 1`. Si `lives` llega a 0, fin de partida; si no, la pelota se recoloca sobre el paddle con la velocidad del nivel actual.
  - Fin de partida por victoria al romper el último bloque del nivel 5. Al romper el último bloque de un nivel 1–4 se carga el siguiente, y la puntuación y las vidas se conservan.
  - 3 vidas (`START_LIVES = 3`) y 5 niveles. `dt` limitado a 50 ms (el original no lo limita; es la regla del contrato). El `dt` es 0 en el primer frame tras empezar o reanudar.
  - **Niveles** (la velocidad multiplica `vx` y `vy` base):

    | Nivel | Patrón                 | Bloques | `speed` | Colores por fila (de arriba a abajo)          |
    | ----- | ---------------------- | ------- | ------- | --------------------------------------------- |
    | 1     | Parrilla completa 10×6 | 60      | 1,00    | red, yellow, cyan, magenta, hotpink, green    |
    | 2     | Pirámide centrada      | 40      | 1,10    | gray, cyan, hotpink, yellow, magenta, green   |
    | 3     | Tablero de ajedrez     | 30      | 1,21    | yellow las filas 0–2, magenta las filas 3–5   |
    | 4     | Filas con huecos       | 39      | 1,33    | cyan, magenta, green, yellow, hotpink, red    |
    | 5     | Marco + cruz central   | 39      | 1,46    | marco cyan, cruz (columna 4 y fila 2) hotpink |

    Detalle de geometría (índices base 0): nivel 2, inicio de columna por fila `[4,3,2,1,0,0]` y fin `[5,6,7,8,9,9]`; nivel 3, bloque si `(col + fila) % 2 === 0`; nivel 4, huecos por fila `[2,5,8]`, `[0,4,7,9]`, `[1,3,6]`, `[2,5,8,9]`, `[0,4,7]`, `[1,3,6,9]`; nivel 5, bloque si `col ∈ {0,9}` o `fila ∈ {0,5}` (marco) o `col = 4` o `fila = 2` (cruz). Total de 208 bloques: la puntuación máxima posible es **2.080**.
- **Reglas del motor** (contrato de plataforma, fijadas aquí por escrito):
  - **Emisión de valores:** un objeto `sent` con los últimos valores enviados a React (iniciado en `-1`) y una función `emit()` que llama a `onScore`, `onLives` y `onLevel` solo si el valor cambió.
  - **`emit()` va antes de `onGameOver(score)` y dentro de `end()`.** El modal usa la puntuación del estado de React, no el argumento de `onGameOver`; sin esto, los 10 puntos del último bloque no llegan y se guarda una puntuación vieja.
  - **Pausa:** `end()` y `restart()` estando en pausa llaman a `onPauseChange(false)`, para que el overlay `EN PAUSA` no se quede debajo del modal.
  - **Teclas sin pegarse:** el estado de `ArrowLeft`/`ArrowRight` vive en un objeto `keys` del closure y `clearKeys()` se llama en `start`, `pause`, `resume`, `end`, `restart` y `blur`. Toda entrada se ignora en `gameover`.
  - **`resize`:** un listener de `window` rehace el backing store (`canvas.width/height` × `devicePixelRatio`), vuelve a aplicar `setTransform` y redibuja. Se quita en `destroy()`.
  - **Foco:** el motor no reacciona ni llama a `preventDefault` si el foco está en `input`, `textarea`, `button`, `select` o un elemento `contentEditable`.
  - **Sin navegador en el módulo:** `window`, `document`, `requestAnimationFrame` y `devicePixelRatio` solo se usan dentro de `createBreakoutGame`. No hay `new Audio` ni `new Image` en ningún archivo de `games/breakout/`.
  - **Un solo `onGameOver`:** se llama una vez por partida (derrota o victoria) y no tras `end()`.
- **Se elimina del original:** el selector «Saltar al nivel» de la pausa y su `click` en el canvas (es un truco que altera la puntuación competitiva), los overlays `PAUSA`, `GAME OVER` y `¡Completaste el juego!` dibujados en el canvas, los textos `Score:` y `Nivel:` y las bolas de vida del canvas, el spritesheet (`spritesheet-breakout.png`, `spritesheet.js`) y los dos mp3. El original no guarda récords en `localStorage`.
- **HUD en React:** el `.player-hud` muestra Jugador, Puntuación, Vidas (`♥` por vida restante, de 3 a 0) y Nivel (`01`…`05`) con datos reales, alimentados por `onScore`, `onLives` y `onLevel`. El canvas no dibuja ningún HUD.
- **Pantalla de inicio:** el motor dibuja el nivel 1 completo con el paddle centrado y la pelota quieta sobre él, sin movimiento. React muestra encima un overlay con el título, los controles y `PULSA ESPACIO PARA EMPEZAR`. La partida empieza con `Space` o `Enter`, o con un clic en la pantalla; en ese momento la pelota sale. La pulsación que inicia no mueve el paddle.
- **Pausa:** botón PAUSA/REANUDAR del HUD, `P` o `Escape`, y pausa automática con `blur` de la ventana o `visibilitychange` a oculto. En pausa se hace `cancelAnimationFrame` y al reanudar el `dt` se reinicia. Overlay `EN PAUSA` existente con `PULSA P O REANUDAR PARA CONTINUAR`. Sin botones de nivel.
- **Fin de partida:** al perder la última vida **o** al romper el último bloque del nivel 5 el motor hace `emit()`, pasa a `gameover` y llama a `onGameOver(score)` una sola vez. React abre `GameOverModal` con `ranked` (título `FIN DEL JUEGO`, sin ampliarlo para la victoria). El tablero queda visible detrás del modal. JUGAR DE NUEVO llama a `restart()` y la partida empieza directamente en el nivel 1 con 3 vidas y 0 puntos.
- **Botón FIN:** `end()` detiene la partida sin llamar a `onGameOver`, hace `emit()` y React abre el modal con la puntuación actual.
- **Estilo neón:** bloques, paddle y pelota como trazos vectoriales con la paleta del sitio, sustituyendo a los sprites: red `#ff2d55`, yellow `#ffe600`, cyan `#00f5ff`, magenta `#ff00e5`, hotpink `#ff6ec7`, green `#00ff88` y gray `#9aa0b4` para los bloques; paddle cian; pelota blanca con glow. La explosión es un destello del color del bloque que se expande unos píxeles y se desvanece en 150 ms (sustituye a los 4 frames del sprite). Glow (`shadowBlur`) solo en paddle y pelota. Los colores exactos se fijan con `/frontend-design` y viven como constantes `COLORS` en `games/breakout/entities.ts`.
- **Canvas nítido y encaje en la CRT 4:3:** resolución lógica **800×600**, la misma que el original y que ROCAS, así que llena la CRT sin bandas. El canvas ocupa el 100 % de la CRT por CSS y el backing store se multiplica por `devicePixelRatio` con `ctx.setTransform`.
- **Teclado:** `ArrowLeft`/`ArrowRight` mueven el paddle a 400 px/s mientras se mantienen, `Space`/`Enter` empiezan (solo en `ready`), `P`/`Escape` pausan. `preventDefault` solo en esas teclas (y en `Enter` mientras el estado es `ready`) y nunca con el foco en un campo de formulario.
- **Ratón:** `mousemove` en el canvas coloca el centro del paddle bajo el cursor: `x = clamp(mouseX − 81/2, 0, 800 − 81)`, con `mouseX = (e.clientX − rect.left) * (800 / rect.width)` (nunca con `canvas.width`, que con DPR 2 da el doble). Solo actúa en estado `playing`. El listener se quita en `destroy()`. El overlay de inicio tapa el canvas en `ready`, así que el ratón no actúa hasta empezar. Teclado y ratón se pueden combinar: gana el último que se mueve.
- **Aviso en pantallas táctiles:** `ESTE JUEGO NECESITA TECLADO O RATÓN` en el overlay de inicio. El juego no se bloquea.
- **Puntuación acotada:** la puntuación interna nunca pasa de `MAX_SCORE = 10_000_000`; siempre es un entero (el máximo real es 2.080).
- **Catálogo:** `GameEngine` pasa a `"asteroids" | "blockfall" | "breakout"`. Entrada nueva, al final de `GAMES`:
  - `id: "ruptura"`, `title: "RUPTURA"`, `short: "Rompe la pared antes de que la bola se escape."`, `long: "Una pared de bloques de neón cuelga sobre ti y solo tienes un paddle. Desvía la bola, rompe cada bloque y sobrevive a cinco niveles que aceleran la pelota sin piedad. Ratón o teclado, tú eliges."`, `cat: "ARCADE"`, `cover: "cover-bricks"` (clase que ya existe en `app/globals.css`), `color: "cyan"`, `best: 2040`, `plays: "9.4K"` (valores mock del catálogo, no se usan para el ranking real), `engine: "breakout"`.
  - `GamePlayer` monta `BreakoutPlayer` cuando `game.engine === "breakout"`.
  - `CATEGORIES` no cambia: el juego aparece bajo `TODOS` y no hay chip `ARCADE`.
- **Leaderboard:** migración `supabase/migrations/20261106120000_game_ruptura.sql` con la fila `ruptura` en `public.games`, aplicada con el MCP de Supabase, y tipos regenerados. Con eso `submitScore`, `/games/ruptura` y `/salon` incluyen RUPTURA sin cambios de código.
- **Ranking fresco tras guardar (ampliación durante la verificación):** `app/games/[id]/page.tsx` y `app/salon/page.tsx` exportan `prefetch = "force-disabled"`. Justo después de guardar, el router vuelve a precargar esas páginas y el servidor le sirve el segmento anterior desde la caché estática, aunque `updateTag` ya haya expirado los datos: la marca nueva no aparece hasta recargar. Afecta a las páginas de ranking de todos los juegos. El cambio es solo de precarga: no toca `submitScore`, `GameOverModal` ni `lib/leaderboard.ts`.

**Fuera de alcance (para futuras specs):**

- Controles táctiles o gamepad.
- Sonido y música (el original tiene dos efectos mp3; se dejan fuera, y por eso no se toca `proxy.ts`).
- Conservar el spritesheet o la animación de explosión de 4 frames.
- Espera de lanzamiento de la pelota (estado `serve`), rebote según el punto de impacto, colisión por lado del bloque, power-ups, bloques de varios golpes o más niveles: el original no los tiene.
- Chip `ARCADE` en el filtro de la biblioteca (`CATEGORIES`).
- `best` y `plays` del catálogo, la actividad de la Home y las etiquetas fijas de `/games/ruptura`.
- Interfaz `GameEngine` compartida y refactor de ROCAS o BLOCKFALL.
- Ampliar `GameOverModal` con un mensaje de victoria.
- Anti-trampas y tests automatizados.

## Modelo de datos

Fila nueva en Supabase:

```sql
-- supabase/migrations/20261106120000_game_ruptura.sql
-- SPEC 08: RUPTURA gets a real engine, so it joins the games catalogue and can receive scores.

insert into public.games (id, title) values ('ruptura', 'RUPTURA');
```

Tipos nuevos:

```ts
// lib/games.ts (cambio)
export type GameEngine = "asteroids" | "blockfall" | "breakout";

// games/breakout/levels.ts
export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
export type LevelDef = {
  speed: number;
  blocks: { col: number; row: number; color: BlockColor }[];
};
export const LEVELS: LevelDef[]; // 5 niveles

// games/breakout/entities.ts
export type Paddle = { x: number; y: number; w: number; h: number };
export type Ball = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};
export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};
export type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number; // ms
};

// games/breakout/engine.ts
export type BreakoutCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onPauseChange: (paused: boolean) => void; // también cuando la pausa es automática (blur/visibilidad)
  onStart: () => void; // la partida pasa de "ready" a "playing"
  onGameOver: (score: number) => void; // última vida perdida o nivel 5 completado
};

export type BreakoutState = "ready" | "playing" | "paused" | "gameover";

export type BreakoutGame = {
  start: () => void; // ready -> playing (clic en el overlay de inicio); ignorada en otro estado
  pause: () => void;
  resume: () => void;
  end: () => void; // botón FIN: pasa a gameover sin llamar a onGameOver
  restart: () => void; // nueva partida directamente en "playing"
  destroy: () => void; // cancela el rAF y quita todos los listeners
};

export function createBreakoutGame(
  canvas: HTMLCanvasElement,
  callbacks: BreakoutCallbacks,
): BreakoutGame;
```

Convenciones:

- Coordenadas con origen arriba a la izquierda; velocidades en px/s; `dt` en segundos.
- `games/breakout/` contiene solo TypeScript del motor, sin `react`, `next/*` ni `@/lib/*`. El motor no conoce el catálogo, `localStorage` ni el usuario.
- El player vive en `components/breakout-player.tsx` y copia la estructura de `components/asteroids-player.tsx` y `components/blockfall-player.tsx`.
- Los callbacks solo se llaman cuando cambia el valor, nunca en cada frame.
- Puntuación entera entre 0 y 10.000.000.

## Plan de implementación

Antes del paso 1 se consultan las guías de Client Components y de `useEffect`/refs en `node_modules/next/dist/docs/`. La UI (overlays, colores del canvas, indicador de vidas) se diseña con `/frontend-design`, según `CLAUDE.md`.

1. Migración `supabase/migrations/20261106120000_game_ruptura.sql`, aplicada con el MCP de Supabase (`apply_migration`; si no conecta, desde el SQL Editor), y tipos regenerados en `lib/supabase/database.types.ts`. Va primero porque la fila es inocua sin el juego; al revés, habría un juego con pestaña en `/salon` cuyo guardado falla por la FK. Verificación: `select * from public.games` incluye `ruptura`.
2. `games/breakout/levels.ts` con `BlockColor`, `LevelDef` y `LEVELS` (5 niveles, 60/40/30/39/39 bloques, `speed` 1,00/1,10/1,21/1,33/1,46). Verificación: `npx tsc --noEmit` y un chequeo puntual de que los niveles suman 208 bloques.
3. `games/breakout/entities.ts`: constantes, tipos, paleta `COLORS` y funciones de dibujo con `ctx` por parámetro (bloques, paddle, pelota con glow, explosión de 150 ms, fondo). Verificación: `npx tsc --noEmit`.
4. `games/breakout/engine.ts` con `createBreakoutGame`: estado en closure, máquina `BreakoutState`, bucle rAF con `dt` limitado a 50 ms, física del original (paddle, pelota, un bloque por frame, vidas, niveles, victoria), teclado y ratón, pausa (P/Esc, `blur`, `visibilitychange`), `clearKeys()`, DPR + `resize`, fondo con nivel 1 en `ready`, `emit()` con `sent`, `destroy()`. Sin HUD ni overlays en canvas. Verificación: `npx tsc --noEmit` y `npm run lint`.
5. `lib/games.ts`: unión `GameEngine` y entrada nueva `ruptura` con `cover: "cover-bricks"`. Verificación: `npx tsc --noEmit` y `/games/ruptura` muestra la ficha con la portada de ladrillos.
6. `components/breakout-player.tsx`: marco `.av-player`/`.player-hud`/`.crt`/`.crt-screen`/`.crt-bottom`, canvas, HUD con Jugador, Puntuación, Vidas y Nivel, overlay de inicio (leyenda con `←` `→`/ratón, `ESPACIO`, `P`; aviso táctil `ESTE JUEGO NECESITA TECLADO O RATÓN`), overlay `EN PAUSA`, botones PAUSA/FIN/SALIR con `releaseFocus`, `GameOverModal key={run}` con `ranked`, y cleanup con `destroy()` y reset del estado de React. Verificación: `npx tsc --noEmit`.
7. Rama en `components/game-player.tsx`: `if (game.engine === "breakout") return <BreakoutPlayer game={game} />;`. Verificación: `/games/ruptura/jugar` muestra el juego real y ROCAS y BLOCKFALL siguen igual.
8. Pasada de diseño con `/frontend-design` a 1280 px y 390 px (colores, glow, overlays, vidas en el HUD).
9. Verificación en el navegador (Playwright o manual) recorriendo los criterios, y después `npm run lint` y `npm run build` (con y sin `.env.local`).

## Criterios de aceptación

- [ ] Existen `games/breakout/entities.ts`, `games/breakout/levels.ts`, `games/breakout/engine.ts`, `components/breakout-player.tsx` y `supabase/migrations/20261106120000_game_ruptura.sql`.
- [ ] Ningún archivo de `games/breakout/` importa `react`, `next/*` ni `@/lib/*`, ni usa `new Audio` o `new Image`.
- [ ] Ningún archivo de la app importa nada de `references/`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores, también sin `.env.local`.
- [ ] `/games/ruptura/jugar` muestra el canvas dentro de la CRT con el nivel 1 completo (60 bloques), el paddle centrado, la pelota quieta sobre él y el overlay `PULSA ESPACIO PARA EMPEZAR` con los controles.
- [ ] La partida empieza con `Space`, `Enter` o un clic en la pantalla, y la pelota sale en ese momento.
- [ ] `ArrowLeft` y `ArrowRight` mueven el paddle a 400 px/s (cruza el área de 800 px en unos 1,8 s) y no hacen scroll en la página; `Space` tampoco.
- [ ] El paddle nunca sale del área `[0, 719]` (x máxima = 800 − 81), con teclado ni con ratón.
- [ ] Con el ratón, el paddle queda centrado bajo el cursor; con `devicePixelRatio` 2 y a 390 px de ancho sigue exactamente al cursor.
- [ ] La pelota rebota en las paredes izquierda, derecha y techo, y en el paddle sin cambiar `vx`. En el nivel 1 sale con `vx = 200` y `vy = −300` px/s.
- [ ] Romper un bloque suma 10 puntos, invierte `vy` y lanza un destello de 150 ms del color del bloque; la Puntuación del HUD de React se actualiza al instante. Nunca se rompe más de un bloque por frame.
- [ ] El HUD empieza con 3 `♥` y Nivel `01`; pierde un `♥` cada vez que la pelota pasa de `y = 600`, y la pelota vuelve sobre el paddle y sale de nuevo sin esperar. El canvas no dibuja ningún HUD propio.
- [ ] Al romper el último bloque del nivel 1 el Nivel pasa a `02`, aparece la pirámide (40 bloques), la pelota sale a ×1,10, y la puntuación y las vidas se conservan. Los niveles 3, 4 y 5 cargan 30, 39 y 39 bloques con velocidades ×1,21, ×1,33 y ×1,46.
- [ ] El botón PAUSA, la tecla `P` y `Escape` pausan y reanudan. En pausa no se mueve nada y se ve el overlay `EN PAUSA`; no hay botones de salto de nivel ni ninguna forma de cambiar de nivel salvo rompiendo bloques.
- [ ] Cambiar de pestaña o sacar el foco de la ventana pausa la partida y, al reanudar, la pelota continúa sin salto de posición.
- [ ] Al perder la tercera vida se abre `GameOverModal` con la puntuación real. Al romper el último bloque del nivel 5 también se abre, con la puntuación real (hasta 2.080) y se puede guardar.
- [ ] FIN detiene la partida y abre el modal con la puntuación actual, también si estaba en pausa, sin que quede el overlay `EN PAUSA`.
- [ ] La puntuación del modal y la fila guardada coinciden con los puntos reales de la partida, incluidos los 10 del último bloque roto.
- [ ] Se pueden escribir las iniciales en el modal (incluida `P`) sin que el motor reaccione.
- [ ] GUARDAR PUNTUACIÓN muestra `GUARDANDO…` y luego `▸ PUNTUACIÓN GUARDADA_`, y aparece una fila en `scores` con `game_id = 'ruptura'`.
- [ ] Tras guardar, `/games/ruptura` muestra la puntuación en su leaderboard y "Mejor global" es la primera fila (o `—` sin puntuaciones).
- [ ] Tras guardar y navegar sin recargar (con SALIR, con VOLVER AL VAULT y la tarjeta del juego, o con la Nav hacia `/salon`), la marca nueva aparece en la página de destino, también en el build de producción.
- [ ] `/salon` tiene una pestaña `RUPTURA` con sus marcas, y la marca también aparece en GLOBAL.
- [ ] JUGAR DE NUEVO empieza una partida nueva en el nivel 1, con 0 puntos, 3 vidas y 60 bloques.
- [ ] Navegar fuera con SALIR o con la Nav detiene el bucle y quita los listeners (incluido el del ratón): las flechas y Espacio vuelven a hacer scroll y no hay errores en consola.
- [ ] En desarrollo (Strict Mode) solo corre un bucle: la pelota no va al doble de velocidad.
- [ ] El canvas se ve nítido con `devicePixelRatio` 2, sigue nítido tras redimensionar la ventana y se adapta a 390 px sin scroll horizontal.
- [ ] Con puntero táctil el overlay de inicio muestra `ESTE JUEGO NECESITA TECLADO O RATÓN`.
- [ ] El selector «Saltar al nivel» del original ya no existe en la plataforma.
- [ ] La entrada `ruptura` aparece en `/games` bajo `TODOS` con la portada `cover-bricks`, y ROCAS, BLOCKFALL y su ranking siguen funcionando igual.
- [ ] No hay errores ni avisos de hidratación en `/games/ruptura` y `/games/ruptura/jugar`.

## Decisiones

- **Sí:** entrada nueva `ruptura` / `RUPTURA` con motor `breakout`. El catálogo no tiene ninguna entrada de romper bloques que reutilizar, y el título es propio, no el de un juego comercial.
- **Sí:** reutilizar `cover-bricks`, que ya existe en `app/globals.css` y encaja con el juego, y `cat: "ARCADE"`. **No:** añadir un chip `ARCADE` a `CATEGORIES`; se queda fuera de alcance.
- **Sí:** mecánica idéntica al original, con un estado `ready` y la pelota que sale sola al empezar, tras perder vida y al cambiar de nivel. **No:** estado `serve` con espera de lanzamiento: añade una mecánica que el original no tiene.
- **Sí:** conservar los defectos de física del original (un bloque por frame, `vy = −vy` sin rebote lateral, paddle sin ángulo). Cambiarlos es otra mecánica y otra spec.
- **Sí:** vectorial neón y sin sonido. Es coherente con ROCAS y BLOCKFALL, evita copiar assets y no obliga a tocar `proxy.ts`. **No:** conservar el spritesheet ni los mp3.
- **Sí:** teclado y ratón. El ratón es el control principal del original. **No:** solo teclado.
- **Sí:** la victoria usa el mismo `GameOverModal` (`FIN DEL JUEGO`). **No:** ampliar el modal con un mensaje de victoria.
- **Sí:** eliminar «Saltar al nivel». Permitir empezar en el nivel 5 falsearía el ranking.
- **Sí:** HUD con Vidas y Nivel como ROCAS. **No:** stat de bloques restantes, que no existía en el original.
- **Sí:** contrato de motor documentado (`start`/`pause`/`resume`/`end`/`restart`/`destroy` + callbacks), sin interfaz compartida ni refactor de ROCAS ni BLOCKFALL.
- **Sí:** la fila en `public.games` va en una migración versionada. Sin ella el insert de `scores` falla por la FK.
- **Sí:** `prefetch = "force-disabled"` en `/games/[id]` y `/salon`. Es una línea por página y corrige el ranking viejo tras guardar; a cambio, esas navegaciones esperan al servidor en lugar de ser instantáneas.
- **No:** `router.refresh()` tras guardar: se probó y no lo corrige. **No:** sacar el ranking a un `<Suspense>` dinámico: cambia más código y añade un estado de carga a dos páginas.

## Riesgos

| Riesgo                                                                          | Mitigación                                                                                                      |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Strict Mode o `<Activity>` dejan bucles o listeners duplicados                  | Motor creado en `useLayoutEffect`, `destroy()` en el cleanup y reset del estado de React.                       |
| Las teclas del juego interfieren con el input del modal                         | Sin `preventDefault` con foco en campos y entrada ignorada en `gameover`.                                       |
| `dt` enorme al volver de otra pestaña                                           | Pausa automática, `dt` reiniciado al reanudar y tope de 50 ms.                                                  |
| Falta la fila en `public.games`                                                 | Migración como primer paso y criterio que comprueba el guardado. El modal muestra el error.                     |
| El modal guarda una puntuación vieja                                            | `emit()` antes de `onGameOver` y en `end()`, con un criterio que lo comprueba.                                  |
| Ratón: coordenadas mal escaladas con DPR o a 390 px                             | Conversión con `800 / rect.width` y criterio con DPR 2 y 390 px.                                                |
| Atravesar bloques o paddle con `dt` de 50 ms                                    | A ×1,46 la pelota avanza ≈ 22 px por frame (< 16 + 14 de solape mínimo con el paddle), igual que el original.   |
| `ARCADE` no es un chip del filtro de la biblioteca                              | Aparece bajo `TODOS`; criterio que lo verifica. El chip se añade en otra spec.                                  |
| Otra página que muestre rankings se precarga y enseña datos viejos tras guardar | Toda página que lea `getTopScores` debe llevar `prefetch = "force-disabled"`; hoy son `/games/[id]` y `/salon`. |
| Un juego nuevo no encaja en los textos fijos de `/games/[id]`                   | Etiquetas fijas fuera de alcance; se revisan en la pasada de diseño sin cambiar su contenido.                   |

## Lo que **no** está en esta spec

- Controles táctiles o gamepad.
- Sonido y música, y el spritesheet y la animación de 4 frames del original.
- Mecánicas nuevas: espera de lanzamiento, rebote angular, power-ups, bloques resistentes, más niveles.
- Filtro `ARCADE` en la biblioteca.
- Mensaje de victoria propio en `GameOverModal`.
- `best` y `plays` del catálogo, la actividad de la Home y las etiquetas fijas de `/games/ruptura`.
- Interfaz `GameEngine` compartida y refactor de ROCAS o BLOCKFALL.
- Anti-trampas y tests automatizados.

Cada uno de esos, si llega, va en su propia spec.

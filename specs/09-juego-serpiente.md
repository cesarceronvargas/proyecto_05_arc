# SPEC 09 — Juego real de serpiente (SERPIENTE)

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-06
> **Objetivo:** Crear un juego de serpiente original como motor TypeScript en `/games/serpiente/jugar`, con las frutas de `references/source-assets/snake-assets/` como sprites, HUD de React y puntuaciones en el leaderboard de Supabase.

## Por qué existe esta spec

Hoy el catálogo (`lib/games.ts`) solo contiene los tres juegos reales (BLOCKFALL, ROCAS y RUPTURA); no hay ninguna entrada de serpiente, ni simulada ni real. La clase CSS `cover-snake` sigue en `app/globals.css` sin ninguna entrada que la use.
No hay un juego original que portar: es un diseño nuevo del género «serpiente en rejilla», así que **esta spec es la única fuente de verdad** y fija todas las reglas y valores.
Lo único que viene de fuera son los sprites que aporta el usuario en `references/source-assets/snake-assets/`:

- `fruits.png`: hoja de 3790×442 px con fondo transparente, tres filas de frutas (22 por fila). El atlas usa la fila central (pixel-art), recortes de 110–170 × 160 px a partir de `y = 136`.
- `sprites.js`: atlas `window.SPRITE_ATLAS` con las coordenadas `{ x, y, w, h }` de las 22 frutas. Es un global de `window` y un script suelto, así que no se puede importar: sus coordenadas se transcriben a un módulo TypeScript.

El origen declarado de la hoja es una web de sprites de terceros; garantizar que se puede publicar con esa licencia es responsabilidad del usuario, que aporta los assets.

Esta spec convierte ese diseño en el cuarto juego real de la plataforma, como entrada nueva **SERPIENTE** (`id: "serpiente"`), siguiendo el contrato de motor, player y catálogo de SPEC 05 y el ranking de SPEC 06.

## Alcance

**Dentro:**

- **Motor creado en TypeScript** en `games/snake/`, en la raíz del repo:
  - `games/snake/sprites.ts`: `FRUIT_ATLAS` (las 22 frutas con su `{ x, y, w, h }`, transcritas de `sprites.js`, sin globals) y `FRUIT_KEYS`.
  - `games/snake/entities.ts`: constantes (`W`, `H`, `CELL`, `COLS`, `ROWS`, `START_LENGTH`, `POINTS_PER_FRUIT`, `START_SPEED`, `SPEED_STEP`, `MAX_SPEED`, `FRUITS_PER_LEVEL`, `MAX_LEVEL`, `INPUT_BUFFER`, `MAX_SCORE`, paleta `COLORS`), tipos `Cell`, `Dir` y funciones de dibujo que reciben el `CanvasRenderingContext2D` por parámetro (`drawBackground`, `drawSnake`, `drawFruit`).
  - `games/snake/engine.ts`: `createSnakeGame(canvas, callbacks)` con el estado en un closure y un controlador con `start`, `pause`, `resume`, `end`, `restart` y `destroy`.
- **Mecánica fijada aquí** (reglas completas y tabla de valores confirmada por el usuario):

  | Concepto                        | Valor                                                                                                                                                  |
  | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | Área lógica                     | **800×600** px                                                                                                                                         |
  | Rejilla                         | **20 columnas × 15 filas** de **40 px** (`COLS = 20`, `ROWS = 15`, `CELL = 40`), 300 celdas                                                            |
  | Origen de celda                 | Esquina superior izquierda; la celda `(c, r)` ocupa `x = c·40`, `y = r·40`                                                                             |
  | Serpiente inicial               | **3 segmentos** (`START_LENGTH = 3`): cabeza en `(10, 7)`, cuerpo en `(9, 7)` y `(8, 7)`, mirando a la derecha                                         |
  | Velocidad inicial               | **8 celdas/s** (`START_SPEED = 8`; un paso cada 125 ms)                                                                                                |
  | Aceleración                     | **+0,5 celdas/s cada 5 frutas** (`SPEED_STEP = 0,5`, `FRUITS_PER_LEVEL = 5`), con tope de **16 celdas/s** (`MAX_SPEED = 16`, se alcanza con 80 frutas) |
  | Fórmula de velocidad            | `speed = min(16, 8 + 0,5 · floor(frutas / 5))`; el intervalo entre pasos es `1000 / speed` ms                                                          |
  | Nivel (solo informativo en HUD) | `level = min(10, 1 + floor(frutas / 5))` (`MAX_LEVEL = 10`; llega a 10 con 45 frutas, pero la velocidad sigue subiendo hasta las 80)                   |
  | Fruta                           | **Una a la vez**; tipo aleatorio entre las 22 del atlas, nunca el mismo que la anterior                                                                |
  | Posición de la fruta            | Celda aleatoria **libre** (que no esté ocupada por la serpiente)                                                                                       |
  | Comer                           | **+10 puntos** (`POINTS_PER_FRUIT = 10`) y **+1 segmento** de longitud                                                                                 |
  | Giros                           | Buffer de **máx. 2 giros** (`INPUT_BUFFER = 2`); no se puede invertir 180° (ni respecto al último giro encolado)                                       |
  | Derrota                         | Chocar con una pared (salir del tablero) o con el propio cuerpo. Sin vidas.                                                                            |
  | Victoria                        | Ocupar las 300 celdas (297 frutas comidas): no queda celda libre para la siguiente fruta                                                               |
  | Puntuación máxima posible       | 297 × 10 = **2.970**                                                                                                                                   |

  Reglas de detalle:
  - **Bucle por pasos:** el motor acumula `dt` (limitado a 50 ms por el contrato, en segundos) y avanza un paso de rejilla cada vez que el acumulador supera `1000 / speed` ms, con un `while` por si en un frame caben varios pasos (a 16 celdas/s el intervalo es 62,5 ms). Al empezar, reanudar o reiniciar, el acumulador y el `dt` se ponen a 0. El movimiento es **discreto** (sin interpolación entre celdas).
  - **Un paso:** se toma el primer giro del buffer (si hay) y se actualiza la dirección; se calcula la nueva cabeza; si sale de `[0, COLS) × [0, ROWS)` → derrota; si coincide con una celda del cuerpo → derrota, **excepto la celda de la cola cuando este paso no come**, porque la cola se desplaza y deja la celda libre; si coincide con la fruta, se come (la cola no se retira y la longitud crece en 1); si no, se retira la cola.
  - **Buffer de giros:** `ArrowUp/W`, `ArrowDown/S`, `ArrowLeft/A`, `ArrowRight/D` encolan una dirección. Se descarta si es igual o la contraria a la última dirección efectiva (la última del buffer, o la actual si está vacío), y si el buffer ya tiene 2 giros. Así dos giros rápidos entre pasos se aplican en pasos consecutivos y un giro 180° nunca mata.
  - **Fruta nueva:** tras comer, si `longitud === 300` → victoria (no se genera fruta); si no, se elige tipo (distinto al anterior) y celda libre al azar. Al empezar una partida se genera la primera fruta con las mismas reglas. En `ready` y al reiniciar se ve la serpiente inicial y la primera fruta.
  - **Una sola derrota:** `onGameOver(score)` se llama una vez por partida (derrota o victoria) y nunca tras `end()`.

- **Reglas del motor** (contrato de plataforma, fijadas aquí por escrito):
  - **Emisión de valores:** un objeto `sent` con los últimos valores enviados a React (iniciado en `-1`) y una función `emit()` que llama a `onScore`, `onLength` y `onLevel` solo si el valor cambió.
  - **`emit()` va antes de `onGameOver(score)` y dentro de `end()`.** El modal usa la puntuación del estado de React, no el argumento de `onGameOver`; sin esto, los 10 puntos de la última fruta no llegan y se guarda una puntuación vieja.
  - **Pausa:** `end()` y `restart()` estando en pausa llaman a `onPauseChange(false)`, para que el overlay `EN PAUSA` no se quede debajo del modal.
  - **Teclas sin pegarse:** el motor no guarda teclas mantenidas (solo giros encolados), pero `clearKeys()` se llama en `start`, `pause`, `resume`, `end`, `restart` y `blur` y vacía el buffer de giros. Toda entrada se ignora en `gameover`.
  - **`resize`:** un listener de `window` rehace el backing store (`canvas.width/height` × `devicePixelRatio`), vuelve a aplicar `setTransform` y redibuja. Se quita en `destroy()`.
  - **Foco:** el motor no reacciona ni llama a `preventDefault` si el foco está en `input`, `textarea`, `button`, `select` o un elemento `contentEditable`.
  - **Sin navegador en el módulo:** `window`, `document`, `requestAnimationFrame`, `new Image` y `devicePixelRatio` solo se usan dentro de `createSnakeGame`. No hay `new Audio` en ningún archivo de `games/snake/`.
  - **Puntuación acotada:** siempre un entero; tope de seguridad `MAX_SCORE = 10_000_000` (el máximo real es 2.970).
- **HUD en React:** el canvas no pinta puntuación, longitud ni nivel. El `.player-hud` muestra Jugador, Puntuación, Longitud (`03`… hasta `300`, de `onLength`) y Nivel (`01`…`10`, de `onLevel`) con datos reales.
- **Pantalla de inicio:** el motor dibuja el tablero con la serpiente inicial y la primera fruta, sin movimiento. React muestra encima un overlay con el título, los controles y `PULSA ESPACIO PARA EMPEZAR`. La partida empieza con `Space` o `Enter`, o con un clic en la pantalla; la serpiente avanza a la derecha desde el primer paso. Las flechas no empiezan la partida.
- **Pausa:** botón PAUSA/REANUDAR del HUD, `P` o `Escape`, y pausa automática con `blur` de la ventana o `visibilitychange` a oculto. En pausa se hace `cancelAnimationFrame` y al reanudar el `dt` y el acumulador se reinician. Overlay `EN PAUSA` existente con `PULSA P O REANUDAR PARA CONTINUAR`.
- **Fin de partida:** al chocar **o** al llenar el tablero el motor hace `emit()`, pasa a `gameover` y llama a `onGameOver(score)` una sola vez. React abre `GameOverModal` con `ranked` (título `FIN DEL JUEGO`, sin ampliarlo para la victoria). El tablero queda visible detrás del modal, con la serpiente en la posición del choque (la cabeza no se dibuja fuera del tablero). JUGAR DE NUEVO llama a `restart()` y la partida empieza directamente en `playing` con 3 segmentos, 0 puntos y nivel 1.
- **Botón FIN:** `end()` detiene la partida sin llamar a `onGameOver`, hace `emit()` y React abre el modal con la puntuación actual.
- **Imágenes:** `fruits.png` se copia de `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png` (la app nunca importa de `references/`) y se carga por URL absoluta `/games/snake/fruits.png` con `new Image` **dentro de** `createSnakeGame`. Solo se dibuja si `img.complete && img.naturalWidth > 0`; mientras no cargue, o si falla, se dibuja como respaldo un círculo vectorial de color de la paleta. Cada fruta se recorta con su `{ x, y, w, h }` del atlas y se dibuja **centrada en su celda, con la altura escalada a 36 px** (4 px de margen) y el ancho proporcional (de ≈ 25 a ≈ 38 px, siempre ≤ 40). `imageSmoothingEnabled` se deja en su valor por defecto (activado, porque son reducciones de ≈ 0,22×), así que no hay que restaurarlo tras cambiar el tamaño del canvas. `proxy.ts` no cambia: su matcher ya excluye `.png`.
- **Estilo neón:** el tablero es un fondo oscuro `#0a0a18` con una rejilla de líneas tenues de 40 px (`rgba(0,245,255,0.06)`); la serpiente son segmentos de rectángulos redondeados verdes (`#00ff88`, el cuerpo se atenúa hacia la cola) con glow (`shadowBlur`) **solo en la cabeza**, y la cabeza lleva dos ojos oscuros orientados según la dirección. Las frutas son los sprites del usuario (sin glow). Los colores exactos se fijan con `/frontend-design` y viven como constantes `COLORS` en `games/snake/entities.ts`.
- **Canvas nítido y encaje en la CRT 4:3:** resolución lógica **800×600**, la misma que ROCAS y RUPTURA, así que llena la CRT sin bandas (20×15 celdas de 40 px = 800×600 exactos). El canvas ocupa el 100 % de la CRT por CSS y el backing store se multiplica por `devicePixelRatio` con `ctx.setTransform`.
- **Teclado:** `ArrowUp/ArrowDown/ArrowLeft/ArrowRight` y `W/A/S/D` giran; `Space`/`Enter` empiezan (solo en `ready`); `P`/`Escape` pausan. `preventDefault` solo en esas teclas (y en `Enter` solo mientras el estado es `ready`) y nunca con el foco en un campo de formulario.
- **Aviso en pantallas táctiles:** `ESTE JUEGO NECESITA TECLADO` en el overlay de inicio. El juego no se bloquea.
- **Catálogo:** `GameEngine` pasa a `"asteroids" | "blockfall" | "breakout" | "snake"`. Entrada nueva, al final de `GAMES`:
  - `id: "serpiente"`, `title: "SERPIENTE"`, `short: "Come, crece y no te muerdas la cola."`, `long: "Una serpiente de neón recorre un tablero cuadriculado y no se detiene nunca. Gírala con las flechas o WASD, devora frutas para crecer y sobrevive mientras la velocidad sube cada cinco piezas. Una pared o tu propio cuerpo ponen fin a la partida."`, `cat: "ARCADE"`, `cover: "cover-snake"` (clase que ya existe en `app/globals.css`), `color: "green"`, `best: 1200`, `plays: "12.1K"` (valores mock del catálogo, no se usan para el ranking real), `engine: "snake"`.
  - `GamePlayer` monta `SnakePlayer` cuando `game.engine === "snake"`.
  - `CATEGORIES` no cambia: el juego aparece bajo `TODOS`.
- **Leaderboard:** migración `supabase/migrations/20261106180000_game_serpiente.sql` con la fila `serpiente` en `public.games`, aplicada con el MCP de Supabase, y tipos regenerados. Con eso `submitScore`, `/games/serpiente` y `/salon` incluyen SERPIENTE sin cambios de código.

**Fuera de alcance (para futuras specs):**

- Controles táctiles o gamepad, y ratón.
- Sonido y música (no hay assets de audio; por eso no se toca `proxy.ts`).
- Mecánicas extra: frutas especiales o con valores distintos por tipo, varias frutas a la vez, obstáculos, paredes que atraviesan (wrap), vidas, modos de juego, movimiento interpolado y animación de muerte o de comer.
- Mostrar en el HUD la fruta actual o la última comida.
- Chip `ARCADE` en el filtro de la biblioteca (`CATEGORIES`).
- `best` y `plays` del catálogo, la actividad de la Home y las etiquetas fijas de `/games/serpiente`.
- Interfaz `GameEngine` compartida y refactor de ROCAS, BLOCKFALL o RUPTURA.
- Ampliar `GameOverModal` con un mensaje de victoria.
- Anti-trampas y tests automatizados.

## Modelo de datos

Fila nueva en Supabase:

```sql
-- supabase/migrations/20261106180000_game_serpiente.sql
-- SPEC 09: SERPIENTE gets a real engine, so it joins the games catalogue and can receive scores.

insert into public.games (id, title) values ('serpiente', 'SERPIENTE');
```

Tipos nuevos:

```ts
// lib/games.ts (cambio)
export type GameEngine = "asteroids" | "blockfall" | "breakout" | "snake";

// games/snake/sprites.ts
export type FruitKey =
  | "banana"
  | "orange"
  | "grape"
  | "garlic"
  | "eggplant"
  | "strawberry"
  | "cherry"
  | "carrot"
  | "mushroom"
  | "broccoli"
  | "watermelon"
  | "pepper"
  | "kiwi"
  | "lemon"
  | "peach"
  | "peanut"
  | "apple"
  | "tomato"
  | "berries"
  | "grapes2"
  | "pineapple"
  | "melon"; // 22, como en sprites.js
export type SpriteRect = { x: number; y: number; w: number; h: number };
export const FRUIT_ATLAS: Record<FruitKey, SpriteRect>; // mismas coordenadas que sprites.js
export const FRUIT_KEYS: FruitKey[]; // las 22 claves, para elegir al azar

// games/snake/entities.ts
export type Cell = { c: number; r: number };
export type Dir = "up" | "down" | "left" | "right";

// games/snake/engine.ts
export type SnakeCallbacks = {
  onScore: (score: number) => void;
  onLength: (length: number) => void; // 3 al empezar, hasta 300
  onLevel: (level: number) => void; // 1..10
  onPauseChange: (paused: boolean) => void; // también cuando la pausa es automática (blur/visibilidad)
  onStart: () => void; // la partida pasa de "ready" a "playing"
  onGameOver: (score: number) => void; // choque o tablero lleno
};

export type SnakeState = "ready" | "playing" | "paused" | "gameover";

export type SnakeGame = {
  start: () => void; // ready -> playing (clic en el overlay de inicio); ignorada en otro estado
  pause: () => void;
  resume: () => void;
  end: () => void; // botón FIN: pasa a gameover sin llamar a onGameOver
  restart: () => void; // nueva partida directamente en "playing"
  destroy: () => void; // cancela el rAF y quita todos los listeners
};

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks,
): SnakeGame;
```

Convenciones:

- Coordenadas lógicas con origen arriba a la izquierda; la lógica del juego va en celdas `(c, r)`; `dt` en segundos y pasos en milisegundos.
- `games/snake/` contiene solo TypeScript del motor, sin `react`, `next/*` ni `@/lib/*`. El motor no conoce el catálogo, `localStorage` ni el usuario.
- El player vive en `components/snake-player.tsx` y copia la estructura de `components/asteroids-player.tsx` y `components/breakout-player.tsx`.
- Los callbacks solo se llaman cuando cambia el valor, nunca en cada frame.
- Puntuación entera entre 0 y 10.000.000.

## Plan de implementación

Antes del paso 1 se consultan las guías de Client Components y de `useEffect`/refs en `node_modules/next/dist/docs/`. La UI (overlays, colores del canvas, stats del HUD) se diseña con `/frontend-design`, según `CLAUDE.md`.

1. Migración `supabase/migrations/20261106180000_game_serpiente.sql`, aplicada con el MCP de Supabase (`apply_migration`; si no conecta, desde el SQL Editor), y tipos regenerados en `lib/supabase/database.types.ts`. Va primero porque la fila es inocua sin el juego; al revés, habría un juego con pestaña en `/salon` cuyo guardado falla por la FK. Verificación: `select * from public.games` incluye `serpiente`.
2. Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png` y crear `games/snake/sprites.ts` con las 22 entradas de `FRUIT_ATLAS` y `FRUIT_KEYS`. Verificación: `npx tsc --noEmit`, `http://localhost:3000/games/snake/fruits.png` responde 200 y un chequeo puntual de que `FRUIT_KEYS` tiene 22 claves y que cada recorte cabe en 3790×442.
3. `games/snake/entities.ts`: constantes, tipos, paleta `COLORS` y funciones de dibujo con `ctx` por parámetro (fondo con rejilla, serpiente con glow solo en la cabeza y ojos, fruta con sprite y respaldo vectorial). Verificación: `npx tsc --noEmit`.
4. `games/snake/engine.ts` con `createSnakeGame`: estado en closure, máquina `SnakeState`, bucle rAF con `dt` limitado a 50 ms y acumulador de pasos, buffer de giros, colisiones (pared, cuerpo con excepción de la cola, fruta), generación de fruta en celda libre sin repetir tipo, victoria por tablero lleno, carga de la imagen dentro del motor, teclado, pausa (P/Esc, `blur`, `visibilitychange`), `clearKeys()`, DPR + `resize`, fondo con la serpiente y la fruta en `ready`, `emit()` con `sent`, `destroy()`. Sin HUD ni overlays en canvas. Verificación: `npx tsc --noEmit` y `npm run lint`.
5. `lib/games.ts`: unión `GameEngine` y entrada nueva `serpiente` con `cover: "cover-snake"`. Verificación: `npx tsc --noEmit` y `/games/serpiente` muestra la ficha con la portada de la serpiente.
6. `components/snake-player.tsx`: marco `.av-player`/`.player-hud`/`.crt`/`.crt-screen`/`.crt-bottom`, canvas, HUD con Jugador, Puntuación, Longitud y Nivel, overlay de inicio (leyenda con `←` `↑` `↓` `→`/`WASD`, `ESPACIO`, `P`; aviso táctil `ESTE JUEGO NECESITA TECLADO`), overlay `EN PAUSA`, botones PAUSA/FIN/SALIR con `releaseFocus`, `GameOverModal key={run}` con `ranked`, y cleanup con `destroy()` y reset del estado de React. Verificación: `npx tsc --noEmit`.
7. Rama en `components/game-player.tsx`: `if (game.engine === "snake") return <SnakePlayer game={game} />;`. Verificación: `/games/serpiente/jugar` muestra el juego real y ROCAS, BLOCKFALL y RUPTURA siguen igual.
8. Pasada de diseño con `/frontend-design` a 1280 px y 390 px (colores, glow, escala de los sprites, overlays, stats del HUD).
9. Verificación en el navegador (Playwright o manual) recorriendo los criterios, y después `npm run lint` y `npm run build` (con y sin `.env.local`).

## Criterios de aceptación

- [ ] Existen `games/snake/sprites.ts`, `games/snake/entities.ts`, `games/snake/engine.ts`, `components/snake-player.tsx`, `public/games/snake/fruits.png` y `supabase/migrations/20261106180000_game_serpiente.sql`.
- [ ] Ningún archivo de `games/snake/` importa `react`, `next/*` ni `@/lib/*`, ni usa `new Audio`; `new Image` solo aparece dentro de `createSnakeGame`.
- [ ] Ningún archivo de la app importa nada de `references/`, y `fruits.png` se sirve desde `/games/snake/fruits.png`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores, también sin `.env.local`.
- [ ] `/games/serpiente/jugar` muestra el canvas dentro de la CRT con el tablero de 20×15 celdas, la serpiente de 3 segmentos en el centro mirando a la derecha, una fruta con su sprite y el overlay `PULSA ESPACIO PARA EMPEZAR` con los controles.
- [ ] La partida empieza con `Space`, `Enter` o un clic en la pantalla, y las flechas no la empiezan.
- [ ] `ArrowUp/Down/Left/Right` y `W/A/S/D` giran la serpiente y ninguna (ni `Space`) hace scroll en la página.
- [ ] La serpiente avanza una celda cada 125 ms al empezar (8 celdas/s) y no se puede girar 180°: pulsar la dirección contraria no hace nada. Dos giros pulsados entre dos pasos se aplican en pasos consecutivos y un tercero se descarta.
- [ ] Comer una fruta suma 10 puntos y 1 segmento; la Puntuación y la Longitud del HUD de React se actualizan al instante. Siempre hay exactamente una fruta en el tablero, en una celda libre, y nunca del mismo tipo que la anterior.
- [ ] Tras 5 frutas el Nivel pasa de `01` a `02` y los pasos pasan a 8,5 celdas/s; con 45 frutas el Nivel marca `10` y no sube más; la velocidad sigue subiendo hasta 16 celdas/s con 80 frutas y no pasa de ahí.
- [ ] Chocar con cualquier borde o con el propio cuerpo termina la partida. Entrar en la celda que acaba de dejar la cola (sin comer en ese paso) no termina la partida.
- [ ] Llenar las 300 celdas (297 frutas) termina la partida con victoria: se abre `GameOverModal` con la puntuación real (2.970) y se puede guardar.
- [ ] Las frutas se dibujan con los recortes de `fruits.png`, centradas en su celda y de 36 px de alto, sin salirse de la celda. Con `fruits.png` inaccesible (p. ej. bloqueada en la pestaña Red) la partida sigue con un círculo vectorial como fruta y sin errores no capturados en consola.
- [ ] El canvas no dibuja ningún HUD propio (puntuación, longitud, nivel) ni overlays de inicio, pausa o game over.
- [ ] El botón PAUSA, la tecla `P` y `Escape` pausan y reanudan. En pausa no se mueve nada y se ve el overlay `EN PAUSA`. Cambiar de pestaña o sacar el foco de la ventana pausa la partida y, al reanudar, la serpiente continúa sin avanzar varias celdas de golpe.
- [ ] Al chocar se abre `GameOverModal` con la puntuación real, con el tablero visible detrás.
- [ ] FIN detiene la partida y abre el modal con la puntuación actual, también si estaba en pausa, sin que quede el overlay `EN PAUSA`.
- [ ] La puntuación del modal y la fila guardada coinciden con los puntos reales de la partida, incluidos los 10 de la última fruta comida.
- [ ] Se pueden escribir las iniciales en el modal (incluida `P`, `W`, `A`, `S` y `D`) sin que el motor reaccione.
- [ ] GUARDAR PUNTUACIÓN muestra `GUARDANDO…` y luego `▸ PUNTUACIÓN GUARDADA_`, y aparece una fila en `scores` con `game_id = 'serpiente'`.
- [ ] Tras guardar, `/games/serpiente` muestra la puntuación en su leaderboard y "Mejor global" es la primera fila (o `—` sin puntuaciones).
- [ ] `/salon` tiene una pestaña `SERPIENTE` con sus marcas, y la marca también aparece en GLOBAL.
- [ ] JUGAR DE NUEVO empieza una partida nueva con 3 segmentos, 0 puntos, Nivel `01` y velocidad de 8 celdas/s.
- [ ] Navegar fuera con SALIR o con la Nav detiene el bucle y quita los listeners: las flechas y Espacio vuelven a hacer scroll y no hay errores en consola.
- [ ] En desarrollo (Strict Mode) solo corre un bucle: la serpiente no va al doble de velocidad.
- [ ] El canvas y los sprites se ven nítidos con `devicePixelRatio` 2, siguen nítidos tras redimensionar la ventana y se adaptan a 390 px sin scroll horizontal.
- [ ] Con puntero táctil el overlay de inicio muestra `ESTE JUEGO NECESITA TECLADO`.
- [ ] La entrada `serpiente` aparece en `/games` bajo `TODOS` con la portada `cover-snake`, y ROCAS, BLOCKFALL, RUPTURA y sus rankings siguen funcionando igual.
- [ ] No hay errores ni avisos de hidratación en `/games/serpiente` y `/games/serpiente/jugar`.

## Decisiones

- **Sí:** entrada nueva `serpiente` / `SERPIENTE` con motor `snake`. El catálogo no tiene ninguna entrada de serpiente que reutilizar y el título es propio, no el de un juego comercial.
- **Sí:** reutilizar `cover-snake`, que ya existe en `app/globals.css` y encaja con el juego, y `cat: "ARCADE"`. **No:** añadir un chip `ARCADE` a `CATEGORIES`; se queda fuera de alcance.
- **Sí:** juego original del género, con la tabla de valores de esta spec como única fuente de verdad. No hay original contra el que verificar.
- **Sí:** rejilla 20×15 de celdas de 40 px sobre 800×600. Encaja exacta en la CRT 4:3, sin bandas, y los sprites escalan bien a 36 px. **No:** 25×19 de 32 px (600/32 no es entero, exigiría márgenes) ni 16×12 de 50 px.
- **Sí:** paredes mortales y sin vidas, para que la partida sea de una sola vida y la puntuación sea comparable. **No:** paredes que atraviesan (wrap).
- **Sí:** +10 por fruta con aceleración de +0,5 celdas/s cada 5 frutas hasta 16. **No:** puntos distintos por tipo de fruta: las 22 son un cambio visual, no mecánico.
- **Sí:** victoria al llenar el tablero, con el mismo `GameOverModal` (`FIN DEL JUEGO`). **No:** ampliar el modal con un mensaje de victoria.
- **Sí:** buffer de 2 giros y bloqueo del giro 180°. Evita muertes injustas por pulsar dos teclas seguidas.
- **Sí:** teclado con flechas y WASD, sin ratón. **No:** controles táctiles.
- **Sí:** sprites del usuario en `public/games/snake/fruits.png`, con atlas TS propio y respaldo vectorial; la serpiente es vectorial neón. **No:** importar de `references/` ni cargar `sprites.js` (usa el global `window`).
- **Sí:** sin sonido. Coherente con los demás juegos, sin assets de audio y sin tocar `proxy.ts`.
- **Sí:** HUD con Longitud y Nivel. **No:** stat de la fruta actual (más UI sin aportar a la mecánica).
- **Sí:** contrato de motor documentado (`start`/`pause`/`resume`/`end`/`restart`/`destroy` + callbacks), sin interfaz compartida ni refactor de ROCAS, BLOCKFALL ni RUPTURA.
- **Sí:** la fila en `public.games` va en una migración versionada. Sin ella el insert de `scores` falla por la FK.

## Riesgos

| Riesgo                                                                            | Mitigación                                                                                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode o `<Activity>` dejan bucles o listeners duplicados                    | Motor creado en `useLayoutEffect`, `destroy()` en el cleanup y reset del estado de React.                                                         |
| Las teclas del juego interfieren con el input del modal (`W`, `A`, `S`, `D`, `P`) | Sin `preventDefault` con foco en campos y entrada ignorada en `gameover`; criterio que escribe esas letras.                                       |
| `dt` enorme al volver de otra pestaña                                             | Pausa automática, `dt` y acumulador reiniciados al reanudar y tope de 50 ms.                                                                      |
| Falta la fila en `public.games`                                                   | Migración como primer paso y criterio que comprueba el guardado. El modal muestra el error.                                                       |
| El modal guarda una puntuación vieja                                              | `emit()` antes de `onGameOver` y en `end()`, con un criterio que lo comprueba.                                                                    |
| `fruits.png` no carga o tarda (585 KB)                                            | Guarda `img.complete && img.naturalWidth > 0`, respaldo vectorial y criterio con la imagen bloqueada.                                             |
| Coordenadas del atlas mal transcritas y sprites cortados o con fruta vecina       | Paso 2 verifica que cada recorte cabe en la hoja y la pasada de diseño revisa las 22 a la vista.                                                  |
| Giro 180° o dos giros rápidos matan a la serpiente                                | Buffer de 2 giros que descarta la dirección contraria a la última encolada; criterio específico.                                                  |
| Elegir celda libre cuando el tablero está casi lleno                              | Se elige al azar entre la lista de celdas libres (no por reintentos); si está vacía → victoria.                                                   |
| Licencia de los sprites (origen declarado: web de sprites de terceros)            | Los aporta el usuario y la responsabilidad es suya; si hiciera falta, se sustituyen por trazo vectorial sin cambiar el motor gracias al respaldo. |
| `ARCADE` no es un chip del filtro de la biblioteca                                | Aparece bajo `TODOS`; criterio que lo verifica. El chip se añade en otra spec.                                                                    |
| Otra página que muestre rankings se precarga y enseña datos viejos tras guardar   | Se mantiene el `prefetch = "force-disabled"` de `/games/[id]` y `/salon` (SPEC 08); no se toca en esta spec.                                      |
| Un juego nuevo no encaja en los textos fijos de `/games/[id]`                     | Etiquetas fijas fuera de alcance; se revisan en la pasada de diseño sin cambiar su contenido.                                                     |

## Lo que **no** está en esta spec

- Controles táctiles, gamepad y ratón.
- Sonido y música.
- Mecánicas nuevas: frutas especiales o con distinto valor, varias frutas, obstáculos, wrap, vidas, modos de juego, animaciones de muerte o de comer.
- Mostrar la fruta actual en el HUD.
- Filtro `ARCADE` en la biblioteca.
- Mensaje de victoria propio en `GameOverModal`.
- `best` y `plays` del catálogo, la actividad de la Home y las etiquetas fijas de `/games/serpiente`.
- Interfaz `GameEngine` compartida y refactor de ROCAS, BLOCKFALL o RUPTURA.
- Anti-trampas y tests automatizados.

Cada uno de esos, si llega, va en su propia spec.

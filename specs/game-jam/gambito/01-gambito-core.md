# SPEC GJ — Juego real de puzzle por turnos (GAMBITO)

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-07
> **Objetivo:** Crear un puzzle original por turnos sobre un tablero que se derrumba, como motor TypeScript en `/games/gambito/jugar`, con HUD de React y puntuaciones en el leaderboard de Supabase.

## Por qué existe esta spec

Hoy el catálogo (`lib/games.ts`) tiene cuatro juegos reales: BLOCKFALL, ROCAS, RUPTURA y SERPIENTE. Los cuatro se juegan en tiempo real, y ninguno se decide turno a turno.
No hay entrada simulada que reutilizar ni un juego original que portar. Es un diseño nuevo a partir del tema «recorrido por turnos sobre tablero que se derrumba», con la sugerencia GS-007 como idea de partida, así que **esta spec es la única fuente de verdad** y fija todas las reglas y valores.
Esta spec convierte ese diseño en un juego real más de la plataforma, como entrada nueva **GAMBITO** (`id: "gambito"`), siguiendo el contrato de motor, player y catálogo de SPEC 05 y el ranking de SPEC 06.

## Alcance

**Dentro:**

- **Motor creado en TypeScript** en `games/gambit/`, en la raíz del repo:
  - `games/gambit/tiles.ts`: `TileId`, `TILES` (desplazamientos de los seis patrones) y `shuffle`.
  - `games/gambit/board.ts`: constantes de reglas (`COLS`, `ROWS`, `MIN_VALUE`, `MAX_VALUE`, `MAX_MULTIPLIER`, `EXIT_BONUS`, `BASE_REQUIRED`, `REQUIRED_STEP`, `MAX_REQUIRED`, `COLLAPSED_STEP`, `MAX_COLLAPSED`, `MIN_EXIT_DISTANCE`, `ROUTE_ATTEMPTS`, `MAX_SCORE`), tipos `Pos`, `Square`, `Board`, `SectorLayout` y funciones puras `requiredFor`, `collapsedFor`, `generateSector` y `legalTargets`.
  - `games/gambit/entities.ts`: constantes de composición (`W`, `H`, `CELL`, `BOARD_X`, `BOARD_Y`, `PANEL_X`, `PANEL_W`, `SLOT_H`, `SLOT_GAP`, `DISCARD_Y`, `DISCARD_H`, `MINI_CELL`, `COLLAPSE_MS`, `PULSE_MS`, `STUCK_MS`), paleta `COLORS` y funciones de dibujo que reciben el `CanvasRenderingContext2D` por parámetro (`drawBackground`, `drawBoard`, `drawTargets`, `drawPiece`, `drawCursor`, `drawCollapse`, `drawPanel`).
  - `games/gambit/engine.ts`: `createGambitGame(canvas, callbacks)` con el estado en un closure y un controlador con `start`, `pause`, `resume`, `end`, `restart` y `destroy`.
- **Mecánica fijada aquí** (valores decididos por el agente `game-jam`, pendientes de la revisión del usuario):

  | Concepto                | Valor                                                                                                                           |
  | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
  | Área lógica             | **800×600** px                                                                                                                  |
  | Tablero                 | **8×8** celdas de **68 px** (`CELL = 68`), 544×544 px, con origen `BOARD_X = 28`, `BOARD_Y = 28`; ocupa `x` 28–572 e `y` 28–572 |
  | Panel lateral           | `PANEL_X = 600`, `PANEL_W = 172`; ocupa `x` 600–772                                                                             |
  | Ranuras de ficha        | **3**, de 172×136 px (`SLOT_H = 136`), separadas 14 px (`SLOT_GAP = 14`): `y` 28–164, 178–314 y 328–464                         |
  | Botón de descarte       | Dentro del panel, 172×94 px: `y` 478–572 (`DISCARD_Y = 478`, `DISCARD_H = 94`)                                                  |
  | Fichas                  | **6 únicas**: `orth1`, `diag1`, `orth2`, `diag2`, `orth3`, `knight`; **3 en mano**, sin repetirse nunca                         |
  | Valores de casilla      | Enteros de **1 a 9**, con un reparto equilibrado (ver reglas de detalle)                                                        |
  | Multiplicador de cadena | De **x1 a x5** (`MAX_MULTIPLIER = 5`); sube 1 si el valor es ≥ que el anterior y vuelve a x1 si es menor                        |
  | Puntos por casilla      | `valor × multiplicador × sector`, con el multiplicador ya actualizado                                                           |
  | Casillas para abrir     | `requiredFor(n) = min(30, 12 + 2·(n − 1))`; **12** en el sector 1 y tope de **30** desde el sector 10 (`MAX_REQUIRED = 30`)     |
  | Derrumbadas de inicio   | `collapsedFor(n) = min(20, 2·(n − 1))`; **0** en el sector 1 y tope de **20** desde el sector 11 (`MAX_COLLAPSED = 20`)         |
  | Bonus de salida         | `100 × sector`, **×2 si no se usó el descarte** en ese sector (`EXIT_BONUS = 100`)                                              |
  | Descarte                | **1 por sector**: cambia las 3 fichas de la mano por las otras 3 y devuelve el multiplicador a x1                               |
  | Vidas y reloj           | Sin vidas y sin límite de tiempo                                                                                                |
  | Derrota                 | Ninguna de las 3 fichas tiene salto legal y el descarte del sector ya está usado                                                |
  | Victoria                | No existe: la partida no tiene final por las reglas                                                                             |
  | Pausa visual de derrota | **800 ms** en estado `stuck` antes de abrir el modal (`STUCK_MS = 800`)                                                         |
  | Animación de derrumbe   | **250 ms**, solo visual y sin bloquear la entrada (`COLLAPSE_MS = 250`)                                                         |
  | Pulso de salida y botón | Periodo de **1.200 ms** (`PULSE_MS = 1200`)                                                                                     |
  | Tope de puntuación      | `MAX_SCORE = 10_000_000`                                                                                                        |

  **Patrones de salto** (`dc`, `dr`; cada ficha salta exactamente esa distancia y pasa por encima de lo que haya en medio):

  | Ficha    | Salto                | Desplazamientos        |
  | -------- | -------------------- | ---------------------- |
  | `orth1`  | 1 casilla ortogonal  | `(±1, 0)`, `(0, ±1)`   |
  | `diag1`  | 1 casilla diagonal   | `(±1, ±1)`             |
  | `orth2`  | 2 casillas ortogonal | `(±2, 0)`, `(0, ±2)`   |
  | `diag2`  | 2 casillas diagonal  | `(±2, ±2)`             |
  | `orth3`  | 3 casillas ortogonal | `(±3, 0)`, `(0, ±3)`   |
  | `knight` | Salto en L           | `(±1, ±2)`, `(±2, ±1)` |

  **Progresión por sector:**

  | Sector   | Derrumbadas | Casillas para abrir | Casillas con valor |
  | -------- | ----------- | ------------------- | ------------------ |
  | 1        | 0           | 12                  | 62                 |
  | 2        | 2           | 14                  | 60                 |
  | 5        | 8           | 20                  | 54                 |
  | 10       | 18          | 30                  | 44                 |
  | 11 o más | 20          | 30                  | 42                 |

  Reglas de detalle:
  - **Coordenadas:** `board[r][c]`, con origen arriba a la izquierda. La celda `(c, r)` ocupa `x = 28 + c·68`, `y = 28 + r·68`.
  - **Salto legal:** el destino está dentro del tablero, coincide con un desplazamiento de la ficha, no está derrumbado y no es la salida mientras esté cerrada. Las casillas intermedias no importan: se puede saltar por encima de huecos y de la salida cerrada.
  - **Las jugadas se resuelven en el evento de entrada, no en el bucle.** El bucle solo avanza animaciones y el temporizador de `stuck`, y luego dibuja. El orden de cada frame es: animaciones, temporizador de `stuck`, dibujo.
  - **Orden de un salto a una casilla con valor:**
    1. La casilla abandonada pasa a `collapsed` y se lanza su animación de derrumbe.
    2. La ficha pasa a la casilla destino.
    3. Si `valor ≥ lastValue`, `multiplier = min(5, multiplier + 1)`; si no, `multiplier = 1`.
    4. `score = min(MAX_SCORE, score + valor × multiplier × sector)`.
    5. `lastValue = valor` y `collected + 1`.
    6. Si `collected ≥ required`, la salida queda abierta y sigue abierta hasta el final del sector.
    7. Se repone la ficha usada en su misma ranura y `selected = null`.
    8. El cursor pasa a la casilla de la ficha y se llama a `emit()`.
    9. Se comprueba el callejón sin salida.
  - **Orden de un salto a la salida abierta:**
    1. La casilla abandonada se derrumba.
    2. `score = min(MAX_SCORE, score + bonus)`, donde `bonus = 100 × sector × (discardUsed ? 1 : 2)`.
    3. Se repone la ficha usada y `selected = null`.
    4. `sector + 1` y se genera el sector nuevo con la mano ya repuesta.
    5. `multiplier = 1`, `lastValue = 0`, `collected = 0`, `discardUsed = false` y se vacía la lista de animaciones.
    6. El cursor pasa a la casilla inicial y se llama a `emit()`. La salida no da puntos por valor ni cuenta como casilla recogida.
  - **Primer salto de un sector:** `lastValue = 0`, así que cualquier valor sube el multiplicador y el primer salto puntúa siempre a x2. Con un 3 en el sector 1 suma 3 × 2 × 1 = 6.
  - **Ejemplo de cadena en el sector 1:** caer en 3, 5 y 2 suma 6 (x2), 15 (x3) y 2 (x1). En el sector 2, un 9 a x5 suma 9 × 5 × 2 = 90.
  - **Casillas sin valor:** la casilla inicial es `empty`, no da puntos ni cuenta como recogida. La salida es `exit` y nunca se derrumba.
  - **Empates:** caer en un valor igual al anterior cuenta como «igual o mayor» y sube el multiplicador.
  - **Bolsa de fichas:** son seis fichas físicas repartidas en `hand` (3), `bag` y `used`, y entre las tres suman siempre 6. Al empezar una partida se barajan: 3 van a `hand` y 3 a `bag`. Al jugar una ficha, va a `used`; si `bag` está vacía, `bag = shuffle(used)` y `used = []`; después se saca una de `bag` para la misma ranura. Por eso la ficha recién jugada puede volver si la bolsa se acaba de rebarajar. La bolsa y la mano se conservan al cambiar de sector.
  - **Descarte (`D` o clic en el botón):** solo actúa en `playing` y con `discardUsed = false`. La mano nueva son las otras 3 fichas (`bag` ∪ `used`) en orden aleatorio, `used` pasa a ser la mano antigua y `bag` queda vacía. Después, `multiplier = 1`, `discardUsed = true` y `selected = null`. `lastValue` no cambia. Se llama a `emit()` y se comprueba el callejón sin salida. Se puede usar aunque haya saltos legales.
  - **Selección y cursor:** `selected` es la ranura elegida (0, 1, 2 o `null`). Elegir otra ranura la sustituye y elegir la misma no hace nada. Se puede seleccionar una ficha sin saltos legales; no resalta ninguna casilla. Los destinos solo se resaltan con una ficha seleccionada. Sin selección, `Space` y el clic en el tablero no hacen nada. Confirmar sobre una casilla no legal tampoco hace nada ni penaliza. Las flechas mueven el cursor una celda, se detienen en los bordes sin dar la vuelta y pueden pasar por cualquier celda. El ratón mueve el cursor mientras está sobre el tablero; fuera del tablero, el cursor no cambia.
  - **Callejón sin salida:** tras cada salto y cada descarte, si ninguna de las 3 fichas tiene salto legal:
    - Con `discardUsed = false`, la partida sigue en `playing` y el botón de descarte pulsa con `PULSE_MS`. El jugador debe descartar o pulsar FIN.
    - Con `discardUsed = true`, el motor pasa a `stuck`, ignora la entrada de juego, dibuja la ficha en rojo y, tras `STUCK_MS`, llama a `emit()`, pasa a `gameover` y llama a `onGameOver(score)`. `P` y `Escape` pueden pausar `stuck`, y el temporizador se detiene en la pausa.
    - Tras un salto a la salida nunca hay callejón, porque el sector nuevo garantiza un salto.
  - **Generación de un sector con número `n` y la mano actual:**
    1. `required = requiredFor(n)` y `L = required + 2`.
    2. La casilla inicial es una celda aleatoria del perímetro (`r` o `c` igual a 0 o 7).
    3. **Ruta testigo:** se intenta una ruta de `L` celdas sin repetir, desde la casilla inicial. Cada paso elige al azar entre los destinos no visitados de los seis patrones, sin mirar la mano. El intento falla si se atasca o si la última celda queda a distancia Chebyshev menor de 4 de la inicial (`MIN_EXIT_DISTANCE = 4`). Hay hasta 200 intentos (`ROUTE_ATTEMPTS = 200`).
    4. **Respaldo:** si los 200 fallan, la casilla inicial pasa a ser `(0, 0)` y la ruta son las primeras `L` celdas en zigzag: fila 0 de izquierda a derecha, fila 1 de derecha a izquierda, y así sucesivamente. Solo usa saltos `orth1`, cabe siempre (`L ≤ 32`, cuatro filas) y es el único caso en que se admite una salida a menos de 4 celdas.
    5. La última celda de la ruta es la salida.
    6. **Primer salto garantizado:** se reúnen los destinos de las 3 fichas de la mano desde la casilla inicial, sin contar la salida. Si ninguno está en la ruta, se protege uno al azar. Siempre hay candidatos: desde una esquina, tres fichas distintas suman como mínimo 4 destinos distintos (`diag1` 1, `diag2` 1 y cualquier otra 2), y solo uno puede ser la salida.
    7. **Derrumbadas:** se eligen `collapsedFor(n)` celdas al azar entre las no protegidas. Hay como máximo 33 protegidas (32 de la ruta y 1 destino), así que quedan al menos 31 candidatas para un máximo de 20.
    8. **Valores:** las `N = 62 − collapsedFor(n)` celdas restantes reciben `floor(N / 9)` series completas de 1 a 9, más `N mod 9` valores distintos elegidos al azar de esa serie, todo barajado. Dos valores cualesquiera difieren como máximo en 1 en número de apariciones.
  - **Qué garantiza la generación:** al empezar cada sector existe al menos un salto legal con la mano actual y existe una ruta que abre y alcanza la salida usando los seis patrones. **No** garantiza que las fichas que salgan permitan recorrerla: la partida puede terminar antes de abrir la salida, y esa es la derrota normal.
  - **Puntuación máxima:** el juego no tiene máximo por reglas, porque los sectores no tienen fin. Una cota superior holgada del sector `n` es `(62 − collapsedFor(n)) × 45n + 200n`: 2.990 en el sector 1, 22.990 en el sector 11 y `2.090·n` desde ahí. Hasta el sector 10 suma 134.750 y hasta el 97 suma 9.953.570. Por tanto, el tope de 10.000.000 no se alcanza antes del sector 98. Si se alcanza, la puntuación se queda en el tope y la partida sigue.
  - **Una sola derrota:** `onGameOver(score)` se llama una vez por partida y nunca tras `end()`.

- **Reglas del motor** (contrato de plataforma, fijadas aquí por escrito):
  - **Estado en un closure:** todo el estado vive dentro de `createGambitGame`. No hay estado global.
  - **Sin navegador en el módulo:** `window`, `document`, `requestAnimationFrame` y `devicePixelRatio` solo se usan dentro de `createGambitGame`. No hay `new Audio` ni `new Image` en ningún archivo de `games/gambit/`.
  - **Bucle:** `requestAnimationFrame` con `dt` limitado a 50 ms, en estados `ready`, `playing` y `stuck`. En `paused` y `gameover` se dibuja un último frame y se hace `cancelAnimationFrame`. Al empezar, reanudar o reiniciar, el `dt` se pone a 0.
  - **Emisión de valores:** un objeto `sent` con los últimos valores enviados a React (iniciado en `-1`) y una función `emit()` que llama a `onScore`, `onSector`, `onMultiplier`, `onCollected` y `onRequired` solo si el valor cambió.
  - **`emit()` va antes de `onGameOver(score)` y dentro de `end()`.** El modal usa la puntuación del estado de React, no el argumento de `onGameOver`; sin esto, los puntos del último salto no llegan y se guarda una puntuación vieja.
  - **Pausa:** `P`, `Escape`, `pause()`, `blur` de la ventana y `visibilitychange` a oculto pausan desde `playing` o `stuck`. `pausedFrom` recuerda el estado de origen y `resume()` vuelve a él. `end()` y `restart()` estando en pausa llaman a `onPauseChange(false)`, para que el overlay `EN PAUSA` no se quede debajo del modal.
  - **Teclas sin pegarse:** `held` es un `Set` con las teclas de acción pulsadas. Una tecla de acción (`Space`, `Enter`, `Digit1`–`Digit3`, `Numpad1`–`Numpad3`, `KeyD`, `KeyP`, `Escape`) solo actúa si `e.repeat` es falso y no está en `held`; `keyup` la quita. `clearKeys()` vacía `held` y se llama en `start`, `pause`, `resume`, `end`, `restart` y `blur`. Toda entrada se ignora en `gameover`.
  - **`resize`:** un listener de `window` rehace el backing store (`canvas.width/height` × `devicePixelRatio`), vuelve a aplicar `setTransform` y redibuja en cualquier estado. Se quita en `destroy()`.
  - **Foco:** el motor no reacciona ni llama a `preventDefault` si el foco está en `input`, `textarea`, `button`, `select` o un elemento `contentEditable`.
  - **Puntuación acotada:** siempre un entero entre 0 y `MAX_SCORE = 10_000_000`. Nunca baja dentro de una partida.
- **HUD en React:** el canvas no pinta puntuación, sector, cadena ni progreso de la salida. El `.player-hud` muestra:

  | Stat       | Formato                                                            | Callback                     | Clase                   |
  | ---------- | ------------------------------------------------------------------ | ---------------------------- | ----------------------- |
  | Jugador    | Nombre del usuario o `INVITADO`                                    | Ninguno (`useUser`)          | `.hud-stat`             |
  | Puntuación | `toLocaleString("es-ES")`                                          | `onScore`                    | `.hud-stat`             |
  | Sector     | `01`, `02`…                                                        | `onSector`                   | `.hud-stat.level`       |
  | Cadena     | `x1`…`x5`                                                          | `onMultiplier`               | `.hud-stat.chain` nueva |
  | Salida     | `00/12` mientras `collected < required`; `ABIERTA` a partir de ahí | `onCollected` y `onRequired` | `.hud-stat.length`      |

  `.hud-stat.chain .v` se añade en `app/globals.css` con `color: var(--magenta)` y `text-shadow: 0 0 6px rgba(255,0,110,0.6)`.

- **Panel en el canvas:** las fichas y el botón de descarte son elementos de juego, como la siguiente pieza de BLOCKFALL, no HUD. Cada ranura dibuja su número (1, 2 o 3) arriba a la izquierda y el patrón en una rejilla de 7×7 celdas de 14 px (`MINI_CELL = 14`, 98×98 px), situada a +60 px en `x` y +19 px en `y` dentro de la ranura, con el centro como posición de la ficha. La ranura seleccionada lleva un borde cian de 3 px con glow. Una ficha sin saltos legales se dibuja con `globalAlpha = 0.35`. El botón muestra `D · DESCARTE` si está disponible y `USADO` en gris si ya se usó. Los únicos textos del canvas son los valores de las casillas, los números de ranura y esos dos rótulos del botón, en `monospace` negrita: 28 px para los valores, 22 px para las ranuras, 22 px para el valor dentro de la ficha y 20 px para el botón.
- **Lectura del tablero:** con una ficha seleccionada, cada destino legal lleva relleno de alfa 0,18 y borde de 3 px: verde si mantiene la cadena (`valor ≥ lastValue`) y naranja si la rompe. La salida abierta, si es legal, lleva doble marco verde. La ficha del jugador es un rombo blanco de 26 px de radio con el valor de su casilla dentro (vacío en la casilla inicial), para que el valor que hay que igualar se vea siempre.
- **Pantalla de inicio:** el motor dibuja el sector 1 ya generado, con la ficha y la mano, sin destinos ni cursor. React muestra encima un overlay con el título, los controles y `PULSA ESPACIO PARA EMPEZAR`. La partida empieza con `Space` o `Enter`, o con un clic en la pantalla. Esa pulsación no selecciona ni confirma nada.
- **Pausa:** botón PAUSA/REANUDAR del HUD, `P` o `Escape`, y pausa automática con `blur` de la ventana o `visibilitychange` a oculto. Overlay `EN PAUSA` con `PULSA P O REANUDAR PARA CONTINUAR`. El tablero sigue visible debajo.
- **Fin de partida:** tras `stuck`, el motor hace `emit()`, pasa a `gameover` y llama a `onGameOver(score)` una sola vez. React abre `GameOverModal` con `ranked` y el tablero queda visible detrás. JUGAR DE NUEVO llama a `restart()`: la partida nueva empieza directamente en `playing`, con bolsa nueva, sector 1 nuevo, 0 puntos, x1 y salida `00/12`.
- **Botón FIN:** `end()` detiene la partida sin llamar a `onGameOver`, hace `emit()` y React abre el modal con la puntuación actual. También funciona en pausa y durante `stuck`.
- **Estilo neón:** trazos vectoriales sobre fondo `#0a0a18`. Colores iniciales en `COLORS`, dentro de `games/gambit/entities.ts`:
  - **Tablero:** celda `#12122a`, rejilla `rgba(0,245,255,0.18)`, derrumbada `#050509` con borde `rgba(154,160,180,0.12)`.
  - **Valores:** 1–3 en `#00f5ff`, 4–6 en `#ffe600`, 7–9 en `#ff00e5`.
  - **Ficha:** rombo `#ffffff` con glow `#00f5ff`; rojo `#ff2d55` en `stuck`.
  - **Destinos:** cadena mantenida `#00ff88`, cadena rota `#ff6a00`.
  - **Salida:** cerrada `#9aa0b4` con barras cruzadas, abierta `#00ff88` y pulsando con `PULSE_MS`.
  - **Panel:** fondo `#12122a`, selección `#00f5ff`, botón `#ff00e5`, botón usado `#9aa0b4`.
  - **Cursor:** borde discontinuo blanco de 2 px, 4 px hacia dentro de la celda. Se dibuja solo en `playing`.
  - **Glow:** `shadowBlur` solo en la ficha, la salida abierta y la ranura seleccionada.
  - **Derrumbe:** la casilla encoge y se desvanece en `COLLAPSE_MS`. La pasada de `/frontend-design` puede cambiar colores y tipografía, pero no reglas ni medidas.
- **Canvas nítido y encaje en la CRT 4:3:** resolución lógica **800×600**, que llena la CRT sin bandas. El tablero y el panel caben con márgenes de 28 px: 28 + 544 + 28 + 172 + 28 = 800 en horizontal y 28 + 544 + 28 = 600 en vertical. El canvas ocupa el 100 % de la CRT por CSS y el backing store se multiplica por `devicePixelRatio` con `ctx.setTransform`.
- **Teclado:**
  - `Digit1`–`Digit3` y `Numpad1`–`Numpad3` eligen la ficha.
  - `ArrowUp/Down/Left/Right` mueven el cursor y se repiten al mantenerlas.
  - `Space` confirma el salto al cursor; en `ready`, empieza.
  - `Enter` solo empieza, en `ready`.
  - `KeyD` descarta.
  - `KeyP` y `Escape` pausan y reanudan; en `ready` no hacen nada, y `pause()` también se ignora en ese estado.
  - Elegir ficha, mover el cursor, saltar y descartar solo actúan en `playing`.
  - `preventDefault` solo en esas teclas (en `Enter`, solo en `ready`), nunca en `gameover` y nunca con el foco en un campo de formulario.
- **Ratón:** coordenadas lógicas con `(e.clientX - rect.left) * (800 / rect.width)` y `(e.clientY - rect.top) * (600 / rect.height)`, nunca con `canvas.width`, que con DPR 2 da el doble. `click` en una ranura la selecciona; `click` en el tablero mueve el cursor a esa celda y salta si es un destino legal de la ficha seleccionada; `click` en el botón descarta. `mousemove` mueve el cursor. Solo actúan en `playing`. El overlay de inicio tapa el canvas en `ready`, así que el ratón no actúa hasta empezar. Los listeners están en el canvas y se quitan en `destroy()`.
- **Aviso en pantallas táctiles:** `ESTE JUEGO NECESITA TECLADO O RATÓN` en el overlay de inicio. El juego no se bloquea.
- **Player:** `components/gambit-player.tsx` copia la estructura de `components/asteroids-player.tsx`: `.av-player`, `.player-hud`, `.crt`, `.crt-screen` con `<canvas className="game-canvas">`, `.crt-bottom` con `VECTOR · 800×600` como último texto, `useLayoutEffect` con cleanup que llama a `destroy()` y resetea todo el estado de React, `releaseFocus` en los botones del HUD, PAUSA y FIN con `disabled={phase !== "playing"}`, fase `"ready" | "playing" | "over"` y `<GameOverModal key={run} … ranked onRestart={restart} />`. La leyenda tiene cinco filas: `1` `2` `3` «Elegir ficha, o clic en ella»; `←` `↑` `↓` `→` «Mover cursor»; `ESPACIO` «Saltar, o clic en la casilla»; `D` «Descartar, o clic en su botón»; `P` `ESC` «Pausa». `stuck` no es una fase de React: durante esos 800 ms la fase sigue siendo `playing`.
- **Catálogo:** `GameEngine` pasa a `"asteroids" | "blockfall" | "breakout" | "snake" | "gambit"`, partiendo de la unión vigente. Entrada nueva, al final de `GAMES`:
  - `id: "gambito"`, `title: "GAMBITO"`, `short: "Salta, recoge y no te quedes sin suelo."`, `long: "Cada casilla que abandonas se derrumba para siempre. Elige entre tres fichas de salto, encadena valores cada vez más altos y decide cuándo cruzar la salida hacia un sector más difícil. Sin reloj: solo tú y tu próxima jugada."`, `cat: "PUZZLE"`, `cover: "cover-gambito"`, `color: "cyan"`, `best: 4820`, `plays: "7.3K"` (`best` y `plays` son valores mock del catálogo y no se usan para el ranking real), `engine: "gambit"`.
  - `GamePlayer` (`components/game-player.tsx`) monta `GambitPlayer` cuando `game.engine === "gambit"`.
  - `CATEGORIES` no cambia: `PUZZLE` ya tiene filtro, así que el juego aparece bajo `TODOS` y `PUZZLE`.
- **Portada:** clase nueva `cover-gambito` en `app/globals.css`, junto a las demás `cover-*`, porque ninguna libre encaja (`cover-glot`, `cover-invaders`, `cover-rana` y `cover-duelo` representan otros géneros). Se termina con `/frontend-design` y parte de esta base: fondo `radial-gradient(circle at 50% 45%, #0f1a3a, #0a0a18)`; `::after` con un damero 8×8 cian de `repeating-conic-gradient`, centrado y con tres casillas tapadas del color del fondo como huecos; `::before` con un rombo `◆` blanco con glow cian, situado sobre el damero.
- **Leaderboard:** migración `supabase/migrations/20261107120000_game_gambito.sql` con la fila `gambito` en `public.games`, aplicada con el MCP de Supabase, y tipos regenerados. Con eso `submitScore`, `/games/gambito` y `/salon` incluyen GAMBITO sin cambios de código.

**Fuera de alcance (para futuras specs):**

- Controles táctiles o gamepad.
- Sonido y música.
- Deshacer jugadas, vista previa de la siguiente ficha y mostrar las fichas que no están en la mano.
- Tablero común o semilla diaria para todos los jugadores.
- Casillas especiales, fichas nuevas, potenciadores, más descartes y modos de juego.
- Animación del salto de la ficha, transición entre sectores y puntos flotantes.
- Ampliar `GameOverModal` con un resumen de la partida.
- `best` y `plays` del catálogo, la actividad de la Home y las etiquetas fijas de `/games/gambito` (`TECLADO / TÁCTIL`, `RETRO 1985`, dificultad).
- Interfaz `GameEngine` compartida y refactor de los juegos existentes.
- Anti-trampas y tests automatizados.

## Modelo de datos

Fila nueva en Supabase:

```sql
-- supabase/migrations/20261107120000_game_gambito.sql
-- GAMBITO gets a real engine, so it joins the games catalogue and can receive scores.

insert into public.games (id, title) values ('gambito', 'GAMBITO');
```

Tipos nuevos:

```ts
// lib/games.ts (cambio)
export type GameEngine =
  "asteroids" | "blockfall" | "breakout" | "snake" | "gambit";

// games/gambit/tiles.ts
export type TileId = "orth1" | "diag1" | "orth2" | "diag2" | "orth3" | "knight";
export type Offset = { dc: number; dr: number };
export const TILES: Record<TileId, Offset[]>;
export function shuffle<T>(items: T[]): T[]; // devuelve una copia barajada (Fisher-Yates)

// games/gambit/board.ts
export type Pos = { c: number; r: number };
export type Square =
  | { kind: "empty" } // casilla inicial
  | { kind: "collapsed" }
  | { kind: "exit" }
  | { kind: "value"; value: number }; // 1..9
export type Board = Square[][]; // board[r][c]
export type SectorLayout = {
  board: Board;
  start: Pos;
  exit: Pos;
  required: number;
};
export function requiredFor(sector: number): number;
export function collapsedFor(sector: number): number;
export function generateSector(sector: number, hand: TileId[]): SectorLayout;
export function legalTargets(
  board: Board,
  from: Pos,
  tile: TileId,
  exitOpen: boolean,
): Pos[];

// games/gambit/engine.ts
export type GambitCallbacks = {
  onScore: (score: number) => void;
  onSector: (sector: number) => void;
  onMultiplier: (multiplier: number) => void; // 1..5
  onCollected: (collected: number) => void; // casillas recogidas en este sector
  onRequired: (required: number) => void; // casillas que abren la salida
  onPauseChange: (paused: boolean) => void; // también cuando la pausa es automática (blur/visibilidad)
  onStart: () => void; // la partida pasa de "ready" a "playing"
  onGameOver: (score: number) => void; // sin saltos ni descarte, tras STUCK_MS
};

export type GambitState = "ready" | "playing" | "stuck" | "paused" | "gameover";

export type GambitGame = {
  start: () => void; // ready -> playing (clic en el overlay de inicio); ignorada en otro estado
  pause: () => void;
  resume: () => void;
  end: () => void; // botón FIN: pasa a gameover sin llamar a onGameOver
  restart: () => void; // nueva partida directamente en "playing"
  destroy: () => void; // cancela el rAF y quita todos los listeners
};

export function createGambitGame(
  canvas: HTMLCanvasElement,
  callbacks: GambitCallbacks,
): GambitGame;
```

Convenciones:

- Coordenadas lógicas con origen arriba a la izquierda; la lógica del juego va en celdas `(c, r)`; el `dt` se mide en segundos y las animaciones en milisegundos.
- `games/gambit/` contiene solo TypeScript del motor, sin `react`, `next/*` ni `@/lib/*`. El motor no conoce el catálogo, `localStorage` ni el usuario.
- El player vive en `components/gambit-player.tsx` y copia la estructura de `components/asteroids-player.tsx`.
- Los callbacks solo se llaman cuando cambia el valor, nunca en cada frame.
- Puntuación entera entre 0 y 10.000.000.

## Plan de implementación

Antes del paso 1 se consultan las guías de Client Components y de `useEffect`/refs en `node_modules/next/dist/docs/`. La UI (overlays, colores del canvas, stats del HUD y portada) se diseña con `/frontend-design`, según `CLAUDE.md`.

1. Migración `supabase/migrations/20261107120000_game_gambito.sql`, aplicada con el MCP de Supabase (`apply_migration`; si no conecta, desde el SQL Editor), y tipos regenerados en `lib/supabase/database.types.ts`. Va primero porque la fila es inocua sin el juego; al revés, habría un juego con pestaña en `/salon` cuyo guardado falla por la FK. Verificación: `select * from public.games` incluye `gambito`.
2. `games/gambit/tiles.ts`: `TileId`, `TILES` y `shuffle`. Verificación: `npx tsc --noEmit` y un chequeo puntual temporal de que los seis patrones no comparten desplazamientos.
3. `games/gambit/board.ts`: constantes, tipos, `requiredFor`, `collapsedFor`, `generateSector` con ruta testigo y respaldo, y `legalTargets`. Verificación: `npx tsc --noEmit` y un chequeo puntual temporal, sin dejar archivos en el repo, que genere 1.000 sectores por cada `n` en {1, 2, 10, 11, 50}, y compruebe el número de derrumbadas, que hay al menos un salto legal con la mano, que los valores difieren como máximo en 1 en apariciones y que el respaldo produce un tablero válido al forzarlo.
4. `games/gambit/entities.ts`: constantes de composición, paleta `COLORS` y funciones de dibujo con `ctx` por parámetro. Verificación: `npx tsc --noEmit`.
5. `games/gambit/engine.ts` con `createGambitGame`: estado en closure, máquina `GambitState` con `pausedFrom`, bolsa, selección y cursor, resolución de saltos, descarte, callejón sin salida y `stuck`, cambio de sector, teclado y ratón, pausa (`P`/`Escape`, `blur`, `visibilitychange`), `clearKeys()`, DPR + `resize`, `emit()` con `sent`, y `destroy()`. Sin HUD ni overlays en canvas. Verificación: `npx tsc --noEmit` y `npm run lint`.
6. `components/gambit-player.tsx` y `.hud-stat.chain` en `app/globals.css`: marco, canvas, HUD con Jugador, Puntuación, Sector, Cadena y Salida, overlay de inicio con la leyenda de cinco filas y el aviso táctil, overlay `EN PAUSA`, botones PAUSA/FIN/SALIR con `releaseFocus`, `GameOverModal key={run}` con `ranked`, y cleanup con `destroy()` y reset del estado de React. El componente aún no se monta en ninguna ruta. Verificación: `npx tsc --noEmit`.
7. Catálogo y montaje, juntos para que el juego no aparezca con la simulación: en `lib/games.ts`, unión `GameEngine` y entrada `gambito`; en `app/globals.css`, `cover-gambito`; en `components/game-player.tsx`, `if (game.engine === "gambit") return <GambitPlayer game={game} />;`. Verificación: `/games/gambito` muestra la ficha con su portada, `/games/gambito/jugar` muestra el juego real, y ROCAS, BLOCKFALL, RUPTURA y SERPIENTE siguen igual.
8. Pasada de diseño con `/frontend-design` a 1280 px y 390 px: colores, glow, legibilidad de valores y mini-rejillas, overlay de inicio y portada. Verificación: a 1280 px y 390 px los valores y los patrones se distinguen, la leyenda cabe dentro de la CRT y no hay scroll horizontal.
9. Recorrido en el navegador (Playwright o manual) de los criterios de aceptación. Verificación: todos los criterios se cumplen, y `npm run lint` y `npm run build` pasan con y sin `.env.local`.

## Criterios de aceptación

**Estándar**

- [ ] Existen `games/gambit/tiles.ts`, `games/gambit/board.ts`, `games/gambit/entities.ts`, `games/gambit/engine.ts`, `components/gambit-player.tsx` y `supabase/migrations/20261107120000_game_gambito.sql`.
- [ ] Ningún archivo de `games/gambit/` importa `react`, `next/*` ni `@/lib/*`, ni usa `new Audio` o `new Image`.
- [ ] Ningún archivo de la app importa nada de `references/`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores, también sin `.env.local`.
- [ ] `/games/gambito/jugar` muestra el canvas dentro de la CRT con el sector 1, la ficha, las 3 fichas de movimiento y el overlay `PULSA ESPACIO PARA EMPEZAR` con los controles.
- [ ] La partida empieza con `Space`, `Enter` o un clic en la pantalla, y esa pulsación no selecciona ni confirma nada.
- [ ] Las flechas, `Space`, `1`, `2`, `3` y `D` funcionan y ninguna hace scroll en la página.
- [ ] El HUD de React muestra Jugador, Puntuación, Sector, Cadena y Salida con datos reales y se actualiza al instante. El canvas no dibuja esos datos ni overlays de inicio, pausa o fin de partida.
- [ ] El botón PAUSA, `P` y `Escape` pausan y reanudan, con el overlay `EN PAUSA`. Cambiar de pestaña o sacar el foco pausa, y al volver el estado de la partida es el mismo.
- [ ] Al terminar la partida se abre `GameOverModal` con la puntuación real y el tablero visible detrás. FIN detiene la partida y abre el modal con la puntuación actual, también si estaba en pausa, sin que quede el overlay `EN PAUSA`.
- [ ] La puntuación del modal y la fila guardada coinciden con los puntos reales de la partida, incluidos los del último salto.
- [ ] Se pueden escribir las iniciales en el modal (incluidas `P` y `D`, y los dígitos) sin que el motor reaccione.
- [ ] GUARDAR PUNTUACIÓN muestra `GUARDANDO…` y luego `▸ PUNTUACIÓN GUARDADA_`, y aparece una fila en `scores` con `game_id = 'gambito'`.
- [ ] Tras guardar, `/games/gambito` muestra la puntuación en su leaderboard y "Mejor global" es la primera fila (o `—` sin puntuaciones).
- [ ] `/salon` tiene una pestaña `GAMBITO` con sus marcas, y la marca también aparece en GLOBAL.
- [ ] JUGAR DE NUEVO empieza directamente una partida nueva con Puntuación 0, Sector `01`, Cadena `x1` y Salida `00/12`, sin casillas derrumbadas.
- [ ] Navegar fuera con SALIR o con la Nav detiene el bucle y quita los listeners, incluidos los del ratón: las flechas y Espacio vuelven a hacer scroll y no hay errores en consola.
- [ ] En desarrollo (Strict Mode) solo corre un bucle: la salida abierta completa un pulso en 1.200 ms, no en la mitad.
- [ ] El canvas se ve nítido con `devicePixelRatio` 2, sigue nítido tras redimensionar la ventana y se adapta a 390 px sin scroll horizontal.
- [ ] Con puntero táctil el overlay de inicio muestra `ESTE JUEGO NECESITA TECLADO O RATÓN`.
- [ ] Con `devicePixelRatio` 2 y a 390 px de ancho, el clic selecciona exactamente la ranura o la casilla que hay bajo el cursor.
- [ ] La entrada `gambito` aparece en `/games` bajo `TODOS` y `PUZZLE`, con la portada `cover-gambito`; ROCAS, BLOCKFALL, RUPTURA, SERPIENTE y sus rankings siguen funcionando igual.
- [ ] No hay errores ni avisos de hidratación en `/games/gambito` y `/games/gambito/jugar`.

**Específicos de GAMBITO**

- [ ] El lienzo lógico es de 800×600, el tablero tiene 8×8 celdas de 68 px con origen en `(28, 28)`, y el panel ocupa `x` 600–772 con 3 ranuras de 172×136 y un botón de 172×94 que termina en `y = 572`.
- [ ] La mano siempre tiene 3 fichas distintas de las 6 definidas, y cada una resalta exactamente los destinos de su tabla de desplazamientos.
- [ ] Un salto puede pasar por encima de huecos y de la salida cerrada. Nunca es legal caer en una casilla derrumbada, fuera del tablero o en la salida cerrada.
- [ ] Con una ficha seleccionada, los destinos que mantienen la cadena se ven en verde y los que la rompen en naranja. Sin selección, no hay destinos resaltados, y ni `Space` ni el clic en el tablero mueven la ficha.
- [ ] Confirmar sobre una casilla no legal no cambia ningún valor.
- [ ] Al saltar, la casilla abandonada se derrumba para siempre en 250 ms, la ficha jugada se repone en su ranura y la selección queda vacía.
- [ ] Caer en 3, 5 y 2 al empezar el sector 1 suma 6, 15 y 2 puntos, y la Cadena pasa por `x2`, `x3` y `x1`.
- [ ] Caer en un valor igual al anterior sube la Cadena. La Cadena no pasa de `x5`.
- [ ] Un 9 a `x5` en el sector 2 suma 90 puntos.
- [ ] La salida empieza cerrada y no se puede pisar. Se abre al recoger 12 casillas en el sector 1 y 14 en el sector 2, y el HUD pasa de `11/12` a `ABIERTA`.
- [ ] Con la salida abierta se puede seguir recogiendo casillas y sumando puntos.
- [ ] Cruzar la salida sin descartar en el sector 1 suma 200 puntos y descartando suma 100; en el sector 3 suma 600 y 300.
- [ ] Al cruzar, Sector sube 1, Cadena vuelve a `x1`, Salida se reinicia, las fichas de la mano se conservan salvo la jugada, y el tablero nuevo tiene un descarte disponible.
- [ ] El sector `n` empieza con `min(20, 2·(n − 1))` casillas derrumbadas y pide `min(30, 12 + 2·(n − 1))` casillas: 0 y 12 en el sector 1, 18 y 30 en el 10, y 20 y 30 en el 11 y siguientes.
- [ ] Los valores del tablero van de 1 a 9 y dos valores cualesquiera difieren como máximo en 1 en número de apariciones.
- [ ] Al empezar cualquier sector hay al menos un salto legal con la mano actual.
- [ ] `D` o el clic en el botón cambian las 3 fichas por las otras 3, ponen la Cadena en `x1` y dejan el botón en `USADO`. Un segundo intento en el mismo sector no hace nada.
- [ ] Tras descartar con `lastValue = 7`, caer en 8 da Cadena `x2` y caer en 3 da `x1`.
- [ ] Sin saltos legales y con descarte disponible, la partida no termina, las tres fichas se ven atenuadas y el botón pulsa cada 1.200 ms.
- [ ] Sin saltos legales y sin descarte, la ficha se ve en rojo durante 800 ms y después se abre `GameOverModal` una sola vez. Pulsar FIN en esos 800 ms abre el modal sin llamar a `onGameOver`.
- [ ] Pausar durante esos 800 ms detiene la cuenta, y al reanudar se completa el tiempo que faltaba.
- [ ] La puntuación nunca baja. Con la puntuación en 10.000.000, el motor no la supera y la partida sigue.
- [ ] Mantener `Space`, `1` o `D` actúa una sola vez; mantener una flecha mueve el cursor de forma repetida y lo detiene en el borde.
- [ ] Los únicos textos del canvas son los valores de las casillas, los números de ranura y los rótulos `D · DESCARTE` y `USADO`.

## Decisiones

- **Sí:** definición autónoma por el agente `game-jam` a partir del tema «recorrido por turnos sobre tablero que se derrumba»; los valores están pendientes de la revisión del usuario.
- **Sí:** entrada nueva `gambito` / `GAMBITO` con motor `gambit`. No hay ninguna entrada que reutilizar, y el motor no choca con `GameEngine`.
- **Sí:** `cat: "PUZZLE"`, que ya tiene filtro, y `color: "cyan"`. **No:** ampliar `Category` ni `CATEGORIES`.
- **Sí:** portada nueva `cover-gambito`. Las clases libres representan otros géneros.
- **Sí:** tope de 30 casillas para abrir la salida. La regla de partida sube sin límite: pediría 42 de 42 en el sector 16 y 44 en el 17, cuando solo hay 42 casillas con valor. **No:** dejarla sin tope, porque haría imposible la salida.
- **Sí:** sector 1 sin casillas derrumbadas y 2 más por sector, hasta 20 en el sector 11. Da un primer tablero limpio para aprender. **No:** empezar con 2 en el sector 1.
- **Sí:** ruta testigo protegida al generar, con respaldo en zigzag. Evita los bucles sin fin y garantiza que la salida no quede inalcanzable con los seis patrones. **No:** colocar huecos al azar y comprobar solo la conectividad, porque no asegura un recorrido con suficientes casillas.
- **Sí:** garantizar solo el primer salto con la mano real. **No:** garantizar que el sector se pueda completar con las fichas que salgan, porque obligaría a prever toda la bolsa y quitaría la derrota por mala planificación.
- **Sí:** seis fichas únicas, sin repetirse en la mano. **Sí:** por eso el descarte da exactamente las otras tres, lo que un buen jugador puede calcular. **No:** robar al azar con posibles repetidos, porque el descarte podría dar las mismas fichas.
- **Sí:** el multiplicador se actualiza antes de sumar y el primer salto de cada sector va a x2. La regla es corta y se comprueba con facilidad.
- **Sí:** cruzar la salida devuelve el multiplicador a x1. Cruzar con una cadena alta tiene un coste. **No:** conservar la cadena entre sectores.
- **Sí:** el descarte conserva `lastValue`. El jugador sigue viendo en la ficha el valor que debe igualar.
- **Sí:** reparto equilibrado de valores por series de 1 a 9. Reduce la varianza entre tableros. **No:** valores independientes al azar.
- **Sí:** tableros aleatorios por partida. **No:** semilla común: exigiría más trabajo y queda fuera de alcance, aunque las partidas comparen tableros distintos.
- **Sí:** la mano y la bolsa se conservan entre sectores. La última jugada del sector ya condiciona el siguiente.
- **Sí:** estado `stuck` de 800 ms antes del modal. En un puzzle hay que ver por qué se ha perdido. **No:** abrir el modal en el mismo instante, porque taparía el tablero.
- **Sí:** el descarte no se usa solo. Es una decisión del jugador, y la partida espera si es la única salida.
- **Sí:** panel y botón de descarte en el canvas, como elementos de juego. **No:** panel de React: rompería la composición única del lienzo.
- **Sí:** número de ranura, valores y rótulo del botón como texto en canvas. Son parte del tablero, no HUD.
- **Sí:** teclado y ratón a la vez, con el ratón moviendo el mismo cursor. **No:** controles táctiles.
- **Sí:** sin sonido ni assets. Trazos vectoriales, sin tocar `proxy.ts`.
- **Sí:** contrato de motor documentado (`start`/`pause`/`resume`/`end`/`restart`/`destroy` + callbacks), sin interfaz compartida ni refactor de los juegos existentes.
- **Sí:** la fila en `public.games` va en una migración versionada. Sin ella el insert de `scores` falla por la FK.
- **Sí:** catálogo, portada y rama de `GamePlayer` en el mismo paso. Separados, el juego se montaría con la simulación.

## Riesgos

| Riesgo                                                                          | Mitigación                                                                                                                               |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Otro juego de la jam se implementa antes                                        | Al implementar, se parte de la unión `GameEngine` vigente y el timestamp de la migración se cambia si ya no es el posterior a la última. |
| Strict Mode o `<Activity>` dejan bucles o listeners duplicados                  | Motor creado en `useLayoutEffect`, `destroy()` en el cleanup y reset del estado de React.                                                |
| Las teclas del juego interfieren con el input del modal                         | Sin `preventDefault` con foco en campos y entrada ignorada en `gameover`; criterio con `P`, `D` y dígitos.                               |
| `dt` enorme al volver de otra pestaña salta la pausa de `stuck`                 | Pausa automática, `dt` reiniciado al reanudar y tope de 50 ms.                                                                           |
| Falta la fila en `public.games`                                                 | Migración como primer paso y criterio que comprueba el guardado. El modal muestra `▸ NO SE PUDO GUARDAR · REINTENTAR`.                   |
| El modal guarda una puntuación vieja                                            | `emit()` tras cada acción, antes de `onGameOver` y en `end()`, con un criterio que lo comprueba.                                         |
| Ratón: coordenadas mal escaladas con DPR o a 390 px                             | Conversión con `800 / rect.width` y `600 / rect.height`, y criterio con DPR 2 y 390 px.                                                  |
| La generación se bloquea o deja un sector imposible                             | Máximo de 200 intentos, respaldo en zigzag sin azar, 33 protegidas como máximo y chequeo puntual de 1.000 sectores por caso.             |
| Un sector garantiza salto al empezar, pero el jugador se atasca enseguida       | Es la derrota prevista. El descarte da una segunda mano y el tablero muestra la causa durante `stuck`.                                   |
| Doble clic salta sin querer o descarta por accidente                            | Tras saltar no queda ficha seleccionada, y el botón de descarte queda en `USADO` tras el primer clic.                                    |
| Valores y mini-rejillas ilegibles a 390 px                                      | Valores de 28 px, celdas de 14 px y revisión en la pasada de diseño, que puede cambiar colores y tipografía.                             |
| La leyenda de cinco filas no cabe en la CRT a 390 px                            | `.key-legend` usa tamaños `clamp`; el paso 8 lo verifica y puede acortar el texto de la leyenda sin cambiar las teclas.                  |
| El tope de 10.000.000 se alcanza                                                | Según la cota superior, no antes del sector 98. Si ocurre, la puntuación se queda en el tope y la partida sigue.                         |
| Partidas largas sin reloj y con la pestaña abierta                              | La pausa automática conserva el estado y el motor no usa tiempo real para puntuar. No hay guardado entre recargas.                       |
| `TECLADO / TÁCTIL` en `/games/gambito` promete un táctil que no existe          | Etiqueta fija fuera de alcance, como en los demás juegos; el overlay avisa con `ESTE JUEGO NECESITA TECLADO O RATÓN`.                    |
| Otra página que muestre rankings se precarga y enseña datos viejos tras guardar | Se mantiene el `prefetch = "force-disabled"` de `/games/[id]` y `/salon`; no se toca en esta spec.                                       |

## Lo que **no** está en esta spec

- Controles táctiles, gamepad, sonido y música.
- Deshacer, vista previa de fichas y mostrar las fichas fuera de la mano.
- Tablero común o semilla diaria.
- Casillas especiales, fichas nuevas, potenciadores, más descartes y modos de juego.
- Animación del salto, transición entre sectores y puntos flotantes.
- Resumen de partida en `GameOverModal`.
- `best` y `plays` del catálogo, la actividad de la Home y las etiquetas fijas de `/games/gambito`.
- Interfaz `GameEngine` compartida y refactor de los juegos existentes.
- Anti-trampas y tests automatizados.

Cada uno de esos, si llega, va en su propia spec.

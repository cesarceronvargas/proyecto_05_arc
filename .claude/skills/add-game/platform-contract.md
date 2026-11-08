# Contrato de plataforma para juegos reales

Lo que toda spec generada por `/add-game` debe fijar. Sale de SPEC 05 (ROCAS), SPEC 06 (leaderboard) y del código actual. Si el código cambia y contradice este archivo, manda el código: compruébalo en la Fase 1.

Un juego es **real** cuando su entrada en `lib/games.ts` tiene `engine`. Ese campo decide qué player se monta, si tiene ranking y si aparece en `/salon`.

## 1. Motor — `games/<engine>/`

Solo TypeScript. Sin `react`, sin `next/*`, sin `@/lib/*`. El motor no conoce el catálogo, `localStorage` ni el usuario.

Archivos habituales:

- `games/<engine>/entities.ts` (o el nombre que pida el juego: `board.ts`, `pieces.ts`…): constantes, utilidades y entidades. Cada `draw` recibe el `CanvasRenderingContext2D` por parámetro. La paleta neón vive aquí como constantes.
- `games/<engine>/levels.ts`, si el juego tiene datos de niveles.
- `games/<engine>/engine.ts`: `create<Name>Game(canvas, callbacks)`.

### Contrato (convención documentada, sin tipo compartido)

No existe una interfaz `GameEngine` común ni un registro de motores. Cada motor exporta sus propios tipos con esta forma (ver `games/asteroids/engine.ts`). La abstracción se reevalúa, en su propia spec, cuando haya tres juegos reales.

```ts
export type <Name>Callbacks = {
  onScore: (score: number) => void;
  onStart: () => void;                      // ready -> playing
  onPauseChange: (paused: boolean) => void; // también en pausa automática
  onGameOver: (score: number) => void;      // fin de partida por las reglas del juego, incluida la victoria
  // + callbacks específicos: onLives, onLevel, onLines, onNext...
};

export type <Name>State = "ready" | "playing" | "paused" | "gameover"; // + estados propios ("dead"...)

export type <Name>Game = {
  start: () => void;   // ready -> playing (clic en el overlay de inicio); ignorada en otro estado
  pause: () => void;
  resume: () => void;
  end: () => void;     // botón FIN: pasa a gameover SIN llamar a onGameOver
  restart: () => void; // nueva partida directamente en "playing"
  destroy: () => void; // cancela el rAF y quita todos los listeners
};

export function create<Name>Game(canvas: HTMLCanvasElement, callbacks: <Name>Callbacks): <Name>Game;
```

### Reglas del motor

**Estado y bucle**

- Todo el estado en el closure de `create<Name>Game`. Nada global.
- Sin APIs de navegador en el nivel superior del módulo: `window`, `document`, `new Audio` y `new Image` solo dentro de `create<Name>Game`. El player también se renderiza en el servidor, y un `new Audio` en el módulo rompe el prerender.
- Bucle `requestAnimationFrame` con `dt` limitado a 50 ms. Al reanudar, el `dt` se reinicia (sin saltos).
- En `ready` el motor puede dibujar un fondo animado (attract mode), sin jugador.

**Callbacks y puntuación**

- Los callbacks se llaman solo cuando cambia el valor, nunca en cada frame. Patrón: un objeto `sent` con los últimos valores enviados, iniciado en `-1`, y una función `emit()` que compara y llama. Los contadores con decimales se redondean (p. ej. a 0,1 s).
- **El motor llama a `emit()` antes de `onGameOver` y dentro de `end()`.** El modal usa el `score` del estado de React, no el argumento de `onGameOver`. Sin esto, los puntos del último frame no llegan y se guarda una puntuación vieja.
- La puntuación es siempre un entero entre 0 y 10.000.000: `Math.floor` si el juego produce fracciones y tope `MAX_SCORE = 10_000_000`. `submitScore` rechaza cualquier otro valor.

**Pausa y teclado**

- Pausa: `P` y `Escape`, más pausa automática con `blur` de la ventana y `visibilitychange` a oculto. En pausa se hace `cancelAnimationFrame`.
- Si hay subestados que se pueden pausar (p. ej. `dead`), la pausa recuerda de cuál viene (`pausedFrom`) y `resume()` vuelve a él.
- `end()` y `restart()` estando en pausa llaman a `onPauseChange(false)`. Si no, el overlay `EN PAUSA` se queda debajo del modal.
- Teclado en `window`: `preventDefault` solo en las teclas del juego, y nunca cuando el foco está en `input`, `textarea`, `button`, `select` o un elemento `contentEditable`. En `gameover` se ignora la entrada.
- `clearKeys()` en `start`, `pause`, `resume`, `end`, `restart` y `blur`, para que no queden teclas pegadas.

**Canvas**

- Resolución lógica fija (4:3 para encajar en `.crt-screen`; si el juego no es 4:3, la spec decide cómo encaja). El canvas ocupa el 100 % de la CRT por CSS y el backing store se multiplica por `devicePixelRatio` con `ctx.setTransform`.
- Listener de `resize` que rehace el backing store, vuelve a aplicar `setTransform` y redibuja. Asignar `canvas.width` borra el estado del contexto, incluido `imageSmoothingEnabled`, así que hay que restaurarlo si el juego lo cambia.
- El canvas **no** dibuja HUD (puntuación, vidas, nivel…) ni overlays de inicio, pausa o game over: eso es React.
- Glow (`shadowBlur`) solo en los elementos principales, no en cada partícula.

**Lo que se quita del original**

- Récords en `localStorage`: el ranking es el de Supabase.
- Trucos y atajos de depuración que alteren una puntuación competitiva (p. ej. `Saltar al nivel` en la pausa de `04-arkanoid`).

### Reglas según el juego

Se incluyen en la spec solo si aplican.

**Ratón**

- Coordenadas lógicas con `(e.clientX - rect.left) * (W / rect.width)`, siendo `W` el ancho lógico. Nunca `canvas.width / rect.width`: con DPR 2 da el doble.
- Listeners en el canvas, quitados en `destroy()`. El overlay de inicio tapa el canvas en `ready`, así que el ratón no actúa hasta empezar.

**Imágenes**

- Viven en `public/games/<engine>/` y se cargan por URL absoluta (`/games/<engine>/…`). La app nunca importa de `references/`.
- `drawImage` lanza una excepción con una imagen rota: dibuja solo si `img.complete && img.naturalWidth > 0`, con una forma vectorial de respaldo.

**Sonido** (solo si el usuario decide conservarlo)

- Vive en `public/games/<engine>/`.
- Se reproduce con `.play().catch(() => {})`: un fallo de carga o de autoplay nunca interrumpe la partida.
- La plataforma no tiene control de volumen; añadirlo es otra spec.
- `proxy.ts` excluye imágenes de su matcher pero no audio, así que cada archivo de sonido pasaría por `updateSession`. La spec añade la extensión al matcher.

**Skins** (obligatorio en todo juego real)

- `games/<engine>/skins.ts` exporta `Palette` y `SKINS: Record<SkinId, Palette>` con `clasico` (por defecto), `neon` y `retro`, usando `SkinId` y `DEFAULT_SKIN` de `games/shared/skins.ts`. Los `draw*` reciben la paleta por parámetro; no queda un `COLORS` fijo.
- `create<Name>Game(canvas, callbacks, options?: { skin?: SkinId })` y `setSkin(id)` en el objeto del juego, que redibuja sin reiniciar la partida.
- El player monta `components/skin-picker.tsx` y guarda la elección por juego en `av_skin_<gameId>` (`lib/storage.ts`).
- Los skins solo cambian lo visual. El detalle del estándar está en `.claude/agents/skin-designer.md`; si la infraestructura compartida aún no existe, la spec lo recoge como dependencia (se crea con `@skin-designer`).

**Juegos con final**

- Ganar también pasa a `gameover` y llama a `onGameOver(score)`, con el mismo `GameOverModal`, cuyo título es `FIN DEL JUEGO`. Un mensaje de victoria propio obliga a ampliar `GameOverModal`, y eso debe constar en la spec.

## 2. Player — `components/<engine>-player.tsx`

Client Component que copia la estructura de `components/asteroids-player.tsx`:

- Marco: `.av-player`, `.player-hud` (`.hud-stat` por cada stat, `.hud-actions` con PAUSA/REANUDAR, FIN y SALIR), `.crt`, `.crt-screen` con `<canvas className="game-canvas">`, `.crt-bottom`. El último texto de `.crt-bottom` es propio del juego.
- Un stat con color propio añade su clase `.hud-stat.<x>` en `app/globals.css`, como `.hud-stat.triple`.
- El motor se crea en `useLayoutEffect(() => …, [])` y el cleanup llama a `destroy()` **y resetea todo el estado de React** (con `cacheComponents` la ruta queda viva en `<Activity>` al navegar fuera; al volver hay un motor nuevo en `ready`).
- Los callbacks son setters de estado (estables), así el motor no se recrea.
- `releaseFocus(e)` en los botones del HUD para que no se queden con el foco y se traguen las teclas.
- PAUSA y FIN con `disabled={phase !== "playing"}`.
- Overlay de inicio: `<button className="screen-overlay">` con `.screen-title`, `.key-legend` con `<kbd className="keycap">`, `.press-start` y, si solo hay puntero táctil (`useSyncExternalStore` sobre `(pointer: coarse)` / `(pointer: fine)`), `.touch-warning` con `ESTE JUEGO NECESITA TECLADO`. Clic → `start()`. Si el juego usa ratón, la leyenda lo indica y el aviso dice `ESTE JUEGO NECESITA TECLADO O RATÓN`.
- Overlay `EN PAUSA` con `PULSA P O REANUDAR PARA CONTINUAR`.
- Fase `"ready" | "playing" | "over"`. FIN → `end()` y fase `over`. `onGameOver` → fase `over`.
- `<GameOverModal key={run} gameId={game.id} score={score} defaultName={playerName} ranked onRestart={restart} />`, donde `restart` llama a `restart()` del motor e incrementa `run`.
- La UI nueva (overlays, stats extra, colores del canvas) se diseña con `/frontend-design`, como pide `CLAUDE.md`.

## 3. Catálogo — `lib/games.ts` y `components/game-player.tsx`

- Ampliar la unión: `export type GameEngine = "asteroids" | "<engine>";`.
- Poner `engine: "<engine>"` en la entrada del juego.
  - **Entrada simulada reutilizada:** `id`, `title`, `cover` y `cat` no cambian (no se rompen URLs). Ajustar `long` si promete mecánicas que el juego no tiene. Su "Mejor global" pasa de `game.best` al top real y deja de mostrar `RANKING PRÓXIMAMENTE`. Si los criterios de una spec anterior citan esa entrada como simulada (SPEC 06 cita `caida`), se recoge como riesgo y se verifica la simulación con otro juego.
  - **Entrada nueva:** todos los campos de `Game`, con una clase `cover-<algo>` nueva en `app/globals.css` diseñada con `/frontend-design`. `cat` debe ser una categoría existente; una nueva obliga a ampliar `Category` y `CATEGORIES`.
- En `GamePlayer` (`components/game-player.tsx`) añadir `if (game.engine === "<engine>") return <<Name>Player game={game} />;` junto a la rama de asteroids. La simulación sigue para el resto.

## 4. Leaderboard — Supabase

Lo único que hay que añadir es la fila del juego en `public.games` (la FK de `scores.game_id` la exige):

```sql
-- supabase/migrations/<YYYYMMDDHHMMSS>_game_<id>.sql
insert into public.games (id, title) values ('<id>', '<TITLE>');
```

- Timestamp posterior a la última migración de `supabase/migrations/`.
- Se aplica con el MCP de Supabase (`apply_migration`). Si el MCP no conecta, desde el SQL Editor del dashboard.
- Se regeneran los tipos en `lib/supabase/database.types.ts` (normalmente sin cambios, porque solo se inserta una fila).

Todo lo demás se activa solo por tener `engine`, sin tocar código:

- `submitScore` en `app/games/[id]/jugar/actions.ts` acepta el juego (valida `getGame(id)?.engine`, score entero 0..10.000.000, nombre 1–10).
- `/games/[id]` (`app/games/[id]/page.tsx`) muestra el top 10 real y "Mejor global" real.
- `/salon` (`app/salon/page.tsx`, `components/hall-of-fame.tsx`) gana una pestaña con el `title` del juego, y sus marcas entran en GLOBAL.

Riesgo a recoger en la spec: un juego con `engine` sin fila en `games` hace fallar el insert por FK; el modal muestra `▸ NO SE PUDO GUARDAR · REINTENTAR`.

## 5. Plan de implementación tipo

Adaptar nombres y añadir pasos propios del juego. Cada paso deja el sistema funcional y tiene su verificación.

1. Consultar en `node_modules/next/dist/docs/` las guías de Client Components y `useEffect`/refs. La UI se diseña con `/frontend-design`.
2. Migración `supabase/migrations/<ts>_game_<id>.sql`, aplicada con el MCP, y tipos regenerados. Va primero porque la fila es inocua sin el juego; al revés, habría un juego con pestaña en `/salon` cuyo guardado falla por la FK. Verificación: `select * from public.games` incluye `<id>`.
3. `games/<engine>/entities.ts` (y demás archivos de dominio): constantes, utilidades, entidades con `ctx` por parámetro. Si hay assets, copiarlos a `public/games/<engine>/`. Verificación: `npx tsc --noEmit`.
4. `games/<engine>/engine.ts` con `create<Name>Game`: estado, máquina de estados, bucle, input, pausa, DPR, resize, callbacks y `destroy()`. Sin HUD ni overlays en canvas. Verificación: `npx tsc --noEmit` y `npm run lint`.
5. `lib/games.ts`: unión `GameEngine` y `engine` en la entrada (o entrada nueva + `cover-*`). Verificación: `npx tsc --noEmit`.
6. `components/<engine>-player.tsx`. Verificación: `npx tsc --noEmit`.
7. Rama en `components/game-player.tsx`. Verificación: `/games/<id>/jugar` muestra el juego real y otro juego simulado sigue igual.
8. Pasada de diseño con `/frontend-design` a 1280 px y 390 px.
9. Verificación en el navegador (Playwright o manual) recorriendo los criterios, y después `npm run lint` y `npm run build` (con y sin `.env.local`).

## 6. Criterios de aceptación estándar

Copiar, adaptar nombres y añadir los específicos del juego (valores numéricos de puntos, velocidades, niveles; HUD; controles):

- [ ] Existen `games/<engine>/…`, `components/<engine>-player.tsx` y `supabase/migrations/<ts>_game_<id>.sql`.
- [ ] Ningún archivo de `games/<engine>/` importa `react`, `next/*` ni `@/lib/*`.
- [ ] Ningún archivo de la app importa nada de `references/`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores, también sin `.env.local`.
- [ ] `/games/<id>/jugar` muestra el canvas dentro de la CRT con el overlay de inicio y la leyenda de controles.
- [ ] La partida empieza con la tecla de inicio o con un clic en la pantalla.
- [ ] Las teclas del juego funcionan y ninguna hace scroll en la página.
- [ ] El HUD de React muestra datos reales y se actualiza al instante. El canvas no dibuja HUD propio.
- [ ] El botón PAUSA, `P` y `Escape` pausan y reanudan, con el overlay `EN PAUSA`. Cambiar de pestaña o sacar el foco pausa, sin saltos al volver.
- [ ] Al terminar la partida se abre `GameOverModal` con la puntuación real. FIN detiene la partida y abre el modal con la puntuación actual, también si estaba en pausa, sin que quede el overlay `EN PAUSA`.
- [ ] La puntuación del modal y la fila guardada coinciden con los puntos reales de la partida, incluidos los del último frame.
- [ ] Se pueden escribir las iniciales en el modal (incluida `P`) sin que el motor reaccione.
- [ ] GUARDAR PUNTUACIÓN muestra `GUARDANDO…` y luego `▸ PUNTUACIÓN GUARDADA_`, y aparece una fila en `scores` con `game_id = '<id>'`.
- [ ] Tras guardar, `/games/<id>` muestra la puntuación en su leaderboard y "Mejor global" es la primera fila (o `—` sin puntuaciones).
- [ ] `/salon` tiene una pestaña `<TITLE>` con sus marcas, y la marca también aparece en GLOBAL.
- [ ] JUGAR DE NUEVO empieza una partida nueva con los valores iniciales.
- [ ] Navegar fuera con SALIR o con la Nav detiene el bucle y quita los listeners: las flechas y Espacio vuelven a hacer scroll y no hay errores en consola.
- [ ] En desarrollo (Strict Mode) solo corre un bucle.
- [ ] El canvas se ve nítido con `devicePixelRatio` 2, sigue nítido tras redimensionar la ventana y se adapta a 390 px sin scroll horizontal.
- [ ] Con puntero táctil el overlay de inicio muestra `ESTE JUEGO NECESITA TECLADO`.
- [ ] El juego ofrece los skins CLÁSICO (por defecto), NEÓN y RETRO; cambiar de skin en partida o en pausa redibuja sin reiniciar, y la elección se recuerda al recargar.
- [ ] ROCAS y los juegos simulados siguen funcionando igual.
- [ ] No hay errores ni avisos de hidratación en `/games/<id>` y `/games/<id>/jugar`.

Añadir solo si aplican:

- [ ] **Ratón:** con `devicePixelRatio` 2 y a 390 px de ancho, el elemento controlado sigue exactamente al cursor.
- [ ] **Final:** al ganar se abre `GameOverModal` con la puntuación real y se puede guardar.
- [ ] **Assets:** con un archivo de imagen o sonido inaccesible, la partida sigue sin errores no capturados en consola.
- [ ] **Trucos:** el original permitía `<truco>` y ya no existe en la plataforma.

## 7. Fuera de alcance por defecto

Salvo que el usuario lo pida y quepa en la spec:

- Controles táctiles o gamepad.
- Sonido y música, si el original no los tiene. Si los tiene, se pregunta (ver Fase 3 de `SKILL.md`).
- Mecánicas que el original no tiene.
- Anti-trampas y tests automatizados.
- Interfaz de motor compartida y refactor de ROCAS.
- `best` y `plays` del catálogo y lo que los muestra (`components/game-card.tsx`), la actividad de `lib/home.ts` y las etiquetas fijas de `/games/[id]` (`TECLADO / TÁCTIL`, `RETRO 1985`, dificultad).

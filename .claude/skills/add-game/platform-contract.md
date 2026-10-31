# Contrato de plataforma para juegos reales

Lo que toda spec generada por `/add-game` debe fijar. Sale de SPEC 05 (ROCAS), SPEC 06 (leaderboard) y del código actual. Si el código cambia y contradice este archivo, manda el código: compruébalo en la Fase 1.

Un juego es **real** cuando su entrada en `lib/games.ts` tiene `engine`. Ese campo decide qué player se monta, si tiene ranking y si aparece en `/salon`.

## 1. Motor — `games/<engine>/`

Solo TypeScript. Sin `react`, sin `next/*`, sin `@/lib/*`. El motor no conoce el catálogo, `localStorage` ni el usuario.

Archivos habituales:

- `games/<engine>/entities.ts` (o el nombre que pida el juego: `board.ts`, `pieces.ts`, `levels.ts`…): constantes, utilidades y entidades. Cada `draw` recibe el `CanvasRenderingContext2D` por parámetro. La paleta neón vive aquí como constantes.
- `games/<engine>/engine.ts`: `create<Name>Game(canvas, callbacks)`.

### Contrato (convención documentada, sin tipo compartido)

No existe una interfaz `GameEngine` común ni un registro de motores. Cada motor exporta sus propios tipos con esta forma (ver `games/asteroids/engine.ts`):

```ts
export type <Name>Callbacks = {
  onScore: (score: number) => void;
  onStart: () => void;                      // ready -> playing
  onPauseChange: (paused: boolean) => void; // también en pausa automática
  onGameOver: (score: number) => void;      // fin de partida por las reglas del juego
  // + callbacks específicos: onLives, onLevel, onLines, onNext...
};

export type <Name>State = "ready" | "playing" | "paused" | "gameover"; // + estados propios ("dead"...)

export type <Name>Game = {
  start: () => void;   // ready -> playing (clic en el overlay de inicio)
  pause: () => void;
  resume: () => void;
  end: () => void;     // botón FIN: pasa a gameover SIN llamar a onGameOver
  restart: () => void; // nueva partida directamente en "playing"
  destroy: () => void; // cancela el rAF y quita todos los listeners
};

export function create<Name>Game(canvas: HTMLCanvasElement, callbacks: <Name>Callbacks): <Name>Game;
```

### Reglas del motor

- Todo el estado en el closure de `create<Name>Game`. Nada global.
- Bucle `requestAnimationFrame` con `dt` limitado a 50 ms. Al reanudar, el `dt` se reinicia (sin saltos).
- En `ready` el motor puede dibujar un fondo animado (attract mode), sin jugador.
- Pausa: `P` y `Escape`, más pausa automática con `blur` de la ventana y `visibilitychange` a oculto. En pausa se hace `cancelAnimationFrame`.
- Teclado en `window`: `preventDefault` solo en las teclas del juego, y nunca cuando el foco está en `input`, `textarea` o `button`. En `gameover` se ignora la entrada.
- Los callbacks se llaman solo cuando cambia el valor, nunca en cada frame. Los contadores con decimales se redondean (p. ej. a 0,1 s).
- Resolución lógica fija (4:3 para encajar en `.crt-screen`; si el juego no es 4:3, la spec decide cómo encaja). El canvas ocupa el 100 % de la CRT por CSS y el backing store se multiplica por `devicePixelRatio` con `ctx.setTransform`.
- El canvas **no** dibuja HUD (puntuación, vidas, nivel…) ni overlays de pausa o game over: eso es React.
- Glow (`shadowBlur`) solo en los elementos principales, no en cada partícula.
- Si el original guarda récords en `localStorage`, se elimina.

## 2. Player — `components/<engine>-player.tsx`

Client Component que copia la estructura de `components/asteroids-player.tsx`:

- Marco: `.av-player`, `.player-hud` (`.hud-stat` por cada stat, `.hud-actions` con PAUSA/REANUDAR, FIN y SALIR), `.crt`, `.crt-screen` con `<canvas className="game-canvas">`, `.crt-bottom`.
- El motor se crea en `useLayoutEffect(() => …, [])` y el cleanup llama a `destroy()` **y resetea todo el estado de React** (con `cacheComponents` la ruta queda viva en `<Activity>` al navegar fuera; al volver hay un motor nuevo en `ready`).
- Los callbacks son setters de estado (estables), así el motor no se recrea.
- `releaseFocus(e)` en los botones del HUD para que no se queden con el foco y se traguen las teclas.
- Overlay de inicio: `<button className="screen-overlay">` con `.screen-title`, `.key-legend` con `<kbd className="keycap">`, `.press-start` y, si solo hay puntero táctil (`useSyncExternalStore` sobre `(pointer: coarse)` / `(pointer: fine)`), `.touch-warning` con `ESTE JUEGO NECESITA TECLADO`. Clic → `start()`.
- Overlay `EN PAUSA` con `PULSA P O REANUDAR PARA CONTINUAR`.
- Fase `"ready" | "playing" | "over"`. FIN → `end()` y fase `over`. `onGameOver` → fase `over`.
- `<GameOverModal key={run} gameId={game.id} score={score} defaultName={playerName} ranked onRestart={restart} />`, donde `restart` llama a `restart()` del motor e incrementa `run`.
- La UI nueva (overlays, stats extra, colores del canvas) se diseña con `/frontend-design`, como pide `CLAUDE.md`.

## 3. Catálogo — `lib/games.ts` y `components/game-player.tsx`

- Ampliar la unión: `export type GameEngine = "asteroids" | "<engine>";`.
- Poner `engine: "<engine>"` en la entrada del juego.
  - **Entrada simulada reutilizada:** `id`, `title`, `cover` y `cat` no cambian (no se rompen URLs). Ajustar `long` si promete mecánicas que el juego no tiene. Su "Mejor global" pasa de `game.best` al top real y deja de mostrar `RANKING PRÓXIMAMENTE`.
  - **Entrada nueva:** todos los campos de `Game`, con una clase `cover-<algo>` nueva en `app/globals.css` diseñada con `/frontend-design`.
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
2. `games/<engine>/entities.ts` (y demás archivos de dominio): constantes, utilidades, entidades con `ctx` por parámetro. Verificación: `npx tsc --noEmit`.
3. `games/<engine>/engine.ts` con `create<Name>Game`: estado, máquina de estados, bucle, input, pausa, DPR, callbacks y `destroy()`. Sin HUD ni overlays en canvas. Verificación: `npx tsc --noEmit` y `npm run lint`.
4. `lib/games.ts`: unión `GameEngine` y `engine` en la entrada (o entrada nueva + `cover-*`). Verificación: `npx tsc --noEmit`.
5. `components/<engine>-player.tsx`. Verificación: `npx tsc --noEmit`.
6. Rama en `components/game-player.tsx`. Verificación: `/games/<id>/jugar` muestra el juego real y otro juego simulado sigue igual.
7. Migración `supabase/migrations/<ts>_game_<id>.sql`, aplicada con el MCP, y tipos regenerados. Verificación: `select * from public.games` incluye `<id>`.
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
- [ ] Al terminar la partida se abre `GameOverModal` con la puntuación real. FIN detiene la partida y abre el modal con la puntuación actual.
- [ ] Se pueden escribir las iniciales en el modal (incluida `P`) sin que el motor reaccione.
- [ ] GUARDAR PUNTUACIÓN muestra `GUARDANDO…` y luego `▸ PUNTUACIÓN GUARDADA_`, y aparece una fila en `scores` con `game_id = '<id>'`.
- [ ] Tras guardar, `/games/<id>` muestra la puntuación en su leaderboard y "Mejor global" es la primera fila (o `—` sin puntuaciones).
- [ ] `/salon` tiene una pestaña `<TITLE>` con sus marcas, y la marca también aparece en GLOBAL.
- [ ] JUGAR DE NUEVO empieza una partida nueva con los valores iniciales.
- [ ] Navegar fuera con SALIR o con la Nav detiene el bucle y quita los listeners: las flechas y Espacio vuelven a hacer scroll y no hay errores en consola.
- [ ] En desarrollo (Strict Mode) solo corre un bucle.
- [ ] El canvas se ve nítido con `devicePixelRatio` 2 y se adapta a 390 px sin scroll horizontal.
- [ ] Con puntero táctil el overlay de inicio muestra `ESTE JUEGO NECESITA TECLADO`.
- [ ] ROCAS y los juegos simulados siguen funcionando igual.
- [ ] No hay errores ni avisos de hidratación en `/games/<id>` y `/games/<id>/jugar`.

## 7. Fuera de alcance por defecto

Salvo que el usuario lo pida y quepa en la spec: controles táctiles o gamepad, sonido y música, mecánicas que el original no tiene, anti-trampas, tests automatizados, interfaz de motor compartida y refactor de ROCAS.

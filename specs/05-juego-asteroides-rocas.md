# SPEC 05 — Juego real de asteroides (ROCAS)

> **Estado:** Implemetado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-28
> **Objetivo:** Portar el Asteroids de `references/started-games/02-asteroids` a un motor TypeScript que se ejecuta en `/games/rocas/jugar`. La puntuación, las vidas y el nivel reales se muestran en el HUD de React, y el fin de partida usa el `GameOverModal` existente.

## Por qué existe esta spec

Hoy `/games/[id]/jugar` es una simulación: `components/game-player.tsx` sube la puntuación con un `setInterval` y no hay ningún juego real.
En `references/started-games/02-asteroids/` hay un Asteroids completo en canvas (`game.js`, unas 510 líneas, sin dependencias). Usa variables globales, `document.getElementById`, listeners en `window` que nunca se quitan y un bucle `requestAnimationFrame` que nunca se detiene.
Ese código no se puede montar tal cual en un Client Component: al navegar fuera de la página los listeners y el bucle seguirían vivos, y el HUD y el game over de la plataforma no sabrían nada de la partida.
Esta spec convierte ese juego en el primer juego real de la plataforma, sobre la entrada **ROCAS** del catálogo. Además deja el patrón (motor aislado + callbacks + player de React) que seguirán los juegos de `03-tetris` y `04-arkanoid`.

## Alcance

**Dentro:**

- **Motor portado a TypeScript** en `games/asteroids/`, en la raíz del repo:
  - `games/asteroids/entities.ts`: constantes (`RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`), utilidades (`wrap`, `dist`, `rand`, `randInt`) y las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle`. Cada `draw` recibe el `CanvasRenderingContext2D` por parámetro y no usa ningún global.
  - `games/asteroids/engine.ts`: `createAsteroidsGame(canvas, callbacks)`. Contiene todo el estado de la partida en un closure y devuelve un controlador con `start`, `pause`, `resume`, `end`, `restart` y `destroy`.
- **Mecánica idéntica al original:** física de la nave (rotación 3,5 rad/s, empuje 260 px/s², rozamiento 0,987), espacio toroidal de 800×600, división de asteroides 3 → 2 → 1, puntos 20/50/100, 3 vidas, 3 s de invencibilidad con parpadeo al reaparecer, 2 s de espera tras morir, `3 + nivel` asteroides por nivel, cadencia de disparo de 0,2 s y `dt` limitado a 50 ms.
- **Power-up de triple disparo (3x) tal cual:** 15 % de probabilidad, garantizado tras 5 destrucciones, uno por nivel, dura 5 s y desaparece a los 12 s.
- **HUD en React:** el canvas ya no pinta `SCORE`, `NIVEL`, los iconos de vidas ni el `3x`. El HUD de la plataforma (`.player-hud`) muestra Jugador, Puntuación, Vidas (`♥` por vida restante) y Nivel con datos reales. Mientras el triple disparo está activo aparece un indicador `3X · 4.2s`.
- **Pantalla de inicio "PULSA ESPACIO":** al entrar, el motor dibuja el campo de asteroides en movimiento, sin nave, y React muestra encima un overlay con el título, los controles y `PULSA ESPACIO PARA EMPEZAR`. La partida empieza con Espacio o con un clic en la pantalla.
- **Pausa:** el botón PAUSA/REANUDAR del HUD, la tecla `P` o `Escape`, y pausa automática con `blur` de la ventana o `visibilitychange` a oculto. En pausa el bucle se detiene (`cancelAnimationFrame`). Al reanudar, el `dt` se reinicia para que no haya un salto. Se reutiliza el overlay `EN PAUSA` existente, con el texto `PULSA P O REANUDAR PARA CONTINUAR`.
- **Fin de partida:** al perder la última vida, el motor llama a `onGameOver(score)` y React abre el `GameOverModal` existente con la puntuación real, que se guarda con `saveScore` en `av_scores`. JUGAR DE NUEVO llama a `restart()` y la nueva partida empieza directamente, sin pasar por la pantalla de inicio. Se elimina el overlay de canvas `GAME OVER … ESPACIO PARA REINICIAR`.
- **Botón FIN:** detiene el motor con `end()` y abre el `GameOverModal` con la puntuación actual.
- **Estilo neón:** mismos trazos vectoriales que el original, recoloreados con la paleta del sitio y un leve glow (`shadowBlur`). Nave en cian, asteroides en blanco/cian tenue, balas en amarillo, power-up en magenta, llama del propulsor en amarillo/magenta y partículas que heredan el color de lo que explota. Los colores exactos se fijan con `/frontend-design` durante la implementación y viven como constantes en `entities.ts`.
- **Canvas nítido y escalado:** la resolución lógica sigue siendo 800×600 (4:3, igual que `.crt-screen`). El canvas ocupa el 100 % de la pantalla CRT por CSS y el backing store se multiplica por `devicePixelRatio`, con `ctx.setTransform` para que se vea nítido en pantallas retina.
- **Teclado:** `ArrowLeft`/`ArrowRight` rotan, `ArrowUp` propulsa, `Space` dispara, `P`/`Escape` pausan. El motor llama a `preventDefault` en esas teclas para que la página no haga scroll, pero no lo hace cuando el foco está en un `input`, `textarea` o `button`, para que el campo de iniciales del modal funcione.
- **Aviso en pantallas táctiles:** si `(pointer: coarse)` coincide y no hay `(pointer: fine)`, el overlay de inicio añade `ESTE JUEGO NECESITA TECLADO`. El juego no se bloquea.
- **Selección de motor en el catálogo:** `Game` gana un campo opcional `engine?: "asteroids"`. ROCAS lo declara y `GamePlayer` monta `AsteroidsPlayer` cuando `game.engine === "asteroids"`. Los otros 7 juegos siguen con la simulación actual sin cambios.
- **Texto de ROCAS:** se quita la frase de los OVNIs del campo `long`, porque el juego no los tiene. `id`, `title`, `short`, `cover` y `cat` no cambian.
- **Versionado de `references/started-games/`:** la carpeta entra en el repositorio como referencia del original. Ningún archivo de la app la importa.

**Fuera de alcance (para futuras specs):**

- Controles táctiles o de mando (gamepad).
- Sonido y música.
- OVNIs, hiperespacio, vidas extra por puntos o cualquier mecánica que el original no tenga.
- Guardar puntuaciones en Supabase o leaderboards reales: sigue `saveScore` en `localStorage`.
- Cambiar el `best` y los `plays` mock de ROCAS en `lib/games.ts`, o el Salón de la Fama.
- Portar Tetris (`03-tetris`) y Arkanoid (`04-arkanoid`).
- Un registro genérico de motores o una interfaz común `GameEngine` compartida por todos los juegos. Se abstrae cuando exista el segundo juego real.
- Anti-trampas o validación de puntuaciones.
- Tests automatizados.

## Modelo de datos

No hay datos persistentes nuevos. `saveScore` y la clave `av_scores` se usan igual que ahora, con `game: "rocas"`.

Tipos nuevos:

```ts
// lib/games.ts (cambio)
export type GameEngine = "asteroids";
export type Game = {
  // ...campos actuales sin cambios
  engine?: GameEngine; // ausente => simulación visual
};

// games/asteroids/engine.ts
export type AsteroidsCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  // Segundos restantes de 3x, redondeados a 0.1. Se llama solo cuando cambia el valor redondeado (0 = inactivo).
  onTripleShot: (secondsLeft: number) => void;
  onPauseChange: (paused: boolean) => void; // también cuando la pausa es automática (blur/visibilidad)
  onStart: () => void; // la partida pasa de "ready" a "playing"
  onGameOver: (score: number) => void; // última vida perdida
};

export type AsteroidsState =
  "ready" | "playing" | "dead" | "paused" | "gameover";

export type AsteroidsGame = {
  start: () => void; // ready -> playing (lo usa el clic en el overlay de inicio)
  pause: () => void;
  resume: () => void;
  end: () => void; // botón FIN: pasa a gameover sin llamar a onGameOver
  restart: () => void; // nueva partida directamente en "playing"
  destroy: () => void; // cancela el rAF y quita todos los listeners de window/document
};

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame;
```

Convenciones:

- `games/<juego>/` contiene solo TypeScript del motor, sin React ni imports de `next/*`. El motor no conoce el catálogo, `localStorage` ni el usuario.
- El componente React del juego vive en `components/<juego>-player.tsx`, en este caso `components/asteroids-player.tsx`.
- Los callbacks se guardan en un `ref` en el componente, para que el motor no se recree cuando cambian.
- `onScore`, `onLives` y `onLevel` se llaman solo cuando el valor cambia, nunca en cada frame.

## Plan de implementación

Antes del paso 1 se consultan las guías de Client Components y de `useEffect`/refs en `node_modules/next/dist/docs/`. La UI (overlays, indicador 3X y colores del canvas) se diseña con `/frontend-design`, según `CLAUDE.md`.

1. Versionar `references/started-games/` tal cual. Verificación: `git status` ya no la muestra como sin trackear.
2. Crear `games/asteroids/entities.ts`: portar constantes, utilidades y las cinco clases con tipos estrictos, `ctx` por parámetro y la paleta neón. `Ship.update` recibe el estado de las teclas por parámetro, en lugar de leer un global `keys`. Verificación: `npx tsc --noEmit` pasa.
3. Crear `games/asteroids/engine.ts` con `createAsteroidsGame`: estado en closure, máquina de estados `AsteroidsState`, bucle rAF con `dt` limitado, input en `window` con `preventDefault` selectivo, pausa (P/Esc, `blur`, `visibilitychange`), escalado por `devicePixelRatio`, callbacks solo cuando cambia el valor, y `destroy()`. Se eliminan `drawHUD` y `drawOverlay` del original. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
4. Añadir `engine?: GameEngine` a `Game` en `lib/games.ts`, poner `engine: "asteroids"` en ROCAS y quitar la frase de los OVNIs de su `long`. Verificación: `npx tsc --noEmit` pasa y `/games/rocas` muestra el texto nuevo.
5. Crear `components/asteroids-player.tsx` (Client Component): mismo marco que `GamePlayer` (`.av-player`, `.player-hud`, `.crt`, `.crt-screen`, `.crt-bottom`), un `<canvas>` en lugar de `.game-arena`, HUD con datos reales e indicador 3X, overlay de inicio con controles y aviso táctil, overlay `EN PAUSA`, botones PAUSA/FIN/SALIR conectados al motor, `GameOverModal` con `onRestart` → `restart()`, y `destroy()` en el cleanup del efecto. Verificación: `npx tsc --noEmit` pasa.
6. En `components/game-player.tsx`, si `game.engine === "asteroids"` devolver `<AsteroidsPlayer game={game} />`. Si no, la simulación actual sin cambios. Verificación: con `npm run dev`, `/games/rocas/jugar` muestra el juego real y `/games/caida/jugar` sigue con la simulación.
7. Pasada de diseño con `/frontend-design`: ajustar colores y glow del canvas y los overlays para que encajen con la estética CRT/neón. Verificación visual en el navegador, a 1280 px y a 390 px de ancho.
8. Verificación completa en el navegador (Playwright o manual) recorriendo los criterios de aceptación, y después `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] Existen `games/asteroids/entities.ts`, `games/asteroids/engine.ts` y `components/asteroids-player.tsx`.
- [ ] Ningún archivo de `games/asteroids/` importa `react`, `next/*` ni `@/lib/storage`.
- [ ] Ningún archivo de la app importa nada de `references/`.
- [ ] `references/started-games/` está versionada.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/games/rocas/jugar` muestra el canvas dentro de la pantalla CRT, con asteroides en movimiento y el overlay `PULSA ESPACIO PARA EMPEZAR` con los controles.
- [ ] Al pulsar Espacio, o al hacer clic en la pantalla, aparece la nave en el centro con parpadeo de invencibilidad y la partida empieza.
- [ ] Las flechas rotan y propulsan la nave y Espacio dispara. Ninguna de esas teclas hace scroll en la página.
- [ ] Destruir un asteroide grande suma 20, uno mediano 50 y uno pequeño 100, y la Puntuación del HUD de React se actualiza al instante.
- [ ] El HUD empieza con 3 `♥` y pierde uno con cada choque. El canvas no dibuja ningún HUD propio.
- [ ] Al vaciar el campo, Nivel pasa a `02` y aparecen 5 asteroides grandes.
- [ ] Al recoger el power-up se disparan 3 balas en abanico durante 5 s, y el HUD muestra `3X` con una cuenta atrás que desaparece al llegar a 0.
- [ ] El botón PAUSA, la tecla `P` y `Escape` pausan y reanudan. En pausa no se mueve nada y se ve el overlay `EN PAUSA`.
- [ ] Cambiar de pestaña o sacar el foco de la ventana pausa la partida, y al volver sigue en pausa hasta que el jugador la reanuda, sin saltos de posición.
- [ ] Al perder la tercera vida se abre `GameOverModal` con la puntuación real, y GUARDAR PUNTUACIÓN añade a `av_scores` una entrada `{ game: "rocas", score, name, at }`.
- [ ] Se pueden escribir las iniciales en el modal (incluidas teclas como `P`) sin que el motor reaccione.
- [ ] JUGAR DE NUEVO cierra el modal y empieza una partida nueva con puntuación 0, 3 vidas y nivel 01.
- [ ] FIN detiene la partida y abre el modal con la puntuación actual.
- [ ] Navegar a otra ruta con SALIR o con la Nav detiene el bucle y quita los listeners: después, las flechas y Espacio vuelven a hacer scroll y no hay errores en consola.
- [ ] En desarrollo (React Strict Mode) solo corre un bucle: la nave no se mueve al doble de velocidad ni se duplican los disparos.
- [ ] El canvas se ve nítido (sin desenfoque) con `devicePixelRatio` 2 y se adapta al ancho de la CRT a 390 px sin scroll horizontal.
- [ ] Con un puntero táctil (`pointer: coarse`) el overlay de inicio muestra `ESTE JUEGO NECESITA TECLADO`.
- [ ] `/games/caida/jugar` y el resto de juegos sin `engine` siguen mostrando la simulación igual que antes.
- [ ] El `long` de ROCAS ya no menciona OVNIs, y su `id`, `title`, `cover` y `cat` no cambian.
- [ ] No hay errores ni avisos de hidratación en la consola del navegador en `/games/rocas/jugar`.

## Decisiones

- **Sí:** reusar la entrada ROCAS (`id: "rocas"`). Su descripción y su portada ya son de asteroides, y no rompe URLs ni puntuaciones guardadas.
- **No:** renombrar a ASTEROIDES. Cambia rutas y deja huérfanas las entradas de `av_scores` con `rocas`.
- **Sí:** portar a un motor TypeScript con estado en closure y `destroy()`. El original usa globals y listeners que nunca se quitan, y en una SPA eso deja bucles vivos al navegar.
- **No:** copiar `game.js` a `/public` y cargarlo con `<Script>`. No se limpia, no tiene tipos y no puede hablar con el HUD.
- **Sí:** HUD en React alimentado por callbacks que solo se llaman cuando cambia el valor. Unifica la experiencia con la plataforma y evita re-renders a 60 fps.
- **No:** mantener el HUD dibujado en el canvas. Duplicaría la información del `.player-hud`.
- **Sí:** reutilizar `GameOverModal` y `saveScore`. El flujo de guardado ya existe, y Supabase llegará en su propia spec.
- **No:** overlay de GAME OVER en el canvas ni reiniciar con Espacio. Compite con el modal y Espacio dispararía al reiniciar.
- **Sí:** pantalla de inicio "PULSA ESPACIO". Evita perder vidas mientras el jugador lee los controles y garantiza un gesto del usuario antes de empezar.
- **Sí:** pausa con botón, `P`/`Escape` y pausa automática por `blur`/visibilidad. El original no tiene pausa, y sin ella perder el foco cuesta vidas.
- **Sí:** `preventDefault` solo en las teclas del juego y nunca con el foco en un campo de formulario. Sin esto, Espacio y las flechas hacen scroll, y con un bloqueo global no se podría escribir en el modal.
- **Sí:** estilo neón con la paleta del sitio. El blanco puro desentona con la CRT de la plataforma, y los trazos y la jugabilidad no cambian.
- **Sí:** mantener el power-up 3x con las mismas reglas. Ya está implementado y probado en el original.
- **Sí:** el motor vive en `games/asteroids/`, en la raíz. `lib/games.ts` ya existe y una carpeta `lib/games/` haría ambiguo `@/lib/games`. Además, cada juego futuro tendrá su carpeta hermana.
- **Sí:** campo opcional `engine` en `Game` para elegir el player. El catálogo decide qué juego es real sin `if (id === "rocas")` dispersos.
- **No:** interfaz `GameEngine` genérica ni registro de motores. Con un solo juego real sería una abstracción especulativa, y se diseña al portar el segundo.
- **Sí:** los otros 7 juegos siguen con la simulación. No se rompe nada que ya funciona.
- **No:** controles táctiles. Amplían bastante el alcance de UI. En táctil solo se muestra un aviso.
- **Sí:** resolución lógica fija de 800×600 escalada por CSS y `devicePixelRatio`. Las coordenadas y la física del original no cambian y la CRT ya es 4:3.
- **Sí:** versionar `references/started-games/`. Sirve de referencia del comportamiento original, igual que `references/templates/`.

## Riesgos

| Riesgo                                                                               | Mitigación                                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode monta el efecto dos veces y deja dos bucles o listeners duplicados | `destroy()` cancela el rAF y quita todos los listeners. El efecto crea el motor y devuelve `destroy` como cleanup. Hay un criterio que lo comprueba.                       |
| Las teclas del juego interfieren con el input de iniciales del modal                 | En `gameover` el motor ignora la entrada y no llama a `preventDefault` cuando el foco está en `input`/`textarea`/`button`. Hay un criterio con la tecla `P`.               |
| `dt` enorme al volver de otra pestaña teletransporta la nave o mata al jugador       | Pausa automática por `visibilitychange`/`blur`, `dt` reiniciado al reanudar y tope de 50 ms como en el original.                                                           |
| Callbacks que actualizan estado de React en cada frame degradan el rendimiento       | Los callbacks solo se llaman cuando cambia el valor, y `onTripleShot` redondea a 0,1 s.                                                                                    |
| El canvas se ve borroso en pantallas retina o al escalar                             | El backing store se multiplica por `devicePixelRatio` con `setTransform`, y la resolución lógica sigue en 800×600.                                                         |
| `shadowBlur` del glow baja los FPS con muchas partículas                             | El glow solo se aplica a la nave, las balas y el power-up, no a cada partícula. Si hace falta se reduce en la pasada de diseño.                                            |
| Con `cacheComponents`, el player rompe el prerender de `/games/[id]/jugar`           | El motor solo se crea dentro de `useEffect`, en el cliente. La página sigue siendo un Server Component que pasa `game` al player, como ahora.                              |
| El original tiene comportamientos implícitos que se pierden en el port               | `references/started-games/02-asteroids/` queda versionado y los criterios de aceptación fijan los valores numéricos clave (puntos, vidas, asteroides por nivel, power-up). |

## Lo que **no** está en esta spec

- Controles táctiles, gamepad, sonido y música.
- Mecánicas que el original no tiene (OVNIs, hiperespacio, vidas extra).
- Puntuaciones en Supabase, leaderboards reales y cambios en el Salón de la Fama o en `best`/`plays`.
- Portar Tetris y Arkanoid, y la interfaz genérica de motores.
- Anti-trampas y tests automatizados.

Cada uno de esos, si llega, va en su propia spec.

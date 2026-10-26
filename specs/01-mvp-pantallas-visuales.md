# SPEC 01 — MVP visual de Arcade Vault

> **Estado:** Aprovado
> **Depende de:** Ninguna
> **Fecha:** 2026-10-25
> **Objetivo:** Implementar en Next.js App Router las cinco pantallas de `references/templates/` (Biblioteca, Detalle, Reproductor, Salón de la Fama y Auth) con datos mock y sin ningún juego real.

## Por qué existe esta spec

Las plantillas de `references/templates/` son un prototipo SPA con React UMD + Babel, rutas en `location.hash` y estilos inline.
El tema visual ya está portado a `app/globals.css` (rama `01-styles`), pero ninguna pantalla existe en la app.
Esta spec traduce el prototipo a la arquitectura real del proyecto (rutas de App Router, Server/Client Components, TypeScript estricto) manteniendo el diseño 1:1.
Es la base visual sobre la que las specs siguientes conectarán juegos reales, backend y autenticación.

## Alcance

**Dentro:**

- Layout global: fondo (`.av-bg`, `.av-noise`), Nav, `<main className="av-main">` y footer `© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0`.
- Nav con logo, enlaces Biblioteca / Salón de la Fama con estado activo, botón "Iniciar Sesión" o menú de usuario, y panel móvil con hamburguesa (≤ 840px).
- Menú desplegable de usuario logueado (`NOMBRE ▾`) con la opción "Cerrar sesión". Se cierra con clic fuera o con `Esc`.
- **Biblioteca** (`/`): hero con `flicker` y `blink`, buscador por nombre, chips de categoría, grid de tarjetas con tilt 3D al mover el ratón y estado vacío "NO HAY RESULTADOS".
- **Detalle** (`/juegos/[id]`): portada, tags, descripción larga, `stat-strip`, botones "▶ JUGAR AHORA" y "VOLVER AL VAULT", y leaderboard mock top 10.
- **Reproductor** (`/juegos/[id]/jugar`): HUD (jugador, puntuación, vidas, nivel), botones PAUSA/REANUDAR, FIN y SALIR, pantalla CRT con la arena decorativa animada, overlay "EN PAUSA" y modal "FIN DEL JUEGO".
- Simulación del Reproductor idéntica a la plantilla: la puntuación sube sola cada 220 ms, el nivel sube al cruzar múltiplos de 2500, y la pausa detiene el contador.
- Modal "FIN DEL JUEGO": puntuación final, input de iniciales (mayúsculas, máximo 10 caracteres), "GUARDAR PUNTUACIÓN" con el toast `▸ PUNTUACIÓN GUARDADA_`, "JUGAR DE NUEVO" y "VOLVER AL VAULT".
- **Salón de la Fama** (`/salon`): cabecera, chips por juego (estado de cliente, abre en el primer juego), podio 2-1-3, tabla top 12 mock con animación `rise` y fila "TU MEJOR MARCA" con datos reales de `av_scores`.
- **Auth** (`/auth`): tabs INICIAR SESIÓN / CREAR CUENTA, campos usuario, correo (solo en crear cuenta) y contraseña, botón principal, "JUGAR COMO INVITADO" y texto de términos.
- Sesión y puntuaciones simuladas en `localStorage` (`av_user`, `av_scores`) sin validación ni backend.
- Página 404 con estética arcade (`app/not-found.tsx`) para ids de juego inexistentes y rutas desconocidas.
- `metadata` por ruta (título de pestaña por pantalla y por juego).

**Fuera de alcance (para futuras specs):**

- Cualquier juego jugable real (canvas, lógica, controles de teclado o táctiles).
- Backend, base de datos, API routes o Server Actions.
- Autenticación real, validación de credenciales, hash de contraseñas o OAuth.
- Botones "GOOGLE" / "GITHUB" y el divisor "O CONTINÚA CON" (se eliminan).
- Contador "CRÉDITOS · 03" de la Nav y del panel móvil (se elimina) y cualquier sistema de créditos.
- Mezclar las puntuaciones de `av_scores` dentro del top del ranking.
- Pestaña del Salón en la URL (`?juego=`).
- Tests automatizados (no hay test runner configurado).
- El panel de "tweaks" (`.tw-section`, `.tw-label`) de la plantilla.

## Modelo de datos

Datos mock en `lib/games.ts`, copiados de `references/templates/data.jsx` y tipados:

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;            // slug de la URL: "bloque-buster", "caida", ...
  title: string;         // "BLOQUE BUSTER"
  short: string;         // descripción de la tarjeta
  long: string;          // descripción del detalle
  cat: Category;
  cover: `cover-${string}`; // clase CSS de portada en globals.css
  color: AccentColor;    // color del botón JUGAR
  best: number;          // mejor puntuación global mock
  plays: string;         // "12.4K"
};

export const GAMES: Game[];                       // los 8 juegos de data.jsx
export const CATEGORIES = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export function getGame(id: string): Game | undefined;

export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date "dd/mm/2026"
export function seededScores(seed: number, count?: number): ScoreRow[]; // mismo algoritmo que la plantilla
```

Semillas de los rankings (idénticas a la plantilla para que los datos coincidan):

- Detalle: `seededScores(id.length * 17 + 3, 10)`.
- Salón: `seededScores(id.length * 23 + 7, 12)`.

Persistencia simulada en `localStorage`:

```ts
// clave "av_user": usuario actual, o ausente si es invitado
type User = { name: string }; // nombre en mayúsculas, máximo 10 caracteres; "PLAYER1" si se envía vacío

// clave "av_scores": array JSON que solo crece
type ScoreEntry = { game: string; score: number; name: string; at: number }; // at = Date.now()
```

Convenciones:

- Las claves `av_user` y `av_scores` se mantienen sin versionar para conservar la compatibilidad con la plantilla.
- Si el JSON de una clave está corrupto, se trata como vacío (`null` / `[]`).
- Los números se formatean con `toLocaleString("es-ES")`.
- "TU MEJOR MARCA" toma la entrada con mayor `score` donde `game === tab` y `name === user.name`.
- Su rango es `1 + número de filas mock con score mayor`, y su fecha es `at` formateado como `dd/mm/yyyy`.
- Si el usuario no tiene entradas para ese juego, la fila "TU MEJOR MARCA" no se muestra.

## Plan de implementación

Antes del paso 1 se invoca `/frontend-design` (obligatorio según CLAUDE.md) para las piezas nuevas que no existen en la plantilla: el desplegable de usuario y la página 404. El resto de las pantallas se mantiene fiel a la plantilla.
Antes de usar `params`, `generateStaticParams`, `generateMetadata`, `notFound` o `PageProps`, se consulta `node_modules/next/dist/docs/` (en Next 16, `params` es una `Promise`).

1. Crear `lib/games.ts` con los tipos, `GAMES`, `CATEGORIES`, `getGame` y `seededScores`. Verificación: `npx tsc --noEmit` pasa.
2. Crear `lib/storage.ts` con `useUser()` (vía `useSyncExternalStore`, snapshot de servidor `null`), `login(name)`, `logout()`, `saveScore(entry)` y `getBestScore(game, name)`. Las escrituras emiten un evento para que todos los suscriptores se actualicen en la misma pestaña.
3. Crear `components/footer.tsx` y `components/nav.tsx` (cliente, `usePathname` para el estado activo, panel móvil) sin el contador de créditos. Montarlos en `app/layout.tsx` junto a `<main className="av-main">`.
4. Crear `components/user-menu.tsx` (cliente): desplegable con "Cerrar sesión", cierre con clic fuera y `Esc`. Añadir sus estilos en `app/globals.css`. Conectarlo en la Nav cuando `useUser()` devuelve un usuario.
5. Reemplazar `app/page.tsx` por la Biblioteca: hero en el Server Component y `components/library.tsx` (cliente) con buscador, chips, grid y estado vacío.
6. Crear `components/game-card.tsx` (cliente) con el tilt 3D, el botón JUGAR coloreado según `color` y la navegación con `<Link>` a `/juegos/[id]`.
7. Crear `app/not-found.tsx` con la estética arcade y un botón para volver a la Biblioteca.
8. Crear `app/juegos/[id]/page.tsx` (Server Component) con `generateStaticParams`, `generateMetadata`, `notFound()` para ids inválidos y `components/leaderboard.tsx` con el top 10.
9. Crear `app/juegos/[id]/jugar/page.tsx` (server, `generateStaticParams` + `notFound()`) que renderiza `components/game-player.tsx` (cliente) con HUD, CRT, arena, simulación y pausa.
10. Crear `components/game-over-modal.tsx` (cliente) con guardado en `av_scores`, el toast y los botones JUGAR DE NUEVO / VOLVER AL VAULT. Conectarlo al botón FIN del Reproductor.
11. Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (cliente) con chips por juego, podio, tabla y fila "TU MEJOR MARCA".
12. Crear `app/auth/page.tsx` y `components/auth-form.tsx` (cliente) con tabs, campos y submit (`login` + `router.push("/")`). "JUGAR COMO INVITADO" ejecuta `logout` + `router.push("/")`.
13. Limpieza: sustituir los `style={{}}` inline de la plantilla por utilidades Tailwind con los tokens del tema, eliminar de `app/globals.css` las reglas sin uso (`.coin-counter`, `.auth-divider`, `.social`, `.tw-section`, `.tw-label`) y verificar `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores y genera estáticamente `/juegos/[id]` y `/juegos/[id]/jugar` para los 8 juegos.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en ninguna de las 5 pantallas.
- [ ] `/` muestra el hero "ARCADE VAULT", el buscador, 5 chips de categoría y 8 tarjetas.
- [ ] Escribir "ser" en el buscador deja solo la tarjeta SERPENTINA.
- [ ] Pulsar el chip PUZZLE deja solo la tarjeta CAÍDA.
- [ ] Buscar "zzz" muestra "NO HAY RESULTADOS".
- [ ] Mover el ratón sobre una tarjeta la inclina en 3D, y al salir vuelve a su posición.
- [ ] Hacer clic en una tarjeta o en su botón JUGAR navega a `/juegos/<id>`.
- [ ] `/juegos/caida` muestra título, tags, descripción larga, `stat-strip` con partidas, mejor global y dificultad, y un leaderboard de 10 filas con las tres primeras en oro, plata y bronce.
- [ ] La pestaña del navegador en `/juegos/caida` muestra el título del juego.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la página 404 arcade con un botón que vuelve a `/`.
- [ ] "▶ JUGAR AHORA" navega a `/juegos/<id>/jugar`.
- [ ] En el Reproductor la puntuación sube sola y PAUSA la detiene y muestra "EN PAUSA". REANUDAR la reanuda.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación final congelada.
- [ ] El input de iniciales convierte a mayúsculas y no admite más de 10 caracteres.
- [ ] GUARDAR PUNTUACIÓN añade una entrada `{ game, score, name, at }` a `localStorage["av_scores"]` y muestra `▸ PUNTUACIÓN GUARDADA_`.
- [ ] JUGAR DE NUEVO reinicia puntuación a 0, vidas a 3 y nivel a 01.
- [ ] SALIR vuelve a `/juegos/<id>`.
- [ ] En `/auth`, la pestaña CREAR CUENTA muestra el campo de correo y la pestaña INICIAR SESIÓN lo oculta.
- [ ] Enviar el formulario con usuario "px_kai" guarda `{"name":"PX_KAI"}` en `localStorage["av_user"]`, navega a `/` y la Nav muestra "PX_KAI ▾".
- [ ] Recargar la página mantiene la sesión.
- [ ] Clic en "PX_KAI ▾" abre el desplegable. "Cerrar sesión" borra `av_user` y la Nav vuelve a mostrar "Iniciar Sesión".
- [ ] El desplegable se cierra al hacer clic fuera y al pulsar `Esc`.
- [ ] "JUGAR COMO INVITADO" borra `av_user` y navega a `/`.
- [ ] En el Reproductor, el HUD muestra el nombre del usuario logueado, o "INVITADO" si no hay sesión.
- [ ] `/salon` muestra un chip por juego, el podio en orden 02-01-03 y una tabla de 12 filas. Cambiar de chip cambia los datos.
- [ ] Con sesión iniciada y una puntuación guardada para ese juego, el Salón muestra la fila "TU MEJOR MARCA" con esa puntuación, su rango calculado y su fecha.
- [ ] Sin sesión, o sin puntuaciones de ese juego, la fila "TU MEJOR MARCA" no aparece.
- [ ] El enlace activo de la Nav es "Biblioteca" en `/`, `/juegos/*` y `/juegos/*/jugar`, y "Salón de la Fama" en `/salon`.
- [ ] A 375px de ancho los enlaces de la Nav se ocultan, aparece la hamburguesa, el panel lateral se abre, y al pulsar un enlace se cierra y navega.
- [ ] A 375px ninguna pantalla genera scroll horizontal.
- [ ] No aparecen ni el contador "CRÉDITOS · 03" ni los botones GOOGLE / GITHUB.
- [ ] No queda ningún `style={{}}` inline en los componentes.

## Decisiones

- **Sí:** rutas reales de App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/auth`). Dan URLs compartibles y aprovechan Server Components.
- **No:** SPA con estado en `location.hash` como la plantilla. Copia literal, pero desaprovecha el framework.
- **Sí:** sesión y puntuaciones simuladas en `localStorage` con las mismas claves que la plantilla (`av_user`, `av_scores`). Es suficiente para un MVP visual.
- **No:** estado solo en memoria, o UI totalmente estática. Se perdería la demostración del flujo login → jugar → guardar → ver tu marca.
- **Sí:** `useSyncExternalStore` para leer `localStorage`. Evita errores de hidratación y sincroniza Nav, Reproductor y Salón sin un Context Provider.
- **Sí:** Reproductor con la simulación de la plantilla (contador con `setInterval`, arena CSS). Es solo visual y no se implementa ningún juego.
- **Sí:** reusar las clases ya portadas en `app/globals.css`. Tailwind solo para sustituir los estilos inline. Así el diseño no diverge de la plantilla.
- **No:** reescribir todo con utilidades Tailwind. Más trabajo y más riesgo de romper el diseño.
- **Sí:** rankings mock deterministas con `seededScores` y las mismas semillas que la plantilla, más la fila "TU MEJOR MARCA" con datos reales de `av_scores`.
- **No:** insertar `av_scores` dentro del top mock. Es más lógica de la que pide un MVP visual.
- **No:** fila de usuario inventada como en la plantilla. Mostrar un rango falso al usuario es engañoso.
- **Sí:** `notFound()` + `app/not-found.tsx` con estética arcade, y rutas pre-generadas con `generateStaticParams`.
- **No:** redirigir en silencio a `/`. Oculta el error al usuario.
- **Sí:** pestaña del Salón en estado de cliente. Evita `searchParams` dinámicos, que con `cacheComponents` obligan a usar `<Suspense>`.
- **Sí:** desplegable de usuario con "Cerrar sesión", en lugar del clic directo de la plantilla, que cerraba sesión por accidente.
- **Sí:** se eliminan los botones GOOGLE/GITHUB y el contador CRÉDITOS. Prometen funcionalidad que no existe.
- **Sí:** se mantiene el tilt 3D de las tarjetas (componente cliente).
- **Sí:** el nombre del producto es "Arcade Vault", como en las plantillas y CLAUDE.md. El prompt inicial decía "Arcade Bot", pero se interpretó como el mismo producto.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Error de hidratación al leer `localStorage` en el render | `useSyncExternalStore` con `getServerSnapshot` → `null`. El servidor siempre renderiza como invitado y el cliente se actualiza tras hidratar. |
| `localStorage` bloqueado (modo privado o cuota llena) | Todas las lecturas y escrituras van envueltas en `try/catch`. La app sigue funcionando como invitado y el guardado falla en silencio. |
| `cacheComponents` exige `<Suspense>` para datos dinámicos | Las páginas solo usan `params` con `generateStaticParams`, y todo lo dinámico (localStorage, temporizadores) vive en Client Components. Si el build lo exige, se envuelve en `<Suspense>`. |
| APIs de Next 16 distintas a las conocidas (`params` como `Promise`, `PageProps`) | Consultar `node_modules/next/dist/docs/` antes de cada API, como indica AGENTS.md. |
| `setInterval` del Reproductor sigue activo al salir de la ruta | Limpieza en el `return` del `useEffect`, y el intervalo se detiene cuando `paused` u `over` son `true`. |
| `toLocaleString("es-ES")` distinto entre servidor y cliente | Las cifras formateadas en Server Components son mock y se calculan en build. En cliente solo se formatean valores que no se renderizan en el servidor. |

## Lo que **no** está en esta spec

- Juegos reales jugables.
- Backend, base de datos y API.
- Autenticación real y OAuth (Google/GitHub).
- Sistema de créditos.
- Ranking global que incluya las puntuaciones guardadas.
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.

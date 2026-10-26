# SPEC 02 — Home (landing) de Arcade Vault

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-26
> **Objetivo:** Implementar en `/` la landing de `references/templates/home-about/home.jsx` y mover la Biblioteca y las páginas de juego bajo `/games`.

## Por qué existe esta spec

En SPEC 01 la Biblioteca ocupa `/`, porque la plantilla original no tenía landing.
La nueva plantilla `references/templates/home-about/` añade un Home de marketing (hero, features, juegos, estadísticas, actividad, precios y CTA final) y lo separa de la Biblioteca.
Esta spec porta ese Home 1:1 a App Router y reorganiza las rutas de juegos bajo `/games` para que `/` quede libre.

## Alcance

**Dentro:**

- **Home** (`/`, `app/page.tsx`) con las siete secciones de `home.jsx`, en este orden:
  1. Hero: siluetas pixel flotantes (8 SVG, `aria-hidden`), eyebrow `▸ INSERTA UNA MONEDA_` con `blink`, título en tres líneas "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA", subtítulo, CTAs "▶ EXPLORAR JUEGOS" (`/games`) y "✦ CREAR CUENTA" (`/auth`), e indicador "DESLIZA ▼".
  2. `// 01` "¿POR QUÉ ARCADE VAULT?": 4 `feature-card` con iconos pixel (GAMEPAD, FREE, TROPHY, ROCKET).
  3. `// 02` "JUEGOS DISPONIBLES AHORA": rail con los 6 primeros juegos de `GAMES` como `mini-card` enlazadas a `/games/[id]`, y botón "VER TODOS LOS JUEGOS →" (`/games`).
  4. Franja de estadísticas: 3 `stat-block`.
  5. `// 03` "ACTIVIDAD EN VIVO": ticker "▸ ÚLTIMAS PUNTUACIONES" (7 filas) y "▸ TOP JUGADORES · HOY" (5 filas con barra) con el enlace "VER SALÓN →" (`/salon`).
  6. `// 04` "PRECIOS": tarjeta "JUGADOR VAULT" ($0 / SIEMPRE, lista de 6 ventajas, botón "EMPEZAR GRATIS →" a `/auth`, sello "FREE PLAY") y 3 FAQ.
  7. CTA final "¿LISTO PARA JUGAR?" con el botón "INSERTAR MONEDA →" (`/games`).
- Animación `reveal` al entrar en el viewport (IntersectionObserver, umbral 0.12, se aplica una sola vez).
- Respeto de `prefers-reduced-motion: reduce`: sin `reveal` (contenido visible desde el inicio), sin `pulse`, sin siluetas flotando, sin `blink` ni flecha animada.
- Estilos del Home portados de `references/templates/home-about/styles.css` a `app/globals.css` (solo las reglas del Home: `.home*`, `.hero-eyebrow`, `.hero-scroll`, `.section-*`, `.kicker`, `.feature-*`, `.ft-*`, `.mini-*`, `.stat-block`, `.stats-inner`, `.stat-n/u/s`, `.activity-*`, `.ac-*`, `.ticker`, `.tick-row`, `.tk-*`, `.top-*`, `.tp-*`, `.pricing-*`, `.price-card`, `.pc-*`, `.faq-*`, `.final-*`, `.reveal`, y sus keyframes y media queries).
- Copia ajustada al catálogo real:
  - La feature "JUEGOS CLÁSICOS" nombra juegos propios en lugar de marcas reales: "Bloque Buster, Caída, Serpentina y muchos más. Los mejores arcades de todos los tiempos en un solo lugar."
  - La primera estadística muestra `GAMES.length` ("8") en lugar de "12+", con "JUEGOS" / "Y CONTANDO".
  - El ticker guarda el `id` del juego y muestra su `title` de `GAMES` (en mayúsculas: "▸ CAÍDA").
- **Reorganización de rutas:**
  - Biblioteca: `/` → `/games` (`app/games/page.tsx`, con el hero "ARCADE VAULT" y `components/library.tsx` actuales).
  - Detalle: `/juegos/[id]` → `/games/[id]`.
  - Reproductor: `/juegos/[id]/jugar` → `/games/[id]/jugar`.
  - La carpeta `app/juegos/` se renombra a `app/games/`.
- **Enlaces actualizados:**
  - `→ /games`: "VOLVER AL VAULT" (Detalle y modal FIN DEL JUEGO), "VOLVER A LA BIBLIOTECA" (404 y Salón) y el enlace "Biblioteca" de la Nav.
  - `→ /`: el logo de la Nav, el submit de Auth y "JUGAR COMO INVITADO".
  - `→ /games/[id]` y `/games/[id]/jugar`: `game-card`, "▶ JUGAR AHORA" y "SALIR".
- **Nav:** nuevo enlace "Inicio" (`/`) antes de "Biblioteca", en la barra y en el panel móvil.
  - "Inicio" está activo solo en `/`.
  - "Biblioteca" está activo en `/games`, `/games/*` y `/games/*/jugar`.
- `metadata` del Home (título de pestaña "Arcade Vault") y de `/games` ("Biblioteca · Arcade Vault").

**Fuera de alcance (para futuras specs):**

- Página "Acerca de" (`about.jsx`), su formulario de contacto y el enlace "Acerca de" de la Nav (va en la SPEC 03).
- Datos reales o derivados de `av_scores` en "ACTIVIDAD EN VIVO" o en las estadísticas.
- Abrir `/auth` directamente en la pestaña CREAR CUENTA (`?modo=registro`).
- Cambiar los CTAs del Home según haya sesión o no.
- Redirecciones de las URLs antiguas `/juegos/*`.
- El contador "CRÉDITOS · 03" de la Nav de la plantilla (sigue eliminado, como en SPEC 01).
- Los estilos nuevos de la plantilla para el Reproductor (`.gp-*`) y cualquier otra regla que no sea del Home.
- Tests automatizados.

## Modelo de datos

Esta feature no introduce estructuras persistentes. Reutiliza `GAMES` de `lib/games.ts` (SPEC 01).

Datos mock del Home en `lib/home.ts`, copiados de `home.jsx` y tipados:

```ts
import type { AccentColor } from "@/lib/games";

export type Feature = {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;       // "JUEGOS CLÁSICOS"
  desc: string;
  color: AccentColor;
};

export type HomeStat = { n: string; u: string; s: string }; // { n: "8", u: "JUEGOS", s: "Y CONTANDO" }

export type RecentScore = {
  player: string;      // "NEONFOX"
  gameId: string;      // id de GAMES: "caida"; se muestra getGame(gameId).title
  score: number;       // 184220
  ago: string;         // "hace 2 min"
  color: AccentColor;
};

export type TopPlayer = { rank: number; player: string; score: number };

export type Faq = { q: string; a: string };

export const FEATURES: Feature[];          // 4
export const HOME_STATS: HomeStat[];       // 3, la primera usa String(GAMES.length)
export const RECENT_SCORES: RecentScore[]; // 7
export const TOP_PLAYERS: TopPlayer[];     // 5
export const PRICING_PERKS: string[];      // 6
export const FAQS: Faq[];                  // 3
```

Convenciones:

- Las puntuaciones se formatean con `toLocaleString("es-ES")`, como en SPEC 01.
- El rango del top se muestra como `#01`…`#05` (`padStart(2, "0")`).
- El ancho de la barra del top es `100 - i * 16` %, como en la plantilla.

## Plan de implementación

Antes del paso 1 se invoca `/frontend-design` (obligatorio según CLAUDE.md) para revisar el Home y el estado de reducir movimiento. El diseño se mantiene fiel a la plantilla.
Antes de mover rutas o usar `generateStaticParams`, `PageProps` o `metadata`, se consulta `node_modules/next/dist/docs/`.

1. Mover `app/juegos/` a `app/games/` y actualizar los tipos `PageProps<"/games/[id]">` y `PageProps<"/games/[id]/jugar">`. Actualizar los enlaces de `game-card`, "▶ JUGAR AHORA" y "SALIR". Verificación: `/games/caida` y `/games/caida/jugar` cargan.
2. Mover la Biblioteca de `app/page.tsx` a `app/games/page.tsx` con su `metadata`. Dejar en `app/page.tsx` un placeholder temporal. Verificación: `/games` muestra las 8 tarjetas.
3. Actualizar los enlaces a `/games` (VOLVER AL VAULT, VOLVER A LA BIBLIOTECA) y a `/` (logo, Auth). Añadir "Inicio" a la Nav y cambiar `sectionOf` para los estados activos. Verificación: `grep -r "/juegos" app components lib` no devuelve nada.
4. Crear `lib/home.ts` con los tipos y constantes del modelo de datos. Verificación: `npx tsc --noEmit` pasa.
5. Portar a `app/globals.css` las reglas del Home de `styles.css`, incluidos keyframes y media queries. Sustituir los `transitionDelay` y anchos inline por reglas `:nth-child` en CSS.
6. Crear `components/home/floating-silhouettes.tsx` y `components/home/feature-icon.tsx` (Server Components, SVG puros).
7. Crear `components/home/reveal-observer.tsx` (cliente): observa los `.reveal` y añade `.in`. Con `prefers-reduced-motion: reduce` el CSS muestra `.reveal` sin transición.
8. Reemplazar `app/page.tsx` por el Home (Server Component): hero, features, rail de `mini-card` con `<Link>`, estadísticas y CTA final, con su `metadata`.
9. Añadir al Home las secciones "ACTIVIDAD EN VIVO" y "PRECIOS" con los datos de `lib/home.ts`.
10. Añadir el bloque `@media (prefers-reduced-motion: reduce)` para `reveal`, `pulse`, siluetas, `blink` y `hero-scroll`. Verificar `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores y genera estáticamente `/`, `/games`, `/games/[id]` y `/games/[id]/jugar` para los 8 juegos.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/` ni en `/games`.
- [ ] `/` muestra el hero con "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA", el eyebrow "▸ INSERTA UNA MONEDA_" y los botones "▶ EXPLORAR JUEGOS" y "✦ CREAR CUENTA".
- [ ] `/` muestra las 7 secciones en el orden del alcance, con los kickers `// 01` a `// 04`.
- [ ] El hero muestra 8 siluetas pixel decorativas que no se anuncian a lectores de pantalla (`aria-hidden="true"`).
- [ ] La sección `// 01` muestra 4 tarjetas, y ninguna menciona "Arkanoid", "Tetris" ni "Snake".
- [ ] La sección `// 02` muestra 6 `mini-card`, y clic en una navega a `/games/<id>`.
- [ ] La primera estadística muestra "8".
- [ ] El ticker muestra 7 filas y el top muestra 5 filas con rangos `#01` a `#05` y barras decrecientes.
- [ ] La tarjeta de precios muestra "$0", 6 ventajas y el sello "FREE PLAY", y hay 3 FAQ.
- [ ] "▶ EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/games`.
- [ ] "✦ CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`.
- [ ] "VER SALÓN →" navega a `/salon`.
- [ ] Al hacer scroll, cada sección `reveal` aparece con su animación una sola vez.
- [ ] Con "reducir movimiento" activo en el sistema (o emulado), todas las secciones son visibles sin hacer scroll y no hay elementos animados.
- [ ] La pestaña del navegador muestra "Arcade Vault" en `/` y "Biblioteca · Arcade Vault" en `/games`.
- [ ] `/games` muestra el hero "ARCADE VAULT", el buscador, 5 chips y 8 tarjetas, igual que la antigua `/`.
- [ ] `/games/caida` muestra el detalle y `/games/caida/jugar` el Reproductor.
- [ ] `/juegos/caida` muestra la página 404 arcade.
- [ ] "VOLVER AL VAULT" (Detalle y modal) y "VOLVER A LA BIBLIOTECA" (404 y Salón) navegan a `/games`.
- [ ] El logo de la Nav, el submit de Auth y "JUGAR COMO INVITADO" navegan a `/`.
- [ ] La Nav muestra "Inicio", "Biblioteca" y "Salón de la Fama", en ese orden, en la barra y en el panel móvil.
- [ ] "Inicio" está activo en `/`; "Biblioteca" está activo en `/games`, `/games/caida` y `/games/caida/jugar`; ninguno de los dos lo está en `/salon`.
- [ ] La Nav no muestra "Acerca de" ni "CRÉDITOS · 03".
- [ ] A 375px de ancho `/` no genera scroll horizontal de página.
- [ ] No queda ningún `style={{}}` inline en los componentes del Home.
- [ ] `grep -r "/juegos" app components lib` no devuelve resultados.

## Decisiones

- **Sí:** Home en `/` y Biblioteca en `/games`. Separa la landing del catálogo, como la plantilla.
- **Sí:** Detalle y Reproductor en `/games/[id]` y `/games/[id]/jugar`. Todo lo del catálogo cuelga de la misma raíz.
- **No:** mantener `/juegos/[id]`. Mezclaría `/games` y `/juegos`.
- **No:** URLs del Reproductor en inglés (`/play`). Se mantiene `/jugar` como en SPEC 01.
- **No:** redirecciones de `/juegos/*`. La app no está publicada, así que no hay enlaces externos que preservar.
- **Sí:** los botones de "volver" van a `/games`, y el logo y el flujo de Auth van a `/`. Volver significa regresar al catálogo; entrar o salir de sesión lleva a la portada.
- **Sí:** "Acerca de" en una spec aparte (SPEC 03). Tiene formulario con validación propia y no forma parte del Home.
- **No:** enlace "Acerca de" en la Nav sin página. Sería un enlace roto.
- **Sí:** datos de "ACTIVIDAD EN VIVO" como mock estático tipado en `lib/home.ts`. El Home queda 100% servidor y sin riesgo de hidratación.
- **No:** mezclar `av_scores` en el ticker. Más lógica de la que pide una landing.
- **Sí:** el ticker guarda `gameId` y muestra `getGame(gameId).title`, en lugar del nombre en mayúscula inicial de la plantilla ("Caída"). El nombre no puede desincronizarse del catálogo y la tipografía en mayúsculas encaja con el resto del Home. Decidido durante la implementación del paso 4.
- **Sí:** barras del top visibles. `.tp-fill` recibe un fondo degradado con el color del puesto (oro, plata, bronce y cian) y anchos 100/84/68/52/36 % por `:nth-child`, en lugar del degradado fijo `.top-row::before`. La plantilla no estilaba `.tp-fill`, así que sus barras eran invisibles. Decidido durante la implementación del paso 5.
- **Sí:** `.mini-card` y `.lb-link` añaden `display`, `color: inherit` y `text-decoration: none` porque pasan de `<div>`/`<button>` a `<Link>`, y comparten el estilo `:hover` con `:focus-visible` para la navegación por teclado. Decidido durante la implementación del paso 5.
- **Sí:** `.activity-card` lleva `min-width: 0`. Sin él, la columna `1fr` de `.activity-grid` crecía hasta el contenido mínimo de la tarjeta y la página desbordaba 12px a 375px. La plantilla tiene el mismo fallo. Detectado al verificar con Playwright en el paso 9.
- **Sí:** regla `.hero-eyebrow .blink` para que el `_` del eyebrow parpadee, como pide el alcance. En la plantilla no parpadeaba porque `.blink` solo se animaba dentro de `.av-hero .sub`. Detectado al verificar el paso 10.
- **Sí:** copia ajustada al catálogo real ("8" juegos, nombres propios). Evita prometer juegos que no existen y nombrar marcas ajenas.
- **No:** copiar "12+" y "Arkanoid, Tetris, Snake" 1:1.
- **Sí:** CTAs de cuenta a `/auth` sin parámetros. No requiere tocar `auth-form` ni leer `searchParams`, que con `cacheComponents` obligan a `<Suspense>`.
- **No:** ocultar los CTAs con sesión. Añade estado de cliente y parpadeo para poco beneficio.
- **Sí:** respetar `prefers-reduced-motion`. El `reveal` oculta contenido y las siluetas se mueven sin parar, lo que molesta a usuarios sensibles al movimiento.
- **Sí:** el Home es un Server Component, y solo `reveal-observer` es cliente. Minimiza JavaScript en la portada.
- **Sí:** `mini-card` como `<Link>` en lugar del `<div onClick>` de la plantilla. Es navegable por teclado y prefetchable.
- **Sí:** los retardos escalonados y anchos de barra pasan de `style` inline a `:nth-child` en CSS. Mantiene la regla de SPEC 01 de no dejar `style={{}}` inline.
- **Sí:** solo se portan los estilos del Home. Los estilos `.gp-*` y los de "Acerca de" llegan con sus propias specs.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Con JS desactivado o lento, las secciones `reveal` quedan invisibles | El estado oculto de `.reveal` solo se aplica cuando `reveal-observer` ha montado (clase en el contenedor `.home`). Sin JS todo se ve. |
| Las reglas portadas de `styles.css` pisan reglas existentes de `globals.css` | Se portan solo selectores del Home. Antes de pegar se busca cada selector en `globals.css`, y si ya existe (por ejemplo `.btn.xl`) se conserva la versión actual. |
| Enlaces olvidados a `/juegos` o a `/` como Biblioteca | Criterio de `grep -r "/juegos"` y revisión de cada `href="/"` listado en el alcance. |
| Tipos `PageProps<"/games/...">` ausentes tras el renombrado | Ejecutar `npm run dev` o `npm run build` para regenerar `.next/types`, como indica CLAUDE.md. |
| El rail de `mini-card` o la tarjeta de precios desbordan a 375px | Verificar con Playwright a 375px. El rail hace scroll horizontal dentro de su contenedor, nunca a nivel de página. |
| `toLocaleString("es-ES")` distinto entre servidor y cliente | Las cifras del Home se renderizan solo en el servidor (Server Component), así que no hay desajuste de hidratación. |

## Lo que **no** está en esta spec

- Página "Acerca de" y formulario de contacto.
- Actividad o estadísticas con datos reales.
- Redirecciones de `/juegos/*`.
- CTAs dependientes de la sesión.
- Estilos nuevos del Reproductor (`.gp-*`).
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.

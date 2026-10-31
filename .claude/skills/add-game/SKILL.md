---
name: add-game
description: Genera la spec de un juego real para Arcade Vault (motor TS + player React + leaderboard en Supabase), portado desde references/started-games o diseñado desde cero. Úsala antes de añadir o portar un juego.
disable-model-invocation: true
model: sonnet
argument-hint: 'carpeta de referencia o descripción del juego (ej. "03-tetris")'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(grep:*)
---

# /add-game — Spec de un juego real con leaderboard

## Contexto de la sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la inventes):
!`date +%F`

Specs que ya existen:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay juegos de referencia"`

Catálogo actual (ids y qué entradas ya tienen motor real):
!`grep -n "id: \|engine" lib/games.ts`

---

Esta skill **solo escribe una spec**: `specs/NN-juego-<slug>.md`. No escribe código. La spec describe cómo convertir un juego en un juego real de la plataforma, con su motor, su player, su entrada en el catálogo y su leaderboard en Supabase, siguiendo el patrón que fijaron SPEC 05 (ROCAS) y SPEC 06 (leaderboard). La implementación la hace el usuario después con `/spec-impl`.

Archivos de esta skill que debes leer siempre:

- `platform-contract.md`: el contrato que toda spec de juego debe respetar (motor, player, catálogo, leaderboard, criterios y plan tipo).
- `spec-template.md`: el esqueleto de la spec, con el formato exacto de las specs del repo.

Y de la skill `/spec`:

- `.claude/skills/spec/template.md`: la norma general de una spec (secciones obligatorias, reglas de cada sección y errores a evitar). Si no existe, sigue sin ella y avisa al usuario al cerrar.

Precedencia si hay conflicto: specs existentes del repo (idioma, estados, títulos de sección) > `spec-template.md` de esta skill (contenido de juego) > `template.md` de `/spec` (reglas generales).

Responde siempre en el idioma del prompt inicial (normalmente español). La spec se escribe en español, como las existentes.

## Fase 1 — Contexto

1. Lee `CLAUDE.md` (y `AGENTS.md`, que importa).
2. Lee `specs/05-juego-asteroides-rocas.md` y `specs/06-leaderboard-supabase.md`. Son el modelo de redacción, nivel de detalle y vocabulario.
3. Lee `platform-contract.md` y `spec-template.md` de esta skill, y `.claude/skills/spec/template.md`.
4. Lee el código que la spec va a tocar o imitar: `lib/games.ts`, `components/game-player.tsx`, `components/asteroids-player.tsx`, los tipos exportados de `games/asteroids/engine.ts` y el listado de `supabase/migrations/`.
5. Si en `specs/` ya hay una spec del mismo juego, dilo y pregunta si se trata de ampliarla o de otra distinta.

## Fase 2 — Origen del juego

Interpreta `$ARGUMENTS`:

- **Con referencia** (nombra una carpeta de `references/started-games/`, aunque sea parcialmente, p. ej. `tetris`): lee su `CLAUDE.md`, `README.md`, `index.html`, `game.js` y cualquier otro archivo o asset. Extrae y anota:
  - Mecánicas y **constantes numéricas** (física, velocidades, puntos, vidas, niveles, probabilidades, tiempos). La spec debe fijarlas para que el port sea verificable.
  - Controles y teclas.
  - Lo que el canvas o el DOM dibujan como HUD (puntuación, vidas, nivel, siguiente pieza…) y los overlays de inicio, pausa y game over. Todo eso se sustituye por el HUD y los overlays de React.
  - Resolución lógica y proporción del área de juego.
  - Dependencias problemáticas: globals, `document.getElementById`, listeners que nunca se quitan, bucles que no se detienen, archivos extra (`levels.js`, `style.css`), assets e imágenes.
  - Si el original guarda récords en `localStorage`, la spec lo elimina: el ranking es el de Supabase.
- **Desde cero** (no hay carpeta, o el usuario describe un juego nuevo): no busques archivos. Pide el diseño: mecánica principal, objetivo, cómo se puntúa, cómo termina la partida, controles, progresión por niveles. Debe ser un diseño original o de un género (p. ej. "un shooter vertical de oleadas"), no la recreación de un juego comercial concreto. Si el usuario pide copiar uno, propón una variante original del género.
- **Sin argumentos**: pregunta en una frase qué juego quiere añadir y si parte de una carpeta de referencia.

## Fase 3 — Preguntas

Pregunta en bloques de 3 a 4 con `AskUserQuestion`, poniendo tu recomendación primero y marcada como `(Recomendado)`. No preguntes lo que ya se deduce del código o de la referencia. Cubre siempre:

1. **Entrada del catálogo.** ¿Reutiliza una entrada simulada (sin `engine`) o crea una nueva? Sugiere la entrada simulada que encaja por `cover`, `cat` y descripción (p. ej. un juego de piezas que caen → `caida`; uno de romper bloques → `bloque-buster`). Si se reutiliza: ¿se ajusta `long` para que no prometa mecánicas que el juego no tiene? Si es nueva: `id`, `title`, `short`, `long`, `cat`, `color` y una clase `cover-*` nueva.
2. **Nombre del motor.** Valor nuevo de `GameEngine` (inglés, kebab o una palabra, p. ej. `"tetris"`), que también nombra `games/<engine>/` y `components/<engine>-player.tsx`.
3. **Fidelidad.** ¿Mecánica idéntica al original o con cambios? Lista los cambios y lo que queda fuera (sonido, mecánicas extra, táctil…).
4. **HUD.** Qué stats muestra el `.player-hud` además de Jugador y Puntuación (vidas, nivel, líneas, siguiente pieza, power-ups…) y qué callback del motor alimenta cada uno.
5. **Encaje en la CRT 4:3.** La `.crt-screen` es 4:3. Si el juego no lo es (p. ej. un tablero vertical de 300×600), ¿lienzo lógico 4:3 con el tablero centrado y paneles laterales dibujados en el canvas, o tablero escalado con bandas? Recomienda una resolución lógica concreta.
6. **Inicio, pausa y controles.** Overlay de inicio con leyenda de teclas (`PULSA ESPACIO PARA EMPEZAR` o la tecla que corresponda), teclas de pausa, aviso táctil. Si el juego usa Espacio para algo distinto de empezar, decide qué tecla empieza.
7. **Assets.** Si hay imágenes o sonidos, dónde viven (`public/games/<engine>/`) y cómo se cargan sin romper el prerender.
8. **Puntuación.** Debe ser un entero entre 0 y 10.000.000 (check de `public.scores`). Si el juego puede superarlo, decide cómo se acota.

Si una respuesta abre otro proyecto (multijugador, online, editor de niveles, sonido completo, controles táctiles completos), señálalo y propón dejarlo para su propia spec.

Para de preguntar cuando puedas responder sin suponer nada:

- ¿Qué archivos aparecen o cambian?
- ¿Cuál es el primer paso ejecutable y cuál el último?
- ¿Cómo se verifica que está terminado?

## Fase 4 — Escribir la spec

Con toda la información, escribe la spec completa de una vez (sin pedir confirmación sección por sección), usando `spec-template.md` como esqueleto y `platform-contract.md` como lista de obligaciones:

- **Número:** el siguiente al mayor de `specs/`, con dos dígitos.
- **Slug:** `juego-<algo>` en kebab-case, al estilo de `05-juego-asteroides-rocas` (p. ej. `07-juego-tetris`).
- **Cabecera:** `> **Estado:** Borrador`, `> **Depende de:** SPEC 05, SPEC 06` (más las que apliquen; comprueba que existen), la fecha del contexto y un objetivo de una sola frase.
- Todo lo del contrato que aplique va en la spec de forma explícita y concreta para este juego: nombres reales de archivos, funciones, callbacks, constantes, id del juego y nombre de la migración.
- Los criterios de aceptación estándar del contrato se adaptan al juego y se añaden los específicos (valores numéricos de la mecánica, HUD, controles).
- La sección **Decisiones** recoge lo que decidió el usuario en la Fase 3, con **Sí:**/**No:** y una justificación breve.
- Si el usuario se saltó preguntas, regístralo en Decisiones ("Definición rápida sin aclaración detallada").
- Aplica las reglas de `.claude/skills/spec/template.md`: el objetivo cabe en una frase, el **Fuera de alcance** es explícito, cada paso del plan deja el sistema funcional y no se sale del alcance, los criterios son booleanos y verificables (nada de "que funcione bien"), y no se asumen nombres o estructuras que el usuario no confirmó.

Escribe el archivo directamente en `specs/NN-juego-<slug>.md` sin pedir permiso. Solo pregunta si el archivo ya existe.

Si no existe `specs/.spec-config.yml`, créalo con este contenido (lo usa `/spec-impl`). Si existe, no lo toques:

```yaml
# spec workflow configuration
#
# AutoCreateBranch — controls whether /spec-impl creates the git branch automatically.
#   true  (default) → /spec-impl creates and switches to spec-NN-slug without asking
#   false           → /spec-impl asks for [y/N] confirmation before creating the branch
AutoCreateBranch: true
```

## Fase 5 — Cierre

Confirma al usuario:

- La ruta del archivo creado.
- Que está en `Borrador` y debe cambiarlo a `Aprobado` cuando lo haya revisado.
- Si acabas de crear `specs/.spec-config.yml`, que existe y que `AutoCreateBranch: true` hace que `/spec-impl` cree la rama sin preguntar.
- Si no encontraste `.claude/skills/spec/template.md`, dilo.
- El siguiente paso: `/spec-impl NN-juego-<slug>`.

**Para aquí.** No propongas implementar ni escribas código.

## Reglas duras

- Nunca escribas código ni toques archivos fuera de `specs/`.
- La spec nunca debe hacer que la app importe nada de `references/`.
- No refactorices ROCAS ni crees una interfaz `GameEngine` compartida: el contrato es una convención documentada (ver `platform-contract.md`).
- No inventes decisiones que el usuario no confirmó. Si falta información, vuelve a la Fase 3.
- Un juego por spec. Si piden varios, propón una spec por juego.

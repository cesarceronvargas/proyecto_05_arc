# SPEC 04 — Conexión base de Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 03
> **Fecha:** 2026-10-28
> **Objetivo:** Conectar la app de Next.js al proyecto de Supabase con clientes tipados para servidor y navegador y refresco de sesión en el proxy, sin tablas ni cambios de UI.

## Por qué existe esta spec

Hoy la sesión (`av_user`) y las puntuaciones (`av_scores`) son simuladas en `localStorage` (`lib/storage.ts`).
Las siguientes specs (Auth real y puntuaciones en base de datos) necesitan una conexión a Supabase que funcione en Server Components, Server Actions, Client Components y el proxy.
Esta spec deja solo esa base, para que cada feature posterior se limite a su propio dominio.

## Alcance

**Dentro:**

- Dependencias nuevas: `@supabase/supabase-js` y `@supabase/ssr`.
- **Cliente de navegador** en `lib/supabase/client.ts`: `createClient()` con `createBrowserClient<Database>` de `@supabase/ssr`.
- **Cliente de servidor** en `lib/supabase/server.ts`: `async createClient()` con `createServerClient<Database>`, que lee y escribe cookies con `cookies()` de `next/headers`. `setAll` va en `try/catch`, porque los Server Components no pueden escribir cookies (el proxy se encarga de refrescarlas).
- **Refresco de sesión** en `lib/supabase/proxy.ts`: `updateSession(request: NextRequest): Promise<NextResponse>`, que crea un cliente de servidor sobre las cookies de la petición y la respuesta, llama a `supabase.auth.getClaims()` y devuelve la respuesta con las cookies actualizadas. No redirige ni protege ninguna ruta.
- **Proxy** en `proxy.ts` (raíz del proyecto, convención de Next 16 que sustituye a `middleware.ts`): delega en `updateSession` y exporta un `matcher` que excluye `_next/static`, `_next/image`, `favicon.ico` y las imágenes estáticas (`svg`, `png`, `jpg`, `jpeg`, `gif`, `webp`).
- Si faltan las variables de entorno, `updateSession` deja pasar la petición sin tocarla y registra un `console.warn`. La app sigue funcionando sin Supabase configurado.
- Los clientes se crean dentro de las funciones `createClient()`, nunca al importar el módulo, para que `npm run build` no falle sin variables.
- **Tipos** en `lib/supabase/database.types.ts`, generados desde el proyecto (`project_ref` `ejhpceatjpqrzyvisxyt`) y versionados. Con el esquema `public` vacío, el tipo `Database` no tiene tablas.
- **Variables de entorno** (en `.env.local`, que no se versiona):
  - `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto.
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave publishable `sb_publishable_…`.
- `.env.template` documenta las dos variables con un comentario cada una. Se quita la línea `SUPABASE_DB_PASSWORD`, porque la app no se conecta por Postgres directo y una contraseña no debe vivir en un archivo versionado.

**Fuera de alcance (para futuras specs):**

- Supabase Auth: reemplazar el login simulado de `/auth`, `av_user`, la Nav y el menú de usuario.
- Tablas, migraciones y políticas RLS (puntuaciones, perfiles).
- Migrar `av_scores` o cualquier dato de `localStorage` a Supabase.
- Rutas protegidas o redirecciones en el proxy.
- Ruta `/api/health` o cualquier ruta de diagnóstico.
- Supabase CLI y entorno local (`supabase start`), y un script `npm` para regenerar tipos.
- Clave `service_role` / secret key y cliente de administración.
- Storage, Realtime y Edge Functions.
- Tests automatizados.

## Modelo de datos

Esta spec no crea tablas ni datos persistentes. Las únicas estructuras nuevas son los tipos generados y las firmas de los clientes:

```ts
// lib/supabase/database.types.ts (generado, no se edita a mano)
export type Database = {
  public: {
    Tables: {};
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};

// lib/supabase/client.ts
export function createClient(): SupabaseClient<Database>;

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>;

// lib/supabase/proxy.ts
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse>;
```

Convenciones:

- Todo el código de Supabase vive en `lib/supabase/`. Los componentes importan `@/lib/supabase/client` o `@/lib/supabase/server`, nunca `@supabase/ssr` directamente.
- Ambos archivos exportan `createClient` con el mismo nombre. El import indica el entorno.
- `database.types.ts` se regenera cada vez que una spec cambie el esquema, y se incluye en el mismo commit que la migración.

## Plan de implementación

Antes del paso 1 se consulta `node_modules/next/dist/docs/` (Proxy en `01-app/03-api-reference/03-file-conventions/proxy.md`, `cookies` y variables de entorno) y la guía de Supabase para Next.js con `@supabase/ssr`.
Esta spec no tiene UI, así que no aplica `/frontend-design`.

1. Instalar `@supabase/supabase-js` y `@supabase/ssr`. Actualizar `.env.template` con las dos variables y quitar `SUPABASE_DB_PASSWORD`. Crear `.env.local` con la URL y la publishable key del proyecto (obtenidas con el MCP de Supabase). Verificación: `git status` no muestra `.env.local`.
2. Generar `lib/supabase/database.types.ts` desde el proyecto. Verificación: `npx tsc --noEmit` pasa.
3. Crear `lib/supabase/client.ts` y `lib/supabase/server.ts`. Verificación: `npx tsc --noEmit` pasa.
4. Crear `lib/supabase/proxy.ts` con `updateSession` y el caso de variables ausentes. Verificación: `npx tsc --noEmit` pasa.
5. Crear `proxy.ts` en la raíz con el `matcher`. Verificación: con `npm run dev`, `/`, `/games`, `/about` y `/auth` cargan igual que antes y sin errores en consola.
6. Comprobación de conexión manual con un script temporal fuera del repo (en el directorio scratch), ejecutado con `node --env-file=.env.local`. El script crea un cliente con `@supabase/supabase-js` y consulta una tabla inexistente. Verificación: Supabase responde `PGRST205` (tabla no encontrada) y no un error de autenticación o de red. El script no se versiona.
7. Ejecutar `npm run lint` y `npm run build` con las variables y sin ellas (renombrando `.env.local` temporalmente).

## Criterios de aceptación

- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr` en `dependencies`.
- [ ] Existen `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, `lib/supabase/database.types.ts` y `proxy.ts`.
- [ ] No existe `middleware.ts`.
- [ ] `npx tsc --noEmit` y `npm run lint` terminan sin errores.
- [ ] `npm run build` termina sin errores con `.env.local` y también sin él.
- [ ] Las rutas que eran estáticas o parcialmente estáticas en el build anterior lo siguen siendo.
- [ ] Con `npm run dev`, `/`, `/games`, `/games/caida`, `/salon`, `/about` y `/auth` cargan sin errores ni avisos de hidratación en la consola del navegador.
- [ ] Sin `.env.local`, esas mismas rutas cargan, y el servidor muestra el aviso de variables ausentes.
- [ ] El script de comprobación del paso 6 recibe `PGRST205` de Supabase, lo que confirma que la URL y la publishable key son válidas.
- [ ] Una petición a `/_next/static/...` o a `/favicon.ico` no pasa por el proxy (fuera del `matcher`).
- [ ] `.env.template` documenta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y no contiene `SUPABASE_DB_PASSWORD`.
- [ ] `.env.local` no aparece en `git status`.
- [ ] Ningún archivo fuera de `lib/supabase/` y `proxy.ts` importa `@supabase/ssr` ni `@supabase/supabase-js`.
- [ ] La UI no cambia: `lib/storage.ts` y sus consumidores siguen intactos.

## Decisiones

- **Sí:** spec solo de infraestructura. Auth real y puntuaciones tocan dominios distintos (UI de `/auth`, esquema, RLS) y van en specs propias.
- **No:** incluir Auth o la tabla de puntuaciones aquí. La spec mezclaría auth, base de datos y UI.
- **Sí:** `@supabase/ssr` para los clientes. Guarda la sesión en cookies, la comparten servidor y navegador, y es el paquete oficial para App Router.
- **No:** solo `@supabase/supabase-js` con sesión en `localStorage`. Los Server Components no verían la sesión.
- **Sí:** publishable key (`sb_publishable_…`) en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Es la clave que Supabase recomienda hoy y se puede rotar sin invalidar sesiones.
- **No:** anon key legacy.
- **Sí:** refrescar la sesión en `proxy.ts` desde ya. Es la pieza que la spec de Auth necesita y no cambia el comportamiento actual.
- **Sí:** `proxy.ts` en lugar de `middleware.ts`. Es la convención de Next 16.
- **Sí:** `getClaims()` en el proxy en lugar de `getSession()`. Valida el JWT, mientras que `getSession()` confía en la cookie sin verificarla.
- **Sí:** sin variables, el proxy deja pasar la petición. La app no depende todavía de Supabase y el build no debe romperse, igual que con Resend en SPEC 03.
- **Sí:** tipos generados y versionados en `lib/supabase/database.types.ts`. Los clientes quedan tipados desde el primer día y las specs siguientes solo regeneran el archivo.
- **No:** script `npm` para regenerar tipos. Requiere Supabase CLI con sesión iniciada, y por ahora se generan con el MCP.
- **Sí:** comprobación de conexión manual con un script temporal. No deja código de diagnóstico en la app.
- **No:** ruta `/api/health` ni tabla de prueba. Añaden código o esquema que ningún feature usa.
- **Sí:** quitar `SUPABASE_DB_PASSWORD` de `.env.template`. La app usa la API REST de Supabase, no Postgres directo, y la contraseña no debe estar en un archivo versionado.

## Riesgos

| Riesgo                                                                           | Mitigación                                                                                                                             |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Con `cacheComponents`, usar `cookies()` fuera de `<Suspense>` rompe el prerender | Esta spec no llama a `createClient()` de servidor desde ninguna página. Las specs que lo hagan deben envolver ese uso en `<Suspense>`. |
| El proxy añade latencia a todas las peticiones                                   | `matcher` excluye los estáticos. Sin cookie de sesión, `getClaims()` no hace ninguna llamada de red.                                   |
| El build falla sin variables de entorno                                          | Los clientes se crean dentro de las funciones y el proxy deja pasar si faltan variables. Hay un criterio de build sin `.env.local`.    |
| Se filtra una clave secreta al cliente                                           | Solo se usa la publishable key, que es pública por diseño. No se añade `service_role` ni secret key.                                   |
| `SUPABASE_DB_PASSWORD` llega al repositorio                                      | Se quita de `.env.template` antes del primer commit de esta spec.                                                                      |
| Los tipos quedan desactualizados respecto al esquema                             | Convención: cada spec que cambie el esquema regenera `database.types.ts` en el mismo commit.                                           |

## Lo que **no** está en esta spec

- Supabase Auth y cambios en `/auth`, la Nav o `lib/storage.ts`.
- Tablas, migraciones, RLS y migración de `av_scores`.
- Rutas protegidas, `/api/health` y cliente de administración.
- Supabase CLI, entorno local y script de tipos.
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.

# 📘 Estándares de Arquitectura y Desarrollo - Proyecto Virteex ERP

## 1\. Visión General del Workspace

Este repositorio es un **Monorepo Nx** que alberga el ecosistema completo de Virteex. El objetivo es maximizar la reutilización de código, mantener límites estrictos entre dominios y asegurar la escalabilidad horizontal de las 7 aplicaciones existentes.

### Aplicaciones del Ecosistema

| Aplicación | Tipo | Tecnología | Rol |
| :--- | :--- | :--- | :--- |
| **virteex-api** | Backend | NestJS | API Gateway y lógica de negocio central. |
| **virteex-web** | Frontend | Angular | Portal principal del cliente (ERP Web). |
| **virteex-admin** | Frontend | Angular | Administración general del sistema (Super Admin). |
| **virteex-site** | Frontend | Angular (SSR) | Sitio web público / Landing page. |
| **virteex-site-admin** | Frontend | Angular | CMS para el sitio público. |
| **virteex-desktop** | Desktop | Electron + Angular | Versión de escritorio (wrapper de la web o nativo). |
| **virteex-mobile** | Mobile | Ionic/Capacitor | Aplicación móvil para operaciones en campo. |

-----

## 2\. Arquitectura de Librerías (The Library Strategy)

Para evitar el acoplamiento y el "código espagueti", **toda la lógica de negocio debe vivir en `libs/`, no en `apps/`**. Las aplicaciones son solo contenedores ligeros que orquestan librerías.

### Estructura de Directorios

Usaremos una estructura basada en **DDD (Domain Driven Design)** agrupada por **Dominio de Negocio**:

`libs/[dominio]/[plataforma]-[tipo]-[nombre]`

### Convención de Nombres (Naming Convention)

Es obligatorio usar los siguientes prefijos para identificar dónde puede ejecutarse una librería:

  * **`api-`**: Librerías exclusivas de NestJS (Backend).
  * **`web-`**: Librerías exclusivas de Angular Web (`virteex-web`, `admin`, `site`).
  * **`mobile-`**: Librerías exclusivas de la App Móvil.
  * **`shared-`**: Librerías que contienen componentes visuales compartidos (Web/Mobile/Desktop).
  * **(Sin prefijo)**: Librerías agnósticas (Typescript puro, interfaces, DTOs compartidos).

### Tipos de Librerías

Dentro de cada dominio, las librerías se clasifican estrictamente en:

1.  **`domain`**:
      * **Contenido:** Entidades, Interfaces, Tipos, Enums y Lógica de negocio pura (validaciones simples).
      * **Dependencias:** Cero dependencias externas. Es el núcleo puro.
2.  **`data-access`**:
      * **Frontend:** Servicios HTTP, State Management (Signals/NGRX), Facades.
      * **Backend:** Repositorios TypeORM/Prisma, Servicios de conexión a DB.
3.  **`feature-[nombre]`**:
      * **Frontend:** "Smart Components" (Páginas), Rutas, Lógica de formularios.
      * **Backend:** Controladores, Servicios de Casos de Uso, Módulos.
4.  **`ui-[nombre]`**:
      * **Frontend:** "Dumb Components" (Botones, Gráficas, Cards) reutilizables. No inyectan servicios de datos, solo reciben `@Input()` y emiten `@Output()`.
5.  **`util-[nombre]`**:
      * Funciones auxiliares, formateadores de fecha, validadores regex.

#### Ejemplo de Estructura de Carpetas Correcta:

```text
libs/
├── sales/                          <-- Dominio
│   ├── domain/                     <-- Interfaces compartidas (API y Web usan esto)
│   ├── api-feature-orders/         <-- Controller NestJS
│   ├── api-data-access/            <-- Entities/Services NestJS
│   ├── web-feature-orders/         <-- Pages Angular (Rutas)
│   ├── web-data-access/            <-- HTTP Services Angular
│   └── mobile-feature-orders/      <-- Vistas específicas de Ionic
└── shared/
    ├── ui-design-system/           <-- Botones, Inputs (Virteex UI Kit)
    └── util-logger/                <-- Utilidad de logs
```

-----

## 3\. Reglas de Dependencias (Module Boundaries)

Para mantener la sanidad mental del equipo y tiempos de compilación rápidos, configuraremos reglas estrictas en `nx.json` y `eslint`:

1.  **Frontend nunca importa Backend:**
      * `type:web-*` **NO PUEDE** importar `type:api-*`.
2.  **UI no importa Feature:**
      * Los componentes visuales (`ui`) deben ser tontos. No pueden depender de páginas completas (`feature`).
3.  **Dominio es Sagrado:**
      * `type:domain` no puede importar NADA de `feature`, `data-access` o `ui`.
4.  **Backend Feature no importa Web Feature:**
      * El API no debe saber que existe una interfaz gráfica.

-----

## 4\. Estándares de Código (Coding Guidelines)

### A. Para NestJS (Backend `virteex-api`)

1.  **Controllers Delgados:** Los controladores solo validan DTOs y llaman servicios. No contienen lógica de negocio.
2.  **DTOs Compartidos:** Si es posible, los DTOs de entrada deben crearse usando clases que implementen interfaces del `libs/[dominio]/domain` para asegurar tipado fuerte en ambos lados.
3.  **Configuración:** Usar `@nestjs/config` para variables de entorno. Nunca hardcodear credenciales.
4.  **Database:** Cada dominio debe gestionar sus propias entidades (Modular Monolith). Evitar *Joins* gigantes entre dominios (ej. Sales haciendo join directo a tablas de RRHH).

### B. Para Angular (Frontend Apps)

1.  **Componentes "Standalone":** Todo nuevo desarrollo debe usar `standalone: true`.
2.  **Signals:** Preferir `Signals` sobre `BehaviorSubject` para el estado local de componentes.
3.  **Lazy Loading:** Todas las rutas de las 7 aplicaciones deben cargar sus `features` mediante `loadChildren` o `loadComponent`.
4.  **UI Kit Centralizado:**
      * Si `virteex-web` y `virteex-admin` usan el mismo botón, ese botón DEBE estar en `libs/shared/ui-design-system`. No duplicar código.
5.  **Manejo de API:**
      * No usar `HttpClient` directamente en los componentes. Siempre a través de una librería `data-access`.

-----

## 5\. Estrategia de Git y CI/CD

Dado que tenemos 7 apps, el riesgo de romper algo es alto.

1.  **Conventional Commits:** Obligatorio.
      * `feat(sales): agregar creación de factura`
      * `fix(mobile): corregir scroll en inventario`
      * `refactor(shared): optimizar ui-kit`
2.  **Pull Requests Atómicos:** Un PR no debe tocar 30 librerías a la vez a menos que sea un refactor global.
3.  **Affected Command:** El CI debe correr tests y lint solo de lo afectado:
      * `nx affected:test`
      * `nx affected:build`

-----

## 6\. Procedimiento de Migración (Plan de Acción Inmediato)

Para alinear el código actual a este estándar:

1.  **Renombrado Masivo:** Estandarizar las carpetas existentes que mezclan `api-feature` con `feature-api`. Usar el script de renombramiento de Nx para no romper referencias.
2.  **Extracción de Dominio:** Mover todas las interfaces duplicadas en `virteex-api` y `virteex-web` a `libs/[dominio]/domain`.
3.  **Consolidación de UI:** Identificar componentes visuales duplicados en las apps frontend y moverlos a `libs/shared/ui`.
4.  **Configurar ESLint Boundaries:** Activar la regla `enforce-module-boundaries` hoy mismo para prevenir nuevas violaciones.

-----

**Firma:** Arquitectura de Software Virteex.
*Este documento es la ley del repositorio. Cualquier desviación debe ser discutida y aprobada.*
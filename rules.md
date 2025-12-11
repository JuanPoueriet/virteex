🏛️ REGLAMENTO OFICIAL DE ARQUITECTURA Y DESARROLLO (v3.0)

Proyecto: Virteex ERP (Nx Monorepo)

Target: SaaS Global (LatAm & USA)

Ejecutor Principal: Jules (AI Assistant) & Core Team

0. Directiva Primaria para Jules (AI Persona)

Rol: Eres el Arquitecto de Software Principal de Virteex.

Misión: Transformar un "Monolito en Monorepo" en una arquitectura orientada a dominios (DDD) altamente desacoplada.

Criterio de Éxito: El código debe ser capaz de escalar a cientos de librerías sin crear dependencias circulares ni tiempos de compilación exponenciales.

Mantra: "Lo que no está en una librería, no existe para el dominio".

1. Estructura del Workspace y Filosofía "Library-First"

1.1 La Regla del Contenedor Vacío (Apps)

Las aplicaciones (apps/backend/api, apps/core/client-web) son contenedores tontos.

Prohibido: Definir lógica de negocio, servicios, componentes UI o entidades de base de datos dentro de apps/.

Responsabilidad Única: Configuración de arranque (main.ts), inyección de variables de entorno globales y orquestación de módulos raíz (app.module.ts).

1.2 Taxonomía de Dominios (DDD Vertical)

El código se organiza verticalmente. Un dominio encapsula todo lo necesario para una funcionalidad de negocio.

Ruta: libs/{dominio}/{tipo-librería}

Ejemplos de Dominios: accounting, sales, inventory, crm, compliance (para impuestos), shared.

2. Taxonomía Estricta de Librerías (Module Boundaries)

Para garantizar un grafo de dependencias saludable, se aplicará estrictamente la siguiente matriz. Cualquier importación que viole esta tabla debe ser rechazada.

Tipo de Librería (type)Sufijo CarpetaContenido EsperadoTags (nx.json)Puede ImportarPROHIBIDO ImportarDomain/domainEntidades (Backend), Interfaces (Frontend), Reglas de Negocio agnósticas.type:domaintype:utilFrameworks (Angular/Nest), type:feature, type:data-access, type:uiShared-DTO/dtoObjetos de Transferencia de Datos compartidos (con class-validator).type:dtotype:utilEntidades TypeORM, Lógica de Negocio.Data-Access/data-accessBackend: Repositorios TypeORM, Servicios de DB.



Frontend: Servicios API, Store (SignalStore).

type:data-accesstype:domain, type:dto, type:utiltype:feature, type:uiUI/uiComponentes Presentacionales ("Dumb"), Pipes, Directivas.type:uitype:domain, type:dto, type:utiltype:data-access, type:featureFeature/feature-{name}Frontend: Páginas, Smart Components (rutas).



Backend: Controllers, Resolvers.

type:featuretype:data-access, type:ui, type:domain, type:dtoOTRAS type:featureUtil/utilHelpers puros, formateadores, constantes.type:utiltype:utilTodo lo demás.3. Comunicación y Desacoplamiento (Inter-Dominio)

3.1 Backend (NestJS) - Prevención de Monolito Distribuido

Prohibición Absoluta: Inyectar un Servicio de un dominio en otro dominio.

Mal: InvoiceService inyecta InventoryService.

Mecanismo Permitido (Síncrono): Shared Kernel / Public API pattern.

Si Sales necesita datos de Inventory, Inventory debe exponer una fachada específica o interfaz en su librería data-access diseñada para consumo externo.

Mecanismo Preferido (Asíncrono - Event Driven):

Usar EventEmitter2 (interno) o Message Queue (futuro).

Sales emite order.created.

Inventory escucha order.created y ejecuta reserveStock().

3.2 Frontend (Angular) - Estado y Rutas

Comunicación entre Features:

A través de la URL (Query Params / Route Params).

Nunca importar una librería feature dentro de otra. Si necesitas un modal de "Crear Cliente" dentro de "Ventas", ese modal debe refactorizarse a una librería ui o smart-ui compartida.

4. Estrategia de Localización y Polimorfismo (LatAm & USA)

Para evitar la deuda técnica de los if (country === 'DO'), se aplicará Inversión de Control.

4.1 Patrón Estrategia (Strategy Pattern)

Definición: En libs/{dominio}/domain, definir interfaces: ITaxCalculator, IFiscalPrinter.

Implementación: En libs/{dominio}/domain/src/strategies/, crear clases concretas:

USATaxStrategy

DominicanRepublicTaxStrategy

MexicoTaxStrategy

Inyección (Backend): Utilizar Factory Providers en el módulo de NestJS para inyectar la estrategia correcta basada en la configuración del Tenant/Organización al inicio del request scope.

4.2 Internacionalización (i18n)

Las traducciones viven con el código.

Cada librería debe tener su carpeta src/assets/i18n/{lang}.json.

El proceso de build debe agregar estos assets al bundle final.

5. Estándares Técnicos "Best Practices" (10/10)

5.1 Backend (NestJS & TypeORM)

Gestión de Entidades (CRÍTICO):

Prohibido: Usar rutas dinámicas o glob patterns (__dirname + '/**/*.entity.ts') en la configuración de TypeORM. Esto falla en entornos compilados con Webpack/Esbuild (Nx).

Mandatorio: Importar y registrar explícitamente las entidades en el TypeOrmModule.forFeature([Entity]) dentro de la librería data-access correspondiente.

Controllers: Deben ser "Thin" (Delgados). Solo validan DTOs y delegan al Servicio/Caso de Uso.

DTOs: Usar class-validator. Si el DTO se comparte con el front (librería shared-dto), asegurar que no importa lógica de backend.

5.2 Frontend (Angular Moderno)

Arquitectura de Componentes: 100% Standalone Components.

Detección de Cambios: ChangeDetectionStrategy.OnPush Obligatorio en todos los componentes.

Gestión de Estado (State Management):

Estándar: Usar NGRX SignalStore (introducido en NGRX v17+). Es modular, ligero y type-safe.

Prohibido: Crear grandes Stores globales con Redux clásico a menos que sea para estado de sesión global. Preferir Stores locales por feature.

Reactividad:

Usar Signals para el estado síncrono de la vista.

Usar RxJS solo para orquestación de eventos asíncronos complejos (HTTP chains).

HTML: Sintaxis de Control Flow (@if, @for) obligatoria.

6. Procedimiento de Migración Algorítmico (Checklist para Jules)

Jules, al recibir la orden de "Migrar el módulo X", ejecutarás esta secuencia exacta:

Análisis de Grafo: Identificar qué archivos en apps/backend/api y apps/core/client-web pertenecen conceptualmente al dominio X.

Scaffolding (Nx Generators):

Crear las 4 librerías base (ajustar rutas según necesidad):

Bash



nx g @nx/js:lib domain --directory=libs/X/domain --tags=type:domain

nx g @nx/js:lib dto --directory=libs/X/dto --tags=type:dto

nx g @nx/nest:lib data-access --directory=libs/X/data-access --tags=type:data-access

nx g @nx/angular:lib feature --directory=libs/X/feature --tags=type:feature

Movimiento de Código (Refactorización):

Backend Entity: Mover de apps/.../entities -> libs/X/domain. Eliminar decoradores si es una entidad pura, o mover a data-access si está muy acoplada a TypeORM (preferible mantenerla en domain pero cuidado con dependencias). Ajuste: En este proyecto, Entities son Data-Access/Domain híbridos. Mover a libs/X/domain pero permitir dependencia de TypeORM en domain solo para decoradores, o usar patrón Data Mapper. -> Decisión para v3.0: Mover Entities a libs/X/domain. Permitir que libs/X/domain tenga peerDependency de TypeORM solo para decoradores.

Backend DTOs: Mover a libs/X/dto.

Backend Service: Mover a libs/X/data-access. Importante: Actualizar TypeOrmModule.forFeature.

Backend Controller: Mover a libs/X/feature.

Frontend Components: Mover a libs/X/feature (Smart) o libs/X/ui (Dumb).

Wiring (Conexión):

Exportar lo necesario en los index.ts de cada librería (Barrels).

Actualizar los imports en la aplicación principal para apuntar a @virteex/X/....

Limpieza: Eliminar los archivos originales en apps/.

Verificación: Ejecutar nx graph para validar no haber creado dependencias circulares.

7. Control de Calidad y Git

Commits: Uso estricto de Conventional Commits.

feat(inventory): migrate logic to lib

refactor(sales): implement tax strategy

Linting: Ningún cambio se acepta si viola eslint-plugin-nx (Module Boundaries). Jules debe corregir estos errores antes de presentar el código.

Fin del Reglamento v3.0.
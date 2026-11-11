# Publicación automática de Mi dinero en GitHub Pages

Prepara la PWA para `https://trazka.github.io/mi-dinero-pwa/` y publica automáticamente al actualizar `main`.

- Configura `/mi-dinero-pwa/` como ruta base de Vite y como identificador, inicio y alcance del manifiesto PWA.
- Ajusta iconos, registro y fallback de navegación del service worker a esa ruta, limitando el fallback al proyecto.
- Añade un workflow con instalación desde lockfile, pruebas, compilación, prueba offline, carga de `dist` y despliegue mediante las acciones oficiales de GitHub Pages. El permiso de publicación se limita al job de despliegue y las publicaciones se serializan.
- Actualiza las pruebas de navegador para visitar la ruta real y verificar manifest, iconos, alcance y URL del service worker.
- Documenta el requisito de seleccionar **Settings → Pages → Source: GitHub Actions**.

## Validación

- `npm test`: 10 pruebas aprobadas.
- `npm run build`: TypeScript, Vite y generación del service worker correctos.
- `npm run test:e2e`: 4 pruebas con perfil iPhone 13 en Chromium; incluye operaciones financieras, persistencia, respaldo, filtros, uso sin internet y metadatos PWA bajo `/mi-dinero-pwa/`.
- `git diff --check`: correcto.
- `src/`, las dependencias y el lockfile permanecen sin cambios respecto a `main`: no se modifica la lógica de ingresos, gastos, deudas ni IndexedDB.

El despliegue remoto se verificará cuando esta PR se integre en `main` y Pages esté habilitado. Esta rama no publica la aplicación. La instalación en Safari físico requiere una comprobación manual tras el despliegue. IndexedDB sigue asociado al origen: los datos existentes de localhost u otro dominio se trasladan con un respaldo JSON si se necesitan en GitHub Pages.

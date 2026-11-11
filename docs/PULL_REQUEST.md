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

## Corrección de la prueba offline del PR #2

La recarga se ejecutaba al terminar `click()`, sin esperar a que el guardado asíncrono terminase. `changeData` ya espera `tx.done` y la aplicación solo entonces actualiza el saldo y cierra el formulario. Una recarga anterior puede cancelar la operación; no es un error del cálculo ni de la lectura posterior de IndexedDB.

La causa se reprodujo manteniendo ocupada la base mediante una transacción real: recargar inmediatamente después del clic dejó `data/main` vacío y el saldo en $0; esperar al cierre del formulario conservó un movimiento de gasto por $50 y mostró -$50 tras recargar.

La prueba conserva todas las verificaciones anteriores y ahora espera la confirmación real de guardado (cierre del formulario), comprueba -$50 antes de recargar, inspecciona directamente IndexedDB y exige que el conjunto de datos sea idéntico después de recargar. Se ejecuta tanto normalmente como con IndexedDB ocupado, comprobando también el estado «Guardando…» mientras la escritura está bloqueada. No se añaden pausas fijas, reintentos de la prueba ni excepciones a las aserciones. No se cambia código de la aplicación ni cálculos financieros.

Validación de la corrección: 10 pruebas unitarias, 5 pruebas de navegador y compilación de producción correctas.

La comprobación adicional de estabilidad (`npx playwright test --grep 'PWA almacena' --repeat-each=10`) completó 20/20 ejecuciones aprobadas: diez con almacenamiento normal y diez con la escritura bloqueada temporalmente por una transacción real.

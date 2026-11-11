# Mostrar errores de arranque y verificar la interfaz publicada de Mi dinero

Un fallo de carga o renderizado podía dejar vacío el contenedor de React sin una explicación visible. Esta PR añade una pantalla de carga/error en HTML, independiente del bundle, y captura fallos de recursos, módulos y renderizado. Ofrece recargar sin borrar datos.

El arranque de App se importa de manera controlada y React tiene un límite de errores. El registro PWA se carga por separado para que sus fallos no impidan renderizar. Se comprueba la existencia de actualizaciones del service worker al iniciar con conexión, sin desregistrarlo ni borrar cachés o IndexedDB. Se conserva `/mi-dinero-pwa/` como base y alcance.

Añade `npm run test:pages` y un job posterior al despliegue que abre `https://trazka.github.io/mi-dinero-pwa/`, valida HTTP, MIME de recursos, errores de ejecución, interfaz visible, disponibilidad de IndexedDB y alcance del service worker, y adjunta una captura. Es una comprobación del sitio publicado, adicional a las pruebas locales.

## Diagnóstico y límites

En `main`, la compilación local servida en `/mi-dinero-pwa/` mostraba la interfaz, cargaba JavaScript/CSS con HTTP 200 y tipos correctos, y no emitía errores de ejecución en Chromium de escritorio y con perfil iPhone. El fallo de IndexedDB se captura y muestra un aviso dentro de la interfaz; la prueba nueva confirma que no produce una pantalla vacía.

**La causa de la pantalla negra del sitio público no está confirmada.** El proxy de este entorno bloquea `trazka.github.io`: curl devuelve 403 y la prueba de navegador pública devuelve `ERR_TUNNEL_CONNECTION_FAILED`, sin recibir recursos. Esta PR corrige la falta de diagnóstico visible y añade validación pública; no afirma que la incidencia específica de iPhone esté resuelta. El job público y la comprobación en el dispositivo tras integrar la PR deben confirmar que aparece la interfaz o proporcionar el error preciso.

## Validación

- `npm test`: 10/10 pruebas aprobadas.
- `npm run build`: TypeScript, Vite y precaché correctos.
- `npm run test:e2e`: 10/10 pruebas aprobadas, incluidas las cinco existentes.
- Las cinco pruebas nuevas verifican fallos de descarga, evaluación de módulos, renderizado React e IndexedDB no disponible, además de un fallo del módulo de registro PWA que no impide abrir React. Los tres fallos de arranque conservan datos preexistentes y, al restaurar los recursos y recargar, recuperan el saldo de -$50.
- Verificador público ejecutado contra la URL real: bloqueado por el proxy, no aprobado.
- `src/App.tsx` y `src/data.ts` permanecen sin cambios: no se alteran cálculos, funciones financieras ni almacenamiento.

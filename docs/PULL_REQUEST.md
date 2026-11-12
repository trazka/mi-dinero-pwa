# Marco fijo de app y desplazamiento interno en iPhone

El documento completo se desplazaba detrás del encabezado y la barra de pestañas. En pantallas móviles, la app ahora ocupa `100dvh` y distribuye encabezado, sección central y pestañas en filas: solo el contenido central tiene desplazamiento vertical. Se evita propagar ese desplazamiento al documento, se mantienen las áreas seguras y el contenido largo sigue siendo accesible.

Los formularios conservan su propio desplazamiento y encabezado visible. Cambiar de sección reinicia el scroll de su contenedor. Las tablas conservan desplazamiento horizontal y no se interceptan gestos táctiles globalmente. El bloqueo del documento solo se aplica cuando la app está montada, de modo que la pantalla de error de arranque mantiene su accesibilidad. La vista de escritorio no cambia.

No se modifican cálculos, IndexedDB, movimientos, deudas ni respaldos.

## Validación

- `npm test`: 22/22 pruebas aprobadas.
- `npm run build`: TypeScript, Vite y PWA correctos.
- `npm run test:e2e`: 20/20 pruebas aprobadas.
- Pruebas nuevas: scroll real del contenido con encabezado/pestañas inmóviles y documento sin desplazarse, acceso al último control de Respaldos, formulario con altura reducida y cierre accesible, desplazamiento normal de escritorio.
- La prueba de diseño móvil existente comprueba ahora el scroll del contenedor central y su reinicio al cambiar de sección.
- Se mantienen pruebas de temas, calendario, offline, finanzas y arranque. La interacción final de Safari físico queda para confirmar tras publicar.

El contenido largo sigue desplazándose dentro de la sección; no se ocultan controles ni se impide acceder al final para simular una pantalla inmóvil.

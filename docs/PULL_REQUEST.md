# Seleccionar fechas con un toque, sin confirmación adicional

Al tocar un día, la fecha se aplica y el calendario se cierra automáticamente. Sustituye el selector nativo de iPhone, que podía exigir pulsar una palomita, por un calendario de la aplicación en español. Se aplica a movimientos, vencimientos, abonos y filtros.

Permite cambiar mes y año, seleccionar Hoy, limpiar los filtros, cerrar con Escape o tocar fuera. Seleccionar una fecha no guarda el movimiento: el formulario conserva su botón Guardar. Se mantienen los valores ISO `YYYY-MM-DD`, las fechas locales y los límites de los filtros. No modifica los cálculos ni IndexedDB y no añade dependencias.

## Validación

- `npm test`: 10 pruebas aprobadas.
- `npm run build`: TypeScript, Vite y generación PWA correctos.
- `npm run test:e2e`: 12 pruebas aprobadas con perfil iPhone en Chromium.
- Las pruebas nuevas comprueban selección y cierre sin confirmación, fecha bisiesta, persistencia al recargar, edición de fecha, vencimiento, fecha de abono, fechas mínimas y limpieza de filtros. Los reportes existentes prueban ahora la selección mediante el nuevo calendario.
- Revisión visual con ancho de iPhone y comprobación de ausencia de desbordamiento horizontal.

Los cambios están preparados para integrar en `main`; la publicación la realizará el workflow habitual tras la integración. La interacción en Safari de un iPhone físico queda para comprobación tras publicar.

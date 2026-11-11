# Primera versión funcional de Mi dinero PWA

Implementa una aplicación local de finanzas personales para iPhone con React, TypeScript, Vite, IndexedDB y vite-plugin-pwa. Incluye inicio, movimientos editables, deudas con abonos vinculados, reportes filtrados y respaldos JSON/CSV. La interfaz está en español y utiliza MXN.

Cada abono genera un único gasto en una transacción atómica. Al revertir el abono se elimina su gasto asociado y se restituye el saldo. La importación valida los vínculos e identificadores antes de reemplazar los datos.

Incluye manifest, iconos de iPhone, funcionamiento offline, instrucciones para agregar desde Safari y CI. No publica la aplicación ni incorpora datos bancarios reales.

## Validación

- Compilación TypeScript y Vite de producción.
- 10 pruebas unitarias y de persistencia IndexedDB.
- Pruebas de navegador con tamaño de iPhone: movimientos, edición/eliminación, deudas, filtros, reportes, exportación/importación y persistencia; recarga y registro sin conexión mediante el service worker real.
- Revisión manual pendiente de instalación en un dispositivo físico con Safari/iOS.

## Revisión

Los datos permanecen en el dispositivo; no hay servidor ni sincronización. Los respaldos no están cifrados. Las deudas existentes no generan movimientos hasta registrar nuevos abonos. Los abonos usan transferencia como método de pago.

## Resultados de esta validación

- `npm test`: 10/10 pruebas aprobadas.
- `npm run build`: compilación TypeScript/Vite y generación del service worker correctas.
- `npm run test:e2e`: 3/3 pruebas aprobadas en Chromium con perfil iPhone 13, incluido funcionamiento sin internet.
- `npm audit --omit=dev`: sin vulnerabilidades en dependencias de ejecución. La auditoría completa conserva 6 avisos transitivos de herramientas de compilación (2 bajos y 4 moderados, cadena Workbox); `npm audit fix` no los resolvió sin cambios adicionales de compatibilidad.
- `git diff --check`: correcto.

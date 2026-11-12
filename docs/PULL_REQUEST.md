# Abonos directos, edición de deudas, planificación y búsqueda

Implementa las siete mejoras solicitadas, conservando el criterio de gasto al pagar: una compra con TDC solo aumenta deuda, mientras cada abono registra gasto en su fecha.

1. **Abonos desde Nuevo movimiento:** opciones de ingreso, gasto, compra con TDC o abono; selección de deuda pendiente y actualización atómica mediante la misma función usada en Deudas.
2. **Editar tarjetas/deudas:** acreedor, vencimiento, notas y configuración de corte. Conserva compras y abonos e impide alterar importes de apertura desde esa edición.
3. **Corte y límite:** días configurables, ajuste de meses cortos, pendiente estimado al corte y límite de pago del ciclo correspondiente. Aplica pagos a lo más antiguo; no incorpora intereses/comisiones ni afirma reproducir el estado bancario.
4. **Recurrentes confirmados:** crear/editar, frecuencia semanal/mensual/anual, pausar/reactivar/eliminar, registrar cada vencimiento con confirmación. Conserva anclas de fin de mes y rechaza dobles confirmaciones concurrentes. No registra gastos en segundo plano y las compras TDC solo crean deuda.
5. **Presupuestos mensuales:** general y por categoría, consumo de gastos pagados, disponible/excedido, actualización por mes/categoría y eliminación. Independientes de los filtros del reporte; los abonos usan su categoría Pago de deuda.
6. **Recordatorio de respaldo:** fecha de exportación iniciada y aviso a los siete días; JSON con toda la planificación y compatibilidad con respaldos anteriores. La descarga se inicia dentro del toque para Safari; la marca temporal no certifica que el usuario guardó el archivo.
7. **Búsqueda:** concepto, notas, categoría e importe; filtros por método y tarjeta/deuda, combinados con los anteriores y botón de limpieza.

## Persistencia y offline

Añade campos opcionales al formato de datos versión 2, sin recrear IndexedDB. El importador valida presupuestos, programaciones, anclas, metadatos de deuda y ocurrencias. Se conservan los respaldos versión 1/2 y los registros existentes. La programación y sus movimientos se actualizan en una sola transacción.

Al ejecutar las pruebas se reprodujo además una carrera de la instalación PWA: tras una recarga temprana había un worker activado pero el documento quedaba sin controlador. El registro ahora es inmediato y el documento solicita al worker activo reclamar sus clientes dentro del alcance cuando `ready` resuelve, independientemente del callback de registro de Workbox. No se fuerza recarga ni se borran cachés o datos. Se incluye la prueba con cuatro contextos iPhone nuevos, recarga rápida y apertura offline.

Los formularios de planificación abiertos bloquean la aplicación de una actualización pendiente. No se añaden dependencias, bancos, notificaciones externas ni servicios remotos.

## Validación

- `npm test`: 34 pruebas de datos y persistencia, incluidas doce nuevas de edición, corte, presupuestos, recurrentes, concurrencia, búsquedas y respaldos.
- `npm run build`: TypeScript, Vite y precaché.
- `npm run test:e2e`: 24 pruebas de navegador con perfil iPhone, incluidas las anteriores y cuatro nuevas para los siete flujos y la recarga PWA.
- Prueba nueva de recurrentes/cortes cubre meses cortos y años bisiestos; los presupuestos excluyen ingresos y compras TDC e incluyen abonos en su mes.
- Flujos nuevos de navegador comprueban edición con historial, abono directo, búsquedas y filtros, confirmación/cancelación de recurrentes, presupuestos excedidos, exportación/restauración y compras recurrentes TDC sin gasto anticipado.

La publicación y verificación de la URL pública ocurrirán al integrar la PR. La comprobación final en Safari físico queda tras publicar.

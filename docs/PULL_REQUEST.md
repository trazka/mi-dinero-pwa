# Vincular compras con tarjeta de crédito a deudas sin duplicar gastos

Registrar un gasto con «Tarjeta de crédito» permite elegir una deuda/tarjeta y aumenta automáticamente su saldo. Cada compra se contabiliza una vez en su fecha/categoría. Los abonos nuevos de esa tarjeta reducen la deuda y generan movimientos identificados como pagos, excluidos del gasto de Inicio y Reportes. Las deudas ordinarias mantienen su comportamiento.

Incluye alta de tarjetas con saldo cero y selección automática si hay una sola tarjeta. Una deuda existente puede vincularse a compras nuevas; los movimientos/abonos históricos se conservan sin reclasificación. No se conectan bancos ni se utilizan datos reales.

Editar una compra, cambiarla de tarjeta/método o eliminarla ajusta los cargos de forma atómica. Se rechazan cambios que dejarían la deuda negativa después de abonos y se explica cómo revertirlos primero. Eliminar un abono restituye la deuda y elimina su movimiento asociado.

Los respaldos versión 2 validan cargos, pagos, importes e identificadores. Se importan respaldos versión 1 sin pérdida; IndexedDB se conserva y no se recrea. Las compras históricas no vinculadas permanecen así automáticamente y pueden editarse sin forzar una vinculación. El CSV distingue abonos de tarjeta e incluye el importe de gasto contabilizado.

## Validación

- `npm test`: 21 pruebas aprobadas, incluidas compras, abonos sin duplicación, edición repetida, cambio de tarjeta/método/tipo, eliminación y reversión, sobrepagos, integridad de respaldos, compatibilidad con versión 1, persistencia y compras concurrentes.
- `npm run build`: TypeScript, Vite y PWA correctos.
- `npm run test:e2e`: 15 pruebas aprobadas. El flujo nuevo crea una tarjeta en cero, registra compra $100 y abono $40, comprueba deuda $60/gasto $100 en Inicio y Reportes, recarga y restaura un respaldo, comprueba cambios rechazados/aplicados, revierte el abono y elimina la compra.
- Se mantienen las pruebas anteriores de calendarios, arranque, actualizaciones y uso sin conexión.

El saldo disponible conserva el criterio de ingresos menos gastos: reserva la compra al registrarla y no descuenta otra vez el abono. Los saldos de apertura y los pagos históricos mantienen su contabilización anterior. No hay migración destructiva ni cambios en el despliegue.

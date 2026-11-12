# Compras con tarjeta a deuda y gastos al pagar

Registrar una compra con «Tarjeta de crédito» permite elegir una deuda/tarjeta y aumenta automáticamente su saldo pendiente. **La compra vinculada no suma al gasto ni reduce el saldo disponible. Cada abono sí cuenta como gasto, en su fecha de pago, y reduce la deuda.**

Ejemplo: compra $100 → deuda $100/gasto $0. Abono $40 → deuda $60/gasto $40. Abono restante $60 → deuda $0/gasto acumulado $100. No hay doble contabilización. Inicio, reportes y CSV aplican este criterio de pagos realizados.

Incluye alta de tarjetas con saldo cero y selección automática si hay una sola. Una deuda existente puede vincularse a compras nuevas. Se conservan sin reclasificación los registros históricos sin vínculo. No se conectan bancos ni se utilizan datos reales.

Editar, cambiar de tarjeta/método o eliminar una compra ajusta los cargos atómicamente. Se rechazan cambios que dejarían la deuda negativa después de abonos y se indica cómo revertirlos primero. Revertir un abono elimina su gasto y restituye la deuda.

Los respaldos versión 2 validan cargos, pagos, importes e identificadores. Se importan respaldos versión 1 sin pérdida, conservando IndexedDB. El CSV distingue compras a deuda y abonos e incluye una columna de gasto contabilizado (cero para las compras vinculadas, importe pagado para los abonos).

## Validación

- `npm test`: pruebas de compras/abonos, parciales y liquidación en fechas distintas, reversión, edición, cambio de tarjeta/método/tipo, integridad de respaldos, versión 1, persistencia y concurrencia.
- `npm run build`: TypeScript, Vite y PWA.
- `npm run test:e2e`: flujo iPhone con compra $100 (gasto $0), abono $40 (deuda $60/gasto $40), Inicio/Reportes, recarga, respaldo, edición y reversión. Se mantienen las pruebas anteriores de calendario, arranque, actualización y uso sin conexión.

Esta descripción reemplaza el criterio anterior de gasto al comprar. Se usa el criterio solicitado de gasto al pagar. Los movimientos anteriores sin vínculo no se enlazan automáticamente, para no alterar los saldos históricos.

Resultados finales: **22/22 pruebas unitarias y de persistencia**, **15/15 pruebas de navegador** y compilación aprobadas. La prueba de pagos en meses distintos confirma gasto cero en el mes de compra y gasto de $40/$60 en los meses de sus respectivos abonos.

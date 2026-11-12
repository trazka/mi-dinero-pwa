# Apariencia de app de iPhone para Mi dinero

Hace más compacta y cómoda la interfaz móvil: encabezado fijo con identidad de la app y acceso a Apariencia, título «Tu resumen», saldo visible más arriba, tarjetas redondeadas y pestañas inferiores con indicador activo. Los formularios aparecen como hojas inferiores con encabezado fijo, cierre accesible y botones amplios. Las listas, campos y estados vacíos usan tamaños adecuados para tocar en iPhone.

Mantiene tonos verdes, modos claro/oscuro/automático y diseño de escritorio. Respeta áreas seguras y reducción de movimiento. Cambiar de pestaña vuelve al inicio de la sección y expone `aria-current`. Oculta la pantalla inicial en el mismo commit de React para evitar que se vea junto con la interfaz durante el arranque.

No cambia IndexedDB, cálculos, compras, abonos, respaldos ni reglas financieras. El verificador de GitHub Pages y las pruebas de arranque usan el nuevo título visible del inicio.

## Validación

- `npm test`: 22/22 pruebas aprobadas.
- `npm run build`: TypeScript, Vite y PWA correctos.
- `npm run test:e2e`: 18/18 pruebas aprobadas, incluidas las anteriores de finanzas, offline, temas, calendario y arranque.
- La prueba móvil nueva comprueba saldo visible arriba, navegación activa y vuelta al inicio, formularios tipo hoja, cierre automático del calendario, tema oscuro y ausencia de desbordamiento a 320 px. Guarda capturas claras y oscuras.
- Revisión visual de la captura con perfil iPhone 13 en Chromium. La interacción y apariencia finales en Safari físico quedan para confirmar tras publicar.

Los cambios están en una rama; el despliegue y la comprobación de la URL pública se ejecutarán al integrarla en `main`.

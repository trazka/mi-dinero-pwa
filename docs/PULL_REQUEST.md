# Autocompletado y navegación táctil por secciones

Los campos de establecimiento/concepto sugieren valores existentes de movimientos y recurrentes mediante autocompletado nativo, manteniendo la escritura libre. El filtro por establecimiento y el formulario recurrente comparten las sugerencias sin modificar registros previos.

El botón con «+» queda flotante: crea deudas en Deudas y movimientos en Inicio, Movimientos y Reportes; no aparece en Respaldos. Se deshabilita mientras hay formularios abiertos. Los deslizamientos horizontales recorren las secciones sin circular entre extremos; se ignoran desplazamientos verticales, multitáctiles, formularios y tablas con desplazamiento horizontal. El menú lateral permite desplazarse en ventanas horizontales de poca altura para alcanzar su tarjeta inferior.

No cambia el almacenamiento, los cálculos financieros ni el bloqueo existente; no incorpora autenticación automática.

También preselecciona la única TDC en gastos recurrentes, conservando la tarjeta de los registros editados. El marco móvil sigue la altura visual disponible y restablece el desplazamiento del documento al regresar de horizontal a vertical, evitando el encabezado oculto y el espacio inferior.

Validación: 34 pruebas unitarias y 34 pruebas de navegador aprobadas; compilación TypeScript/Vite/PWA correcta. Incluye finanzas, respaldos, modo offline, bloqueo, selección de la única TDC sin intervención manual y dos rotaciones consecutivas tras desplazar la vista horizontal. Captura de iPhone revisada. Safari/iPhone físico sigue requiriendo comprobación manual del autocompletado, los gestos y la rotación.

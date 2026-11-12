# Autocompletado y navegación táctil por secciones

Los campos de establecimiento/concepto sugieren valores existentes de movimientos y recurrentes mediante autocompletado nativo, manteniendo la escritura libre. El filtro por establecimiento y el formulario recurrente comparten las sugerencias sin modificar registros previos.

El botón con «+» queda flotante: crea deudas en Deudas y movimientos en Inicio, Movimientos y Reportes; no aparece en Respaldos. Se deshabilita mientras hay formularios abiertos. Los deslizamientos horizontales recorren las secciones sin circular entre extremos; se ignoran desplazamientos verticales, multitáctiles, formularios y tablas con desplazamiento horizontal. El menú lateral permite desplazarse en ventanas horizontales de poca altura para alcanzar su tarjeta inferior.

No cambia el almacenamiento, los cálculos financieros ni el bloqueo existente; no incorpora autenticación automática.

Validación: 34 pruebas unitarias aprobadas y compilación TypeScript/Vite/PWA correcta. Las 30 pruebas de navegador preexistentes aprobaron, incluidas finanzas, respaldos, modo offline y bloqueo. Las 3 pruebas nuevas aprobaron tras corregir la construcción del evento táctil y el selector de encabezado en la prueba. Captura de iPhone revisada. Safari/iPhone físico sigue requiriendo comprobación manual del autocompletado y los gestos.

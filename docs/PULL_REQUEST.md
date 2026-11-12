# Icono M en verde intenso sobre fondo negro

Sustituye la cartera por el símbolo solicitado: M geométrica y punto en verde intenso, con fondo negro, tomando como referencia las capturas proporcionadas. El tono es una aproximación visual al verde de SIGTI; no se afirma un color corporativo exacto a partir del favicon pequeño.

Actualiza icono de Apple, manifest PWA, favicon e identidad del encabezado. Genera PNG de 180, 192 y 512 px desde el maestro en `assets/icon-v3-master.png`, conservando un generador reproducible. Los nombres nuevos evitan reutilizar los archivos de cartera; se mantienen los anteriores para clientes instalados. La identidad, alcance y ruta base de la PWA no cambian.

No modifica colores de la interfaz, modo oscuro, cálculos ni IndexedDB.

## Validación

- `npm run build`: TypeScript, Vite y precaché correctos.
- `npm test`: 34 pruebas de datos/persistencia.
- `npm run test:e2e`: 25 pruebas de navegador, incluida validación de las nuevas rutas de icono y de funcionamiento offline.
- Dimensiones PNG comprobadas: 192×192, 512×512 y 180×180.
- Revisión visual del icono generado.

El icono existente de la pantalla de inicio puede permanecer en la caché de iOS tras publicar. No se desinstala ni se borran datos para forzar su renovación. La actualización visual de una instalación real se confirma después del despliegue.

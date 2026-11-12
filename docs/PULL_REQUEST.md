# Icono moderno y modos Claro, Oscuro y Automático

Añade un control **Apariencia** en la esquina superior derecha. Permite cambiar entre modo claro, oscuro y automático. El automático sigue la preferencia del dispositivo y responde a sus cambios. El modo se aplica antes de montar React para evitar destellos claros al abrir; persiste en una clave de localStorage y sigue funcionando por sesión si no hay permiso para guardar.

Incluye colores oscuros para navegación, tarjetas, texto, formularios, calendario, avisos y pantalla de arranque. Actualiza el color de las barras del navegador según el tema. No modifica IndexedDB, cálculos, movimientos ni deudas.

Renueva el icono con una cartera en esmeralda y menta, en SVG y PNG 192/512/180 px. El manifest y apple-touch-icon usan nombres versionados para renovar recursos, manteniendo el mismo id, inicio y alcance de la PWA. Los iconos anteriores se conservan para clientes antiguos. Se incluye un generador reproducible basado en SVG/Chromium, sin dependencias adicionales.

## Validación

- `npm test`: 22 pruebas aprobadas.
- `npm run build`: TypeScript, Vite y precaché correctos.
- `npm run test:e2e`: 17 pruebas aprobadas en Chromium con perfil iPhone.
- Las pruebas nuevas cubren preferencia del sistema, cambios manuales, persistencia al recargar, funcionamiento offline, navegación por todas las secciones, colores del formulario/calendario, falta de acceso a localStorage y ausencia de desbordamiento horizontal.
- La prueba de metadatos PWA comprueba los nuevos recursos de icono.
- Revisión visual de la captura oscura y del PNG de 512 px.

La publicación y su validación remota se ejecutarán al integrar en `main`. La apariencia en Safari físico debe confirmarse tras publicar. iOS puede conservar el icono anterior de una instalación existente; no se promete su sustitución inmediata ni se borran instalaciones o datos para forzarla.

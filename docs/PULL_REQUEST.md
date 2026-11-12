# Restaurar la billetera en el encabezado y conservar la M de lanzamiento

Corrige la interpretación del cambio anterior: la billetera en verde/menta vuelve al encabezado dentro de Mi dinero. La M y el punto en verde intenso sobre negro permanecen exclusivamente como iconos de lanzamiento PWA/Apple y favicon.

Se reutiliza `icon-v2.svg` para el encabezado y se conservan los PNG `icon-v3-*` y `apple-touch-icon-v3.png` en el manifiesto y HTML. Las rutas PNG de lanzamiento anteriores (versiones 1 y 2) ahora sirven la misma M intensa, para que un cliente que vuelva a consultarlas reciba el diseño nuevo; el SVG de la billetera se mantiene intacto. No se cambia la identidad instalada, ruta base, tema, datos ni cálculos. La prueba de interfaz comprueba explícitamente que ambas referencias sean diferentes para evitar otra sustitución accidental.

## Validación

- `npm run build`: TypeScript, Vite y PWA.
- `npm test`: 34 pruebas de datos/persistencia.
- `npm run test:e2e`: 25 pruebas de navegador, incluida billetera en encabezado, M v3 en icono Apple e igualdad del contenido servido por las dos rutas antiguas de Apple y la actual.

La captura del usuario muestra la nueva M intensa dentro de la app y la antigua M tenue en la pantalla de inicio: los recursos de la app se actualizaron pero el icono de lanzamiento instalado en iOS sigue siendo anterior. No se promete que cambiar recursos web fuerce a iOS a renovar el icono ya instalado. Se debe exportar un respaldo JSON antes de intentar reemplazar el acceso y no borrar datos ni desinstalar para forzar una caché.

# Fondo negro uniforme para el icono de lanzamiento

Quita el recuadro interior gris, degradados, borde y reflejos del icono de lanzamiento. El diseño queda con la M y el punto verdes sobre un único fondo negro intenso. La billetera del encabezado y los colores de la interfaz permanecen intactos.

Añade un maestro v4 y genera PNG de 180, 192 y 512 px. Manifest, icono Apple y favicon usan nombres v4 para renovar recursos. Las rutas PNG anteriores también sirven el nuevo diseño cuando un cliente las vuelve a consultar. La identidad y el alcance de la PWA no cambian.

## Validación

- Compilación TypeScript, Vite y PWA.
- 34 pruebas unitarias y de persistencia.
- 25 pruebas de navegador, con iconos y funcionamiento offline.
- Comprobación de que el encabezado mantiene la billetera y el lanzamiento utiliza los PNG v4.
- Revisión visual de la imagen editada para confirmar que desapareció el panel gris interior.

No se modifican funciones financieras ni IndexedDB. La renovación del icono ya instalado sigue dependiendo de iOS y no se fuerza borrando datos o desinstalando.

# Mi dinero

PWA de finanzas personales en español, con moneda MXN y diseño para iPhone. React + TypeScript + Vite + IndexedDB (`idb`) + `vite-plugin-pwa`. No requiere cuentas, servidor de datos ni credenciales. Empieza sin datos; las pruebas utilizan únicamente conceptos ficticios.

## Desarrollo

Requiere Node.js 22.12+ (validado con Node 24) y npm.

```sh
npm ci
npm run dev
```

## Validación

```sh
npm test
npm run build
npm run test:e2e
```

Las pruebas de navegador usan Chromium instalado en `/usr/bin/chromium` por defecto. Para otra instalación, define `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; si utilizas los navegadores de Playwright, ejecuta `npx playwright install chromium` y define `PLAYWRIGHT_USE_BUNDLED_BROWSER=1`.

`npm run preview` sirve la compilación local; el modo de desarrollo no registra el service worker. Las pruebas E2E levantan su propio servidor de preview en el puerto 4173. El workflow de GitHub Pages publica únicamente cuando se actualiza `main`. Las ramas y las pull requests solo ejecutan validaciones.

## Funcionalidad

- **Inicio:** saldo de todos los ingresos menos los gastos, ingresos, egresos y deuda pendiente acumulados. El saldo inicial es cero: para representar dinero previo registra un ingreso con concepto «Saldo inicial».
- **Movimientos:** altas, edición y eliminación; fecha local, concepto o establecimiento, categoría, importe en MXN, método de pago y notas. Filtros inclusivos por fecha, categoría y establecimiento.
- **Deudas:** acreedor, importe original, saldo pendiente al incorporarla, vencimiento, abonos e historial. Una deuda no genera automáticamente un ingreso ni un gasto. Los abonos anteriores al registro quedan representados por la diferencia entre el original y el saldo inicial.
- **Abonos:** cada abono crea exactamente un gasto vinculado en una única transacción IndexedDB. El importe del gasto y del abono siempre coinciden. Los abonos se registran mediante transferencia. No vuelvas a registrar manualmente ese mismo pago como gasto. Para corregirlo, elimina/revierte el abono y créalo de nuevo: la reversión elimina el gasto y restituye el saldo pendiente. No se permiten sobrepagos.
- **Reportes:** totales de ingresos, egresos y balance diarios, semanales (lunes a domingo) y mensuales, con los mismos filtros. El rango incluye ambos extremos.
- **Respaldos:** exportación JSON versionada de toda la información; importación validada, con confirmación, que reemplaza el conjunto completo de datos atómicamente. No mezcla ni duplica registros al reimportar. Límite de archivo de 10 MB. CSV de todos los movimientos o de los movimientos filtrados, con escape de comillas, BOM UTF-8 y protección contra fórmulas comunes.

## Instalar en iPhone

La aplicación se prepara para `https://trazka.github.io/mi-dinero-pwa/`, con HTTPS y ruta base `/mi-dinero-pwa/`. La disponibilidad de esa dirección depende de que GitHub Pages esté habilitado y el workflow termine correctamente.

1. Abre su dirección en Safari.
2. Toca **Compartir → Agregar a pantalla de inicio → Agregar**.
3. Abre Mi dinero y espera el aviso **Aplicación lista para usar sin internet** antes de desconectarte.
4. Puedes registrar, editar, consultar y exportar datos sin conexión. Las nuevas versiones requieren conexión y se activan al cerrar y volver a abrir la aplicación.

Incluye manifest, iconos PNG de 192/512 px, icono de Apple de 180 px y precaché de todos los recursos locales. No utiliza fuentes ni servicios externos en tiempo de ejecución. La instalación real en Safari/iOS requiere comprobación manual en un iPhone; la emulación Chromium no la sustituye.

## Almacenamiento y privacidad

Los datos se guardan en IndexedDB en el origen y dispositivo actuales. Safari y la aplicación instalada pueden tener almacenes separados según la versión de iOS: usa JSON para transferir los datos si fuera necesario. No hay sincronización ni conexión bancaria. Eliminar datos del navegador, desinstalar, usar navegación privada o cambiar de origen/dispositivo puede eliminar o aislar la información. El almacenamiento puede fallar si no queda espacio; la aplicación muestra el error sin confirmar el guardado.

Haz respaldos periódicos. El JSON y el CSV contienen datos personales **sin cifrar**; guárdalos con cuidado. La aplicación no cifra IndexedDB y se apoya en la protección del dispositivo.

## Publicación automática en GitHub Pages

En el repositorio, selecciona **Settings → Pages → Build and deployment → Source: GitHub Actions**. Al integrar cambios en `main`, `.github/workflows/deploy-pages.yml` instala desde el lockfile, ejecuta las pruebas unitarias, compila y prueba la PWA con Chromium en la ruta real de publicación, incluidos manifest, service worker y funcionamiento offline. Solo si todo pasa sube `dist` y lo publica en el entorno `github-pages`. No requiere tokens personales ni secretos adicionales. Las ejecuciones se serializan para evitar despliegues simultáneos.

La ruta base, el identificador, inicio y alcance del manifest, los iconos y el fallback de navegación están configurados para `/mi-dinero-pwa/`. Para validar localmente esa misma ruta, usa `npm run build` y `npm run preview`, y visita la ruta `/mi-dinero-pwa/` del servidor local.

Publicar no migra ni borra IndexedDB. Los datos están asociados al origen del navegador; los registros creados en localhost u otro dominio no aparecerán automáticamente en GitHub Pages. Puedes trasladarlos mediante exportación e importación JSON.

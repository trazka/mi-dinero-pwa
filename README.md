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
- **Abonos:** en deudas ordinarias, cada abono crea un único gasto vinculado. En tarjetas, la compra vinculada solo aumenta la deuda: cada abono crea el gasto en la fecha del pago. Ambos se guardan atómicamente en IndexedDB, mediante transferencia. No registres el pago por separado. Revertir el abono elimina su movimiento y restituye la deuda. No se permiten sobrepagos.
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

## Diagnóstico del arranque y verificación pública

La página incluye una pantalla de carga y error independiente del bundle de React. Si falla la descarga del JavaScript, la evaluación de un módulo o el render inicial, muestra el motivo y un botón para volver a cargar. Si el inicio tarda más de 15 segundos, muestra un aviso; una carga posterior correcta lo oculta. No borra IndexedDB ni las cachés. Los fallos de registro PWA se registran en consola y no bloquean el arranque de React. En los inicios con conexión se solicita comprobar si hay un service worker nuevo, manteniendo el modo de actualización con aviso.

```sh
npm run test:pages
```

Esta comprobación abre **la URL pública real** `https://trazka.github.io/mi-dinero-pwa/` con un perfil iPhone en Chromium y un contexto limpio. Exige HTTP correcto, tipos MIME de JavaScript/CSS correctos, ausencia de errores de ejecución, encabezado y botón de la interfaz visibles, IndexedDB inicializado y service worker con alcance `/mi-dinero-pwa/`. Guarda `test-results/pages-live.png`. Se puede pasar otra URL como argumento para comprobar el propio verificador; eso no verifica el despliegue público.

El workflow ejecuta esta comprobación **después** de publicar y adjunta la captura en el artefacto `github-pages-interface`, incluso si falla la comprobación. Una compilación aprobada ya no es la única señal de salud: debe aprobar también el job `verify-published`. La prueba sigue sin sustituir una revisión en Safari/Brave de un iPhone físico.

Para diagnosticar una pantalla vacía, conserva el texto exacto del error visible y consulta el artefacto del último despliegue. Una sesión privada nueva también reproduce problemas de recursos o ejecución sin depender de una instalación anterior. No borres los datos del sitio como paso de diagnóstico; contienen tus movimientos.

Los campos de fecha usan un calendario en español: al tocar el día, se aplica la selección y se cierra automáticamente, sin palomita adicional. En los formularios, el botón Guardar sigue siendo necesario para guardar el registro completo; los filtros se aplican al seleccionar la fecha.

El mes y el año también se seleccionan dentro del calendario con botones, sin abrir selectores nativos de iPhone. Si hay una versión pendiente, el aviso **Actualizar aplicación** permite aplicarla; guarda o cierra los formularios antes de pulsarlo. La actualización no borra IndexedDB ni los respaldos.

## Compras con tarjeta de crédito

1. En **Deudas → Nueva deuda**, selecciona **Tipo de deuda → Tarjeta de crédito**. Registra el acreedor, vencimiento e importes de apertura. Si está en cero, introduce 0 en ambos importes.
2. En **Nuevo movimiento**, selecciona **Gasto → Tarjeta de crédito** y elige **Tarjeta o deuda vinculada**. Si solo hay una tarjeta registrada, queda preseleccionada. También puedes elegir una deuda existente: se utilizará como tarjeta a partir de esa compra.
3. La compra aumenta automáticamente el saldo pendiente de esa tarjeta. No suma al gasto ni reduce el saldo disponible. Se conserva su categoría y fecha para consultar el movimiento.
4. Usa **Deudas → Registrar abono** para pagar. El pago reduce la deuda, aparece en Movimientos y suma al gasto en Inicio y Reportes, en la fecha del abono y categoría Pago de deuda. Ejemplo: compra $100 y abono $40 → deuda $60 y gasto $40.

El saldo disponible representa ingresos menos gastos pagados. Las compras vinculadas a crédito no lo reducen: se descuenta cada abono al pagar la tarjeta. El saldo inicial de una tarjeta representa compras anteriores al registro y no crea gastos nuevos. Los movimientos y abonos anteriores permanecen con su contabilización original; no se vinculan ni reclasifican retroactivamente. Un gasto antiguo con tarjeta sin vínculo puede editarse manteniéndolo sin vincular. Si decides vincularlo expresamente, su importe se agrega a la deuda: evita incluirlo también en el saldo de apertura.

Al editar, eliminar o cambiar de tarjeta una compra, su cargo se ajusta en la misma transacción. Si eso dejaría el saldo negativo porque ya hubo abonos, se rechaza el cambio: primero revierte los abonos correspondientes. El CSV incluye los vínculos y una columna **Gasto contabilizado MXN**, con cero para las compras vinculadas y el importe pagado para los abonos.

El formato de respaldo es ahora versión 2. Se admiten respaldos anteriores de versión 1 y se preservan movimientos, deudas y abonos. No se recrea la base de IndexedDB: la lectura adapta el formato en memoria y la siguiente escritura guarda la versión 2. Las versiones anteriores de la aplicación pueden rechazar respaldos nuevos.

## Apariencia e icono

En la esquina superior derecha, pulsa **Apariencia** (icono de monitor, sol o luna) y elige **Claro**, **Oscuro** o **Automático**. Automático sigue el modo del iPhone y responde a sus cambios sin recargar. La preferencia se conserva localmente, funciona sin conexión y se aplica antes de iniciar React. Si el navegador no permite guardar preferencias, puedes cambiar el modo durante la sesión. Esta preferencia visual no modifica ni forma parte del respaldo financiero de IndexedDB.

El icono de la M integrada en una billetera, en verde intenso sobre negro se genera desde `assets/icon-v5-master.png` en tamaños 192, 512 y 180 px (Apple). Para regenerar los PNG, ejecuta `node scripts/generate-icons.mjs` con Chromium instalado según las instrucciones de pruebas. El manifiesto conserva su identidad y ruta y usa archivos de icono con nombres nuevos para renovar la caché. iOS puede conservar el icono de una instalación existente aunque la interfaz esté actualizada; no desinstales ni borres datos para forzar el cambio. Antes de cualquier reinstalación conserva un respaldo JSON.

La vista de iPhone usa un encabezado compacto con el icono de Mi dinero, pestañas inferiores con estado activo, tarjetas redondeadas y formularios en una hoja inferior. Al cambiar de sección vuelve al inicio de esa sección. Respeta las áreas seguras del iPhone, el modo oscuro y la preferencia de reducir movimiento. Conserva todas las funciones y sigue siendo instalable desde Safari.

En iPhone, el marco de la aplicación ocupa la altura disponible: encabezado y pestañas inferiores permanecen en su sitio. Solo se desplaza el contenido central o el formulario abierto. Se evita que el desplazamiento de una sección arrastre la página completa; cambiar de pestaña vuelve al inicio del contenido. Las tablas mantienen su desplazamiento horizontal y no se bloquean los gestos táctiles globalmente. La vista de escritorio mantiene su desplazamiento normal.

## Abonos, planificación y búsqueda

- **Nuevo movimiento → Tipo:** ingreso, gasto, compra con TDC o abono a deuda. El abono permite elegir una deuda con saldo pendiente, usa transferencia y actualiza deuda/gasto en una única transacción. No se registra una segunda vez como gasto. Las compras con TDC siguen aumentando solo la deuda.
- **Deudas → Editar:** cambia acreedor, vencimiento y notas conservando compras y abonos. Los importes de apertura quedan de solo lectura para proteger el historial. En tarjetas puedes configurar día de corte y día límite (ambos de 1 a 31, o ambos vacíos).
- **Corte de tarjeta:** muestra el saldo total, pendiente estimado al último corte y límite calculado. Días que no existen se ajustan al último día del mes. Los pagos se aplican a lo más antiguo; cuando el corte ya está pagado se muestra el límite del ciclo siguiente. El cálculo usa únicamente tus registros y el saldo de apertura: no incluye intereses, comisiones ni datos del banco y no sustituye un estado de cuenta.
- **Movimientos → Gastos recurrentes → Crear recurrente:** configura concepto, importe, categoría, método, frecuencia semanal/mensual/anual y próxima fecha. No crea movimientos al guardar ni en segundo plano. Cada vencimiento requiere pulsar Registrar y confirmar su fecha/importe; se registra con la fecha programada. Puedes editar, pausar, reactivar o eliminar la programación sin borrar movimientos anteriores. Una compra recurrente con TDC solo aumenta deuda. El ancla mensual conserva, por ejemplo, enero 31 → febrero 28 → marzo 31. Eliminar un movimiento generado no retrocede automáticamente la programación.
- **Reportes → Presupuesto mensual:** configura límite general o por categoría para el mes mostrado. Guardar el mismo mes/categoría reemplaza su límite. El consumo usa todos los gastos pagados del mes, independientemente de los filtros del reporte, y muestra disponible o excedido. General y categorías se comparan por separado. Los abonos se contabilizan en «Pago de deuda», no se distribuyen automáticamente entre las categorías de sus compras.
- **Respaldos:** muestra la fecha de la última exportación iniciada y recomienda exportar cada siete días. Inicio también lo recuerda si hay datos sin respaldo reciente. La fecha indica que se inició la descarga; comprueba que guardaste el archivo en Archivos. El JSON incluye presupuestos, programaciones, fechas de corte y fecha de exportación, además de movimientos y deudas. Se mantienen los respaldos versión 1 y 2; importar sigue reemplazando el conjunto completo.
- **Buscar movimientos:** busca por concepto, categoría, notas o importe (también con símbolo $ y comas), sin distinguir acentos. Combina con filtros por método, tarjeta/deuda, fechas, categoría y establecimiento; «Limpiar filtros» restablece todos. Los filtros de deuda incluyen sus compras y abonos. El CSV de Movimientos respeta la búsqueda y los filtros.

Las siete mejoras funcionan localmente y sin conexión una vez preparada la PWA. Los recordatorios son avisos dentro de la app: no se solicitan permisos de notificaciones ni se envían mensajes externos. Los formularios de planificación abiertos bloquean el botón de actualización para evitar perder lo que estás escribiendo.

El símbolo dentro del encabezado es la billetera en verde/menta (`icon-v2.svg`). El icono de lanzamiento en la pantalla de inicio es la M integrada en una billetera verde intensa sobre negro (PNG v5). Son recursos independientes. Actualizar la interfaz no garantiza que iOS sustituya el icono de lanzamiento de una instalación existente; conserva un respaldo JSON antes de intentar reemplazar el acceso.

Las rutas PNG de iconos de lanzamiento anteriores también sirven la nueva billetera con M; el SVG de billetera usado dentro de la app es independiente y se conserva. Esto facilita las actualizaciones si iOS vuelve a descargar un icono antiguo, pero no obliga al sistema a renovar su copia guardada.

El icono de lanzamiento v5 combina la M con el contorno de una billetera en verde intenso sobre fondo negro uniforme. La billetera del encabezado no cambia.

## Bloqueo opcional

En **Respaldos → Seguridad**, activa el bloqueo del dispositivo. Requiere HTTPS, un autenticador de plataforma compatible y una llave de acceso. iPhone puede solicitar Face ID o el código del dispositivo; la app no controla esa elección. La activación comprueba la llave y exige guardar un código de recuperación fuera de la app. El código permite abrirla si no está disponible la llave.

La app se bloquea al abrirla y al ocultarse, manteniendo los formularios sin guardar en memoria mientras la sesión siga abierta. Puedes bloquear manualmente o desactivarlo desde Seguridad. La comprobación de firmas se hace localmente, sin servidor; la configuración está en una base de seguridad separada y no forma parte del respaldo financiero. El bloqueo es una protección de interfaz, no un cifrado de los datos locales o JSON. No borres los datos del sitio ni desinstales la app para solucionar problemas de acceso. Verifica Face ID y el modo avión en el iPhone real después de publicar: las pruebas con autenticador virtual no sustituyen esa comprobación.

## Apartados para ahorro

En **Apartados → Nuevo apartado**, crea una meta con nombre e importe objetivo. **Aportar** reserva dinero de tu saldo libre; **Retirar** lo libera. Son reservas manuales: no mueven dinero entre bancos ni generan ingresos o gastos. El saldo principal conserva su cálculo de ingresos menos gastos pagados; Inicio muestra además el total apartado y el saldo libre después de reservarlo.

Cada apartado tiene progreso e historial de aportaciones y retiros. Puedes cambiar su nombre/meta sin perder el historial y eliminarlo solo cuando su saldo sea cero. No se permite aportar más del saldo libre ni retirar más de lo reservado. Si después registras gastos que superan el dinero libre, la app muestra el saldo libre negativo y pide revisar las reservas: no altera ni rechaza tus movimientos financieros. Para gastar dinero reservado, retíralo del apartado y registra el gasto una sola vez.

Los apartados se guardan en IndexedDB y se incluyen en el JSON; importar sigue reemplazando todo el conjunto. Los respaldos anteriores sin apartados se admiten. El CSV mantiene su propósito de exportar movimientos financieros; las reservas se conservan en JSON. No hay aportaciones automáticas, intereses ni conexión bancaria.

En horizontal con poca altura, el menú lateral oculta su tarjeta informativa y pie decorativo para evitar que aparezcan recortados; los accesos a las secciones siguen disponibles.

Para cambiar de sección, desliza horizontalmente sobre el contenido: a la izquierda avanzas y a la derecha vuelves. El recorrido es Inicio → Movimientos → Deudas → Apartados → Reportes → Respaldos, sin saltar del último al primero. Se tolera una pequeña desviación vertical del dedo; los desplazamientos verticales, las tablas horizontales y los formularios abiertos conservan su función.

En horizontal, el botón de panel situado a la izquierda de «Mi dinero» permite **Ocultar menú lateral** y **Mostrar menú lateral**. Al ocultarlo, el contenido ocupa el ancho disponible y conserva la sección actual. En vertical se mantiene la navegación inferior; el botón de panel solo aparece donde existe menú lateral.

También puedes aportar desde **Nuevo movimiento → Tipo → Apartado**: selecciona tu meta, importe y fecha. Si solo tienes un apartado queda seleccionado. Esta operación solo reserva saldo y aparece en el historial de la meta; no genera un gasto en Movimientos. Si aún no hay metas, **Crear apartado** abre el formulario correspondiente.

## Privacidad visual de los apartados

Los ahorros empiezan ocultos al abrir la app: Inicio muestra `••••` para el total apartado y el saldo libre; en Apartados se ocultan nombres, metas, importes e historial. El botón **Mostrar ahorros** exige tener activado el bloqueo en **Respaldos → Seguridad**. Al pulsarlo aparece la pantalla de bloqueo y debes iniciar manualmente el desbloqueo con el dispositivo o tu recuperación. No se solicita autenticación de forma automática. **Ocultar ahorros** vuelve a cubrirlos sin modificar datos.

Sin bloqueo no se pueden revelar ni gestionar apartados; **Configurar bloqueo** lleva a Seguridad. También se protege el selector de metas de Nuevo movimiento. Al salir de la app, los ahorros vuelven a ocultarse, aunque desbloquees después la sesión general. Los borradores de Apartados se conservan mientras la sección permanezca abierta. Esta es privacidad visual, no cifrado: los JSON siguen incluyendo los ahorros y deben guardarse con cuidado.

# Quitar confirmaciones nativas del calendario y permitir aplicar actualizaciones

El calendario de la aplicación ya seleccionaba el día y se cerraba con un toque, pero sus listas de mes y año seguían siendo `<select>` nativos de iPhone, capaces de mostrar una palomita. Ahora los meses y años también se eligen mediante botones dentro del calendario, sin controles de fecha ni selectores nativos. Los días conservan selección y cierre inmediatos.

Además, en modo PWA `prompt` una versión anterior puede seguir activa mientras haya clientes abiertos. El aviso anterior solo pedía cerrar la aplicación y no invocaba la función de actualización del plugin. Esta PR añade **Actualizar aplicación**, que aplica el service worker pendiente. Se bloquea mientras hay un formulario abierto o un guardado en curso, y muestra un error recuperable si no puede actualizar. El aviso se conserva aunque llegue antes de montar React. No se borran datos ni cachés ni se cambian los cálculos.

La descripción del usuario (palomita desde que abre el calendario) es compatible con el selector anterior, pero no se ha inspeccionado su sesión: no se atribuye con certeza su pantalla a una versión almacenada.

## Validación

- `npm test`: 10 pruebas aprobadas.
- `npm run build`: correcto.
- `npm run test:e2e`: 14 pruebas aprobadas.
- Las pruebas de fechas ahora eligen mes y año mediante botones y verifican que no haya `select` ni `input[type=date]` dentro del calendario, además de conservar fecha, cierre automático, mínimos y persistencia.
- Dos pruebas de la interfaz de actualización comprueban aviso anterior/posterior al montaje, invocación del callback, bloqueo con formulario abierto y recuperación de errores. Usan un callback de actualización controlado, no simulan una publicación real.
- `src/data.ts` permanece intacto. No hay migración ni eliminación de IndexedDB.

Tras integrar, el workflow habitual publica y verifica la interfaz pública. Falta comprobar en el iPhone que recibe la nueva versión y que ya no muestra la palomita.

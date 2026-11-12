# Bloqueo opcional con llave de acceso del dispositivo

Añade Seguridad en Respaldos: activación voluntaria con autenticación de plataforma y verificación obligatoria del usuario (Face ID o código, según el dispositivo). Exige confirmar que se guardó un código de recuperación antes de activar. Permite bloquear manualmente y desactivar desde la sesión desbloqueada.

Bloquea al abrir y al ocultarse la app, conservando el estado de formularios ocultos. Verifica localmente las firmas ES256, el desafío aleatorio, origen, RP, identificador de credencial y presencia/verificación del usuario. Cancelar o recibir una firma inválida mantiene el bloqueo. Usa una base IndexedDB de seguridad separada de los datos financieros; no se exportan las credenciales en respaldos. La recuperación usa un código aleatorio de 128 bits y solo guarda su hash.

El bloqueo protege la interfaz y no cifra IndexedDB ni los JSON. No exige exclusivamente Face ID: el sistema decide el método de verificación. La disponibilidad depende del navegador y del autenticador. El desbloqueo local se prueba sin red con un autenticador virtual; debe comprobarse también en un iPhone real instalado desde Safari, con Face ID y en modo avión, antes de prometer compatibilidad en ese dispositivo.

Validación: 34 pruebas unitarias y 30 pruebas de navegador aprobadas; compilación correcta. Comprobadas firma inválida, cancelación, recuperación errónea/correcta, autenticación y recuperación sin conexión, bloqueo al ocultarse, conservación de borradores y datos, y navegador sin autenticador compatible. Captura revisada en tamaño iPhone.

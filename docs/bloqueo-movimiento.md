# Bloqueo automático de video durante el movimiento

## Alcance y advertencia

El panel de demostración bloquea los elementos `<video>` y `<iframe>` de la página cuando detecta movimiento. El audio sigue disponible. El modo predeterminado es el simulador; el GPS experimental solo se activa después de elegirlo en el panel y responder al permiso del navegador.

**Demostración del algoritmo. No es un mecanismo de seguridad validado para uso real en vehículos.**

## Algoritmo y estados

El umbral inicial está definido por `UMBRAL_VELOCIDAD_KMH = 5` en `src/servicios/bloqueo_movimiento.js`.

Se eligieron 5 km/h como margen sencillo para tolerar ruido y pequeñas variaciones del GPS o del sensor: exigir exactamente 0 km/h no es realista, y a velocidades bajas el vehículo ya se considera en movimiento a efectos de evitar distracciones. Es un valor demostrativo, no un límite de seguridad certificado. Para cambiarlo, modifica esa constante. El desbloqueo espera 3 segundos continuos por debajo del umbral (`ESPERA_DESBLOQUEO_MS`).

```text
                       velocidad >= 5 km/h
          ┌─────────────────────────────────────────┐
          │                                         ▼
    PERMITIDO ◄── menos de 5 km/h durante 3 s ── BLOQUEADO
          │                                         ▲
          └──────── señal ausente o inválida ──────┘
```

En pseudocódigo:

```text
si no hay señal válida:
    bloquear inmediatamente
si velocidad >= umbral:
    cancelar la espera y bloquear inmediatamente
si velocidad < umbral y el video está bloqueado:
    iniciar espera de 3 segundos
    desbloquear solo si la lectura sigue siendo válida y bajo el umbral
al desbloquear:
    no reanudar; la persona debe presionar reproducir
```

En el valor exacto del umbral se bloquea; solo se inicia la espera de desbloqueo por debajo de él. Si la señal se pierde durante esa espera, el bloqueo continúa.

## Fuentes de velocidad

- **Simulador:** seleccionado por defecto. Los botones de vehículo detenido/en movimiento y el deslizador (0–120 km/h) emiten lecturas por la interfaz común.
- **GPS real (experimental):** se inicia `navigator.geolocation.watchPosition` solo después de seleccionar esta fuente. La velocidad `coords.speed`, en m/s, se convierte a km/h multiplicándola por 3.6. Si el navegador no ofrece velocidad, niega el permiso, no tiene una conexión segura, falla la lectura o pasan 15 segundos sin una actualización, se muestra el motivo y el video permanece bloqueado.
- **Interfaz:** `emitirVelocidad(velocidad, fuente, error)` publica el evento `speedchange`; `obtenerVelocidad()` devuelve la última velocidad válida o `null`. Una integración puede enviar lecturas con `emitirVelocidad(velocidadEnKmh, 'gps')` sin cambiar el algoritmo. Una lectura ausente/inválida puede enviarse como `emitirVelocidad(null, 'gps', 'Motivo de la pérdida de señal')`.

## Integración futura con un vehículo

Una página web no obtiene acceso directo al bus CAN del vehículo. Una posible integración necesitaría una pasarela autorizada, por ejemplo una aplicación nativa o un servicio local conectado a un adaptador OBD-II/ELM327 (PID de velocidad `0x0D`), una pasarela del bus CAN o un módulo GPS/telemetría. Esa pasarela tendría que exponer datos a la aplicación web de forma segura —por ejemplo, con una API autenticada compatible— y convertirlos a km/h. El adaptador publica cada lectura mediante la misma interfaz `emitirVelocidad(velocidadEnKmh, 'gps')`; ante una desconexión publica una lectura nula con el motivo. El resto del control de movimiento no depende del origen de la señal.

## Limitaciones

- El navegador no tiene acceso directo al bus del vehículo ni verifica que el GPS corresponda a ese vehículo.
- La geolocalización puede retrasarse, sufrir errores o no proporcionar `coords.speed`; el permiso y HTTPS dependen del navegador y del sitio.
- Un reproductor de iframe de otro proveedor se cubre y bloquea visualmente; la integración también pausa el reproductor de YouTube mediante su interfaz y una orden `postMessage`. Durante el bloqueo se retiran los permisos de autoplay y picture-in-picture. Si el URL de un iframe HTTP(S) solicita `autoplay=1`, se cambia a `autoplay=0` y se conserva desactivado tras desbloquear para que no se reanude solo. Los reproductores de otros orígenes no exponen una API común que la página pueda invocar con seguridad.
- El reproductor de video puede recibir eventos externos o depender de APIs del proveedor; esta demo no sustituye un sistema certificado, integrado en el vehículo y validado para uso real.
- **Demostración del algoritmo. No es un mecanismo de seguridad validado para uso real en vehículos.**

## Pruebas manuales

1. Abrir Multimedia, desplegar «Modo demostración / simulador» y confirmar que al iniciar la página el video permanece bloqueado hasta completarse la espera de velocidad cero.
2. Con el simulador, seleccionar «Vehículo en movimiento» o ajustar el deslizador a más de 5 km/h: el reproductor debe pausarse y mostrar la capa de bloqueo.
3. Ajustar la velocidad a exactamente 5 km/h: el reproductor debe permanecer bloqueado.
4. Bajar a 4 km/h y volver a 5 km/h antes de 3 segundos: la espera debe reiniciarse y no debe parpadear el desbloqueo.
5. Mantener el deslizador por debajo de 5 km/h durante 3 segundos: desaparece la capa y el video no se reanuda hasta pulsar Play.
6. Cambiar a «GPS real (experimental)» y denegar el permiso o probar en una página sin HTTPS: debe mostrarse un aviso y mantenerse el bloqueo.
7. Mientras está bloqueado, insertar un `<video>` o un iframe de YouTube dinámicamente: debe cubrirse y bloquearse también.
8. Desbloquear después de haber pausado un video y confirmar que se restauran sus atributos originales de controles, autoplay, pantalla completa y picture-in-picture sin iniciar la reproducción automáticamente.

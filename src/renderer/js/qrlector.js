document.addEventListener('DOMContentLoaded', () => {
    const { ipcRenderer } = require('electron');
    const { Html5Qrcode } = require('html5-qrcode');

    const qrContainer = document.getElementById("img-qr");
    if (!qrContainer) {
        console.error("Elemento img-qr no encontrado");
        return;
    }

    // ---------------------------------------------------------------
    // UI
    // ---------------------------------------------------------------
    qrContainer.style.width = "300px";
    qrContainer.style.height = "300px";
    qrContainer.style.backgroundColor = "#000";
    qrContainer.style.position = "relative";

    const statusDiv = document.createElement("div");
    Object.assign(statusDiv.style, {
        color: "white",
        position: "absolute",
        bottom: "10px",
        left: "10px",
        right: "10px",
        textAlign: "center",
        zIndex: "10"
    });
    statusDiv.textContent = "Iniciando cámara... (también puedes usar el lector)";
    qrContainer.appendChild(statusDiv);

    // ---------------------------------------------------------------
    // Estado compartido (cámara + lector HID)
    // ---------------------------------------------------------------
    let procesando = false;          // Evita enviar dos lecturas a la vez
    let qrScanner = null;
    let camaraActiva = false;
    let timeoutSeguridad = null;

    const TIEMPO_ESPERA_RESPUESTA = 10000; // ms antes de liberar si main no responde

    function detenerCamara() {
        if (!qrScanner || !camaraActiva) return Promise.resolve();
        camaraActiva = false;
        return qrScanner.stop()
            .then(() => console.log("Escáner QR detenido"))
            .catch(err => console.error("Error al detener escáner:", err));
    }

    /**
     * Punto único de entrada para cualquier lectura (cámara o HID).
     */
    function procesarMatricula(texto, origen) {
        const matricula = (texto || "").trim();
        if (!matricula || procesando) return;

        procesando = true;
        console.log(`QR leído (${origen}):`, matricula);
        statusDiv.textContent = "QR detectado: " + matricula;

        detenerCamara();
        ipcRenderer.send('verificar-matricula', matricula);

        // Si el proceso principal no responde, se libera para reintentar
        clearTimeout(timeoutSeguridad);
        timeoutSeguridad = setTimeout(() => {
            procesando = false;
            statusDiv.textContent = "Sin respuesta, intenta de nuevo";
        }, TIEMPO_ESPERA_RESPUESTA);
    }

    // ---------------------------------------------------------------
    // Lector HID (emula teclado)
    // ---------------------------------------------------------------
    const HID = {
        MAX_INTERVALO: 50,        // ms máx. entre teclas para considerarlo lector (humano es más lento)
        MIN_LONGITUD: 3,          // longitud mínima de una lectura válida
        TIMEOUT_SIN_SUFIJO: 150,  // si el lector no manda sufijo, se procesa tras esta pausa
        VENTANA_POST_LECTURA: 150 // ms para absorber el LF de un CR+LF
    };

    let bufferHid = "";
    let ultimaTecla = 0;
    let finUltimaLectura = 0;
    let timerSinSufijo = null;

    function esCampoEditable(el) {
        return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    }

    function finalizarLecturaHid() {
        clearTimeout(timerSinSufijo);
        const lectura = bufferHid;
        bufferHid = "";
        if (lectura.length >= HID.MIN_LONGITUD) {
            finUltimaLectura = performance.now();
            procesarMatricula(lectura, "lector HID");
            return true;
        }
        return false;
    }

    document.addEventListener('keydown', (e) => {
        // No interferir si en el futuro hay un campo de texto con foco
        if (esCampoEditable(e.target)) return;

        const ahora = performance.now();
        const intervalo = ahora - ultimaTecla;
        ultimaTecla = ahora;

        // --- Terminadores: CR (Enter) o Tab ---
        if (e.key === 'Enter' || e.key === 'Tab') {
            if (bufferHid.length > 0) {
                e.preventDefault();          // evita mover foco o "clickear" botones
                finalizarLecturaHid();
                return;
            }
            // Buffer vacío justo después de una lectura: es el LF de CR+LF
            // o un Enter/Tab residual del lector -> se descarta
            if (ahora - finUltimaLectura < HID.VENTANA_POST_LECTURA) {
                e.preventDefault();
            }
            return;
        }

        // Algunos lectores emulan LF como Ctrl+J
        if (e.ctrlKey && e.key.toLowerCase() === 'j' &&
            ahora - finUltimaLectura < HID.VENTANA_POST_LECTURA) {
            e.preventDefault();
            return;
        }

        // Solo caracteres imprimibles sin modificadores (Shift sí se permite)
        if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

        // Si pasó mucho tiempo desde la última tecla, es una lectura nueva
        // (o un humano tecleando): se reinicia el buffer
        if (intervalo > HID.MAX_INTERVALO) {
            bufferHid = "";
        }

        bufferHid += e.key;

        // Respaldo por si el lector está configurado sin sufijo
        clearTimeout(timerSinSufijo);
        timerSinSufijo = setTimeout(finalizarLecturaHid, HID.TIMEOUT_SIN_SUFIJO);
    });

    // ---------------------------------------------------------------
    // Cámara
    // ---------------------------------------------------------------
    setTimeout(() => {
        if (procesando) return; // ya se leyó con el lector HID

        statusDiv.textContent = "Solicitando permisos de cámara...";

        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop());
                if (procesando) return;

                statusDiv.textContent = "Escanea tu QR con la cámara o el lector";
                qrScanner = new Html5Qrcode("img-qr");

                const config = {
                    fps: 30,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                return qrScanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => procesarMatricula(decodedText, "cámara"),
                    () => { /* frames sin QR: se ignoran para no saturar la consola */ }
                ).then(() => {
                    camaraActiva = true;
                    // Si el lector HID leyó mientras la cámara arrancaba
                    if (procesando) detenerCamara();
                });
            })
            .catch(err => {
                // La cámara falla, pero el lector HID sigue funcionando
                statusDiv.textContent = "Cámara no disponible. Usa el lector QR.";
                console.error("Error de cámara:", err);
            });
    }, 1000);

    // ---------------------------------------------------------------
    // Navegación y respuesta del proceso principal
    // ---------------------------------------------------------------
    document.getElementById('btn-volver-qr').addEventListener('click', () => {
        detenerCamara().finally(() => ipcRenderer.send('navigate', 'acceder'));
    });

    ipcRenderer.on('resultado-verificacion', (event, respuesta) => {
        clearTimeout(timeoutSeguridad);
        detenerCamara().finally(() => {
            ipcRenderer.send('navigate', respuesta && respuesta.success === true
                ? 'qrsuccess'
                : 'qrdontsucces');
        });
    });
});
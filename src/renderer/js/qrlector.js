// qrlector.js — monitor de la ventana del lector de accesos
//
// Los tres escáneres serie se leen en el proceso principal (lectores.js) y aquí solo se muestran.
// La cámara y un lector tipo teclado (HID) quedan como respaldo y registran con el rol elegido.
document.addEventListener('DOMContentLoaded', () => {
    const { ipcRenderer } = require('electron');
    const { Html5Qrcode } = require('html5-qrcode');

    const ROLES = {
        PEATONAL: { numero: 1, nombre: 'Peatonal' },
        ENTRADA_VEHICULAR: { numero: 2, nombre: 'Entrada vehicular' },
        SALIDA_VEHICULAR: { numero: 3, nombre: 'Salida vehicular' }
    };
    const DURACION_RESULTADO_MS = 3000;
    const MAX_HISTORIAL = 25;

    const panel = (rol) => document.querySelector(`.panel[data-rol="${rol}"]`);
    const temporizadores = {};

    // ---------------------------------------------------------------
    // Reloj
    // ---------------------------------------------------------------
    const reloj = document.getElementById('reloj');
    const pintarReloj = () => {
        reloj.textContent = new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'medium' });
    };
    pintarReloj();
    setInterval(pintarReloj, 1000);

    // ---------------------------------------------------------------
    // Sonido para que el vigilante no tenga que mirar la pantalla
    // ---------------------------------------------------------------
    let audio = null;
    function sonar(estado, conAvisos) {
        try {
            audio = audio || new AudioContext();
            const tonos = estado === 'RECHAZADO' ? [[220, 0.35]] : conAvisos ? [[660, 0.12], [440, 0.2]] : [[880, 0.12]];
            let t = audio.currentTime;
            for (const [frecuencia, duracion] of tonos) {
                const osc = audio.createOscillator();
                const ganancia = audio.createGain();
                osc.frequency.value = frecuencia;
                ganancia.gain.value = 0.15;
                osc.connect(ganancia).connect(audio.destination);
                osc.start(t);
                osc.stop(t + duracion);
                t += duracion + 0.05;
            }
        } catch (e) {
            console.warn('No se pudo reproducir el sonido:', e);
        }
    }

    // ---------------------------------------------------------------
    // Resultados de cada lector
    // ---------------------------------------------------------------
    function crear(etiqueta, clase, texto) {
        const el = document.createElement(etiqueta);
        if (clase) el.className = clase;
        if (texto !== undefined) el.textContent = texto;
        return el;
    }

    function mostrarEspera(rol) {
        const caja = panel(rol).querySelector('.resultado');
        caja.className = 'resultado';
        caja.replaceChildren(crear('p', 'espera', 'Esperando lectura...'));
    }

    function mostrarResultado(r) {
        const caja = panel(r.lector).querySelector('.resultado');
        caja.className = `resultado activo ${r.estado}`;
        const contenido = [crear('span', 'tipo', r.estado === 'RECHAZADO' ? 'RECHAZADO' : r.estado)];
        if (r.nombre) {
            contenido.push(crear('p', 'nombre', r.nombre));
            contenido.push(crear('p', 'detalle', `Matrícula ${r.matricula}${r.rol ? ' · ' + r.rol : ''}`));
        } else {
            contenido.push(crear('p', 'nombre', r.mensaje));
        }
        if (r.placas && r.placas.length) {
            contenido.push(crear('p', 'placas', `🚗 ${r.placas.join(' · ')}`));
        }
        if (r.avisos && r.avisos.length) {
            const lista = crear('ul', 'avisos');
            r.avisos.forEach((a) => lista.appendChild(crear('li', null, `⚠ ${a}`)));
            contenido.push(lista);
        }
        caja.replaceChildren(...contenido);

        // La tarjeta desaparece sola; el historial conserva la lectura
        clearTimeout(temporizadores[r.lector]);
        temporizadores[r.lector] = setTimeout(() => mostrarEspera(r.lector), DURACION_RESULTADO_MS);
    }

    function agregarHistorial(r) {
        const lista = panel(r.lector).querySelector('.historial');
        const item = crear('li', r.avisos && r.avisos.length ? 'con-aviso' : '');
        if (r.avisos && r.avisos.length) item.title = r.avisos.join('\n');
        item.append(
            crear('span', 'hora', new Date(r.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
            crear('span', `etiqueta ${r.estado}`, r.estado === 'RECHAZADO' ? 'Rechazo' : r.estado === 'ENTRADA' ? 'Entrada' : 'Salida'),
            crear('span', null, r.nombre || r.mensaje)
        );
        lista.prepend(item);
        while (lista.children.length > MAX_HISTORIAL) lista.lastChild.remove();
    }

    ipcRenderer.on('lectura-acceso', (event, resultado) => {
        if (!ROLES[resultado.lector] || resultado.estado === 'REPETIDO') return;
        mostrarResultado(resultado);
        agregarHistorial(resultado);
        sonar(resultado.estado, resultado.avisos && resultado.avisos.length);
    });

    Object.keys(ROLES).forEach(mostrarEspera);

    // ---------------------------------------------------------------
    // Estado de los escáneres serie
    // ---------------------------------------------------------------
    function pintarEstado({ lectores, sinAsignar }) {
        lectores.forEach((l) => {
            const etiqueta = panel(l.rol).querySelector('.estado-lector');
            etiqueta.className = `estado-lector ${l.puerto ? (l.conectado ? 'conectado' : 'desconectado') : ''}`;
            etiqueta.textContent = l.puerto ? `${l.puerto} · ${l.conectado ? 'conectado' : 'desconectado'}` : 'Sin asignar';
        });
        const aviso = document.getElementById('aviso-sin-asignar');
        const faltan = lectores.filter((l) => !l.puerto).length;
        aviso.hidden = !(faltan && sinAsignar.length);
        aviso.textContent = `Hay escáneres conectados sin asignar (${sinAsignar.join(', ')}). Usa "Configurar lectores" para indicar cuál es cada uno.`;
    }

    ipcRenderer.invoke('estado-lectores').then(pintarEstado);
    ipcRenderer.on('estado-lectores', (event, estado) => pintarEstado(estado));
    ipcRenderer.on('lectura-sin-asignar', (event, { puerto }) => {
        UI.notificar(`Se leyó un código en ${puerto}, que no está asignado a ningún lector`, 'warning');
    });

    // ---------------------------------------------------------------
    // Calibración: identificar qué puerto COM es cada escáner físico
    // ---------------------------------------------------------------
    const modalCalibracion = document.getElementById('modal-calibracion');
    const instruccion = document.getElementById('calibracion-instruccion');
    const resumen = document.getElementById('calibracion-resumen');
    const btnGuardar = document.getElementById('btn-calibracion-guardar');
    const btnOmitir = document.getElementById('btn-calibracion-omitir');
    let calibrando = null; // { cancelado, omitido, asignacion }

    function cancelarCalibracion() {
        if (calibrando) calibrando.cancelado = true;
        ipcRenderer.invoke('calibrar-cancelar');
        UI.cerrarModal(modalCalibracion);
    }

    async function calibrar() {
        calibrando = { cancelado: false, omitido: false, asignacion: {} };
        const sesion = calibrando;
        const usados = [];
        btnGuardar.hidden = true;
        btnOmitir.hidden = false;
        resumen.replaceChildren();
        UI.abrirModal(modalCalibracion, { alEscape: cancelarCalibracion });

        for (const [rol, info] of Object.entries(ROLES)) {
            instruccion.textContent = `Escanea cualquier código QR con el escáner del lector ${info.numero} · ${info.nombre}.`;
            sesion.omitido = false;
            const respuesta = await ipcRenderer.invoke('calibrar-esperar', { excluir: usados });
            if (sesion.cancelado) return;
            const item = crear('li');
            if (respuesta && !sesion.omitido) {
                sesion.asignacion[rol] = respuesta.puerto;
                usados.push(respuesta.puerto);
                item.className = 'listo';
                item.textContent = `Lector ${info.numero} · ${info.nombre}: ${respuesta.puerto}`;
            } else {
                sesion.asignacion[rol] = '';
                item.textContent = `Lector ${info.numero} · ${info.nombre}: sin asignar`;
            }
            resumen.appendChild(item);
        }

        instruccion.textContent = 'Revisa la asignación y guárdala.';
        btnOmitir.hidden = true;
        btnGuardar.hidden = false;
        btnGuardar.focus();
    }

    btnOmitir.addEventListener('click', () => {
        if (!calibrando) return;
        calibrando.omitido = true;
        ipcRenderer.invoke('calibrar-cancelar');
    });
    document.getElementById('btn-calibracion-cancelar').addEventListener('click', cancelarCalibracion);
    btnGuardar.addEventListener('click', async () => {
        try {
            const estado = await ipcRenderer.invoke('guardar-lectores', calibrando.asignacion);
            pintarEstado(estado);
            UI.cerrarModal(modalCalibracion);
            UI.notificar('Lectores configurados', 'success');
        } catch (error) {
            UI.notificar(`No se pudo guardar: ${error.message}`, 'error');
        }
    });
    document.getElementById('btn-configurar').addEventListener('click', calibrar);

    // ---------------------------------------------------------------
    // Respaldo: cámara y lector tipo teclado (HID)
    // ---------------------------------------------------------------
    const selectorRol = document.getElementById('rol-camara');
    const estadoCamara = document.getElementById('estado-camara');
    let enviando = false;

    async function procesarRespaldo(texto, origen) {
        const lectura = (texto || '').trim();
        if (!lectura || enviando) return;
        enviando = true;
        try {
            // El resultado llega por 'lectura-acceso', igual que el de los escáneres serie
            await ipcRenderer.invoke('registrar-acceso', { texto: lectura, lector: selectorRol.value, origen });
        } catch (error) {
            UI.notificar(`No se pudo registrar la lectura: ${error.message}`, 'error');
        } finally {
            enviando = false;
        }
    }

    // Lector HID (emula teclado): solo funciona con esta ventana enfocada
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
        return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    }

    function finalizarLecturaHid() {
        clearTimeout(timerSinSufijo);
        const lectura = bufferHid;
        bufferHid = "";
        if (lectura.length >= HID.MIN_LONGITUD) {
            finUltimaLectura = performance.now();
            procesarRespaldo(lectura, "teclado");
            return true;
        }
        return false;
    }

    document.addEventListener('keydown', (e) => {
        if (esCampoEditable(e.target) || modalCalibracion.classList.contains('active')) return;

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

    // Cámara: sigue encendida; las relecturas del mismo QR las descarta el proceso principal
    setTimeout(() => {
        estadoCamara.textContent = "Solicitando permisos de cámara...";
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop());
                const qrScanner = new Html5Qrcode("img-qr");
                return qrScanner.start(
                    { facingMode: "environment" },
                    { fps: 15, qrbox: { width: 120, height: 120 } },
                    (decodedText) => procesarRespaldo(decodedText, "camara"),
                    () => { /* frames sin QR: se ignoran para no saturar la consola */ }
                ).then(() => {
                    estadoCamara.textContent = "Cámara activa";
                });
            })
            .catch(err => {
                // La cámara falla, pero los escáneres siguen funcionando
                estadoCamara.textContent = "Cámara no disponible";
                console.error("Error de cámara:", err);
            });
    }, 1000);

    // El lector sigue activo: solo se trae al frente la ventana principal
    document.getElementById('btn-volver-qr').addEventListener('click', () => {
        ipcRenderer.send('mostrar-ventana-principal');
    });
});

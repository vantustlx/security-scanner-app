/**
 * Módulo para captura de huellas desde el escáner SecuGen USB U20
 * Utiliza node-hid para comunicación directa con el dispositivo USB
 */

const HID = require('node-hid');

// IDs del dispositivo SecuGen USB U20
const SECUGEN_VENDOR_ID = 0x1162;  // SecuGen Corporation
const SECUGEN_PRODUCT_ID = 0x0300; // U20 modelo

class SecuGenScanner {
    constructor() {
        this.device = null;
        this.isScanning = false;
        this.imageWidth = 300;  // Ancho típico del U20
        this.imageHeight = 400; // Alto típico del U20
    }

    /**
     * Detecta y conecta con el escáner SecuGen U20
     */
    connect() {
        try {
            const devices = HID.devices();
            console.log('[SecuGen] Dispositivos USB disponibles:', devices.length);

            // Buscar el dispositivo SecuGen
            const secugenDevice = devices.find(
                d => d.vendorId === SECUGEN_VENDOR_ID && d.productId === SECUGEN_PRODUCT_ID
            );

            if (!secugenDevice) {
                console.warn('[SecuGen] No se encontró el escáner SecuGen USB U20');
                console.log('[SecuGen] Asegúrate de que el dispositivo esté conectado');
                return false;
            }

            console.log('[SecuGen] Escáner encontrado:', secugenDevice.product);
            this.device = new HID.HID(secugenDevice.path);

            this.device.on('data', (data) => {
                this.handleScanData(data);
            });

            this.device.on('error', (err) => {
                console.error('[SecuGen] Error del dispositivo:', err);
            });

            console.log('[SecuGen] ✓ Escáner conectado exitosamente');
            return true;
        } catch (error) {
            console.error('[SecuGen] Error al conectar:', error);
            return false;
        }
    }

    /**
     * Desconecta el escáner
     */
    disconnect() {
        if (this.device) {
            this.device.close();
            this.device = null;
            console.log('[SecuGen] Escáner desconectado');
        }
    }

    /**
     * Inicia la captura de huella
     * @returns {Promise<Buffer>} Imagen de la huella en formato raw
     */
    async captureFingerprint() {
        return new Promise((resolve, reject) => {
            if (!this.device) {
                return reject(new Error('Escáner no conectado'));
            }

            if (this.isScanning) {
                return reject(new Error('Ya hay una captura en progreso'));
            }

            console.log('[SecuGen] Iniciando captura de huella...');
            this.isScanning = true;

            const imageData = [];
            let timeout;

            // Listener temporal para esta captura
            const dataHandler = (data) => {
                imageData.push(...data);

                // Cuando tengamos suficientes datos (imagen completa)
                const expectedSize = this.imageWidth * this.imageHeight;
                if (imageData.length >= expectedSize) {
                    clearTimeout(timeout);
                    this.device.removeListener('data', dataHandler);
                    this.isScanning = false;

                    const imageBuffer = Buffer.from(imageData.slice(0, expectedSize));
                    console.log('[SecuGen] ✓ Huella capturada exitosamente');
                    resolve(imageBuffer);
                }
            };

            this.device.on('data', dataHandler);

            // Enviar comando de captura (esto depende del protocolo del dispositivo)
            // Comando genérico para iniciar captura
            try {
                this.device.write([0x00, 0x01]); // Comando básico de inicio
            } catch (err) {
                this.isScanning = false;
                reject(new Error('Error al enviar comando de captura: ' + err.message));
                return;
            }

            // Timeout de 10 segundos
            timeout = setTimeout(() => {
                this.device.removeListener('data', dataHandler);
                this.isScanning = false;
                reject(new Error('Timeout: No se pudo capturar la huella'));
            }, 10000);
        });
    }

    /**
     * Maneja los datos recibidos del escáner
     */
    handleScanData(data) {
        // Este método se puede usar para debugging
        // console.log('[SecuGen] Datos recibidos:', data.length, 'bytes');
    }

    /**
     * Verifica si el escáner está disponible
     */
    static isAvailable() {
        const devices = HID.devices();
        return devices.some(
            d => d.vendorId === SECUGEN_VENDOR_ID && d.productId === SECUGEN_PRODUCT_ID
        );
    }

    /**
     * Obtiene información del dispositivo
     */
    getDeviceInfo() {
        if (!this.device) {
            return null;
        }
        return {
            manufacturer: 'SecuGen Corporation',
            product: 'SecuGen USB U20',
            imageWidth: this.imageWidth,
            imageHeight: this.imageHeight
        };
    }
}

module.exports = SecuGenScanner;

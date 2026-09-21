/**
 * SecuGen FDx SDK Pro v4.3.1 - Wrapper for Node.js
 * Interfaz FFI para comunicación con sgfplib.dll
 *
 * Compatible con: SecuGen U20 USB FRD (VID: 0x1162, PID: 0x2200)
 */

const koffi = require('koffi');
const path = require('path');
const fs = require('fs');

// =====================================================================
// TIPOS DE DATOS (Koffi usa strings directamente en las funciones)
// =====================================================================
// uint32 = DWORD
// int32 = LONG
// uint8* = LPBYTE (puntero a bytes)
// bool = BOOL

// =====================================================================
// CONSTANTES DEL SDK (desde sgfplib.h)
// =====================================================================

// Códigos de error
const SGFDX_ERROR_NONE = 0;
const SGFDX_ERROR_CREATION_FAILED = 1;
const SGFDX_ERROR_FUNCTION_FAILED = 2;
const SGFDX_ERROR_INVALID_PARAM = 3;
const SGFDX_ERROR_TIME_OUT = 54;
const SGFDX_ERROR_DEVICE_NOT_FOUND = 55;
const SGFDX_ERROR_WRONG_IMAGE = 57;
const SGFDX_ERROR_FEAT_NUMBER = 101;

// IDs de dispositivos
const SG_DEV_U20A = 0x0A;  // U20A
const SG_DEV_AUTO = 0xFF;  // Auto-detect

// Dirección de puerto (USB auto-detect)
const USB_AUTO_DETECT = 0x3BD;

// Niveles de seguridad para matching
const SL_NONE = 0;
const SL_LOWEST = 1;
const SL_LOWER = 2;
const SL_LOW = 3;
const SL_BELOW_NORMAL = 4;
const SL_NORMAL = 5;
const SL_ABOVE_NORMAL = 6;
const SL_HIGH = 7;
const SL_HIGHER = 8;
const SL_HIGHEST = 9;

// Formatos de template
const TEMPLATE_FORMAT_ANSI378 = 0x0100;
const TEMPLATE_FORMAT_SG400 = 0x0200;  // SecuGen propietario (400 bytes)
const TEMPLATE_FORMAT_ISO19794 = 0x0300;

// Dimensiones de imagen del U20
const IMAGE_WIDTH = 300;
const IMAGE_HEIGHT = 400;
const IMAGE_SIZE = IMAGE_WIDTH * IMAGE_HEIGHT;  // 120,000 bytes

// Tamaños de template
const TEMPLATE_SIZE_SG400 = 400;
const TEMPLATE_SIZE_ANSI = 1024;
const TEMPLATE_SIZE_ISO = 1024;

// Mapa de errores legibles
const ERROR_MESSAGES = {
    [SGFDX_ERROR_NONE]: 'Operación exitosa',
    [SGFDX_ERROR_CREATION_FAILED]: 'Error al crear instancia del SDK',
    [SGFDX_ERROR_FUNCTION_FAILED]: 'Función del SDK falló',
    [SGFDX_ERROR_INVALID_PARAM]: 'Parámetro inválido',
    [SGFDX_ERROR_TIME_OUT]: 'Timeout: coloque su dedo en el lector',
    [SGFDX_ERROR_DEVICE_NOT_FOUND]: 'Dispositivo no encontrado',
    [SGFDX_ERROR_WRONG_IMAGE]: 'Imagen de huella inválida o corrupta',
    [SGFDX_ERROR_FEAT_NUMBER]: 'Muy pocas minucias detectadas (mala calidad)'
};

// =====================================================================
// CLASE PRINCIPAL: SecuGenSDK
// =====================================================================

class SecuGenSDK {
    constructor() {
        this.handle = 0;
        this.deviceOpened = false;
        this.sgfplib = null;
        this.dllPath = null;

        // Configuración del dispositivo
        this.imageWidth = IMAGE_WIDTH;
        this.imageHeight = IMAGE_HEIGHT;
        this.templateFormat = TEMPLATE_FORMAT_SG400;  // Usar formato SecuGen 400 bytes
        this.templateSize = TEMPLATE_SIZE_SG400;

        console.log('[SecuGen SDK] Inicializando wrapper v4.3.1...');
    }

    /**
     * Carga la DLL de SecuGen
     * Busca en múltiples ubicaciones: native/, SDK/bin/x64/, etc.
     */
    _loadDLL() {
        const possiblePaths = [
            // 1. Carpeta native del proyecto
            path.join(__dirname, '../native/sgfplib.dll'),

            // 2. SDK en carpeta src/
            path.join(__dirname, '../../FDx_SDK_Pro_Windows_v4.3.1_J1.12/FDx SDK Pro for Windows v4.3.1_J1.12/FDx SDK Pro for Windows v4.3.1/bin/x64/sgfplib.dll'),

            // 3. Instalación estándar de Windows
            'C:\\Program Files\\SecuGen\\FDx SDK Pro\\bin\\x64\\sgfplib.dll',
            'C:\\Program Files (x86)\\SecuGen\\FDx SDK Pro\\bin\\x64\\sgfplib.dll',

            // 4. Ruta relativa desde el ejecutable de Electron
            path.join(process.cwd(), 'src/main/native/sgfplib.dll')
        ];

        for (const dllPath of possiblePaths) {
            if (fs.existsSync(dllPath)) {
                this.dllPath = dllPath;
                console.log(`[SecuGen SDK] ✓ DLL encontrada: ${dllPath}`);
                break;
            }
        }

        if (!this.dllPath) {
            throw new Error(
                'sgfplib.dll no encontrada. ' +
                'Copie la DLL de 64-bit a src/main/native/ o instale el SDK en C:\\Program Files\\SecuGen\\'
            );
        }

        try {
            // Cargar DLL con Koffi
            const lib = koffi.load(this.dllPath);

            // Definir funciones con sintaxis Koffi (Win32 usa __stdcall)
            this.sgfplib = {
                // Gestión de sesión
                SGFPM_Create: lib.func('int32 __stdcall SGFPM_Create(_Out_ uint32 *handle)'),
                SGFPM_Init: lib.func('int32 __stdcall SGFPM_Init(uint32 handle, uint32 deviceId)'),
                SGFPM_Terminate: lib.func('int32 __stdcall SGFPM_Terminate(uint32 handle)'),

                // Gestión de dispositivo
                SGFPM_OpenDevice: lib.func('int32 __stdcall SGFPM_OpenDevice(uint32 handle, uint32 port)'),
                SGFPM_CloseDevice: lib.func('int32 __stdcall SGFPM_CloseDevice(uint32 handle)'),
                SGFPM_GetDeviceID: lib.func('int32 __stdcall SGFPM_GetDeviceID(uint32 handle, _Out_ uint32 *deviceId)'),

                // Captura de imagen
                SGFPM_GetImage: lib.func('int32 __stdcall SGFPM_GetImage(uint32 handle, _Out_ uint8 *imageBuffer)'),
                SGFPM_GetImageEx: lib.func('int32 __stdcall SGFPM_GetImageEx(uint32 handle, _Out_ uint8 *imageBuffer, uint32 timeout, uint32 imageQuality, uint32 flags)'),

                // Extracción de template
                SGFPM_CreateTemplate: lib.func('int32 __stdcall SGFPM_CreateTemplate(uint32 handle, uint8 *imageBuffer, _Out_ uint8 *templateBuffer)'),
                SGFPM_GetTemplateEx: lib.func('int32 __stdcall SGFPM_GetTemplateEx(uint32 handle, uint8 *imageBuffer, uint32 imageFormat, _Out_ uint8 *templateBuffer, _Out_ uint32 *templateSize)'),

                // Matching (1:1)
                SGFPM_MatchTemplate: lib.func('int32 __stdcall SGFPM_MatchTemplate(uint32 handle, uint8 *template1, uint8 *template2, uint32 securityLevel, _Out_ bool *matched)'),
                SGFPM_GetMatchingScore: lib.func('int32 __stdcall SGFPM_GetMatchingScore(uint32 handle, uint8 *template1, uint8 *template2, _Out_ uint32 *score)'),

                // Calidad de imagen
                SGFPM_GetImageQuality: lib.func('int32 __stdcall SGFPM_GetImageQuality(uint32 handle, uint32 width, uint32 height, uint8 *imageBuffer, _Out_ uint32 *quality)'),

                // Información del dispositivo
                SGFPM_GetDeviceSN: lib.func('int32 __stdcall SGFPM_GetDeviceSN(uint32 handle, _Out_ uint8 *serialBuffer, _Out_ uint32 *serialLength)')
            };

            console.log('[SecuGen SDK] ✓ DLL cargada correctamente');
            return true;

        } catch (error) {
            console.error('[SecuGen SDK] ❌ Error al cargar DLL:', error);
            throw new Error(`Error al cargar sgfplib.dll: ${error.message}`);
        }
    }

    /**
     * Inicializa el SDK y abre el dispositivo U20
     */
    async initialize() {
        try {
            // Cargar DLL
            this._loadDLL();

            // Crear handle del SDK (Koffi usa arrays para parámetros de salida)
            const handleOut = [0];
            let result = this.sgfplib.SGFPM_Create(handleOut);

            if (result !== SGFDX_ERROR_NONE) {
                throw new Error(this._getErrorMessage(result));
            }

            this.handle = handleOut[0];
            console.log('[SecuGen SDK] Handle creado:', this.handle);

            // Inicializar con auto-detección
            result = this.sgfplib.SGFPM_Init(this.handle, SG_DEV_AUTO);

            if (result !== SGFDX_ERROR_NONE) {
                throw new Error(`Error al inicializar: ${this._getErrorMessage(result)}`);
            }

            console.log('[SecuGen SDK] SDK inicializado');

            // Abrir dispositivo (puerto USB auto-detect)
            result = this.sgfplib.SGFPM_OpenDevice(this.handle, USB_AUTO_DETECT);

            if (result !== SGFDX_ERROR_NONE) {
                throw new Error(`Error al abrir dispositivo: ${this._getErrorMessage(result)}`);
            }

            this.deviceOpened = true;

            // Obtener ID del dispositivo
            const deviceIDOut = [0];
            result = this.sgfplib.SGFPM_GetDeviceID(this.handle, deviceIDOut);

            if (result === SGFDX_ERROR_NONE) {
                const deviceID = deviceIDOut[0];
                console.log('[SecuGen SDK] Device ID:', '0x' + deviceID.toString(16).toUpperCase());
            }

            console.log('[SecuGen SDK] ✓ Dispositivo U20 abierto exitosamente');
            return true;

        } catch (error) {
            console.error('[SecuGen SDK] Error en initialize():', error.message);
            throw error;
        }
    }

    /**
     * Captura una imagen de huella desde el dispositivo
     * @param {number} timeout - Timeout en milisegundos (default: 10000)
     * @returns {Promise<Buffer>} Imagen raw (300x400 grayscale)
     */
    async captureImage(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (!this.deviceOpened) {
                return reject(new Error('Dispositivo no está abierto'));
            }

            try {
                // Buffer para la imagen (300x400 = 120,000 bytes)
                const imageBuffer = Buffer.alloc(IMAGE_SIZE);

                console.log('[SecuGen SDK] Esperando dedo... (timeout: ' + (timeout / 1000) + 's)');

                // Timeout para la captura
                const timeoutId = setTimeout(() => {
                    reject(new Error('Timeout: No se detectó dedo en el lector'));
                }, timeout);

                // Capturar imagen (bloqueante hasta que se detecte dedo)
                const result = this.sgfplib.SGFPM_GetImage(this.handle, imageBuffer);

                clearTimeout(timeoutId);

                if (result !== SGFDX_ERROR_NONE) {
                    return reject(new Error(this._getErrorMessage(result)));
                }

                console.log('[SecuGen SDK] ✓ Imagen capturada (' + imageBuffer.length + ' bytes)');
                resolve(imageBuffer);

            } catch (error) {
                console.error('[SecuGen SDK] Error en captureImage():', error);
                reject(error);
            }
        });
    }

    /**
     * Crea un template biométrico desde una imagen
     * @param {Buffer} imageBuffer - Imagen raw capturada (120,000 bytes)
     * @returns {Promise<Buffer>} Template de 400 bytes (formato SG400)
     */
    async createTemplate(imageBuffer) {
        return new Promise((resolve, reject) => {
            try {
                if (!imageBuffer || imageBuffer.length !== IMAGE_SIZE) {
                    return reject(new Error(`Imagen inválida (esperado: ${IMAGE_SIZE} bytes, recibido: ${imageBuffer?.length || 0})`));
                }

                // Buffer para el template (400 bytes para formato SG400)
                const templateBuffer = Buffer.alloc(this.templateSize);

                // Crear template
                const result = this.sgfplib.SGFPM_CreateTemplate(
                    this.handle,
                    imageBuffer,
                    templateBuffer
                );

                if (result !== SGFDX_ERROR_NONE) {
                    return reject(new Error(this._getErrorMessage(result)));
                }

                console.log('[SecuGen SDK] ✓ Template creado (' + templateBuffer.length + ' bytes)');
                resolve(templateBuffer);

            } catch (error) {
                console.error('[SecuGen SDK] Error en createTemplate():', error);
                reject(error);
            }
        });
    }

    /**
     * Compara dos templates (matching 1:1)
     * @param {Buffer} template1 - Template de referencia (400 bytes)
     * @param {Buffer} template2 - Template a comparar (400 bytes)
     * @param {number} securityLevel - Nivel de seguridad (1-9, default: 5)
     * @returns {Promise<boolean>} true si coinciden
     */
    async matchTemplates(template1, template2, securityLevel = SL_NORMAL) {
        return new Promise((resolve, reject) => {
            try {
                if (!template1 || !template2) {
                    return reject(new Error('Templates inválidos'));
                }

                if (template1.length !== this.templateSize || template2.length !== this.templateSize) {
                    return reject(new Error(`Templates deben ser de ${this.templateSize} bytes`));
                }

                const matchedOut = [false];

                // Comparar templates
                const result = this.sgfplib.SGFPM_MatchTemplate(
                    this.handle,
                    template1,
                    template2,
                    securityLevel,
                    matchedOut
                );

                if (result !== SGFDX_ERROR_NONE) {
                    return reject(new Error(this._getErrorMessage(result)));
                }

                const matchResult = matchedOut[0];

                console.log('[SecuGen SDK] Matching:', matchResult ? '✓ MATCH' : '✗ NO MATCH');

                resolve(matchResult);

            } catch (error) {
                console.error('[SecuGen SDK] Error en matchTemplates():', error);
                reject(error);
            }
        });
    }

    /**
     * Obtiene un score de similitud entre dos templates (0-100)
     * @param {Buffer} template1 - Template de referencia
     * @param {Buffer} template2 - Template a comparar
     * @returns {Promise<number>} Score de 0 a 100 (100 = idénticas)
     */
    async getMatchingScore(template1, template2) {
        return new Promise((resolve, reject) => {
            try {
                const scoreOut = [0];

                const result = this.sgfplib.SGFPM_GetMatchingScore(
                    this.handle,
                    template1,
                    template2,
                    scoreOut
                );

                if (result !== SGFDX_ERROR_NONE) {
                    return reject(new Error(this._getErrorMessage(result)));
                }

                const score = scoreOut[0];
                console.log('[SecuGen SDK] Matching score:', score);

                resolve(score);

            } catch (error) {
                console.error('[SecuGen SDK] Error en getMatchingScore():', error);
                reject(error);
            }
        });
    }

    /**
     * Obtiene la calidad de una imagen capturada
     * @param {Buffer} imageBuffer - Imagen raw
     * @returns {Promise<number>} Calidad (0-100, >= 50 recomendado)
     */
    async getImageQuality(imageBuffer) {
        return new Promise((resolve, reject) => {
            try {
                const qualityOut = [0];

                const result = this.sgfplib.SGFPM_GetImageQuality(
                    this.handle,
                    this.imageWidth,
                    this.imageHeight,
                    imageBuffer,
                    qualityOut
                );

                if (result !== SGFDX_ERROR_NONE) {
                    return reject(new Error(this._getErrorMessage(result)));
                }

                const quality = qualityOut[0];
                console.log('[SecuGen SDK] Calidad de imagen:', quality + '/100');

                resolve(quality);

            } catch (error) {
                console.error('[SecuGen SDK] Error en getImageQuality():', error);
                reject(error);
            }
        });
    }

    /**
     * Obtiene el número de serie del dispositivo
     * @returns {Promise<string>} Número de serie
     */
    async getDeviceSerialNumber() {
        return new Promise((resolve, reject) => {
            try {
                const snBuffer = Buffer.alloc(16);
                const snLengthOut = [16];

                const result = this.sgfplib.SGFPM_GetDeviceSN(
                    this.handle,
                    snBuffer,
                    snLengthOut
                );

                if (result !== SGFDX_ERROR_NONE) {
                    return reject(new Error(this._getErrorMessage(result)));
                }

                const snLength = snLengthOut[0];
                const serialNumber = snBuffer.slice(0, snLength).toString('ascii');

                console.log('[SecuGen SDK] Serial Number:', serialNumber);
                resolve(serialNumber);

            } catch (error) {
                console.error('[SecuGen SDK] Error en getDeviceSerialNumber():', error);
                reject(error);
            }
        });
    }

    /**
     * Cierra el dispositivo y libera recursos
     */
    async terminate() {
        try {
            if (this.deviceOpened && this.handle) {
                this.sgfplib.SGFPM_CloseDevice(this.handle);
                this.deviceOpened = false;
                console.log('[SecuGen SDK] Dispositivo cerrado');
            }

            if (this.handle) {
                this.sgfplib.SGFPM_Terminate(this.handle);
                this.handle = 0;
                console.log('[SecuGen SDK] SDK terminado');
            }

            return true;

        } catch (error) {
            console.error('[SecuGen SDK] Error al terminar:', error);
            return false;
        }
    }

    /**
     * Verifica si el SDK está disponible
     * @returns {boolean}
     */
    static isAvailable() {
        try {
            const sdk = new SecuGenSDK();
            sdk._loadDLL();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtiene información del dispositivo conectado
     * @returns {Object|null}
     */
    getDeviceInfo() {
        if (!this.deviceOpened) {
            return null;
        }

        return {
            manufacturer: 'SecuGen Corporation',
            product: 'SecuGen U20 USB FRD',
            vendorId: '0x1162',
            productId: '0x2200',
            imageWidth: this.imageWidth,
            imageHeight: this.imageHeight,
            imageSize: IMAGE_SIZE,
            templateFormat: this._getTemplateFormatName(this.templateFormat),
            templateSize: this.templateSize,
            sdkVersion: '4.3.1'
        };
    }

    /**
     * Traduce código de error a mensaje legible
     * @private
     */
    _getErrorMessage(errorCode) {
        return ERROR_MESSAGES[errorCode] || `Error desconocido (código: ${errorCode})`;
    }

    /**
     * Obtiene nombre legible del formato de template
     * @private
     */
    _getTemplateFormatName(format) {
        const formats = {
            [TEMPLATE_FORMAT_ANSI378]: 'ANSI INCITS 378',
            [TEMPLATE_FORMAT_SG400]: 'SecuGen Proprietary (400 bytes encrypted)',
            [TEMPLATE_FORMAT_ISO19794]: 'ISO/IEC 19794-2'
        };
        return formats[format] || 'Unknown';
    }
}

// =====================================================================
// EXPORTAR MÓDULO
// =====================================================================

module.exports = SecuGenSDK;
module.exports.SecurityLevel = {
    NONE: SL_NONE,
    LOWEST: SL_LOWEST,
    LOWER: SL_LOWER,
    LOW: SL_LOW,
    BELOW_NORMAL: SL_BELOW_NORMAL,
    NORMAL: SL_NORMAL,
    ABOVE_NORMAL: SL_ABOVE_NORMAL,
    HIGH: SL_HIGH,
    HIGHER: SL_HIGHER,
    HIGHEST: SL_HIGHEST
};

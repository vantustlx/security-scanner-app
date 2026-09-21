/**
 * Módulo para análisis y extracción de características biométricas de huellas
 * Calcula: radio, perímetro_max, perímetro_min, área, promedio, elipse
 */

const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');

class FingerprintAnalyzer {
    constructor() {
        this.imageWidth = 300;
        this.imageHeight = 400;
    }

    /**
     * Procesa la imagen raw de la huella y extrae características
     * @param {Buffer} rawImageBuffer - Imagen raw del escáner
     * @returns {Promise<Object>} Características biométricas
     */
    async extractFeatures(rawImageBuffer) {
        try {
            console.log('[Analyzer] Iniciando extracción de características...');

            // 1. Convertir raw buffer a imagen procesable
            const processedImage = await this.preprocessImage(rawImageBuffer);

            // 2. Binarizar imagen (blanco y negro)
            const binaryImage = await this.binarizeImage(processedImage);

            // 3. Detectar contornos y características
            const features = await this.analyzeFingerprint(binaryImage);

            console.log('[Analyzer] ✓ Características extraídas:', features);
            return features;

        } catch (error) {
            console.error('[Analyzer] Error en extracción:', error);
            throw error;
        }
    }

    /**
     * Preprocesa la imagen (mejora de contraste, reducción de ruido)
     */
    async preprocessImage(rawBuffer) {
        try {
            // Convertir raw grayscale a PNG
            const image = await sharp(rawBuffer, {
                raw: {
                    width: this.imageWidth,
                    height: this.imageHeight,
                    channels: 1 // Grayscale
                }
            })
            .normalize() // Mejora contraste
            .median(3)   // Reduce ruido
            .sharpen()   // Mejora bordes
            .toBuffer();

            return image;

        } catch (error) {
            console.error('[Analyzer] Error en preprocesamiento:', error);
            throw error;
        }
    }

    /**
     * Binariza la imagen (threshold)
     */
    async binarizeImage(imageBuffer) {
        try {
            const binary = await sharp(imageBuffer)
                .threshold(128) // Umbral automático
                .toBuffer();

            return binary;

        } catch (error) {
            console.error('[Analyzer] Error en binarización:', error);
            throw error;
        }
    }

    /**
     * Analiza la huella y extrae características numéricas
     */
    async analyzeFingerprint(binaryImageBuffer) {
        try {
            // Obtener metadata de la imagen
            const { width, height, data } = await sharp(binaryImageBuffer)
                .raw()
                .toBuffer({ resolveWithObject: true });

            // Convertir a array de píxeles
            const pixels = new Uint8Array(data);

            // Calcular características
            const features = {
                radio: this.calculateRadius(pixels, width, height),
                perimetro_max: this.calculateMaxPerimeter(pixels, width, height),
                perimetro_min: this.calculateMinPerimeter(pixels, width, height),
                area: this.calculateArea(pixels, width, height),
                promedio: this.calculateAverage(pixels),
                elipse: this.calculateEllipse(pixels, width, height)
            };

            return features;

        } catch (error) {
            console.error('[Analyzer] Error en análisis:', error);
            throw error;
        }
    }

    /**
     * Calcula el radio promedio de la huella
     */
    calculateRadius(pixels, width, height) {
        // Encontrar centro de masa
        let sumX = 0, sumY = 0, count = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 3; // RGB
                if (pixels[idx] === 0) { // Píxel negro (huella)
                    sumX += x;
                    sumY += y;
                    count++;
                }
            }
        }

        if (count === 0) return 0;

        const centerX = sumX / count;
        const centerY = sumY / count;

        // Calcular distancia promedio desde el centro
        let sumDistances = 0;
        let distanceCount = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 3;
                if (pixels[idx] === 0) {
                    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    sumDistances += dist;
                    distanceCount++;
                }
            }
        }

        return distanceCount > 0 ? sumDistances / distanceCount : 0;
    }

    /**
     * Calcula el perímetro máximo
     */
    calculateMaxPerimeter(pixels, width, height) {
        let maxPerimeter = 0;

        // Detectar bordes y calcular perímetro
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 3;

                if (pixels[idx] === 0) { // Píxel de huella
                    // Verificar si es borde (tiene vecino blanco)
                    const neighbors = [
                        pixels[((y - 1) * width + x) * 3],
                        pixels[((y + 1) * width + x) * 3],
                        pixels[(y * width + (x - 1)) * 3],
                        pixels[(y * width + (x + 1)) * 3]
                    ];

                    if (neighbors.some(n => n === 255)) {
                        maxPerimeter++;
                    }
                }
            }
        }

        return maxPerimeter;
    }

    /**
     * Calcula el perímetro mínimo
     */
    calculateMinPerimeter(pixels, width, height) {
        // Para simplificar, usamos una fracción del perímetro máximo
        // En un análisis más complejo, esto detectaría el contorno interno
        const maxPerim = this.calculateMaxPerimeter(pixels, width, height);
        return maxPerim * 0.7; // Aproximación del 70%
    }

    /**
     * Calcula el área de la huella
     */
    calculateArea(pixels, width, height) {
        let area = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 3;
                if (pixels[idx] === 0) { // Píxel negro
                    area++;
                }
            }
        }

        return area;
    }

    /**
     * Calcula el promedio de intensidad
     */
    calculateAverage(pixels) {
        let sum = 0;
        const count = pixels.length / 3; // RGB

        for (let i = 0; i < pixels.length; i += 3) {
            sum += pixels[i]; // Canal R (mismo que G y B en grayscale)
        }

        return sum / count;
    }

    /**
     * Calcula la relación de elipse (ancho/alto)
     */
    calculateEllipse(pixels, width, height) {
        // Encontrar límites de la huella
        let minX = width, maxX = 0;
        let minY = height, maxY = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 3;
                if (pixels[idx] === 0) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        const widthSpan = maxX - minX;
        const heightSpan = maxY - minY;

        // Relación de aspecto (elipse)
        return heightSpan > 0 ? widthSpan / heightSpan : 1.0;
    }

    /**
     * Convierte imagen a base64 para visualización
     */
    async imageToBase64(imageBuffer) {
        try {
            const base64 = await sharp(imageBuffer)
                .png()
                .toBuffer()
                .then(buf => buf.toString('base64'));

            return `data:image/png;base64,${base64}`;

        } catch (error) {
            console.error('[Analyzer] Error al convertir a base64:', error);
            throw error;
        }
    }

    /**
     * Compara dos conjuntos de características
     * @returns {number} Similaridad (0-100)
     */
    compareFeatures(features1, features2) {
        const weights = {
            radio: 0.20,
            perimetro_max: 0.15,
            perimetro_min: 0.15,
            area: 0.25,
            promedio: 0.10,
            elipse: 0.15
        };

        let totalSimilarity = 0;

        Object.keys(weights).forEach(key => {
            const val1 = features1[key] || 0;
            const val2 = features2[key] || 0;

            // Calcular diferencia relativa
            const maxVal = Math.max(Math.abs(val1), Math.abs(val2), 1);
            const diff = Math.abs(val1 - val2) / maxVal;

            // Similaridad (1 - diferencia)
            const similarity = Math.max(0, 1 - diff);

            totalSimilarity += similarity * weights[key];
        });

        // Convertir a porcentaje
        return Math.round(totalSimilarity * 100);
    }
}

module.exports = FingerprintAnalyzer;

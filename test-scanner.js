/**
 * Script de prueba para verificar la conexión con el escáner SecuGen USB U20
 * Ejecutar: node test-scanner.js
 */

console.log('🔍 Escaneando dispositivos USB conectados...\n');

try {
    const HID = require('node-hid');

    const devices = HID.devices();
    console.log(`📱 Total de dispositivos HID detectados: ${devices.length}\n`);

    // Mostrar todos los dispositivos
    console.log('📋 Lista completa de dispositivos:');
    console.log('━'.repeat(80));

    devices.forEach((d, index) => {
        console.log(`\n${index + 1}. ${d.product || d.manufacturer || 'Dispositivo sin nombre'}`);
        console.log(`   Fabricante:  ${d.manufacturer || 'N/A'}`);
        console.log(`   Vendor ID:   0x${d.vendorId.toString(16).toUpperCase().padStart(4, '0')}`);
        console.log(`   Product ID:  0x${d.productId.toString(16).toUpperCase().padStart(4, '0')}`);
        console.log(`   Path:        ${d.path}`);
    });

    console.log('\n' + '━'.repeat(80));

    // Buscar específicamente el SecuGen U20
    console.log('\n🔎 Buscando escáner SecuGen USB U20...\n');

    const SECUGEN_VENDOR_ID = 0x1162;
    const SECUGEN_PRODUCT_ID = 0x0300;

    const secugen = devices.find(d =>
        d.vendorId === SECUGEN_VENDOR_ID && d.productId === SECUGEN_PRODUCT_ID
    );

    if (secugen) {
        console.log('✅ ¡ESCÁNER DETECTADO!\n');
        console.log('📌 Información del dispositivo:');
        console.log(`   Nombre:      ${secugen.product || 'SecuGen USB U20'}`);
        console.log(`   Fabricante:  ${secugen.manufacturer || 'SecuGen Corporation'}`);
        console.log(`   Vendor ID:   0x${secugen.vendorId.toString(16).toUpperCase()} (SecuGen)`);
        console.log(`   Product ID:  0x${secugen.productId.toString(16).toUpperCase()} (U20)`);
        console.log(`   Interface:   ${secugen.interface || 'HID'}`);
        console.log(`   Path:        ${secugen.path}`);

        // Intentar abrir el dispositivo
        console.log('\n🔌 Intentando conectar con el escáner...');

        try {
            const device = new HID.HID(secugen.path);
            console.log('✅ Conexión exitosa con el escáner!\n');

            console.log('📊 Estado del dispositivo:');
            console.log('   • Dispositivo abierto: ✓');
            console.log('   • Listo para captura: ✓');

            device.close();
            console.log('   • Conexión cerrada: ✓');

            console.log('\n✨ El escáner está funcionando correctamente.');
            console.log('✅ Puedes proceder a usar el sistema de huellas.\n');

        } catch (connectErr) {
            console.error('❌ Error al conectar con el escáner:', connectErr.message);
            console.log('\n💡 Posibles soluciones:');
            console.log('   1. Ejecuta este script como Administrador');
            console.log('   2. Desconecta y reconecta el escáner');
            console.log('   3. Prueba en otro puerto USB');
            console.log('   4. Verifica los drivers en el Administrador de Dispositivos\n');
        }

    } else {
        console.log('❌ ESCÁNER NO DETECTADO\n');
        console.log('🔍 El escáner SecuGen USB U20 no está conectado o no es reconocido.\n');
        console.log('💡 Verifica:');
        console.log('   1. Cable USB conectado correctamente');
        console.log('   2. Drivers instalados (Administrador de Dispositivos)');
        console.log('   3. Puerto USB funcional (prueba otro puerto)');
        console.log('   4. Que el modelo sea USB U20 (no U10, U20-ASF, etc.)\n');

        console.log('📝 Si tu escáner aparece en la lista con IDs diferentes:');
        console.log('   • Anota el Vendor ID y Product ID');
        console.log('   • Actualiza los valores en src/main/fingerprint/secugenScanner.js\n');
    }

} catch (error) {
    console.error('❌ ERROR CRÍTICO:', error.message);

    if (error.code === 'MODULE_NOT_FOUND') {
        console.log('\n📦 El módulo "node-hid" no está instalado.\n');
        console.log('📌 Ejecuta el siguiente comando para instalarlo:');
        console.log('   npm install node-hid\n');
    } else {
        console.log('\n💡 Detalles del error:', error);
    }
}

console.log('━'.repeat(80));
console.log('Prueba completada.');
console.log('━'.repeat(80) + '\n');

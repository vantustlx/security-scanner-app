document.addEventListener('DOMContentLoaded', () => {
    const { ipcRenderer } = require('electron');
    const qrContainer = document.getElementById("img-qr");
    
    // Dimensiona correctamente el contenedor
    qrContainer.style.width = "300px";
    qrContainer.style.height = "300px";
    
    // Asegúrate de que sea visible
    qrContainer.style.backgroundColor = "#000";
    qrContainer.style.position = "relative";
    
    // Mensaje de estado inicial 
    const statusDiv = document.createElement("div");
    statusDiv.style.color = "white";
    statusDiv.style.position = "absolute";
    statusDiv.style.bottom = "10px";
    statusDiv.style.left = "10px";
    statusDiv.style.right = "10px";
    statusDiv.style.textAlign = "center";
    statusDiv.textContent = "Iniciando cámara...";
    qrContainer.appendChild(statusDiv);
    
    // Es importante esperar un poco para asegurar que el DOM esté listo
    setTimeout(() => {
        try {
            // CAMBIO: En lugar de importación dinámica, usamos require directo
            // ya que estamos en Electron con nodeIntegration: true
            const Html5QrcodeScanner = require('html5-qrcode');
            
            // Asegúrate de que el elemento existe
            if (!document.getElementById("img-qr")) {
                console.error("Elemento img-qr no encontrado");
                statusDiv.textContent = "Error: Elemento img-qr no encontrado";
                return;
            }
            
            statusDiv.textContent = "Solicitando permisos de cámara...";
            
            // Primero solicitar permisos explícitamente
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: "environment" // Preferir cámara trasera
                } 
            })
            .then(stream => {
                // Liberar la cámara después de obtener permiso
                stream.getTracks().forEach(track => track.stop());
                
                statusDiv.textContent = "Inicializando escáner QR...";
                
                // Ahora inicializar el escáner QR con la biblioteca importada
                const qrScanner = new Html5QrcodeScanner.Html5Qrcode("img-qr");
                
                const config = {
                    fps: 30,
                    qrbox: { width: 300, height: 300 },
                    aspectRatio: 1.0
                };
                
                qrScanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText, decodedResult) => {
                        console.log("QR leído:", decodedText);
                        statusDiv.textContent = "QR detectado: " + decodedText;
                        
                        // Envía la matrícula al proceso principal
                        ipcRenderer.send('verificar-matricula', decodedText);
                        
                        // Detener la cámara tras escaneo
                        qrScanner.stop().then(() => {
                            console.log("Escáner QR detenido");
                        }).catch(err => {
                            console.error("Error al detener escáner:", err);
                        });
                    },
                    (errorMessage) => {
                        // Este callback se llama cuando hay un error durante el escaneo
                        console.warn("Error de lectura QR:", errorMessage);
                    }
                ).catch(err => {
                    statusDiv.textContent = "Error al iniciar la cámara: " + err.message;
                    console.error("Error al iniciar la cámara:", err);
                });
            })
            .catch(err => {
                statusDiv.textContent = "Error de permisos: " + err.message;
                console.error("Error de permisos de cámara:", err);
            });
        } catch (e) {
            console.error("Error en la inicialización del QR:", e);
            statusDiv.textContent = "Error en la inicialización: " + e.message;
        }
    }, 1000); // Esperar 1 segundo para asegurar que todo esté cargado

    // Botón para volver
    document.getElementById('btn-volver-qr').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'acceder');
    });

    // Escuchar el resultado de la verificación
    ipcRenderer.on('resultado-verificacion', (event, respuesta) => {
      
       if (respuesta.success === true) {
            ipcRenderer.send('navigate', 'qrsuccess');
        } else {
            ipcRenderer.send('navigate', 'qrdontsucces');
        }
         
    });
    
});
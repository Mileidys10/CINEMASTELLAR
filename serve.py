"""
CINEMASTELLAR - Servidor HTTP Local para Demostracion y Pruebas
Puerto por defecto: 3001
Gobernanza: Google Cloud OKF v0.2
"""

import http.server
import socketserver
import os
import sys

# Asegurar codificacion UTF-8 para evitar errores de charmap en consolas Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PORT = 3001
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CinemaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Desactivar cache local para desarrollo agil y visualizacion instantanea
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CinemaHandler) as httpd:
        print("=" * 64)
        print("[*] CINEMASTELLAR - Servidor de Demostracion Local")
        print(f"[*] URL Local: http://localhost:{PORT}")
        print(f"[*] Directorio Raiz: {DIRECTORY}")
        print("[*] Presiona Ctrl+C para detener el servidor.")
        print("=" * 64)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido con exito.")
            httpd.server_close()

if __name__ == "__main__":
    run_server()

"""
CINEMASTELLAR - Test Suite Automatizada de Aceptación y Calidad (QA)
Compatible con unittest estándar y pytest
Gobernanza: Google Cloud OKF v0.2
Estandar: ISO 25010 & Mandato de Cero Alucinaciones
"""

import os
import sys
import json
import threading
import time
import http.server
import socketserver
import urllib.request
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, "assets", "images")
CSS_PATH = os.path.join(BASE_DIR, "css", "styles.css")
JS_DATA_PATH = os.path.join(BASE_DIR, "js", "movies_data.js")
JS_APP_PATH = os.path.join(BASE_DIR, "js", "app.js")
INDEX_PATH = os.path.join(BASE_DIR, "index.html")
AGENTS_MD_PATH = os.path.join(BASE_DIR, "AGENTS.md")
PACKAGE_JSON_PATH = os.path.join(BASE_DIR, "package.json")


class TestMediaOptimization(unittest.TestCase):
    """Verifica la reducción drástica de peso y existencia de activos multimedia (RNF-01)."""

    def test_image_assets_exist(self):
        self.assertTrue(os.path.isdir(ASSETS_DIR), f"No existe la carpeta de assets: {ASSETS_DIR}")
        files = os.listdir(ASSETS_DIR)
        self.assertGreaterEqual(len(files), 12, f"Se esperaban al menos 12 imágenes optimizadas, encontradas {len(files)}")

    def test_total_image_size_under_limit(self):
        total_size = sum(
            os.path.getsize(os.path.join(ASSETS_DIR, f))
            for f in os.listdir(ASSETS_DIR)
            if os.path.isfile(os.path.join(ASSETS_DIR, f))
        )
        total_mb = total_size / (1024 * 1024)
        print(f"\n[QA Media] Peso total de imágenes optimizadas: {total_mb:.2f} MB")
        self.assertLess(total_mb, 3.5, f"El peso de las imágenes ({total_mb:.2f} MB) excede el umbral de 3.5 MB")

    def test_critical_images_drastically_reduced(self):
        hero_banner = os.path.join(ASSETS_DIR, "cinema_hero_banner.jpg")
        self.assertTrue(os.path.isfile(hero_banner))
        size_kb = os.path.getsize(hero_banner) / 1024
        self.assertLess(size_kb, 400, f"Hero banner supera 400 KB: {size_kb:.1f} KB")

        fondo_romance = os.path.join(ASSETS_DIR, "fondo_romance.jpg")
        self.assertTrue(os.path.isfile(fondo_romance))
        size_kb_romance = os.path.getsize(fondo_romance) / 1024
        self.assertLess(size_kb_romance, 500, f"Fondo romance supera 500 KB: {size_kb_romance:.1f} KB")


class TestMarkupAndSpaStructure(unittest.TestCase):
    """Verifica el HTML semántico y los contenedores de las 6 vistas SPA (RF-01, RNF-04)."""

    def setUp(self):
        self.assertTrue(os.path.isfile(INDEX_PATH), f"No se encontró index.html en {INDEX_PATH}")
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            self.html = f.read()

    def test_spa_views_declared(self):
        expected_views = [
            "view-billboard",
            "view-seats",
            "view-snacks",
            "view-checkout",
            "view-ticket",
            "view-history",
            "view-contact",
        ]
        for v in expected_views:
            self.assertIn(f'id="{v}"', self.html, f"Falta la vista SPA obligatoria: #{v}")

    def test_seat_matrix_and_curved_screen(self):
        self.assertIn('id="seats-matrix-container"', self.html)
        self.assertIn('class="screen-curve"', self.html)
        self.assertIn('class="seats-legend-bar"', self.html)

    def test_concession_and_ticket_elements(self):
        self.assertIn('id="snacks-catalog-grid"', self.html)
        self.assertIn('id="ticket-qr-canvas"', self.html)
        self.assertIn('id="ticket-render-canvas"', self.html)
        self.assertIn('id="btn-download-ticket-png"', self.html)

    def test_modals_present(self):
        self.assertIn('id="trailer-modal"', self.html)
        self.assertIn('id="movie-details-modal"', self.html)
        self.assertIn('id="auth-modal"', self.html)
        self.assertIn('id="payment-processing-overlay"', self.html)

    def test_scripts_included_properly(self):
        self.assertIn('src="js/movies_data.js"', self.html)
        self.assertIn('src="js/app.js"', self.html)


class TestStylesAndDesignSystem(unittest.TestCase):
    """Verifica las reglas de estilo cinematográfico y tokens CSS (RF-10, RNF-03)."""

    def setUp(self):
        self.assertTrue(os.path.isfile(CSS_PATH), f"No se encontró css/styles.css en {CSS_PATH}")
        with open(CSS_PATH, "r", encoding="utf-8") as f:
            self.css = f.read()

    def test_css_variables_and_palette(self):
        self.assertIn("--accent-gold:", self.css)
        self.assertIn("--bg-dark:", self.css)
        self.assertIn("--seat-selected:", self.css)
        self.assertIn("--font-heading:", self.css)

    def test_critical_classes_defined(self):
        classes = [
            ".cinema-header",
            ".spa-view",
            ".stellar-btn",
            ".movie-card",
            ".seat-node",
            ".digital-ticket-card",
            ".ticket-header-strip",
            ".ticket-qr-container",
            ".snack-card",
            ".stellar-modal",
        ]
        for c in classes:
            self.assertIn(c, self.css, f"Falta la regla CSS obligatoria para {c}")


class TestJavaScriptDataAndEngine(unittest.TestCase):
    """Verifica la integridad de datos y lógica del motor de la aplicación (RF-02..RF-08)."""

    def test_movies_data_js(self):
        with open(JS_DATA_PATH, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("CINEMA_MOVIES", content)
        self.assertIn("CINEMA_SNACKS", content)
        self.assertIn("Dune: Parte Dos", content)
        self.assertIn("Los Juegos del Hambre", content)
        self.assertIn("Divergente: Insurgente", content)
        self.assertIn("La Doncella", content)
        self.assertIn("Corazones Malheridos", content)

    def test_app_js_engine_functions(self):
        with open(JS_APP_PATH, "r", encoding="utf-8") as f:
            content = f.read()

        required_symbols = [
            "drawCinemaQR",
            "navigateTo",
            "renderMoviesCatalog",
            "openTrailerModal",
            "renderSeatMap",
            "toggleSeatSelection",
            "renderSnacksView",
            "completeBookingAndGenerateTicket",
            "drawFullTicketCanvas",
            "downloadTicketPNG",
            "cinemaApp",
            "proceedToCheckout",
            "processSecurePayment",
            "openAuthModal",
            "switchPaymentMethod",
        ]
        for sym in required_symbols:
            self.assertIn(sym, content, f"Falta el método o símbolo obligatorio en app.js: {sym}")


class TestLocalHttpServerAndEndpoints(unittest.TestCase):
    """Prueba que los archivos se sirvan correctamente con código HTTP 200."""

    @classmethod
    def setUpClass(cls):
        cls.port = 3919
        cls.handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(
            *args, directory=BASE_DIR, **kwargs
        )
        socketserver.TCPServer.allow_reuse_address = True
        cls.httpd = socketserver.TCPServer(("", cls.port), cls.handler)
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.3)

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def test_index_endpoint_200(self):
        url = f"http://localhost:{self.port}/index.html"
        req = urllib.request.urlopen(url)
        self.assertEqual(req.status, 200)
        content = req.read().decode("utf-8")
        self.assertIn("CINEMASTELLAR", content)

    def test_css_endpoint_200(self):
        url = f"http://localhost:{self.port}/css/styles.css"
        req = urllib.request.urlopen(url)
        self.assertEqual(req.status, 200)

    def test_js_endpoints_200(self):
        for script in ["js/movies_data.js", "js/app.js"]:
            url = f"http://localhost:{self.port}/{script}"
            req = urllib.request.urlopen(url)
            self.assertEqual(req.status, 200)

    def test_image_endpoint_200(self):
        url = f"http://localhost:{self.port}/assets/images/dune.jpg"
        req = urllib.request.urlopen(url)
        self.assertEqual(req.status, 200)
        self.assertGreater(len(req.read()), 10000)


class TestGovernanceAndManifests(unittest.TestCase):
    """Valida la gobernanza Google Cloud OKF v0.2 y manifiestos del proyecto (RNF-06)."""

    def test_agents_md_governance(self):
        self.assertTrue(os.path.isfile(AGENTS_MD_PATH))
        with open(AGENTS_MD_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("urn:factory:project:cinemastellar", content)
        self.assertIn("Google Cloud OKF v0.2 Knowledge Bundle", content)
        self.assertIn("MobileFrontendSpecialist", content)

    def test_package_json_validity(self):
        self.assertTrue(os.path.isfile(PACKAGE_JSON_PATH))
        with open(PACKAGE_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(data["name"], "cinemastellar")
        self.assertIn("Mileidys Agamez Ospino", data["author"])





class TestAuthenticationAndPaymentGateway(unittest.TestCase):
    """Verifica los requerimientos funcionales de autenticacion obligatoria y pasarela de pago."""

    @classmethod
    def setUpClass(cls):
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            cls.html = f.read()
        with open(JS_APP_PATH, "r", encoding="utf-8") as f:
            cls.js = f.read()

    def test_auth_widgets_and_modal_structure(self):
        self.assertIn('id="auth-header-widget"', self.html)
        self.assertIn('id="user-header-widget"', self.html)
        self.assertIn('id="auth-modal"', self.html)
        self.assertIn('id="btn-tab-login"', self.html)
        self.assertIn('id="btn-tab-register"', self.html)

    def test_payment_gateway_components(self):
        self.assertIn('id="view-checkout"', self.html)
        self.assertIn('id="tab-pay-card"', self.html)
        self.assertIn('id="tab-pay-pse"', self.html)
        self.assertIn('id="tab-pay-wallet"', self.html)
        self.assertIn('id="credit-card-preview"', self.html)
        self.assertIn('id="btn-submit-card-pay"', self.html)
        self.assertIn('id="payment-processing-overlay"', self.html)

    def test_auth_guard_and_checkout_flow_in_js(self):
        self.assertIn("proceedToCheckout", self.js)
        self.assertIn("processSecurePayment", self.js)
        self.assertIn("switchPaymentMethod", self.js)
        self.assertIn("currentUser", self.js)
        self.assertIn("cinemastellar_current_user", self.js)


if __name__ == "__main__":
    unittest.main(verbosity=2)

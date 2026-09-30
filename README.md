# ★ CINEMASTELLAR &mdash; Portal Cinematográfico y Cartelera Interactiva

> Plataforma web de entretenimiento cinematográfico interactivo de alta fidelidad, desarrollada bajo arquitectura Single Page Application (SPA) sin dependencias externas pesadas.

![CinemaStellar Banner](assets/images/cinema_hero_banner.jpg)

---

## 🌟 Características Principales

1. **Arquitectura SPA (Single Page Application)**:
   - Navegación instantánea y fluida entre las vistas de **Cartelera**, **Selección de Sala**, **Confitería**, **Boleto QR**, **Mis Boletos** y **Contacto**.
2. **Catálogo Dinámico y Búsqueda en Vivo**:
   - Filtros por categorías (Ciencia Ficción, Acción, Romance, Suspenso, Destacadas y Todos).
   - Buscador reactivo por título, director, actores o palabras clave.
3. **Reproductor Modal de Trailers Oficiales**:
   - Visualización de avances cinematográficos en streaming mediante reproductores integrados con control de ciclo de vida de audio.
4. **Selector Interactivo de Butacas**:
   - Plano de sala con pantalla curva IMAX láser, numeración de filas (A-H) y columnas (1-12).
   - Estados de butacas en tiempo real (Disponible, Seleccionada, Ocupada y VIP Reclinable).
5. **Módulo de Confitería y Snacks**:
   - Combos de crispetas artesanales, bebidas heladas, nachos con queso cheddar y dulces con ajuste dinámico de cantidades y subtotales.
6. **Emisión de Boleto Digital con Código QR Descargable**:
   - Generación determinista del código QR en canvas HTML5 sin dependencias externas.
   - Renderizado del ticket boarding pass con opción de descarga instantánea en formato **PNG**.
7. **Persistencia Local**:
   - Almacenamiento seguro en `localStorage` del historial de reservas y boletos emitidos.
8. **Optimización Extrema de Activos**:
   - Reducción del **94.1%** del peso de las imágenes (de 31.9 MB originales a sólo 1.87 MB), garantizando carga inicial sub-segundo.

---

## 🚀 Puesta en Marcha Local

### Prerrequisitos
- Python 3.8 o superior (para el servidor y suite de pruebas)
- Cualquier navegador web moderno (Chrome, Edge, Firefox, Safari)

### 1. Iniciar Servidor Local
```bash
python serve.py
```
Abre en tu navegador: [http://localhost:3001](http://localhost:3001)

### 2. Ejecutar la Suite de Pruebas
```bash
python tests/test_cinemastellar.py
```

---

## 📂 Estructura del Proyecto

```text
cinemastellar/
├── index.html                 # Punto de entrada único de la SPA
├── css/
│   └── styles.css             # Sistema de diseño cinematográfico (Tokens, Glassmorphism, CSS Grid)
├── js/
│   ├── movies_data.js         # Dataset central de películas, horarios y confitería
│   └── app.js                 # Router SPA, matriz de butacas, carrito y renderizador de QR en Canvas
├── assets/
│   └── images/                # Imágenes de alta resolución optimizadas (< 1.9 MB total)
├── tests/
│   └── test_cinemastellar.py  # Suite automatizada de pruebas de aceptación y endpoints
├── serve.py                   # Servidor HTTP local con deshabilitación de caché para desarrollo
└── package.json               # Manifiesto y scripts del proyecto
```

---

## 👩‍💻 Autor y Créditos

- **Desarrolladora**: Mileidys Agamez Ospino
- **Licencia**: MIT

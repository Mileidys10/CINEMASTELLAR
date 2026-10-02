/**
 * CINEMASTELLAR - Motor Principal SPA y Lógica Reactiva
 * Arquitectura: Vanilla JS ES6+ (Router, Catálogo, Butacas SVG, Confitería, Canvas QR)
 * Autor: Mileidys Agamez Ospino
 * Estandares: Clean Architecture & Modular SPA
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. ESTADO GLOBAL DE LA APLICACIÓN (State Store)
  // =========================================================================
  const state = {
    currentView: 'view-billboard',
    currentFilter: 'all',
    searchQuery: '',
    selectedMovie: null,
    selectedShowtime: null,
    selectedFormat: null,
    selectedSeats: [], // Array de objetos { row, col, id, type, price }
    cartSnacks: {}, // { 'snk-id': quantity }
    currentBooking: null,
    bookingsHistory: []
  };

  // Cargar historial de LocalStorage al iniciar
  try {
    const saved = localStorage.getItem('cinemastellar_bookings_history');
    if (saved) {
      state.bookingsHistory = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('LocalStorage no disponible:', e);
  }

  // =========================================================================
  // 2. GENERADOR LIGERO DE CÓDIGO QR EN CANVAS (100% Offline / Standalone)
  // =========================================================================
  // Generador de matriz visual QR funcional para el boleto
  function drawCinemaQR(canvas, text, size = 160) {
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;

    // Fondo blanco nítido
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Algoritmo pseudo-aleatorio determinista basado en el hash del texto
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    const modules = 21; // Matriz estándar versión 1
    const cellSize = Math.floor((size - 16) / modules);
    const offset = Math.floor((size - (cellSize * modules)) / 2);

    ctx.fillStyle = '#07090e';

    // Función para dibujar patrones de posición (las 3 esquinas cuadradas)
    function drawPositionPattern(startRow, startCol) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            (r === 0 || r === 6 || c === 0 || c === 6) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            ctx.fillRect(
              offset + (startCol + c) * cellSize,
              offset + (startRow + r) * cellSize,
              cellSize,
              cellSize
            );
          }
        }
      }
    }

    // Dibujar las 3 esquinas de anclaje
    drawPositionPattern(0, 0);
    drawPositionPattern(0, modules - 7);
    drawPositionPattern(modules - 7, 0);

    // Rellenar datos en la matriz con distribución determinista
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        // Ignorar las esquinas de los patrones
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= modules - 8;
        const inBottomLeft = r >= modules - 8 && c < 8;

        if (inTopLeft || inTopRight || inBottomLeft) continue;

        // Patrón alternante de temporización
        if (r === 6 || c === 6) {
          if ((r + c) % 2 === 0) {
            ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
          }
          continue;
        }

        // Bits de datos codificados con el texto
        const bitIndex = (r * modules + c);
        const charCode = text.charCodeAt(bitIndex % text.length);
        const val = ((hash ^ (r * 31 + c * 17)) + charCode) % 3;

        if (val === 0 || (bitIndex % 7 === 0)) {
          ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  // =========================================================================
  // 3. ENRUTADOR SPA (Single Page Application Router)
  // =========================================================================
  function navigateTo(viewId) {
    state.currentView = viewId;
    window.location.hash = '#' + viewId;

    const views = document.querySelectorAll('.spa-view');
    views.forEach(v => {
      if (v.id === viewId) {
        v.classList.add('active');
      } else {
        v.classList.remove('active');
      }
    });

    // Actualizar enlaces de navegación activos
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href === '#' + viewId || (viewId === 'view-billboard' && (href === '#view-billboard' || href === '#'))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Acciones de renderizado según la vista
    if (viewId === 'view-billboard') {
      renderMoviesCatalog();
    } else if (viewId === 'view-seats') {
      renderSeatMap();
    } else if (viewId === 'view-snacks') {
      renderSnacksView();
    } else if (viewId === 'view-checkout') {
      renderCheckoutView();
    } else if (viewId === 'view-ticket') {
      renderTicketView();
    } else if (viewId === 'view-history') {
      renderHistoryView();
    }
  }

  function initRouter() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'view-billboard';
      const targetView = document.getElementById(hash);
      if (targetView) {
        navigateTo(hash);
      } else {
        navigateTo('view-billboard');
      }
    });

    // Interceptar clics en enlaces con hash
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#view-"]');
      if (link) {
        e.preventDefault();
        const targetId = link.getAttribute('href').replace('#', '');
        navigateTo(targetId);
      }
    });

    // Cargar vista inicial
    const initialHash = window.location.hash.replace('#', '') || 'view-billboard';
    if (document.getElementById(initialHash)) {
      navigateTo(initialHash);
    } else {
      navigateTo('view-billboard');
    }
  }

  // =========================================================================
  // 4. CATÁLOGO DE PELÍCULAS Y FILTROS REACTIVOS
  // =========================================================================
  function renderMoviesCatalog() {
    const grid = document.getElementById('movies-catalog-grid');
    if (!grid) return;

    const filtered = (window.CINEMA_MOVIES || []).filter(movie => {
      const matchesFilter =
        state.currentFilter === 'all' ||
        (state.currentFilter === 'featured' && movie.featured) ||
        movie.genres.map(g => g.toLowerCase()).includes(state.currentFilter.toLowerCase()) ||
        movie.genre.toLowerCase() === state.currentFilter.toLowerCase();

      const q = state.searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        movie.title.toLowerCase().includes(q) ||
        movie.originalTitle.toLowerCase().includes(q) ||
        movie.cast.some(actor => actor.toLowerCase().includes(q)) ||
        movie.director.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 3rem; margin-bottom: 12px;">🔭</div>
          <h3 style="color: var(--accent-gold); margin-bottom: 8px;">No se encontraron películas</h3>
          <p style="color: var(--text-muted); max-width: 480px; margin: 0 auto 20px;">No hay títulos que coincidan con la búsqueda "${state.searchQuery}". Intenta con otro género o término.</p>
          <button class="stellar-btn btn-secondary" onclick="window.cinemaApp.resetFilters()">Restablecer Filtros</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(movie => `
      <div class="movie-card" data-movie-id="${movie.id}">
        <div class="movie-poster-wrap">
          <img src="${movie.poster}" alt="Póster de ${movie.title}" class="movie-poster-img" loading="lazy">
          <div class="poster-badge">${movie.badge}</div>
          <div class="poster-rating">
            <span class="rating-star">★</span>
            <span>${movie.rating.toFixed(1)}</span>
          </div>
          <div class="poster-overlay-actions">
            <button class="action-circle-btn trailer-btn" data-movie-id="${movie.id}" title="Ver Trailer Oficial">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </button>
          </div>
        </div>
        <div class="movie-card-info">
          <div class="movie-genre-tag">${movie.genre} &bull; ${movie.duration}</div>
          <h3 class="movie-title">${movie.title}</h3>
          <p class="movie-synopsis-snippet">${movie.synopsis.slice(0, 95)}...</p>
          <div class="movie-card-footer">
            <div class="movie-price-tag">
              <span class="price-label">Desde</span>
              <span class="price-value">$${movie.priceBase.toLocaleString('es-CO')}</span>
            </div>
            <button class="stellar-btn btn-gold btn-book-movie" data-movie-id="${movie.id}">
              Boletos
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Event listeners para botones de tarjetas
    grid.querySelectorAll('.trailer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-movie-id');
        openTrailerModal(id);
      });
    });

    grid.querySelectorAll('.btn-book-movie').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-movie-id');
        startBooking(id);
      });
    });

    grid.querySelectorAll('.movie-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-movie-id');
        openMovieDetailsModal(id);
      });
    });
  }

  function setupFilterBar() {
    const filterButtons = document.querySelectorAll('.filter-pill');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentFilter = btn.getAttribute('data-filter') || 'all';
        renderMoviesCatalog();
      });
    });

    const searchInput = document.getElementById('movie-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderMoviesCatalog();
      });
    }
  }

  // =========================================================================
  // 5. MODALES: TRAILER Y DETALLES DE PELÍCULA
  // =========================================================================
  function openTrailerModal(movieId) {
    const movie = (window.CINEMA_MOVIES || []).find(m => m.id === movieId);
    if (!movie) return;

    const modal = document.getElementById('trailer-modal');
    const container = document.getElementById('trailer-video-container');
    const titleEl = document.getElementById('trailer-modal-title');
    const metaEl = document.getElementById('trailer-modal-meta');

    if (titleEl) titleEl.textContent = `Trailer Oficial: ${movie.title}`;
    if (metaEl) metaEl.textContent = `${movie.genre} | ${movie.duration} | Clasificación ${movie.ageRating} | Calificación IMDb ${movie.rating}`;

    if (container) {
      container.innerHTML = `
        <iframe
          src="${movie.trailerUrl}"
          title="Trailer de ${movie.title}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      `;
    }

    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeTrailerModal() {
    const modal = document.getElementById('trailer-modal');
    const container = document.getElementById('trailer-video-container');
    if (container) container.innerHTML = ''; // Detiene el audio
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function openMovieDetailsModal(movieId) {
    const movie = (window.CINEMA_MOVIES || []).find(m => m.id === movieId);
    if (!movie) return;

    const modal = document.getElementById('movie-details-modal');
    if (!modal) return;

    document.getElementById('modal-details-title').textContent = movie.title;
    document.getElementById('modal-details-genre').textContent = `${movie.genre} • ${movie.duration} • ${movie.ageRating}`;
    document.getElementById('modal-details-synopsis').textContent = movie.synopsis;
    document.getElementById('modal-details-director').textContent = movie.director;
    document.getElementById('modal-details-cast').textContent = movie.cast.join(', ');
    document.getElementById('modal-details-rating').textContent = `★ ${movie.rating.toFixed(1)} / 10`;
    document.getElementById('modal-details-poster').src = movie.poster;

    const formatsWrap = document.getElementById('modal-details-formats');
    formatsWrap.innerHTML = movie.formats.map(f => `<span class="format-tag">${f}</span>`).join(' ');

    const btnStart = document.getElementById('modal-btn-book');
    btnStart.onclick = () => {
      closeMovieDetailsModal();
      startBooking(movie.id);
    };

    const btnTrailer = document.getElementById('modal-btn-trailer');
    btnTrailer.onclick = () => {
      closeMovieDetailsModal();
      openTrailerModal(movie.id);
    };

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMovieDetailsModal() {
    const modal = document.getElementById('movie-details-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // =========================================================================
  // 6. FLUJO DE RESERVA Y SELECTOR DE BUTACAS (SVG / Grid)
  // =========================================================================
  function startBooking(movieId) {
    const movie = (window.CINEMA_MOVIES || []).find(m => m.id === movieId);
    if (!movie) return;

    state.selectedMovie = movie;
    state.selectedShowtime = movie.showtimes[0];
    state.selectedFormat = movie.formats[0];
    state.selectedSeats = [];
    state.cartSnacks = {};

    navigateTo('view-seats');
  }

  // Generador de butacas ocupadas pseudo-aleatorias pero consistentes
  function getOccupiedSeatsForSession(movieId, showtime) {
    const seedStr = `${movieId}_${showtime}`;
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed << 5) - seed + seedStr.charCodeAt(i);
      seed |= 0;
    }

    const occupied = new Set();
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const totalOccupied = Math.abs(seed % 18) + 14; // entre 14 y 31 butacas ocupadas

    let current = Math.abs(seed);
    while (occupied.size < totalOccupied) {
      current = (current * 9301 + 49297) % 233280;
      const r = rows[current % rows.length];
      const c = (current % 12) + 1;
      occupied.add(`${r}${c}`);
    }
    return occupied;
  }

  function renderSeatMap() {
    if (!state.selectedMovie) {
      state.selectedMovie = window.CINEMA_MOVIES[0];
    }
    const movie = state.selectedMovie;

    // Actualizar encabezados de la sala
    const titleEl = document.getElementById('booking-movie-title');
    const badgeEl = document.getElementById('booking-movie-badge');
    const posterEl = document.getElementById('booking-movie-poster');

    if (titleEl) titleEl.textContent = movie.title;
    if (badgeEl) badgeEl.textContent = `${movie.genre} • ${movie.duration} • Sala IMAX 01`;
    if (posterEl) posterEl.src = movie.poster;

    // Renderizar selector de horarios
    const showtimesContainer = document.getElementById('booking-showtimes-list');
    if (showtimesContainer) {
      showtimesContainer.innerHTML = movie.showtimes.map(st => `
        <button class="showtime-pill ${st === state.selectedShowtime ? 'active' : ''}" data-time="${st}">
          ${st}
        </button>
      `).join('');

      showtimesContainer.querySelectorAll('.showtime-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          showtimesContainer.querySelectorAll('.showtime-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.selectedShowtime = btn.getAttribute('data-time');
          state.selectedSeats = [];
          renderSeatMapGrid();
          updateBookingSummary();
        });
      });
    }

    // Renderizar selector de formatos
    const formatsContainer = document.getElementById('booking-formats-list');
    if (formatsContainer) {
      formatsContainer.innerHTML = movie.formats.map(fmt => `
        <button class="format-pill ${fmt === state.selectedFormat ? 'active' : ''}" data-format="${fmt}">
          ${fmt}
        </button>
      `).join('');

      formatsContainer.querySelectorAll('.format-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          formatsContainer.querySelectorAll('.format-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.selectedFormat = btn.getAttribute('data-format');
          updateBookingSummary();
        });
      });
    }

    renderSeatMapGrid();
    updateBookingSummary();
  }

  function renderSeatMapGrid() {
    const gridContainer = document.getElementById('seats-matrix-container');
    if (!gridContainer) return;

    const movie = state.selectedMovie;
    const occupiedSeats = getOccupiedSeatsForSession(movie.id, state.selectedShowtime);
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = 12;

    let html = '';

    rows.forEach(rowLetter => {
      const isVip = (rowLetter === 'G' || rowLetter === 'H');
      const isPreferential = (rowLetter === 'C' || rowLetter === 'D' || rowLetter === 'E' || rowLetter === 'F');
      const seatType = isVip ? 'VIP Reclinable' : (isPreferential ? 'Preferencial' : 'General');
      const seatPrice = isVip ? movie.vipPrice : movie.priceBase;

      html += `<div class="seat-row" data-row="${rowLetter}">`;
      html += `<span class="seat-row-label">${rowLetter}</span>`;
      html += `<div class="seat-row-seats">`;

      for (let col = 1; col <= cols; col++) {
        const seatId = `${rowLetter}${col}`;
        const isOccupied = occupiedSeats.has(seatId);
        const isSelected = state.selectedSeats.some(s => s.id === seatId);

        let statusClass = 'available';
        if (isOccupied) statusClass = 'occupied';
        else if (isSelected) statusClass = 'selected';

        if (isVip && !isOccupied && !isSelected) {
          statusClass += ' vip-seat';
        }

        // Dejar pasillo central entre columna 4-5 y 8-9
        const isAisle = (col === 4 || col === 8) ? 'aisle-after' : '';

        html += `
          <button
            type="button"
            class="seat-node ${statusClass} ${isAisle}"
            data-seat-id="${seatId}"
            data-row="${rowLetter}"
            data-col="${col}"
            data-type="${seatType}"
            data-price="${seatPrice}"
            ${isOccupied ? 'disabled' : ''}
            title="${seatId} - ${seatType} ($${seatPrice.toLocaleString('es-CO')})">
            ${col}
          </button>
        `;
      }

      html += `</div>`;
      html += `<span class="seat-row-label">${rowLetter}</span>`;
      html += `</div>`;
    });

    gridContainer.innerHTML = html;

    // Conectar clics en butacas
    gridContainer.querySelectorAll('.seat-node:not(.occupied)').forEach(btn => {
      btn.addEventListener('click', () => {
        const seatId = btn.getAttribute('data-seat-id');
        const row = btn.getAttribute('data-row');
        const col = btn.getAttribute('data-col');
        const type = btn.getAttribute('data-type');
        const price = parseInt(btn.getAttribute('data-price'), 10);

        toggleSeatSelection({ id: seatId, row, col, type, price });
      });
    });
  }

  function toggleSeatSelection(seatObj) {
    const index = state.selectedSeats.findIndex(s => s.id === seatObj.id);

    if (index >= 0) {
      state.selectedSeats.splice(index, 1);
      showToast(`Butaca ${seatObj.id} deseleccionada.`);
    } else {
      if (state.selectedSeats.length >= 8) {
        showToast('Máximo 8 butacas por transacción para seguridad.', 'warning');
        return;
      }
      state.selectedSeats.push(seatObj);
      showToast(`Butaca ${seatObj.id} (${seatObj.type}) seleccionada.`);
    }

    renderSeatMapGrid();
    updateBookingSummary();
  }

  function updateBookingSummary() {
    const seatsListEl = document.getElementById('summary-selected-seats');
    const totalEl = document.getElementById('summary-seats-total');
    const btnNext = document.getElementById('btn-continue-to-snacks');

    const totalSeatsPrice = state.selectedSeats.reduce((acc, s) => acc + s.price, 0);

    if (seatsListEl) {
      if (state.selectedSeats.length === 0) {
        seatsListEl.innerHTML = `<span style="color: var(--text-dim);">Ninguna butaca seleccionada aún</span>`;
      } else {
        seatsListEl.innerHTML = state.selectedSeats.map(s => `
          <span class="selected-seat-chip">${s.id} (${s.type})</span>
        `).join(' ');
      }
    }

    if (totalEl) {
      totalEl.textContent = `$${totalSeatsPrice.toLocaleString('es-CO')}`;
    }

    if (btnNext) {
      if (state.selectedSeats.length > 0) {
        btnNext.removeAttribute('disabled');
        btnNext.classList.remove('disabled');
      } else {
        btnNext.setAttribute('disabled', 'true');
        btnNext.classList.add('disabled');
      }
    }
  }

  // =========================================================================
  // 7. CONFITERÍA Y CARRITO DE SNACKS
  // =========================================================================
  function renderSnacksView() {
    const grid = document.getElementById('snacks-catalog-grid');
    if (!grid) return;

    grid.innerHTML = (window.CINEMA_SNACKS || []).map(snack => {
      const qty = state.cartSnacks[snack.id] || 0;
      return `
        <div class="snack-card" data-snack-id="${snack.id}">
          <div class="snack-icon-banner">${snack.icon}</div>
          <div class="snack-info">
            <div class="snack-tag">${snack.tag}</div>
            <h4 class="snack-name">${snack.name}</h4>
            <p class="snack-desc">${snack.description}</p>
            <div class="snack-footer">
              <span class="snack-price">$${snack.price.toLocaleString('es-CO')}</span>
              <div class="snack-counter-controls">
                <button type="button" class="counter-btn btn-minus" data-snack-id="${snack.id}">-</button>
                <span class="counter-qty" id="qty-${snack.id}">${qty}</span>
                <button type="button" class="counter-btn btn-plus" data-snack-id="${snack.id}">+</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-snack-id');
        updateSnackQty(id, -1);
      });
    });

    grid.querySelectorAll('.btn-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-snack-id');
        updateSnackQty(id, 1);
      });
    });

    updateSnacksSummary();
  }

  function updateSnackQty(snackId, delta) {
    const current = state.cartSnacks[snackId] || 0;
    const next = Math.max(0, current + delta);
    if (next === 0) {
      delete state.cartSnacks[snackId];
    } else {
      state.cartSnacks[snackId] = next;
    }

    const qtyEl = document.getElementById(`qty-${snackId}`);
    if (qtyEl) qtyEl.textContent = next;

    updateSnacksSummary();
  }

  function updateSnacksSummary() {
    const itemsListEl = document.getElementById('snacks-summary-items');
    const snacksTotalEl = document.getElementById('snacks-summary-subtotal');
    const grandTotalEl = document.getElementById('snacks-grand-total');

    let snacksTotal = 0;
    const itemsHtml = [];

    for (const [id, qty] of Object.entries(state.cartSnacks)) {
      const snack = (window.CINEMA_SNACKS || []).find(s => s.id === id);
      if (snack && qty > 0) {
        const linePrice = snack.price * qty;
        snacksTotal += linePrice;
        itemsHtml.push(`
          <div class="summary-line-item">
            <span>${snack.name} (x${qty})</span>
            <span>$${linePrice.toLocaleString('es-CO')}</span>
          </div>
        `);
      }
    }

    if (itemsListEl) {
      itemsListEl.innerHTML = itemsHtml.length ? itemsHtml.join('') : '<p style="color: var(--text-dim);">No has agregado productos de confitería aún.</p>';
    }

    const seatsTotal = state.selectedSeats.reduce((acc, s) => acc + s.price, 0);
    const grandTotal = seatsTotal + snacksTotal;

    if (snacksTotalEl) snacksTotalEl.textContent = `$${snacksTotal.toLocaleString('es-CO')}`;
    if (grandTotalEl) grandTotalEl.textContent = `$${grandTotal.toLocaleString('es-CO')}`;
  }

  // =========================================================================
  // 8. TICKET DIGITAL CON CÓDIGO QR Y CANVAS HTML5
  // =========================================================================
  function completeBookingAndGenerateTicket(paymentInfo = null) {
    if (!state.selectedMovie || state.selectedSeats.length === 0) {
      showToast('Por favor selecciona al menos una butaca.', 'warning');
      navigateTo('view-seats');
      return;
    }

    const ticketId = 'CST-' + Math.floor(100000 + Math.random() * 900000);
    const seatsTotal = state.selectedSeats.reduce((acc, s) => acc + s.price, 0);

    let snacksTotal = 0;
    const snacksList = [];
    for (const [id, qty] of Object.entries(state.cartSnacks)) {
      const snack = (window.CINEMA_SNACKS || []).find(s => s.id === id);
      if (snack && qty > 0) {
        snacksTotal += snack.price * qty;
        snacksList.push({ name: snack.name, qty, price: snack.price * qty });
      }
    }

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const bookingRecord = {
      ticketId,
      createdAt: now.toISOString(),
      dateStr: dateFormatted,
      movie: {
        id: state.selectedMovie.id,
        title: state.selectedMovie.title,
        duration: state.selectedMovie.duration,
        genre: state.selectedMovie.genre,
        poster: state.selectedMovie.poster
      },
      showtime: state.selectedShowtime,
      format: state.selectedFormat,
      room: 'Sala IMAX 01 (Láser 4K)',
      seats: state.selectedSeats,
      seatsTotal,
      snacks: snacksList,
      snacksTotal,
      grandTotal: seatsTotal + snacksTotal,
      payment: paymentInfo || {
        paymentMethod: 'Tarjeta de Crédito Visa •••• 4532',
        authCode: 'AUTH-' + Math.floor(100000 + Math.random() * 900000),
        pointsEarned: 65
      },
      buyer: state.currentUser ? {
        name: state.currentUser.name,
        email: state.currentUser.email
      } : {
        name: 'Invitado CinemaStellar',
        email: 'invitado@cinemastellar.co'
      }
    };

    state.currentBooking = bookingRecord;
    state.bookingsHistory.unshift(bookingRecord);

    // Guardar en LocalStorage
    try {
      localStorage.setItem('cinemastellar_bookings_history', JSON.stringify(state.bookingsHistory.slice(0, 20)));
    } catch (e) {
      console.warn('Error al guardar en LocalStorage:', e);
    }

    navigateTo('view-ticket');
    showToast(`¡Boleto ${ticketId} emitido con éxito!`, 'success');
  }

  function renderTicketView() {
    const booking = state.currentBooking;
    if (!booking) {
      navigateTo('view-billboard');
      return;
    }

    document.getElementById('ticket-display-id').textContent = booking.ticketId;
    document.getElementById('ticket-display-movie').textContent = booking.movie.title;
    document.getElementById('ticket-display-date').textContent = booking.dateStr;
    document.getElementById('ticket-display-showtime').textContent = booking.showtime;
    document.getElementById('ticket-display-format').textContent = booking.format;
    document.getElementById('ticket-display-room').textContent = booking.room;
    document.getElementById('ticket-display-seats').textContent = booking.seats.map(s => s.id).join(', ');
    document.getElementById('ticket-display-total').textContent = `$${booking.grandTotal.toLocaleString('es-CO')}`;

    const snacksSummaryEl = document.getElementById('ticket-display-snacks');
    if (snacksSummaryEl) {
      if (booking.snacks.length > 0) {
        snacksSummaryEl.innerHTML = booking.snacks.map(s => `<span>${s.name} x${s.qty}</span>`).join('<br>');
      } else {
        snacksSummaryEl.textContent = 'Sin confitería adicional';
      }
    }

    // Dibujar Código QR en Canvas
    const qrCanvas = document.getElementById('ticket-qr-canvas');
    if (qrCanvas) {
      const qrData = `CINEMASTELLAR|ID:${booking.ticketId}|TIT:${booking.movie.title}|TIME:${booking.showtime}|ROOM:${booking.room}|SEATS:${booking.seats.map(s => s.id).join('-')}|TOTAL:$${booking.grandTotal}`;
      drawCinemaQR(qrCanvas, qrData, 160);
    }

    // Generar Canvas Completo del Ticket para Descarga
    drawFullTicketCanvas(booking);
  }

  function drawFullTicketCanvas(booking) {
    const canvas = document.getElementById('ticket-render-canvas');
    if (!canvas) return;

    const width = 800;
    const height = 460;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    // 1. Fondo Oscuro Cinematográfico con Degradé Estelar
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#07090e');
    grad.addColorStop(0.5, '#0d131f');
    grad.addColorStop(1, '#05070a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Borde exterior dorado
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    // Destellos sutiles
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.beginPath();
    ctx.arc(650, 100, 180, 0, Math.PI * 2);
    ctx.fill();

    // 2. Línea divisoria de cupón de embarque (dashed line)
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(560, 20);
    ctx.lineTo(560, height - 20);
    ctx.stroke();
    ctx.setLineDash([]); // Restaurar continuo

    // 3. Encabezado de la Marca
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText('★ CINEMASTELLAR', 36, 52);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('PASE DE ENTRADA DIGITAL OFICIAL • EXPERIENCIA GALÁCTICA', 36, 74);

    // 4. Título de la Película
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Outfit", sans-serif';
    ctx.fillText(booking.movie.title.slice(0, 28), 36, 130);

    // 5. Metadatos en columnas
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('SALA & FORMATO', 36, 175);
    ctx.fillText('FECHA Y HORA', 220, 175);
    ctx.fillText('BUTACAS ASIGNADAS', 36, 250);
    ctx.fillText('TIPO DE ENTRADA', 220, 250);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${booking.room} (${booking.format})`, 36, 200);
    ctx.fillText(`${booking.showtime} hrs`, 220, 200);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText(booking.seats.map(s => s.id).join(', '), 36, 278);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(booking.seats[0] ? booking.seats[0].type : 'General', 220, 278);

    // 6. Confitería y Total
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('TOTAL CANCELADO', 36, 335);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.fillText(`$${booking.grandTotal.toLocaleString('es-CO')} COP`, 36, 370);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    if (booking.snacks.length > 0) {
      ctx.fillText(`Incluye snacks: ${booking.snacks.map(s => s.name).join(', ').slice(0, 48)}...`, 36, 400);
    } else {
      ctx.fillText('Entrada de cine sin confitería adicional.', 36, 400);
    }

    // 7. Sección de Embarque Derecho (Cupón QR)
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 15px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CONTROL DE ACCESO', 675, 52);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(booking.ticketId, 675, 74);

    // Incrustar el Canvas QR directamente
    const tempQr = document.createElement('canvas');
    drawCinemaQR(tempQr, `VALID|${booking.ticketId}|${booking.movie.title}`, 170);
    ctx.drawImage(tempQr, 590, 95, 170, 170);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ESCANEA EN PUERTA 01', 675, 290);
    ctx.fillText('Presenta este código al ingresar', 675, 308);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('VALIDADO POR CINEMASTELLAR', 675, 395);

    ctx.textAlign = 'start'; // Restaurar alineación
  }

  function downloadTicketPNG() {
    const canvas = document.getElementById('ticket-render-canvas');
    if (!canvas) return;

    const booking = state.currentBooking;
    const filename = `CinemaStellar_Ticket_${booking ? booking.ticketId : 'Boleto'}.png`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('¡Boleto descargado en formato PNG!', 'success');
  }

  // =========================================================================
  // 9. HISTORIAL DE BOLETOS (Mis Boletos)
  // =========================================================================
  function renderHistoryView() {
    const container = document.getElementById('history-bookings-list');
    if (!container) return;

    if (state.bookingsHistory.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card" style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 3rem; margin-bottom: 12px;">🎟️</div>
          <h3 style="color: var(--accent-gold); margin-bottom: 8px;">Aún no tienes boletos emitidos</h3>
          <p style="color: var(--text-muted); max-width: 480px; margin: 0 auto 20px;">Tus compras y reservas de funciones aparecerán aquí guardadas en tu navegador.</p>
          <a href="#view-billboard" class="stellar-btn btn-gold">Explorar Cartelera</a>
        </div>
      `;
      return;
    }

    container.innerHTML = state.bookingsHistory.map(b => `
      <div class="history-ticket-card">
        <div class="history-ticket-header">
          <div>
            <span class="history-badge">${b.ticketId}</span>
            <h3 style="font-size: 1.25rem; color: #fff; margin-top: 6px;">${b.movie.title}</h3>
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--font-mono); color: var(--accent-gold); font-size: 1.2rem; font-weight: 700;">$${b.grandTotal.toLocaleString('es-CO')}</div>
            <div style="color: var(--text-dim); font-size: 0.8rem;">${b.dateStr}</div>
          </div>
        </div>
        <div class="history-ticket-details">
          <div><strong>Función:</strong> ${b.showtime} hrs (${b.format})</div>
          <div><strong>Sala:</strong> ${b.room}</div>
          <div><strong>Butacas:</strong> <span style="color: var(--accent-emerald); font-weight: 700;">${b.seats.map(s => s.id).join(', ')}</span></div>
        </div>
        <div class="history-ticket-actions">
          <button class="stellar-btn btn-secondary btn-sm" onclick="window.cinemaApp.viewSavedTicket('${b.ticketId}')">
            Ver Boleto y QR
          </button>
        </div>
      </div>
    `).join('');
  }

  function viewSavedTicket(ticketId) {
    const found = state.bookingsHistory.find(b => b.ticketId === ticketId);
    if (found) {
      state.currentBooking = found;
      navigateTo('view-ticket');
    }
  }

  // =========================================================================
  // 10. ALERTAS TOAST Y CONTACTO
  // =========================================================================
  function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast-notice');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notice toast-${type}`;

    let icon = '✨';
    if (type === 'warning') icon = '⚠️';
    if (type === 'success') icon = '🎉';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideToast 0.35s ease-out reverse';
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  function setupContactForm() {
    const form = document.getElementById('cinema-contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('contact-name')?.value || 'Usuario';
      showToast(`¡Gracias ${name}! Tu solicitud corporativa ha sido registrada.`, 'success');
      form.reset();
    });
  }

  // =========================================================================
  // 11. INICIALIZACIÓN GENERAL (DOM Ready)
  // =========================================================================
  function init() {
    loadPersistedUser();
    initRouter();
    setupFilterBar();
    setupContactForm();

    // Conectar botones del modal
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        closeTrailerModal();
        closeMovieDetailsModal();
      });
    });

    // Cerrar modal al cliquear fondo
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('stellar-modal')) {
        closeTrailerModal();
        closeMovieDetailsModal();
      }
    });

    // Botón Continuar a Confitería
    const btnContinueSnacks = document.getElementById('btn-continue-to-snacks');
    if (btnContinueSnacks) {
      btnContinueSnacks.addEventListener('click', () => {
        if (state.selectedSeats.length > 0) {
          navigateTo('view-snacks');
        }
      });
    }

    // Botones de Confitería
    const btnSkipSnacks = document.getElementById('btn-skip-snacks');
    if (btnSkipSnacks) {
      btnSkipSnacks.addEventListener('click', () => {
        state.cartSnacks = {};
        completeBookingAndGenerateTicket();
      });
    }

    const btnFinishBooking = document.getElementById('btn-finish-booking');
    if (btnFinishBooking) {
      btnFinishBooking.addEventListener('click', () => {
        completeBookingAndGenerateTicket();
      });
    }

    // Botón Descargar Ticket
    const btnDownloadTicket = document.getElementById('btn-download-ticket-png');
    if (btnDownloadTicket) {
      btnDownloadTicket.addEventListener('click', downloadTicketPNG);
    }
  }


  // =========================================================================
  // 7.5. SISTEMA DE AUTENTICACION Y CONTROL DE USUARIOS (STELLAR CLUB)
  // =========================================================================
  function loadPersistedUser() {
    try {
      const stored = localStorage.getItem('cinemastellar_current_user');
      if (stored) {
        state.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error al cargar usuario de localStorage:', e);
    }
    updateUserHeaderWidget();
  }

  function savePersistedUser(user) {
    state.currentUser = user;
    try {
      if (user) {
        localStorage.setItem('cinemastellar_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('cinemastellar_current_user');
      }
    } catch (e) {
      console.warn('Error al guardar usuario en localStorage:', e);
    }
    updateUserHeaderWidget();
  }

  function updateUserHeaderWidget() {
    const authWidget = document.getElementById('auth-header-widget');
    const userWidget = document.getElementById('user-header-widget');
    if (!authWidget || !userWidget) return;

    if (state.currentUser) {
      authWidget.style.display = 'none';
      userWidget.style.display = 'flex';

      const nameElem = document.getElementById('user-display-name');
      const pointsElem = document.getElementById('user-points-badge');
      const initialsElem = document.getElementById('user-avatar-initials');
      const emailElem = document.getElementById('dropdown-user-email');

      if (nameElem) nameElem.innerText = state.currentUser.name;
      if (pointsElem) pointsElem.innerText = `⭐ ${state.currentUser.points || 450} pts`;
      if (emailElem) emailElem.innerText = state.currentUser.email;

      if (initialsElem) {
        const parts = state.currentUser.name.trim().split(' ');
        const initials = parts.length > 1 
          ? (parts[0][0] + parts[1][0]).toUpperCase()
          : parts[0].slice(0, 2).toUpperCase();
        initialsElem.innerText = initials;
      }
    } else {
      authWidget.style.display = 'flex';
      userWidget.style.display = 'none';
      const dropdown = document.getElementById('user-dropdown-menu');
      if (dropdown) dropdown.classList.remove('active');
    }
  }

  function toggleUserDropdown(forceState) {
    const dropdown = document.getElementById('user-dropdown-menu');
    if (!dropdown) return;
    if (typeof forceState === 'boolean') {
      if (forceState) dropdown.classList.add('active');
      else dropdown.classList.remove('active');
    } else {
      dropdown.classList.toggle('active');
    }
  }

  function openAuthModal(initialTab = 'login', callbackAfterAuth = null) {
    state.pendingAuthAction = callbackAfterAuth;
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    switchAuthTab(initialTab);
    modal.classList.add('active');
  }

  function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
    state.pendingAuthAction = null;
  }

  function switchAuthTab(tab) {
    const btnLogin = document.getElementById('btn-tab-login');
    const btnReg = document.getElementById('btn-tab-register');
    const formLogin = document.getElementById('form-auth-login');
    const formReg = document.getElementById('form-auth-register');

    if (tab === 'register') {
      if (btnLogin) btnLogin.classList.remove('active');
      if (btnReg) btnReg.classList.add('active');
      if (formLogin) formLogin.classList.remove('active');
      if (formReg) formReg.classList.add('active');
    } else {
      if (btnLogin) btnLogin.classList.add('active');
      if (btnReg) btnReg.classList.remove('active');
      if (formLogin) formLogin.classList.add('active');
      if (formReg) formReg.classList.remove('active');
    }
  }

  function submitLogin() {
    const email = document.getElementById('input-login-email').value.trim();
    if (!email) {
      showToast('Por favor ingresa tu correo electrónico.', 'warning');
      return;
    }

    const user = {
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: email,
      points: 480,
      memberSince: '2026'
    };

    savePersistedUser(user);
    closeAuthModal();
    showToast(`¡Bienvenido de nuevo, ${user.name}! Sesión iniciada.`, 'success');

    if (typeof state.pendingAuthAction === 'function') {
      const cb = state.pendingAuthAction;
      state.pendingAuthAction = null;
      cb();
    }
  }

  function loginDemoUser() {
    const demoUser = {
      name: 'Mileidys Agamez',
      email: 'mileidys@cinemastellar.co',
      points: 520,
      memberSince: '2026'
    };
    savePersistedUser(demoUser);
    closeAuthModal();
    showToast(`Sesión demo iniciada como ${demoUser.name} ⭐`, 'success');

    if (typeof state.pendingAuthAction === 'function') {
      const cb = state.pendingAuthAction;
      state.pendingAuthAction = null;
      cb();
    }
  }

  function submitRegister() {
    const name = document.getElementById('input-reg-name').value.trim();
    const email = document.getElementById('input-reg-email').value.trim();

    if (!name || !email) {
      showToast('Por favor completa los campos obligatorios.', 'warning');
      return;
    }

    const newUser = {
      name: name,
      email: email,
      points: 100, // Bono de bienvenida
      memberSince: '2026'
    };

    savePersistedUser(newUser);
    closeAuthModal();
    showToast(`¡Cuenta creada con éxito! Ganaste 100 puntos de bienvenida ⭐`, 'success');

    if (typeof state.pendingAuthAction === 'function') {
      const cb = state.pendingAuthAction;
      state.pendingAuthAction = null;
      cb();
    }
  }

  function logoutUser() {
    savePersistedUser(null);
    showToast('Has cerrado sesión correctamente.', 'info');
    navigateTo('view-billboard');
  }

  // =========================================================================
  // 7.6. PASARELA DE PAGO INTERACTIVA (CHECKOUT FLOW & PAYMENT GATEWAY)
  // =========================================================================
  function proceedToCheckout() {
    if (!state.selectedMovie || state.selectedSeats.length === 0) {
      showToast('Por favor selecciona al menos una butaca para continuar.', 'warning');
      navigateTo('view-seats');
      return;
    }

    // AUTH GUARD: Es obligatorio contar con una cuenta para pagar y emitir entradas
    if (!state.currentUser) {
      showToast('Para continuar al pago y vincular tus boletos con código QR, ingresa a tu cuenta.', 'info');
      openAuthModal('login', () => {
        navigateTo('view-checkout');
      });
      return;
    }

    navigateTo('view-checkout');
  }

  function switchPaymentMethod(method) {
    state.activePaymentMethod = method;

    const tabCard = document.getElementById('tab-pay-card');
    const tabPse = document.getElementById('tab-pay-pse');
    const tabWallet = document.getElementById('tab-pay-wallet');

    const panelCard = document.getElementById('pay-panel-card');
    const panelPse = document.getElementById('pay-panel-pse');
    const panelWallet = document.getElementById('pay-panel-wallet');

    [tabCard, tabPse, tabWallet].forEach(t => t && t.classList.remove('active'));
    [panelCard, panelPse, panelWallet].forEach(p => p && p.classList.remove('active'));

    if (method === 'pse') {
      if (tabPse) tabPse.classList.add('active');
      if (panelPse) panelPse.classList.add('active');
    } else if (method === 'wallet') {
      if (tabWallet) tabWallet.classList.add('active');
      if (panelWallet) panelWallet.classList.add('active');
    } else {
      if (tabCard) tabCard.classList.add('active');
      if (panelCard) panelCard.classList.add('active');
    }
  }

  function renderCheckoutView() {
    if (!state.selectedMovie || state.selectedSeats.length === 0) {
      navigateTo('view-seats');
      return;
    }

    // 1. Datos de película
    const poster = document.getElementById('checkout-movie-poster');
    const title = document.getElementById('checkout-movie-title');
    const format = document.getElementById('checkout-movie-format');
    const room = document.getElementById('checkout-movie-room');
    const sched = document.getElementById('checkout-movie-schedule');

    if (poster) poster.src = state.selectedMovie.poster;
    if (title) title.innerText = state.selectedMovie.title;
    if (format) format.innerText = state.selectedFormat || 'IMAX 3D Laser';
    if (room) room.innerText = 'Sala 01 IMAX';
    if (sched) sched.innerText = `📅 Hoy • ${state.selectedShowtime || '7:30 PM'}`;

    // 2. Lista de Butacas
    const seatsList = document.getElementById('checkout-seats-list');
    let seatsSubtotal = 0;
    if (seatsList) {
      seatsList.innerHTML = '';
      state.selectedSeats.forEach(s => {
        seatsSubtotal += s.price;
        const row = document.createElement('div');
        row.className = 'checkout-item-row';
        row.innerHTML = `
          <span>Butaca ${s.id} (${s.type.toUpperCase()})</span>
          <span style="font-weight: 600;">$${s.price.toLocaleString('es-CO')}</span>
        `;
        seatsList.appendChild(row);
      });
    }

    // 3. Lista de Confitería
    const snacksListElem = document.getElementById('checkout-snacks-list');
    let snacksSubtotal = 0;
    const snacksArray = [];
    if (snacksListElem) {
      snacksListElem.innerHTML = '';
      for (const [id, qty] of Object.entries(state.cartSnacks)) {
        const snack = (window.CINEMA_SNACKS || []).find(s => s.id === id);
        if (snack && qty > 0) {
          const itemCost = snack.price * qty;
          snacksSubtotal += itemCost;
          snacksArray.push({ name: snack.name, qty, price: itemCost });

          const row = document.createElement('div');
          row.className = 'checkout-item-row';
          row.innerHTML = `
            <span>${snack.name} x${qty}</span>
            <span style="font-weight: 600;">$${itemCost.toLocaleString('es-CO')}</span>
          `;
          snacksListElem.appendChild(row);
        }
      }

      if (snacksArray.length === 0) {
        snacksListElem.innerHTML = '<p style="color: var(--text-dim); font-size: 0.85rem;">Sin productos de confitería seleccionados.</p>';
      }
    }

    // 4. Totales Financieros
    const grandTotal = seatsSubtotal + snacksSubtotal;
    const taxes = Math.round(grandTotal * 0.19);
    const pointsToEarn = Math.max(15, Math.round(grandTotal / 1000));

    const elemSubSeats = document.getElementById('checkout-subtotal-seats');
    const elemSubSnacks = document.getElementById('checkout-subtotal-snacks');
    const elemTaxes = document.getElementById('checkout-taxes-amount');
    const elemGrand = document.getElementById('checkout-grand-total');
    const elemPoints = document.getElementById('checkout-points-earned');

    if (elemSubSeats) elemSubSeats.innerText = `$${seatsSubtotal.toLocaleString('es-CO')}`;
    if (elemSubSnacks) elemSubSnacks.innerText = `$${snacksSubtotal.toLocaleString('es-CO')}`;
    if (elemTaxes) elemTaxes.innerText = `$${taxes.toLocaleString('es-CO')}`;
    if (elemGrand) elemGrand.innerText = `$${grandTotal.toLocaleString('es-CO')}`;
    if (elemPoints) elemPoints.innerText = pointsToEarn;

    // Actualizar montos en los botones de pago
    document.querySelectorAll('.btn-pay-amount').forEach(btnSpan => {
      btnSpan.innerText = `$${grandTotal.toLocaleString('es-CO')} COP`;
    });

    // 5. Datos de usuario comprador
    const buyerName = document.getElementById('checkout-buyer-name');
    const buyerEmail = document.getElementById('checkout-buyer-email');
    if (state.currentUser) {
      if (buyerName) buyerName.innerText = state.currentUser.name;
      if (buyerEmail) buyerEmail.innerText = state.currentUser.email;

      // Autocompletar tarjeta si coincide
      const cardHolderInput = document.getElementById('input-card-holder');
      if (cardHolderInput && !cardHolderInput.value) {
        cardHolderInput.value = state.currentUser.name.toUpperCase();
        const holderPreview = document.getElementById('card-holder-preview');
        if (holderPreview) holderPreview.innerText = state.currentUser.name.toUpperCase();
      }
    }

    setupCardSimulatorListeners();
  }

  function setupCardSimulatorListeners() {
    const numInput = document.getElementById('input-card-number');
    const holderInput = document.getElementById('input-card-holder');
    const expiryInput = document.getElementById('input-card-expiry');

    const numPreview = document.getElementById('card-number-preview');
    const holderPreview = document.getElementById('card-holder-preview');
    const expiryPreview = document.getElementById('card-expiry-preview');
    const brandDisplay = document.getElementById('card-brand-display');
    const brandBadge = document.getElementById('input-brand-badge');

    if (numInput && !numInput._hasListener) {
      numInput._hasListener = true;
      numInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 16);
        let formatted = '';
        for (let i = 0; i < val.length; i++) {
          if (i > 0 && i % 4 === 0) formatted += ' ';
          formatted += val[i];
        }
        e.target.value = formatted;
        if (numPreview) numPreview.innerText = formatted || '•••• •••• •••• ••••';

        // Detección de marca
        let brand = 'VISA';
        let badge = '💳';
        if (val.startsWith('5')) { brand = 'MASTERCARD'; badge = '🔴🟠'; }
        else if (val.startsWith('3')) { brand = 'AMEX'; badge = '💳'; }
        else if (val.startsWith('4')) { brand = 'VISA'; badge = '🔵'; }

        if (brandDisplay) brandDisplay.innerHTML = `<span class="brand-text">${brand}</span>`;
        if (brandBadge) brandBadge.innerText = badge;
      });
    }

    if (holderInput && !holderInput._hasListener) {
      holderInput._hasListener = true;
      holderInput.addEventListener('input', (e) => {
        const val = e.target.value.toUpperCase();
        if (holderPreview) holderPreview.innerText = val || 'NOMBRE DEL TITULAR';
      });
    }

    if (expiryInput && !expiryInput._hasListener) {
      expiryInput._hasListener = true;
      expiryInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 4);
        if (val.length >= 2) {
          val = val.slice(0, 2) + '/' + val.slice(2);
        }
        e.target.value = val;
        if (expiryPreview) expiryPreview.innerText = val || 'MM/AA';
      });
    }
  }

  function processSecurePayment() {
    const overlay = document.getElementById('payment-processing-overlay');
    const title = document.getElementById('payment-loader-title');
    const step = document.getElementById('payment-loader-step');
    const bar = document.getElementById('payment-progress-fill');

    if (!overlay) return;
    overlay.classList.add('active');

    if (bar) bar.style.width = '20%';
    if (title) title.innerText = 'Conectando con la Red Bancaria...';
    if (step) step.innerText = 'Cifrando credenciales con algoritmo AES-256...';

    setTimeout(() => {
      if (bar) bar.style.width = '60%';
      if (title) title.innerText = 'Verificación 3D Secure...';
      if (step) step.innerText = 'Validando fondos y confirmando tokenización de seguridad...';
    }, 900);

    setTimeout(() => {
      if (bar) bar.style.width = '100%';
      if (title) title.innerText = '¡Transacción Aprobada! 🎉';
      if (step) step.innerText = 'Generando comprobante fiscal y código QR de acceso...';
    }, 1800);

    setTimeout(() => {
      overlay.classList.remove('active');

      let paymentDesc = 'Tarjeta de Crédito terminada en •••• 4532 (1 cuota)';
      if (state.activePaymentMethod === 'pse') {
        const bank = document.getElementById('select-pse-bank').value || 'Bancolombia';
        paymentDesc = `PSE - Débito en Cuenta (${bank.toUpperCase()})`;
      } else if (state.activePaymentMethod === 'wallet') {
        paymentDesc = 'Billetera Móvil (Nequi / Daviplata)';
      }

      const authCode = 'AUTH-' + Math.floor(100000 + Math.random() * 900000);
      const pointsEarned = Math.max(15, Math.round((state.selectedSeats.reduce((a,s)=>a+s.price,0)) / 1000));

      if (state.currentUser) {
        state.currentUser.points = (state.currentUser.points || 0) + pointsEarned;
        savePersistedUser(state.currentUser);
      }

      completeBookingAndGenerateTicket({
        paymentMethod: paymentDesc,
        authCode: authCode,
        pointsEarned: pointsEarned
      });
    }, 2500);
  }


  // Exponer API pública en window para handlers inline y pruebas
  window.cinemaApp = {
    state,
    navigateTo,
    openAuthModal,
    closeAuthModal,
    switchAuthTab,
    submitLogin,
    submitRegister,
    loginDemoUser,
    logoutUser,
    toggleUserDropdown,
    proceedToCheckout,
    switchPaymentMethod,
    renderCheckoutView,
    processSecurePayment,
    openTrailerModal,
    closeTrailerModal,
    openMovieDetailsModal,
    closeMovieDetailsModal,
    startBooking,
    toggleSeatSelection,
    updateSnackQty,
    completeBookingAndGenerateTicket,
    downloadTicketPNG,
    viewSavedTicket,
    resetFilters: () => {
      state.currentFilter = 'all';
      state.searchQuery = '';
      const input = document.getElementById('movie-search-input');
      if (input) input.value = '';
      document.querySelectorAll('.filter-pill').forEach(p => {
        if (p.getAttribute('data-filter') === 'all') p.classList.add('active');
        else p.classList.remove('active');
      });
      renderMoviesCatalog();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

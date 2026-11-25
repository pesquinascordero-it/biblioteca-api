// ============================================================
// app.js — Lógica de la página
// ------------------------------------------------------------
// Lee lo que hace el usuario (filtros, estantería, formulario),
// llama a la API y pinta los resultados. No sabe nada de HTTP:
// eso lo hace api.js.
// ============================================================

// ---------- Estado de la página ----------
const state = {
  page: 1,
  pagination: null, // datos de paginación que devuelve la API
  books: [],        // libros de la página actual
  selectedId: null, // libro seleccionado en la estantería
  editingId: null,  // libro que se está editando en el formulario
  demo: false,      // true = usar demoApi en lugar de la API real
};

// Devuelve la API que toca usar según el modo
function backend() {
  return state.demo ? demoApi : api;
}

const $ = (id) => document.getElementById(id);

// Los id pueden llegar como número (3) o como texto ("3"): los comparamos como texto
const sameId = (a, b) => String(a) === String(b);

// Evita que un título como "<b>Hola</b>" se interprete como HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// ---------- Aspecto de cada lomo ----------

// Colores de encuadernación: [fondo, texto]
const BINDINGS = [
  ['#2f5d50', '#ffffff'], // verde
  ['#6b2737', '#ffffff'], // granate
  ['#284b7a', '#ffffff'], // azul
  ['#44405e', '#ffffff'], // pizarra
  ['#c99a3b', '#2a1d05'], // mostaza
  ['#3f5e35', '#ffffff'], // musgo
  ['#7a4a2a', '#ffffff'], // cuero
  ['#1f4f5a', '#ffffff'], // petróleo
];

// Algunos géneros tienen siempre el mismo color, para reconocerlos de un vistazo
const GENRE_BINDING = {
  novela: 0, misterio: 1, relatos: 2, 'ciencia ficción': 3, infantil: 4, programación: 5,
};

// Convierte un texto en un número estable (el mismo texto da siempre el mismo número)
function hash(text) {
  let h = 0;
  for (const char of String(text)) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

function bindingFor(book) {
  const genre = (book.genre || '').toLowerCase();
  const index = genre in GENRE_BINDING ? GENRE_BINDING[genre] : hash(genre || book.title) % BINDINGS.length;
  return BINDINGS[index];
}

function spineSize(book) {
  const h = hash(`${book.id}-${book.title}`);
  return {
    height: 190 + (h % 60),                                      // 190–249 px
    width: 44 + Math.min((book.title || '').length, 28) * 0.8,   // más ancho cuanto más largo el título
  };
}

function surname(author) {
  const parts = (author || '').trim().split(/\s+/);
  return parts[parts.length - 1] || '';
}

// ---------- Cargar y pintar la estantería ----------

function currentFilters() {
  return {
    q: $('f-q').value.trim(),
    genre: $('f-genre').value.trim(),
    available: $('f-available').value,
    sort: $('f-sort').value,
    order: $('f-order').value,
    page: state.page,
    limit: $('f-limit').value,
  };
}

async function loadBooks() {
  try {
    const result = await backend().listBooks(currentFilters());
    state.books = result.data;
    state.pagination = result.pagination;

    // Si el libro seleccionado ya no está en esta página, se deselecciona
    if (!state.books.some((b) => sameId(b.id, state.selectedId))) state.selectedId = null;

    hideBanner();
    renderAll();
  } catch (err) {
    state.books = [];
    state.pagination = null;
    state.selectedId = null;
    renderAll();
    if (err.status === 0) showBanner(err.message);
    else showToast(`Error ${err.status}: ${err.message}`);
  }
}

function renderAll() {
  renderShelf();
  renderSummary();
  renderPagination();
  renderDetail();
}

function renderShelf() {
  const shelf = $('shelf');

  if (!state.pagination) {
    shelf.innerHTML = '<li class="shelf-empty">No hay conexión con la estantería.</li>';
    return;
  }
  if (state.books.length === 0) {
    const filtering = $('f-q').value || $('f-genre').value || $('f-available').value;
    shelf.innerHTML = `<li class="shelf-empty">${filtering
        ? 'Ningún libro coincide con estos filtros. Prueba a quitar alguno.'
        : 'La estantería está vacía. Añade el primer libro con el formulario.'
      }</li>`;
    return;
  }

  shelf.innerHTML = state.books.map((book) => {
    const [colour, text] = bindingFor(book);
    const { height, width } = spineSize(book);
    const selected = sameId(book.id, state.selectedId);
    const label = `${book.title}, de ${book.author}${book.available ? '' : ' (prestado)'}`;
    return `
      <li>
        <button type="button"
          class="spine${book.available ? '' : ' is-loaned'}"
          style="--h:${height}px; --w:${width}px; --c:${colour}; --t:${text}"
          data-id="${escapeHtml(String(book.id))}"
          aria-pressed="${selected}"
          aria-label="${escapeHtml(label)}"
          title="${escapeHtml(label)}">
          <span class="spine-year">${escapeHtml(String(book.year ?? ''))}</span>
          <span class="spine-title">${escapeHtml(book.title)}</span>
          <span class="spine-author">${escapeHtml(surname(book.author))}</span>
        </button>
      </li>`;
  }).join('');
}

function renderSummary() {
  const p = state.pagination;
  if (!p) {
    $('shelf-summary').textContent = 'Sin conexión con la API';
    return;
  }
  const loaned = state.books.filter((b) => !b.available).length;
  const total = `${p.total} ${p.total === 1 ? 'libro' : 'libros'}`;
  $('shelf-summary').textContent = loaned
    ? `${total} encontrados, ${loaned} prestado${loaned === 1 ? '' : 's'} en esta página`
    : `${total} encontrado${p.total === 1 ? '' : 's'}`;
}

function renderPagination() {
  const p = state.pagination;
  $('page-info').textContent = p ? `Página ${p.page} de ${p.totalPages}` : '';
  $('prev-btn').disabled = !p || state.page <= 1;
  $('next-btn').disabled = !p || state.page >= p.totalPages;
}

// ---------- Ficha del libro seleccionado ----------

function renderDetail() {
  const box = $('detail');
  const book = state.books.find((b) => sameId(b.id, state.selectedId));

  if (!book) {
    box.innerHTML = '<p class="detail-empty">Elige un libro de la estantería para ver sus datos, prestarlo, editarlo o borrarlo.</p>';
    return;
  }

  const [colour] = bindingFor(book);
  box.innerHTML = `
    <p class="detail-title">${escapeHtml(book.title)}</p>
    <p class="detail-author">${escapeHtml(book.author)}</p>
    <dl class="detail-data">
      <dt>Estado</dt>
      <dd class="status ${book.available ? 'in' : 'out'}">${book.available ? 'En la estantería' : 'Prestado'}</dd>
      <dt>Año</dt><dd>${escapeHtml(String(book.year ?? '—'))}</dd>
      <dt>Género</dt><dd><span class="detail-colour" style="background:${colour}"></span>${escapeHtml(book.genre || 'Sin género')}</dd>
      <dt>ISBN</dt><dd>${escapeHtml(book.isbn || '—')}</dd>
      <dt>Id</dt><dd>${escapeHtml(String(book.id))}</dd>
    </dl>
    <div class="actions">
      <button type="button" class="btn btn-primary" data-action="toggle">${book.available ? 'Prestar' : 'Devolver'}</button>
      <button type="button" class="btn btn-quiet" data-action="edit">Editar</button>
      <button type="button" class="btn btn-danger" data-action="delete">Borrar</button>
    </div>`;
}

async function handleDetailAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const book = state.books.find((b) => sameId(b.id, state.selectedId));
  if (!book) return;

  try {
    if (button.dataset.action === 'edit') {
      startEditing(book);
      return;
    }

    if (button.dataset.action === 'toggle') {
      // PATCH: solo cambiamos un campo
      await backend().updateBook(book.id, { available: !book.available });
      showToast(book.available ? `Prestado: ${book.title}` : `Devuelto: ${book.title}`);
    }

    if (button.dataset.action === 'delete') {
      if (!confirm(`¿Borrar "${book.title}"? No se puede deshacer.`)) return;
      await backend().deleteBook(book.id);
      showToast(`Borrado: ${book.title}`);
      if (sameId(state.editingId, book.id)) resetForm();
      state.selectedId = null;
      // Si era el último libro de la página, volvemos a la anterior
      if (state.books.length === 1 && state.page > 1) state.page--;
    }

    await loadBooks();
  } catch (err) {
    if (err.status === 0) showBanner(err.message);
    else showToast(`Error ${err.status}: ${err.message}`);
  }
}

// ---------- Formulario: añadir y editar ----------

function readForm() {
  const book = {
    title: $('title').value.trim(),
    author: $('author').value.trim(),
    year: $('year').value === '' ? undefined : Number($('year').value),
    available: $('available').checked,
  };
  if ($('genre').value.trim()) book.genre = $('genre').value.trim();
  if ($('isbn').value.trim()) book.isbn = $('isbn').value.trim();
  return book;
}

function resetForm() {
  $('book-form').reset();
  $('available').checked = true;
  state.editingId = null;
  $('form-title').textContent = 'Añadir un libro';
  $('submit-btn').textContent = 'Añadir a la estantería';
  $('cancel-btn').hidden = true;
  showFormErrors(null);
}

function startEditing(book) {
  state.editingId = book.id;
  $('title').value = book.title;
  $('author').value = book.author;
  $('year').value = book.year ?? '';
  $('genre').value = book.genre || '';
  $('isbn').value = book.isbn || '';
  $('available').checked = book.available;
  $('form-title').textContent = `Editar «${book.title}»`;
  $('submit-btn').textContent = 'Guardar cambios';
  $('cancel-btn').hidden = false;
  showFormErrors(null);
  $('title').focus();
}

function showFormErrors(err) {
  const box = $('form-errors');
  if (!err) {
    box.hidden = true;
    box.textContent = '';
    return;
  }
  const details = err.details && err.details.length
    ? `<ul>${err.details.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`
    : '';
  box.innerHTML = `${escapeHtml(err.message)}${details}`;
  box.hidden = false;
}

async function handleSubmit(event) {
  event.preventDefault(); // evita que el navegador recargue la página
  const book = readForm();
  $('submit-btn').disabled = true;

  try {
    if (state.editingId !== null) {
      // Editar: PUT sustituye el libro entero
      const saved = await backend().replaceBook(state.editingId, book);
      state.selectedId = saved ? saved.id : state.editingId;
      showToast(`Guardado: ${book.title}`);
    } else {
      // Añadir: POST crea un libro nuevo
      const created = await backend().createBook(book);
      if (created) state.selectedId = created.id;
      showToast(`Añadido: ${book.title}`);
    }
    resetForm();
    await loadBooks();
  } catch (err) {
    if (err.status === 0) showBanner(err.message);
    showFormErrors(err);
  } finally {
    $('submit-btn').disabled = false;
  }
}

// ---------- Avisos ----------

function showBanner(message) {
  $('connection-message').textContent = message;
  $('connection-banner').hidden = false;
}

function hideBanner() {
  $('connection-banner').hidden = true;
}

let toastTimer;
function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function setDemoMode(on) {
  state.demo = on;
  $('demo-mode').checked = on;
  state.page = 1;
  state.selectedId = null;
  resetForm();
  loadBooks();
}

// ---------- Registro de peticiones HTTP ----------

let logCount = 0;
function logRequest({ method, path, status, demo }) {
  const time = new Date().toLocaleTimeString('es-ES');
  const family = String(status)[0]; // "2", "4", "5" o "0"
  let readablePath = path;
  try { readablePath = decodeURIComponent(path); } catch { /* se deja tal cual */ }

  const item = document.createElement('li');
  item.innerHTML = `
    <span class="time">${time}</span>
    <span class="method">${method}</span>
    <span class="path">${escapeHtml(readablePath)}${demo ? ' <em>(demo)</em>' : ''}</span>
    <span class="status-code s${family}">${status === 0 ? 'sin conexión' : status}</span>`;
  $('request-log').prepend(item); // la más reciente arriba

  logCount++;
  $('log-count').textContent = `(${logCount})`;
}

api.onRequest = logRequest;

// ---------- Conectar los eventos ----------

// Al escribir en la búsqueda esperamos un poco para no lanzar
// una petición por cada letra ("debounce")
let searchTimer;
for (const id of ['f-q', 'f-genre']) {
  $(id).addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.page = 1; loadBooks(); }, 350);
  });
}
for (const id of ['f-available', 'f-sort', 'f-order', 'f-limit']) {
  $(id).addEventListener('change', () => { state.page = 1; loadBooks(); });
}
$('filters').addEventListener('submit', (e) => e.preventDefault());

$('prev-btn').addEventListener('click', () => { state.page--; loadBooks(); });
$('next-btn').addEventListener('click', () => { state.page++; loadBooks(); });

// Pulsar un lomo selecciona el libro (o lo deselecciona si ya lo estaba)
$('shelf').addEventListener('click', (event) => {
  const spine = event.target.closest('.spine');
  if (!spine) return;
  const book = state.books.find((b) => sameId(b.id, spine.dataset.id));
  state.selectedId = book && !sameId(book.id, state.selectedId) ? book.id : null;
  renderShelf();
  renderDetail();
  // Al volver a pintar la estantería se pierde el foco: lo devolvemos al mismo lomo
  const again = $('shelf').querySelector(`.spine[data-id="${CSS.escape(spine.dataset.id)}"]`);
  if (again) again.focus();
});

$('detail').addEventListener('click', handleDetailAction);
$('book-form').addEventListener('submit', handleSubmit);
$('cancel-btn').addEventListener('click', resetForm);

$('demo-mode').addEventListener('change', (e) => setDemoMode(e.target.checked));
$('banner-demo-btn').addEventListener('click', () => setDemoMode(true));
$('clear-log-btn').addEventListener('click', () => {
  $('request-log').innerHTML = '';
  logCount = 0;
  $('log-count').textContent = '';
});

// ---------- Arranque ----------
loadBooks();
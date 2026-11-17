// ============================================================
// app.js — Lógica de la página
// ------------------------------------------------------------
// Lee lo que hace el usuario (formularios, botones), llama a la
// API y pinta los resultados. No sabe nada de HTTP: eso lo hace
// api.js.
// ============================================================

// ---------- Estado de la página ----------
const state = {
  page: 1,
  totalPages: 1,
  books: [],       // libros de la página actual
  pagination: null, // datos de paginación que devuelve la API
  editingId: null, // id del libro que se está editando (o null)
  demo: false,     // true = usar demoApi en lugar de la API real
};

// Devuelve la API que toca usar según el modo
function backend() {
  return state.demo ? demoApi : api;
}

// Atajo para document.getElementById
const $ = (id) => document.getElementById(id);

// Evita que un título como "<b>Hola</b>" se interprete como HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// ---------- Cargar y pintar el listado ----------

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
  $('list-status').textContent = 'Cargando…';
  try {
    const result = await backend().listBooks(currentFilters());
    state.books = result.data;
    state.pagination = result.pagination;
    state.totalPages = result.pagination.totalPages;
    renderBooks(result);
    hideBanner();
  } catch (err) {
    state.books = [];
    renderBooks(null);
    $('list-status').textContent = '';
    if (err.status === 0) showBanner(err.message);
    else $('list-status').textContent = `Error ${err.status}: ${err.message}`;
  }
}

function renderBooks(result) {
  const body = $('books-body');

  if (!result || result.data.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="empty">${result ? 'No hay libros que coincidan con los filtros.' : 'Sin datos.'}</td></tr>`;
  } else {
    body.innerHTML = result.data.map((book) => `
      <tr class="${book.id === state.editingId ? 'editing' : ''}">
        <td class="title">${escapeHtml(book.title)}</td>
        <td>${escapeHtml(book.author)}</td>
        <td>${book.year}</td>
        <td>${escapeHtml(book.genre || '—')}</td>
        <td><span class="tag ${book.available ? 'yes' : 'no'}">${book.available ? 'Disponible' : 'Prestado'}</span></td>
        <td class="row-actions">
          <button class="btn-link" data-action="toggle" data-id="${book.id}">${book.available ? 'Prestar' : 'Devolver'}</button>
          <button class="btn-link" data-action="edit" data-id="${book.id}">Editar</button>
          <button class="btn-link danger" data-action="delete" data-id="${book.id}">Borrar</button>
        </td>
      </tr>`).join('');
  }

  if (result) {
    const { page, totalPages, total } = result.pagination;
    $('list-status').textContent = `${total} libro${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`;
    $('page-info').textContent = `Página ${page} de ${totalPages}`;
  } else {
    $('page-info').textContent = '';
  }
  $('prev-btn').disabled = !result || state.page <= 1;
  $('next-btn').disabled = !result || state.page >= state.totalPages;
}

// ---------- Formulario: crear y editar ----------

function readForm() {
  const book = {
    title: $('title').value.trim(),
    author: $('author').value.trim(),
    year: $('year').value === '' ? undefined : Number($('year').value),
    available: $('available').checked,
  };
  // Los campos opcionales solo se envían si tienen valor
  if ($('genre').value.trim()) book.genre = $('genre').value.trim();
  if ($('isbn').value.trim()) book.isbn = $('isbn').value.trim();
  return book;
}

function fillForm(book) {
  $('book-id').value = book.id;
  $('title').value = book.title;
  $('author').value = book.author;
  $('year').value = book.year;
  $('genre').value = book.genre || '';
  $('isbn').value = book.isbn || '';
  $('available').checked = book.available;
}

function resetForm() {
  $('book-form').reset();
  $('available').checked = true;
  state.editingId = null;
  $('form-title').textContent = 'Añadir libro';
  $('submit-btn').textContent = 'Guardar';
  $('cancel-btn').hidden = true;
  showFormErrors(null);
}

function startEditing(book) {
  state.editingId = book.id;
  fillForm(book);
  $('form-title').textContent = 'Editar libro';
  $('submit-btn').textContent = 'Guardar cambios';
  $('cancel-btn').hidden = false;
  showFormErrors(null);
  $('title').focus();
  renderBooks({ data: state.books, pagination: state.pagination }); // resalta la fila
}

function showFormErrors(err) {
  const box = $('form-errors');
  if (!err) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  const details = err.details && err.details.length
    ? `<ul>${err.details.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`
    : '';
  box.innerHTML = `<strong>Error ${err.status || ''}</strong> ${escapeHtml(err.message)}${details}`;
  box.hidden = false;
}

async function handleSubmit(event) {
  event.preventDefault(); // evita que el navegador recargue la página
  const book = readForm();
  $('submit-btn').disabled = true;

  try {
    if (state.editingId) {
      // Editar: PUT reemplaza el libro completo con los datos del formulario
      await backend().replaceBook(state.editingId, book);
    } else {
      // Crear: POST añade un libro nuevo
      await backend().createBook(book);
    }
    resetForm();
    await loadBooks();
  } catch (err) {
    showFormErrors(err);
    if (err.status === 0) showBanner(err.message);
  } finally {
    $('submit-btn').disabled = false;
  }
}

// ---------- Acciones de cada fila ----------

async function handleRowAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.dataset.id;
  const book = state.books.find((b) => String(b.id) === id);
  if (!book) return;

  try {
    if (button.dataset.action === 'edit') {
      startEditing(book);
      return;
    }

    if (button.dataset.action === 'toggle') {
      // PATCH: solo cambiamos un campo
      await backend().updateBook(id, { available: !book.available });
    }

    if (button.dataset.action === 'delete') {
      if (!confirm(`¿Borrar "${book.title}"?`)) return;
      await backend().deleteBook(id);
      if (state.editingId === id) resetForm();
      // Si borramos el último libro de una página, volvemos a la anterior
      if (state.books.length === 1 && state.page > 1) state.page--;
    }

    await loadBooks();
  } catch (err) {
    if (err.status === 0) showBanner(err.message);
    else alert(`Error ${err.status}: ${err.message}`);
  }
}

// ---------- Aviso de conexión y modo demo ----------

function showBanner(message) {
  $('connection-message').textContent = message;
  $('connection-banner').hidden = false;
}

function hideBanner() {
  $('connection-banner').hidden = true;
}

function setDemoMode(on) {
  state.demo = on;
  $('demo-mode').checked = on;
  state.page = 1;
  resetForm();
  loadBooks();
}

// ---------- Registro de peticiones HTTP ----------

function logRequest({ method, path, status, demo }) {
  const time = new Date().toLocaleTimeString('es-ES');
  const family = String(status)[0]; // "2", "4", "5" o "0"
  const statusText = status === 0 ? 'sin conexión' : status;
  // En la URL los acentos viajan codificados ("ñ" → "%C3%B1"); aquí los mostramos legibles
  let readablePath = path;
  try { readablePath = decodeURIComponent(path); } catch { /* se deja tal cual */ }

  const item = document.createElement('li');
  item.innerHTML = `
    <span class="time">${time}</span>
    <span class="method">${method}</span>
    <span class="path">${escapeHtml(readablePath)}${demo ? ' <em>(demo)</em>' : ''}</span>
    <span class="status s${family}">${statusText}</span>`;
  $('request-log').prepend(item); // la más reciente arriba
}

api.onRequest = logRequest;

// ---------- Conectar los eventos ----------

// Al escribir en la búsqueda, esperamos un poco para no lanzar
// una petición por cada letra ("debounce")
let searchTimer;
$('f-q').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.page = 1; loadBooks(); }, 350);
});
$('f-genre').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.page = 1; loadBooks(); }, 350);
});
for (const id of ['f-available', 'f-sort', 'f-order', 'f-limit']) {
  $(id).addEventListener('change', () => { state.page = 1; loadBooks(); });
}
$('filters').addEventListener('submit', (e) => e.preventDefault());

$('prev-btn').addEventListener('click', () => { state.page--; loadBooks(); });
$('next-btn').addEventListener('click', () => { state.page++; loadBooks(); });

$('book-form').addEventListener('submit', handleSubmit);
$('cancel-btn').addEventListener('click', () => { resetForm(); loadBooks(); });
$('books-body').addEventListener('click', handleRowAction);

$('demo-mode').addEventListener('change', (e) => setDemoMode(e.target.checked));
$('banner-demo-btn').addEventListener('click', () => setDemoMode(true));
$('clear-log-btn').addEventListener('click', () => { $('request-log').innerHTML = ''; });

// ---------- Arranque ----------
loadBooks();

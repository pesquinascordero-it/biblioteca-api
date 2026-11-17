// ============================================================
// demo-api.js — Servidor de mentira, solo para el modo demo
// ------------------------------------------------------------
// Imita las respuestas de la API real para que puedas ver la
// página funcionando antes de tener tu backend. Los datos viven
// en una variable y se pierden al recargar la página.
//
// Cuando tengas tu backend, este archivo deja de usarse (basta
// con desmarcar "Modo demo").
// ============================================================

const demoBooks = [
  ['Cien años de soledad', 'Gabriel García Márquez', 1967, 'Novela', true],
  ['Don Quijote de la Mancha', 'Miguel de Cervantes', 1605, 'Novela', true],
  ['La sombra del viento', 'Carlos Ruiz Zafón', 2001, 'Misterio', false],
  ['Rayuela', 'Julio Cortázar', 1963, 'Novela', true],
  ['El nombre de la rosa', 'Umberto Eco', 1980, 'Misterio', true],
  ['Ficciones', 'Jorge Luis Borges', 1944, 'Relatos', true],
  ['1984', 'George Orwell', 1949, 'Ciencia ficción', true],
  ['Fahrenheit 451', 'Ray Bradbury', 1953, 'Ciencia ficción', false],
  ['Clean Code', 'Robert C. Martin', 2008, 'Programación', true],
  ['El principito', 'Antoine de Saint-Exupéry', 1943, 'Infantil', true],
  ['La casa de los espíritus', 'Isabel Allende', 1982, 'Novela', true],
  ['Pedro Páramo', 'Juan Rulfo', 1955, 'Novela', true],
].map(([title, author, year, genre, available], i) => {
  const date = new Date(Date.now() - (12 - i) * 86400000).toISOString();
  return { id: `demo-${i + 1}`, title, author, year, genre, available, createdAt: date, updatedAt: date };
});

let demoNextId = demoBooks.length + 1;

// Simula una respuesta HTTP: un pequeño retraso, un código de estado y datos
function demoRespond(method, path, status, data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      api.onRequest({ method, path, status, demo: true });
      if (status >= 400) reject(new ApiError(status, data.message, data.details));
      else resolve(data);
    }, 150);
  });
}

function demoValidate(book, partial) {
  const errors = [];
  const required = ['title', 'author', 'year'];
  for (const field of required) {
    if (!partial && (book[field] === undefined || book[field] === '')) errors.push(`'${field}' es obligatorio`);
  }
  if (book.year !== undefined && !Number.isInteger(book.year)) errors.push("'year' debe ser un número entero");
  if (Number.isInteger(book.year) && book.year > new Date().getFullYear()) errors.push("'year' no puede ser futuro");
  return errors;
}

const demoApi = {
  listBooks(params) {
    const path = `/books?${new URLSearchParams(params)}`;
    let result = [...demoBooks];

    if (params.q) {
      const q = params.q.toLowerCase();
      result = result.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    }
    if (params.genre) result = result.filter((b) => (b.genre || '').toLowerCase() === params.genre.toLowerCase());
    if (params.available) result = result.filter((b) => String(b.available) === params.available);

    const dir = params.order === 'desc' ? -1 : 1;
    const key = params.sort || 'title';
    result.sort((a, b) => (typeof a[key] === 'number' ? a[key] - b[key] : String(a[key]).localeCompare(String(b[key]))) * dir);

    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const total = result.length;
    return demoRespond('GET', path, 200, {
      data: result.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  },

  createBook(book) {
    const errors = demoValidate(book, false);
    if (errors.length) return demoRespond('POST', '/books', 400, { message: 'Datos del libro no válidos', details: errors });
    const now = new Date().toISOString();
    const created = { id: `demo-${demoNextId++}`, available: true, ...book, createdAt: now, updatedAt: now };
    demoBooks.push(created);
    return demoRespond('POST', '/books', 201, created);
  },

  replaceBook(id, book) {
    const path = `/books/${id}`;
    const index = demoBooks.findIndex((b) => b.id === id);
    if (index === -1) return demoRespond('PUT', path, 404, { message: `No existe ningún libro con id '${id}'` });
    const errors = demoValidate(book, false);
    if (errors.length) return demoRespond('PUT', path, 400, { message: 'Datos del libro no válidos', details: errors });
    const old = demoBooks[index];
    demoBooks[index] = { id, available: true, ...book, createdAt: old.createdAt, updatedAt: new Date().toISOString() };
    return demoRespond('PUT', path, 200, demoBooks[index]);
  },

  updateBook(id, data) {
    const path = `/books/${id}`;
    const book = demoBooks.find((b) => b.id === id);
    if (!book) return demoRespond('PATCH', path, 404, { message: `No existe ningún libro con id '${id}'` });
    Object.assign(book, data, { updatedAt: new Date().toISOString() });
    return demoRespond('PATCH', path, 200, book);
  },

  deleteBook(id) {
    const path = `/books/${id}`;
    const index = demoBooks.findIndex((b) => b.id === id);
    if (index === -1) return demoRespond('DELETE', path, 404, { message: `No existe ningún libro con id '${id}'` });
    demoBooks.splice(index, 1);
    return demoRespond('DELETE', path, 204, null);
  },
};

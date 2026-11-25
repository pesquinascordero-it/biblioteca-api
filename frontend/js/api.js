// ============================================================
// api.js — Comunicación con el backend
// ------------------------------------------------------------
// Todas las peticiones HTTP de la página pasan por aquí.
// Si algún día cambia la dirección del servidor, solo hay que
// tocar API_URL.
// ============================================================

// En tu ordenador, la API está en localhost:3000.
// Publicada, está en el mismo sitio que la página, así que no hace falta poner dirección.
const API_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:')
  ? 'http://localhost:3000'
  : '';

// Error con el código de estado y los detalles que devuelve la API
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;   // 0 = no se pudo conectar
    this.details = details; // lista de errores de validación (si la hay)
  }
}

const api = {
  // La página asigna aquí una función para enterarse de cada petición
  // (la usa para pintar el registro de "Peticiones HTTP").
  onRequest: () => { },

  // Función genérica: envía una petición y devuelve el JSON de la respuesta
  async request(method, path, body) {
    const options = { method, headers: {} };

    // Solo POST, PUT y PATCH llevan cuerpo en JSON
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(API_URL + path, options);
    } catch {
      // fetch solo falla así cuando no hay respuesta: servidor apagado o bloqueo CORS
      this.onRequest({ method, path, status: 0 });
      throw new ApiError(0, `No se puede conectar con la API en ${API_URL}. ¿Está el servidor arrancado?`);
    }

    this.onRequest({ method, path, status: response.status });

    // Una respuesta 204 (No Content) no tiene cuerpo
    const text = await response.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }

    // response.ok es true para los códigos 200-299
    if (!response.ok) {
      const err = data && data.error ? data.error : {};
      throw new ApiError(response.status, err.message || `Error ${response.status}`, err.details);
    }

    return data;
  },

  // ---- Un método por cada endpoint de la API ----

  listBooks(params) {
    // Convierte { page: 1, genre: 'novela' } en "?page=1&genre=novela"
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== '' && value !== undefined && value !== null) query.set(key, value);
    }
    return this.request('GET', `/books?${query}`);
  },

  getBook(id) { return this.request('GET', `/books/${encodeURIComponent(id)}`); },
  createBook(book) { return this.request('POST', '/books', book); },
  replaceBook(id, book) { return this.request('PUT', `/books/${encodeURIComponent(id)}`, book); },
  updateBook(id, data) { return this.request('PATCH', `/books/${encodeURIComponent(id)}`, data); },
  deleteBook(id) { return this.request('DELETE', `/books/${encodeURIComponent(id)}`); },
};
# Contrato de la API

Este documento describe **qué tiene que hacer el backend** para que el frontend funcione. Es tu guía mientras lo programas: el frontend ya está hecho y espera exactamente estas rutas y estos formatos.

- Dirección: `http://localhost:3000` (se cambia en `frontend/js/api.js`, en `API_URL`)
- Todo se envía y se recibe en **JSON**.

---

## Un libro

```json
{
  "id": "a1b2c3",
  "title": "Rayuela",
  "author": "Julio Cortázar",
  "year": 1963,
  "genre": "Novela",
  "isbn": "9788437604572",
  "available": true,
  "createdAt": "2026-11-16T10:00:00.000Z",
  "updatedAt": "2026-11-16T10:00:00.000Z"
}
```

| Campo       | Lo envía… | Reglas                                   |
|-------------|-----------|------------------------------------------|
| `id`        | servidor  | único; lo generas tú al crear el libro   |
| `title`     | cliente   | obligatorio, texto no vacío              |
| `author`    | cliente   | obligatorio, texto no vacío              |
| `year`      | cliente   | obligatorio, número entero, no futuro    |
| `genre`     | cliente   | opcional, texto                          |
| `isbn`      | cliente   | opcional, texto                          |
| `available` | cliente   | opcional, `true`/`false`; por defecto `true` |
| `createdAt` | servidor  | fecha de creación                        |
| `updatedAt` | servidor  | fecha de la última modificación          |

---

## Endpoints

### `GET /books` — listar

Parámetros opcionales en la URL (todos los envía el frontend):

| Parámetro   | Ejemplo        | Qué hace                                  |
|-------------|----------------|-------------------------------------------|
| `q`         | `q=sombra`     | busca en título y autor                   |
| `genre`     | `genre=Novela` | solo ese género                           |
| `available` | `available=true` | solo disponibles (`true`) o prestados (`false`) |
| `sort`      | `sort=year`    | `title`, `author`, `year` o `createdAt`   |
| `order`     | `order=desc`   | `asc` o `desc`                            |
| `page`      | `page=2`       | página (empieza en 1)                     |
| `limit`     | `limit=10`     | libros por página                         |

Respuesta **200**:

```json
{
  "data": [ { "...un libro..." }, { "...otro libro..." } ],
  "pagination": { "page": 1, "limit": 10, "total": 12, "totalPages": 2 }
}
```

### `GET /books/:id` — ver uno
**200** con el libro, o **404** si no existe.

### `POST /books` — crear
Cuerpo: los campos del cliente. Respuesta **201** con el libro creado (ya con `id`, `createdAt` y `updatedAt`). **400** si los datos no son válidos.

### `PUT /books/:id` — reemplazar
El frontend lo usa al pulsar *Editar* y guardar. Cuerpo: el libro completo. **200** con el libro actualizado, **400** si los datos no son válidos, **404** si no existe.

### `PATCH /books/:id` — modificar algunos campos
El frontend lo usa en *Prestar* / *Devolver* y envía solo `{ "available": false }`. **200** con el libro actualizado, **404** si no existe.

### `DELETE /books/:id` — borrar
**204** sin cuerpo, o **404** si no existe.

---

## Errores

Cuando algo va mal, responde con el código adecuado y este cuerpo. El frontend muestra `message` y la lista `details`:

```json
{
  "error": {
    "status": 400,
    "message": "Datos del libro no válidos",
    "details": ["'author' es obligatorio", "'year' debe ser un número entero"]
  }
}
```

---

## ⚠️ CORS: lo primero que te vas a encontrar

El frontend se abre desde un archivo (`file://...`) o desde otro puerto, y el backend está en `http://localhost:3000`. Por seguridad, el navegador **bloquea** las peticiones entre orígenes distintos salvo que el servidor diga que las permite. Ese mecanismo se llama **CORS**.

Si ves en la consola del navegador (F12) un error con la palabra *CORS*, es esto. La solución es que tu servidor:

1. Añada estas cabeceras a **todas** sus respuestas:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
   Access-Control-Allow-Headers: Content-Type
   ```
2. Responda **204** a las peticiones con método `OPTIONS`. Antes de un `POST`, `PUT`, `PATCH` o `DELETE` con JSON, el navegador envía un `OPTIONS` de comprobación (la *preflight request*) para preguntar si tiene permiso.

---

## Orden recomendado para programarlo

Puedes ir comprobando cada paso con la página (desmarcando *Modo demo*):

1. Servidor que arranca en el puerto 3000 y responde algo.
2. CORS (cabeceras + `OPTIONS`).
3. `GET /books` devolviendo una lista fija → ya verás libros en la página.
4. `POST /books` guardando en un array en memoria.
5. `DELETE /books/:id`.
6. `PATCH /books/:id` → funcionan *Prestar* / *Devolver*.
7. `PUT /books/:id` → funciona *Editar*.
8. Filtros, ordenación y paginación en `GET /books`.
9. Validación y errores (`400`, `404`).

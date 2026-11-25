# 📚 Biblioteca — API REST con Node.js

**🌐 Demo en vivo: [biblioteca.pabloesquinas.es](https://biblioteca.pabloesquinas.es)**

API REST para gestionar los libros de una biblioteca, hecha con **Node.js sin frameworks** (solo el módulo `http` nativo). Incluye una página web que la consume para crear, consultar, editar, prestar y borrar libros.

Es un proyecto de aprendizaje: programé el backend desde cero para entender cómo funciona HTTP por dentro (rutas, métodos, códigos de estado, cabeceras y CORS) sin que un framework lo haga por mí. Después lo desplegué en un servidor Linux propio.

## Tecnologías

- **Backend:** JavaScript, Node.js (módulo `http`)
- **Frontend:** HTML, CSS y JavaScript
- **Despliegue:** VPS Debian, Caddy, systemd y un script de despliegue en Bash
- **Control de versiones:** Git y GitHub

## Funcionalidades

- **CRUD completo** de libros: crear, listar, editar, modificar parcialmente y borrar.
- **Filtros** por disponibilidad y por género.
- **Búsqueda** por título o autor.
- **Ordenación** por título, autor o año, ascendente o descendente.
- **Paginación** con número de página y libros por página.
- **Validación** de datos: título y autor obligatorios, y año entero que no sea futuro.
- **Gestión de errores:** el servidor responde con el código adecuado y no se cae si recibe datos mal formados.
- **CORS** configurado, incluidas las peticiones *preflight* (`OPTIONS`).

## Cómo ejecutarlo en local

Requisitos: [Node.js](https://nodejs.org) 20 o superior. No hace falta instalar dependencias.

```bash
git clone https://github.com/pesquinascordero-it/biblioteca-api.git
cd biblioteca-api
node backend/server.js
```

El servidor queda escuchando en `http://localhost:3000` (se puede cambiar con la variable de entorno `PORT`).

Para usar la página, abre `frontend/index.html` en el navegador (o con la extensión Live Server de VS Code) y desmarca **Modo demo**.

> Los datos se guardan en memoria: al reiniciar el servidor se vuelve a los libros de ejemplo.

## Despliegue

La aplicación está publicada en un VPS Linux (Debian) que también aloja mi portfolio:

```
biblioteca.pabloesquinas.es
        │
      Caddy  (HTTPS automático)
        ├── /books*  →  API de Node.js en el puerto 3001 (servicio de systemd)
        └── resto    →  archivos del frontend en /var/www/biblioteca
```

- **Caddy** recibe las visitas, gestiona el certificado HTTPS y reparte las peticiones.
- **systemd** mantiene la API siempre encendida y la vuelve a arrancar si se cae o si se reinicia el servidor.
- **`deploy.sh`** automatiza las actualizaciones. Cada vez que subo cambios a GitHub, ejecuto en el servidor:

```bash
bash /root/biblioteca-api/deploy.sh
```

El script:
1. baja los últimos cambios del repositorio (`git pull`);
2. copia el frontend a la carpeta que sirve Caddy;
3. reinicia el servicio de la API;
4. comprueba que la API responde y avisa si algo ha fallado.

## Endpoints

| Método   | Ruta          | Descripción                          | Respuesta |
|----------|---------------|--------------------------------------|-----------|
| `GET`    | `/books`      | Lista los libros (con filtros)       | `200`     |
| `POST`   | `/books`      | Crea un libro                        | `201`     |
| `PUT`    | `/books/:id`  | Sustituye un libro entero            | `200`     |
| `PATCH`  | `/books/:id`  | Modifica parte de un libro           | `200`     |
| `DELETE` | `/books/:id`  | Borra un libro                       | `204`     |

### Parámetros de `GET /books`

| Parámetro   | Ejemplo            | Qué hace                                  |
|-------------|--------------------|-------------------------------------------|
| `available` | `?available=false` | Solo disponibles (`true`) o prestados (`false`) |
| `genre`     | `?genre=novela`    | Filtra por género (sin distinguir mayúsculas) |
| `q`         | `?q=borges`        | Busca en el título o el autor             |
| `sort`      | `?sort=year`       | Ordena por `title`, `author` o `year`     |
| `order`     | `?order=desc`      | `asc` (por defecto) o `desc`              |
| `page`      | `?page=2`          | Página que se quiere ver (desde 1)        |
| `limit`     | `?limit=5`         | Libros por página (por defecto, 10)       |

Se pueden combinar: `/books?genre=novela&available=true&sort=year&page=1&limit=5`

Prueba la API publicada: [biblioteca.pabloesquinas.es/books](https://biblioteca.pabloesquinas.es/books)

Respuesta:

```json
{
  "data": [
    { "id": 1, "title": "Rayuela", "author": "Julio Cortázar", "year": 1963, "genre": "Novela", "available": true }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### Ejemplo: crear un libro

```bash
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Los detectives salvajes","author":"Roberto Bolaño","year":1998,"genre":"Novela"}'
```

## Errores

Todos los errores tienen el mismo formato:

```json
{ "error": { "message": "El título es obligatorio" } }
```

| Código | Cuándo                                                        |
|--------|---------------------------------------------------------------|
| `400`  | Faltan datos, el año no es válido o el JSON está mal formado  |
| `404`  | El libro o la ruta no existen                                 |

## Estructura

```
backend/
└── server.js       # la API: rutas, filtros, validación y respuestas
frontend/
├── index.html      # la página (una estantería con los libros)
├── styles.css
└── js/
    ├── api.js      # peticiones HTTP a la API
    ├── app.js      # lógica de la página
    └── demo-api.js # datos de prueba para usar la página sin servidor
API.md              # contrato entre frontend y backend
deploy.sh           # script de despliegue en el servidor
```

## Qué he aprendido

- Cómo viaja una petición HTTP: método, ruta, parámetros, cabeceras y cuerpo.
- Usar los códigos de estado correctos (`200`, `201`, `204`, `400`, `404`).
- Leer el cuerpo de una petición por partes y convertirlo con `JSON.parse`.
- Qué es CORS y por qué el navegador envía una petición `OPTIONS` antes de un `POST`.
- Validar los datos de entrada y proteger el servidor con `try`/`catch`.
- Filtrar, ordenar y paginar una lista con `filter`, `sort` y `slice`.
- Desplegar en un servidor Linux: SSH, variables de entorno, servicios de systemd, Caddy como proxy inverso con HTTPS y un script de despliegue en Bash.

## Próximos pasos

- [ ] Guardar los datos en una base de datos (SQLite o PostgreSQL).
- [ ] Separar el código en varios archivos (rutas, validación, datos).
- [ ] Añadir pruebas automáticas de los endpoints.
- [ ] Automatizar el despliegue con GitHub Actions al hacer `push`.
- [ ] Rehacer la API con Express y comparar.
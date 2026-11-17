// Importamos el módulo HTTP que trae Node de serie
const http = require('node:http');

// Puerto donde escuchará el servidor
const PORT = 3000;

// Lista de libros (escrito a mano)
const books = [
    { id: 1, title: 'Rayuela', author: 'Julio Cortázar', year: 1963, genre: 'Novela', available: true },
    { id: 2, title: 'Ficciones', author: 'Jorge Luis Borges', year: 1944, genre: 'Relatos', available: true },
];

// Número que tendrá el próximo libro que se cree
let nextId = 3;

// Creamos el servidor. Esta función se ejecuta CADA VEZ que llega una petición.
//   req (request)  = la petición que nos llega
//   res (response) = la respuesta que vamos a devolver
const server = http.createServer((req, res) => {
    // Mostramos en la terminal qué nos han pedido
    console.log(`${req.method} ${req.url}`);

    // Permiso para que la página pueda leer nuestras respuestas
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Si el navegador pregunta si puede enviar datos (OPTIONS), le decimos que sí
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.writeHead(204);
        res.end();
        return;
    }

    // Separamos la ruta (/books) de los filtros (?page=1...)
    const url = new URL(req.url, 'http://localhost');

    // Si piden LEER los libros (GET /books), respondemos con la lista
    if (req.method === 'GET' && url.pathname === '/books') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            data: books,
            pagination: { page: 1, limit: 10, total: books.length, totalPages: 1 },
        }));
        return;
    }

    // Si piden GUARDAR un libro (POST /books)
    if (req.method === 'POST' && url.pathname === '/books') { //es un post la peticion? a /books?
        let body = ''; //creamos una variable que se llama body que de momento está vacía

        // 1. Cada vez que llega un trozo del libro, lo vamos juntando
        req.on('data', (trozo) => { //cada vez que lleguen 'datos' de esta peticion haz...
            body += trozo; // haz...pega el 'trozo al final de lo que tenia 'body'
        });

        // 2. Cuando ya han llegado todos los trozos...
        req.on('end', () => { //cuando haya llegado todo el libro, terminamos (el parentesis vacio es que ya no llegan mas trozos)
            const newBook = JSON.parse(body); //el libro le ha llegado en formato texto, esta linea convierte el texto en un objeto y lo guarda en la variable. con el objeto si podemos trabajar
            newBook.id = nextId; //añadimos un campo id al libro, con valor nexId
            nextId++; //sumale 1 al id del siguiente libro
            books.push(newBook); //añade al final de la lista de books el nuevo libro

            // Respondemos 201 (creado) y devolvemos el libro guardado
            res.writeHead(201, { 'Content-Type': 'application/json' }); //preparamos la respuesta con dos cosas. codigo 201 (creado), y la etiqueta que avisa de lo que va dentro del JSON
            res.end(JSON.stringify(newBook)); //convertimos de objeto a texto, y res.end lo envía y cierra la respuesta
        });

        return;
    }

    // Si piden BORRAR un libro (DELETE /books/2)
    if (req.method === 'DELETE' && url.pathname.startsWith('/books/')) {
        // Sacamos el id de la ruta: '/books/2' → '2'
        const id = url.pathname.split('/')[2];

        // Buscamos en qué posición de la lista está ese libro
        const position = books.findIndex((book) => String(book.id) === id); // Busca el libro con ese id en "books" y guarda en "position" en qué lugar está (-1 si no existe)

        // Si no existe, respondemos 404
        if (position === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Libro no encontrado' }));
            return;
        }

        // Lo quitamos de la lista y respondemos 204 (hecho, sin contenido)
        books.splice(position, 1); //quita el elemento que este en la posicion que hemos visto antes de la lista
        res.writeHead(204);
        res.end();
        return;
    }

    // Si piden MODIFICAR parte de un libro (PATCH /books/1)
    if (req.method === 'PATCH' && url.pathname.startsWith('/books/')) {
        // Sacamos el id de la ruta y buscamos ese libro
        const id = url.pathname.split('/')[2];
        const book = books.find((b) => String(b.id) === id); //Mira los libros uno por uno y devuélveme el libro cuyo id coincide con el que busco. te dice el libro no donde esta como findIndex

        // Si no existe, respondemos 404
        if (!book) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Libro no encontrado' }));
            return;
        }

        // Leemos los cambios que envía la página (igual que en el POST)
        let body = '';
        req.on('data', (trozo) => {
            body += trozo;
        });

        req.on('end', () => {
            const changes = JSON.parse(body);   // ej: { available: false }
            Object.assign(book, changes);       // aplicamos los cambios al libro

            // Respondemos 200 con el libro ya modificado
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(book));
        });

        return;
    }

    // Si piden SUSTITUIR un libro entero (PUT /books/1)
    if (req.method === 'PUT' && url.pathname.startsWith('/books/')) {
        // Sacamos el id y buscamos en qué posición está (como en el DELETE)
        const id = url.pathname.split('/')[2];
        const position = books.findIndex((b) => String(b.id) === id);

        if (position === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Libro no encontrado' }));
            return;
        }

        // Leemos el libro nuevo que envía la página (como en el POST)
        let body = '';
        req.on('data', (trozo) => {
            body += trozo;
        });

        req.on('end', () => {
            const updatedBook = JSON.parse(body);
            updatedBook.id = books[position].id;   // conserva el mismo id que tenía
            books[position] = updatedBook;         // sustituye el libro viejo por el nuevo

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(updatedBook));
        });

        return;
    }

    // Si no ha coincidido ninguna ruta, respondemos 404 (no encontrado)
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

// Arrancamos el servidor y nos quedamos esperando peticiones
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
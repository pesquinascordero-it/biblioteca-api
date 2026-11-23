// Importamos el módulo HTTP que trae Node de serie
const http = require('node:http');

// Puerto donde escuchará el servidor: el que digan al arrancar, o el 3000 por defecto
const PORT = process.env.PORT || 3000;

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
    // Si piden LEER los libros (GET /books), respondemos con la lista
    if (req.method === 'GET' && url.pathname === '/books') {
        // Empezamos con todos los libros
        let result = [...books]; //creamos una copia de la lista de trabajo y la llamamos result y empieza con todos los libros. ponemos let por que va a ir cambiando

        // Filtro de disponibilidad (?available=true o ?available=false)
        const available = url.searchParams.get('available'); //lee el parametro available de la URL y lo guarda en una variable que se llama available
        if (available === 'true') { //si elegimos available = true...
            result = result.filter((b) => b.available === true); // nos quedamos con los libros cuyo available = true
        }
        if (available === 'false') {
            result = result.filter((b) => b.available === false); //lo mismo pero nos quedamos con los libros que tienen available = false. filter lo que haces es mirar libro a libro (b) y se queda con los que cumplen la condicion
        }

        const genre = url.searchParams.get('genre');
        if (genre) {
            result = result.filter((b) => (b.genre || '').toLowerCase() === genre.toLowerCase()); //si han escrito un género, quédate solo con los libros cuyo género sea igual a ese. to lowercase para que lea minuscula tambien
        }

        const q = url.searchParams.get('q');
        if (q) {
            const text = q.toLowerCase();
            result = result.filter((b) => b.title.toLowerCase().includes(text) || b.author.toLowerCase().includes(text));
        }

        const sort = url.searchParams.get('sort') || 'title'; //ordenamos por titulo/año/autor... y si no se ordena por el titulo
        const order = url.searchParams.get('order'); //ordenamos por ascendente o descendente

        result.sort((a, b) => {
            if (a[sort] < b[sort]) return -1; //a va antes 
            if (a[sort] > b[sort]) return 1; //a va despues
            return 0; //son iguales
        });

        if (order === 'desc') {
            result.reverse(); //si piden descendente le damos la vuelta
        }

        // Paginación (?page=2&limit=5)
        const page = Number(url.searchParams.get('page')) || 1;     // guardar en page qué página se pide en número, si no lo dicen, por defecto, la 1
        const limit = Number(url.searchParams.get('limit')) || 10;  // cuántos libros por página (por defecto, 10)

        const total = result.length;                    // cuántos libros hay en total , lo guarda en total que es la lista ya filtrada y ordenada
        const totalPages = Math.ceil(total / limit) || 1;  // divide el numero total de libros entre los que caben en cada pagina. math.ceil es para redondear hacia arriba si hay decimales. si no hay libros muestra al menos una pagina

        const start = (page - 1) * limit;               // desde qué posición empezamos. que libros empieza la pagina que se pide
        const pageBooks = result.slice(start, start + limit);  // cortamos solo los libros de esa página. result slide es desde - hasta


        res.writeHead(200, { 'Content-Type': 'application/json' }); //Responde 200, con la etiqueta de JSON. Igual que antes.
        res.end(JSON.stringify({ //envía la respuesta en formato texto a la página. espera los compartimentos que tiene la caja...
            data: pageBooks, // los libros que se van a filtrar y que se van a mostrar en la tabla
            pagination: { page, limit, total, totalPages }, //informacion sobre las paginas
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
            let newBook;
            try {
                newBook = JSON.parse(body);   // intentamos convertir el texto en objeto
            } catch {
                // si el texto no es JSON válido, respondemos 400 en vez de caernos
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: 'Los datos no tienen un formato JSON válido' } }));
                return;
            }

            if (!newBook.title) { //si no se escribe el titulo al crear un libro la validacion lo impide y te llega un error 400 (peticion incorrecta)
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: 'El título es obligatorio' } }));
                return;
            }

            if (!newBook.author) { //si no se escribe el autor al crear un libro la validacion lo impide y te llega un error 400 (peticion incorrecta)
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: 'El autor es obligatorio' } }));
                return;
            }

            const currentYear = new Date().getFullYear(); //coge la fecha de hoy y de esa fecha coge solo el año y lo mete a la variable
            if (!Number.isInteger(newBook.year) || newBook.year > currentYear) { //si el año no es un numero entero o es mayor que el año actual...
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: 'El año debe ser un número y no puede ser futuro' } }));
                return;
            }

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
            res.end(JSON.stringify({ error: {message: 'Libro no encontrado' } }));
            return;
        }

        // Lo quitamos de la lista y respondemos 204 (hecho, sin contenido)
        books.splice(position, 1); //quita el elemento que este en la posicion que hemos visto antes de la lista
        res.writeHead(204);
        res.end();
        return;
    }

    // Si piden MODIFICAR parte de un libro (PATCH /books/1)
    if (req.method === 'PATCH' && url.pathname.startsWith('/books/')) { //usamos startWith y no === por que detras de /books/ puede ir cualquier numero
        // Sacamos el id de la ruta y buscamos ese libro
        const id = url.pathname.split('/')[2]; // cortamos por trzos la url y nos quedamos con la posicion 2 que es la del numero /.../numero (pos 2)
        const book = books.find((b) => String(b.id) === id); //Mira los libros uno por uno (los va metiendo en b) y devuélve el libro cuyo id coincide con el que busco. te dice el libro no donde esta como findIndex

        // Si no existe, respondemos 404
        if (!book) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: {message: 'Libro no encontrado' } }));
            return;
        }

        // Leemos los cambios que envía la página (igual que en el POST)
        let body = ''; //creamos una variable body vacia, donde iremos metiendo lo que envíe la página
        req.on('data', (trozo) => {
            body += trozo; //cada vez que llegue un trozo del libro lo iremos metiendo a body
        });

        req.on('end', () => { //cuando haya llegado todo...
            let changes;
            try {
                changes = JSON.parse(body);
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: 'Los datos no tienen un formato JSON válido' } }));
                return;
            }
            Object.assign(book, changes);       // aplicamos los cambios al libro

            // Respondemos 200 con el libro ya modificado
            res.writeHead(200, { 'Content-Type': 'application/json' }); //convierte el libro (que es un objeto) en texto, porque por la red solo viaja texto. Es lo contrario de JSON.parse.
            res.end(JSON.stringify(book));//nvía ese texto a la página y cierra la respuesta. la pagina recibe: {"id":1,"title":"Rayuela",...,"available":false}
        });

        return;
    }

    // Si piden SUSTITUIR un libro entero (PUT /books/1)
    if (req.method === 'PUT' && url.pathname.startsWith('/books/')) {
        // Sacamos el id y buscamos en qué posición está (como en el DELETE)
        const id = url.pathname.split('/')[2];
        const position = books.findIndex((b) => String(b.id) === id); //Mira los libros uno por uno (los mete en b) y devuélve el numero de la pos cuyo id coincide con el que busco.

        if (position === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: {message: 'Libro no encontrado' } }));
            return;
        }

        // Leemos el libro nuevo que envía la página (como en el POST)
        let body = ''; //cremaos body que esta vacio para meter trozos (esta vez los trozos no es un mensaje, es el libro)
        req.on('data', (trozo) => {
            body += trozo;
        });

        req.on('end', () => { //cuando llega al final...
            let updatedBook;
            try {
                updatedBook = JSON.parse(body);
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: 'Los datos no tienen un formato JSON válido' } }));
                return;
            }

            if (!updatedBook.title) { //si no se escribe el titulo al crear un libro la validacion lo impide y te llega un error 400 (peticion incorrecta)
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: 'El título es obligatorio' } }));
                return;
            }

            if (!updatedBook.author) { //si no se escribe el autor al crear un libro la validacion lo impide y te llega un error 400 (peticion incorrecta)
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: 'El autor es obligatorio' } }));
                return;
            }

            const currentYear = new Date().getFullYear(); //coge la fecha de hoy y de esa fecha coge solo el año y lo mete a la variable
            if (!Number.isInteger(updatedBook.year) || updatedBook.year > currentYear) { //si el año no es un numero entero o es mayor que el año actual...
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: 'El año debe ser un número y no puede ser futuro' } }));
                return;
            }

            updatedBook.id = books[position].id;   // conserva el mismo id que tenía el libro antiguo
            books[position] = updatedBook;         // sustituye el libro viejo por el nuevo

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(updatedBook));
        });

        return;
    }

    // Si no ha coincidido ninguna ruta, respondemos 404 (no encontrado)
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: {message:'Ruta no encontrada' } }));
});

// Arrancamos el servidor y nos quedamos esperando peticiones
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
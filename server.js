const express = require('express');
const exphbs = require('express-handlebars');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const PORT = 8080;

let products = [];
let carts = [];

app.use(express.json());

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

const productsRouter = express.Router();
const cartsRouter = express.Router();

productsRouter.get('/', (req, res) => {
    res.json(products);
});

productsRouter.get('/:pid', (req, res) => {
    const productId = req.params.pid;
    const product = products.find(p => p.id === productId);
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ error: 'Producto no encontrado' });
    }
});

productsRouter.post('/', (req, res) => {
    const newProduct = {
        id: uuidv4(),
        ...req.body
    };
    products.push(newProduct);
    io.emit('createProduct', newProduct);
    res.json(newProduct);
});

productsRouter.put('/:pid', (req, res) => {
    const productId = req.params.pid;
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex !== -1) {
        products[productIndex] = {
            ...products[productIndex],
            ...req.body
        };
        res.json(products[productIndex]);
    } else {
        res.status(404).json({ error: 'Producto no encontrado' });
    }
});

productsRouter.delete('/:pid', (req, res) => {
    const productId = req.params.pid;
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex !== -1) {
        const deletedProduct = products.splice(productIndex, 1)[0];
        io.emit('deleteProduct', deletedProduct.id);
        res.json({ message: 'Producto eliminado exitosamente' });
    } else {
        res.status(404).json({ error: 'Producto no encontrado' });
    }
});

app.use('/api/products', productsRouter);

cartsRouter.get('/:cid', (req, res) => {
    const cartId = req.params.cid;
    const cart = carts.find(c => c.id === cartId);
    if (cart) {
        res.json(cart.products);
    } else {
        res.status(404).json({ error: 'Carrito no encontrado' });
    }
});

cartsRouter.post('/:cid/product/:pid', (req, res) => {
    const cartId = req.params.cid;
    const productId = req.params.pid;
    const quantity = parseInt(req.body.quantity) || 1;
    const cartIndex = carts.findIndex(c => c.id === cartId);
    const productIndex = products.findIndex(p => p.id === productId);
    if (cartIndex !== -1 && productIndex !== -1) {
        const existingProductIndex = carts[cartIndex].products.findIndex(p => p.id === productId);
        if (existingProductIndex !== -1) {
            carts[cartIndex].products[existingProductIndex].quantity += quantity;
        } else {
            carts[cartIndex].products.push({ id: productId, quantity });
        }
        res.json({ message: 'Producto agregado al carrito exitosamente' });
    } else {
        res.status(404).json({ error: 'Carrito o producto no encontrado' });
    }
});

cartsRouter.post('/', (req, res) => {
    const newCart = {
        id: uuidv4(),
        products: []
    };
    carts.push(newCart);
    res.json(newCart);
});

app.use('/api/carts', cartsRouter);

const io = require('socket.io')(server);

io.on('connection', socket => {
    console.log('Nuevo cliente conectado');
    socket.emit('updateProducts', products);
    socket.on('createProduct', product => {
        products.push(product);
        io.emit('updateProducts', products);
    });
    socket.on('deleteProduct', productId => {
        products = products.filter(product => product.id !== productId);
        io.emit('updateProducts', products);
    });
});

app.get('/', (req, res) => {
    res.render('home', { products });
});

app.get('/realtimeproducts', (req, res) => {
    res.render('realTimeProducts', { products });
});

server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

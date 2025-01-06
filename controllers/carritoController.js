const Carrito = require('../services/carritoServicio');
const productoService = require('../services/productoServicio');

function obtenerCarrito(req) {
    if (!req.session.carrito) {
        req.session.carrito = new Carrito();
    } else if (!(req.session.carrito instanceof Carrito)) {
        const carritoData = req.session.carrito;
        req.session.carrito = new Carrito();
        req.session.carrito.productos = carritoData.productos;
        req.session.carrito.total = carritoData.total;
    }
} 

const getCarrito = (req, res) => {
    obtenerCarrito(req);
    const carrito = req.session.carrito || { productos: [], total: 0 };
    const error = req.session.errores || null;

    res.render('carrito', { carrito, error });
};

const agregarProductoAlCarrito = async (req, res) => {
    try {
        obtenerCarrito(req);

        const producto = await productoService.obtenerProductoPorId(req.params.id);
        if (!producto) {
            return res.status(404).send('Producto no encontrado');
        }
        req.session.carrito.agregarProducto(producto, 1);
        req.session.save(() => {
            res.redirect('/comprador/carrito');
        });
    } catch (error) {
        console.error('Error al agregar producto al carrito:', error);
        res.status(500).json({ message: 'Error al agregar producto al carrito.' });
    }
};

const actualizarProductoEnCarrito = async (req, res) => {
    obtenerCarrito(req);

    const cantidad = parseInt(req.body.cantidad, 10); 
    if (isNaN(cantidad) || cantidad < 1) {
        return res.status(400).json({ message: 'Cantidad inválida' });
    }
    //validar stock
    const producto = await productoService.obtenerProductoPorId(req.params.id);
    if (cantidad > producto.inventario) {
        if (!req.session.errores) {
            req.session.errores = {};
        }
        req.session.errores[req.params.id] = `Cantidad ${cantidad} supera el stock disponible (${producto.inventario})`;
        return res.redirect('/comprador/carrito');
    }

    // Si no hay errores, elimina errores previos del producto
    if (req.session.errores) {
        delete req.session.errores[req.params.id];
        if (Object.keys(req.session.errores).length === 0) {
            delete req.session.errores;
        }
    }

    req.session.carrito.actualizarProducto(req.params.id, cantidad);
    req.session.error = null;
    req.session.save(() => {
        res.redirect('/comprador/carrito'); 
    });
};

const eliminarProductoDelCarrito = (req, res) => {
    obtenerCarrito(req); 
    req.session.carrito.eliminarProducto(req.params.id);
    req.session.save(() => {
        res.redirect('/comprador/carrito'); 
    });
};

const vaciarCarrito = (req, res) => {
    obtenerCarrito(req); 
    req.session.carrito.vaciarCarrito();
    req.session.save(() => {
        res.redirect('/comprador/carrito'); 
    });
};

module.exports = {
    getCarrito,
    agregarProductoAlCarrito,
    actualizarProductoEnCarrito,
    eliminarProductoDelCarrito,
    vaciarCarrito
}
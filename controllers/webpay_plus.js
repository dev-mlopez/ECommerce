const { WebpayPlus } = require('transbank-sdk');
const asyncHandler = require('../utils/asyncHandler');
const productoService = require('../services/productoServicio');
const nodemailer = require("nodemailer");

// Crear Transacción
exports.create = asyncHandler(async function (req, res) {
  req.session.carrito.productos.forEach(async producto => {
    const { id, cantidad } = producto;

    const inventario = await productoService.consultarInventario(id, cantidad);

    if (inventario === null) {
      res.redirect('/comprador/carrito');
    }
  })

  let fechaActual = new Date();
  let fecha = fechaActual.toISOString().split('T')[0];
  let buyOrder = 'OC' + '-' + fecha + '-' + Math.floor(Math.random() * 100)
  let sessionId = 'S-' + Math.floor(Math.random() * 100000000);
  let amount = req.session.carrito.total;
  let returnUrl = `${req.protocol}://${req.get('host')}/webpay_plus/commit`;

  let productos = req.session.carrito.productos;

  const createResponse = await new WebpayPlus.Transaction().create(
    buyOrder,
    sessionId,
    amount,
    returnUrl
  );

  res.render('webpay_plus/create', {
    token: createResponse.token,
    url: createResponse.url,
    buyOrder,
    sessionId,
    amount,
    productos
  });
});

// Confirmar Transacción
exports.commit = asyncHandler(async function (req, res) {
  const token = req.query.token_ws || req.body.token_ws;

  if (!token) {
    return res.status(400).send('Token no recibido');
  }

  const commitResponse = await new WebpayPlus.Transaction().commit(token);

  
  if (commitResponse.status === 'AUTHORIZED') {
    let productos = "";

    for (const producto of req.session.carrito.productos) {
      const { id, cantidad } = producto;
    
      await productoService.descontarInventario(id, cantidad);
    
      productos += `
        <li>
          Producto: ${producto.nombre} - Precio: ${producto.precio} - Cantidad: ${producto.cantidad}
        </li>
      `;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.FROM_EMAIL,
        pass: process.env.FROM_EMAIL_PASSWORD
      }
    })

    const correo = req.session.user.correo;

    const mensaje = `
      <p> Orden de Compra:
        <span>
          ${commitResponse.buy_order}
        </span>
      </p>
      <p> Session ID:
        <span>
          ${commitResponse.session_id}
        </span>
      </p>
      <ul> Productos:
        ${productos}
      </ul>
      <p> Monto:
        <span>
          $ ${commitResponse.amount}
        </span>
      </p>
    `;

    const email = {
      from: process.env.FROM_EMAIL,
      to: correo,
      subject: "Confirmacion de compra",
      html: mensaje,
    };

    try {
      const info = await transporter.sendMail(email);
      console.log('Correo enviado: ', info.response);
    } catch (error) {
      console.log('Error: ', error);
    }
  };

  res.render('webpay_plus/commit', {
    token,
    commitResponse,
  });
});

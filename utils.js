import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isSeller: user.isSeller,
    },
    process.env.JWT_SECRET || "somethingsecret",
    {
      expiresIn: "30d",
    }
  );
};

export const isAuth = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (authorization) {
    const token = authorization.slice(7, authorization.length); // Bearer XXXXXX
    jwt.verify(
      token,
      process.env.JWT_SECRET || "somethingsecret",
      (err, decode) => {
        if (err) {
          res.status(401).send({ message: "Invalid Token" });
        } else {
          req.user = decode;
          next();
        }
      }
    );
  } else {
    res.status(401).send({ message: "No Token" });
  }
};

export const isAuthTurn = (req, res, next) => {
  const authorization = req.body.headers.Authorization;

  if (authorization) {
    const token = authorization.slice(7, authorization.length); // Bearer XXXXXX
    jwt.verify(
      token,
      process.env.JWT_SECRET || "somethingsecret",
      (err, decode) => {
        if (err) {
          res.status(401).send({ message: "Invalid Token" });
        } else {
          req.user = decode;
          next();
        }
      }
    );
  } else {
    res.status(401).send({ message: "No Token" });
  }
};
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401).send({ message: "Invalid Admin Token" });
  }
};
export const isSeller = (req, res, next) => {
  if (req.user && req.user.isSeller) {
    next();
  } else {
    res.status(401).send({ message: "Invalid Seller Token" });
  }
};
export const isSellerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.isSeller || req.user.isAdmin)) {
    next();
  } else {
    res.status(401).send({ message: "Invalid Admin/Seller Token" });
  }
};

// export const mailgun = () =>
//   mg({
//     apiKey: process.env.MAILGUN_API_KEY,
//     domain: process.env.MAILGUN_DOMIAN,
//   });

// export const payOrderEmailTemplate = (order) => {
//   return `<h1>Thanks for shopping with us</h1>
//   <p>
//   Hi ${order.user.name},</p>
//   <p>We have finished processing your order.</p>
//   <h2>[Order ${order._id}] (${order.createdAt.toString().substring(0, 10)})</h2>
//   <table>
//   <thead>
//   <tr>
//   <td><strong>Product</strong></td>
//   <td><strong>Quantity</strong></td>
//   <td><strong align="right">Price</strong></td>
//   </thead>
//   <tbody>
//   ${order.orderItems
//     .map(
//       (item) => `
//     <tr>
//     <td>${item.name}</td>
//     <td align="center">${item.qty}</td>
//     <td align="right"> $${item.price.toFixed(2)}</td>
//     </tr>
//   `
//     )
//     .join("\n")}
//   </tbody>
//   <tfoot>
//   <tr>
//   <td colspan="2">Items Price:</td>
//   <td align="right"> $${order.itemsPrice.toFixed(2)}</td>
//   </tr>
//   <tr>
//   <td colspan="2">Tax Price:</td>
//   <td align="right"> $${order.taxPrice.toFixed(2)}</td>
//   </tr>
//   <tr>
//   <td colspan="2">Shipping Price:</td>
//   <td align="right"> $${order.shippingPrice.toFixed(2)}</td>
//   </tr>
//   <tr>
//   <td colspan="2"><strong>Total Price:</strong></td>
//   <td align="right"><strong> $${order.totalPrice.toFixed(2)}</strong></td>
//   </tr>
//   <tr>
//   <td colspan="2">Payment Method:</td>
//   <td align="right">${order.paymentMethod}</td>
//   </tr>
//   </table>
//   <h2>Shipping address</h2>
//   <p>
//   ${order.shippingAddress.fullName},<br/>
//   ${order.shippingAddress.address},<br/>
//   ${order.shippingAddress.city},<br/>
//   ${order.shippingAddress.country},<br/>
//   ${order.shippingAddress.postalCode}<br/>
//   </p>
//   <hr/>
//   <p>
//   Thanks for shopping with us.
//   </p>
//   `;
// };

export const orderHandlerIsPad = async (orderId, status, email) => {
  const order = await Order.findById(orderId).populate("user", "email name");
  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      orderId,
      status,
      email,
      //update_time: req.body.update_time,
      //email_address: req.body.email_address,
    };
    const updatedOrder = await order.save();

    res.send({ message: "Order Paid", order: updatedOrder });
  } else {
    res.status(404).send({ message: "Order Not Found" });
  }
};

export const random = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

// export const sendMailForgotPassword = async (req, res) => {
//   if (req.body.email == "") {
//     res.status(400).send({
//       message: "email is required",
//     });
//   }
//   try {
//     const user = await User.findOne({
//       where: { email: req.body.email },
//     });

//     if (!user) {
//       return res.status(403).send({
//         message: "email not found",
//       });
//     }

//     const token = jwt.sign(
//       { _id: user._id },
//       process.env.JWT_SECRET || "somethingsecret",
//       { expiresIn: "1d" }
//     );
//     user.update({
//       tokenResetPassword: token,
//     });

//     const transporter = nodemailer.createTransport({
//       host: "smtp.gmail.com",
//       port: 465,
//       secure: true,
//       auth: {
//         user: "ep3977752@gmail.com",
//         pass: process.env.KEY_NODEMAILER,
//       },
//     });

//     const emailPort = process.env.PORT || "http://localhost:5000";

//     const mailOptions = {
//       from: "Remitente",
//       to: user.email,
//       subject: "Enlace para recuperar su cuenta en Calyaan.com",
//       text: `${emailPort}/api/users/resetPassword/${user._id}/${token}, `,
//     };

//     transporter.sendMail(mailOptions, (err, info) => {
//       if (err) {
//         console.log(err);
//       } else {
//         console.log("Email enviado");
//         res.status(200).json("email to recover account has been sent");
//       }
//     });
//   } catch (error) {
//     res.status(500).send({
//       message: "an error occurred",
//     });
//   }
// };

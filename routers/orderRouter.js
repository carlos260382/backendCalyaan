import express from "express";
import expressAsyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Service from "../models/serviceModel.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import webpush from "web-push";
import axios from "axios";
import { isAdmin, isAuth, isSellerOrAdmin, random } from "../utils.js";

dotenv.config();

const orderRouter = express.Router();

orderRouter.get(
  "/",
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const seller = req.query.seller || "";
    const sellerFilter = seller ? { seller } : {};

    const orders = await Order.find({ ...sellerFilter }).populate(
      "user",
      "name"
    );
    console.log("orders", orders);
    res.send(orders);
  })
);

orderRouter.get(
  "/professional/:id",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log("idseller", req);
    const orders = await Order.find({ seller: id });
    console.log("orders", orders);
    res.send(orders);
  })
);

orderRouter.get(
  "/summary",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.aggregate([
      {
        $group: {
          _id: null,
          numOrders: { $sum: 1 },
          totalSales: { $sum: "$totalPrice" },
        },
      },
    ]);
    const users = await User.aggregate([
      {
        $group: {
          _id: null,
          numUsers: { $sum: 1 },
        },
      },
    ]);
    const dailyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          sales: { $sum: "$totalPrice" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const serviceCategories = await Service.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);
    res.send({ users, orders, dailyOrders, serviceCategories });
  })
);

orderRouter.get(
  "/mine",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id });
    res.send(orders);
  })
);

orderRouter.post(
  "/",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    if (req.body.orderItems.length === 0) {
      res.status(400).send({ message: "Cart is empty" });
    } else {
      const order = new Order({
        seller: req.body.orderItems[0].seller,
        orderItems: req.body.orderItems,
        shippingAddress: req.body.shippingAddress,
        paymentMethod: req.body.paymentMethod,
        itemsPrice: req.body.itemsPrice,
        shippingPrice: req.body.shippingPrice,
        taxPrice: req.body.taxPrice,
        totalPrice: req.body.totalPrice,
        user: req.user._id,
        userPoints: req.body.userPoints,
        userfatherId: req.body.userfatherId,
      });

      const createdOrder = await order.save();
      res
        .status(201)
        .send({ message: "New Order Created", order: createdOrder });
    }
  })
);

orderRouter.get(
  "/:id",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      res.send(order);
    } else {
      res.status(404).send({ message: "Order Not Found" });
    }
  })
);

orderRouter.put("/:id/pay", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "email name"
    );

    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      // order.paymentResult = {
      //   id: req.body.id,
      //   status: req.body.status,
      //   update_time: req.body.update_time,
      //   email_address: req.body.email_address,
      // };
      const updatedOrder = await order.save();
      res.send({ message: "Order Paid", order: updatedOrder });
      const userEmail = order.user.email;

      const user = await User.findOne({ email: userEmail });
      if (user) {
        user.pointsUser = order.itemsPrice * 0.05 + user.pointsUser;
      }
      await user.save();

      const userFather = await User.findById(order.userfatherId);

      if (userFather) {
        userFather.pointsUser = order.itemsPrice * 0.05 + userFather.pointsUser;
      }
      await userFather.save();

      const seller = await User.findById(order.seller);

      // const turn = await Turn.findById(order.turnId);

      // ----------- Envio por WHATSAPP ----------------------

      try {
        const sendWhatsApp = await axios.post(
          "http://44.201.159.167:3001/received",
          // "https://sendwhatsapp2.herokuapp.com/received",
          // "http://localhost:3001/received",
          //"https://sendmessagewhatsapp.herokuapp.com/received",
          {
            body: {
              // from: "573128596420@c.us",
              // body: "servicio solicitado",
              from: "57" + seller.phone,
              body: `Fue confirmado el servicio ${order.orderItems[0].name}, para el dia ${order.turn.day}, hora ${order.turn.hour}, en la direccion ${order.shippingAddress.address}, el codigo de seguridad para presentar al cliente es ${order.turn.keyCode}, recuerde marcarlo como realizado una vez finalice la actividad`,
            },
          }
        );
      } catch (error) {
        console.log("este es el error", error);
      }

      // *-------Envio Norificacion Push-----------

      const payload = JSON.stringify({
        title: "Servicio Confirmado",
        message: `Fue confirmado el servicio ${order.orderItems[0].name}, para el dia ${order.turn.day}, hora ${order.turn.hour}, en la direccion ${order.shippingAddress.address}, el codigo de seguridad para presentar al cliente es ${order.turn.keyCode}`,
        vibrate: [100, 50, 100],
      });
      webpush.setVapidDetails(
        "mailto:andres260382@gmail.com",
        process.env.PUBLIC_API_KEY_WEBPUSH,
        process.env.PRIVATE_API_KEY_WEBPUSH
      );
      try {
        await webpush.sendNotification(seller.subscription, payload);
        // res.status(200).json();
      } catch (error) {
        console.log("No se pudo enviar la notificacion");
      }

      // const transporter = nodemailer.createTransport({
      //   host: "smtp.gmail.com",
      //   port: 465,
      //   secure: true,
      //   auth: {
      //     user: "calyaan.com@gmail.com",
      //     pass: process.env.KEY_NODEMAILER,
      //   },
      // });

      // const mailOptions = {
      //   from: "Remitente",
      //   to: order.user.email,
      //   subject: "pago exitoso",
      //   text: `¡Gracias ${order.user.name}, has realizado el pago de tu servicio exitosamente`,
      // };

      // await transporter.sendMail(mailOptions, (err, info) => {
      //   if (err) {
      //     console.log(err);
      //   } else {
      //     console.log("Email enviado");
      //   }
      // });
    } else {
      res.status(404).send({ message: "Order Not Found" });
    }
  } catch (error) {
    console.log("error send email pay order", error);
  }
});

orderRouter.delete(
  "/:id",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      const deleteOrder = await order.remove();
      res.send({ message: "Order Deleted", order: deleteOrder });
    } else {
      res.status(404).send({ message: "Order Not Found" });
    }
  })
);

orderRouter.put(
  "/:id/deliver",
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();

      const updatedOrder = await order.save();
      res.send({ message: "Order Delivered", order: updatedOrder });

      // *-------Envio Norificacion Push-----------

      if (createdTurn) {
        const userAdmin = await User.find({
          isAdmin: true,
        });

        const payload = JSON.stringify({
          title: "Servicio Realizado",
          message: `Fue realizado el servicio ${order.orderItems[0].name}`,
          vibrate: [100, 50, 100],
        });

        try {
          await webpush.setVapidDetails(
            "mailto:andres260382@gmail.com",
            process.env.PUBLIC_API_KEY_WEBPUSH,
            process.env.PRIVATE_API_KEY_WEBPUSH
          );
          await webpush.sendNotification(userAdmin.subscription, payload);
          // res.status(200).json();
        } catch (error) {
          console.log("No se pudo enviar la notificacion", error);
          res.status(400).send(error).json();
        }
      }
    } else {
      res.status(404).send({ message: "Order Not Found" });
    }
  })
);

orderRouter.put(
  "/:id/update",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      if (order.totalPrice >= req.body.points.points) {
        order.totalPrice = order.totalPrice - req.body.points.points;
        order.userPoints = order.userPoints - req.body.points.points;
        const updatedOrder = await order.save();
        const user = await User.findById(req.body.points.userId);
        if (user) {
          user.pointsUser = user.pointsUser - req.body.points.points;
          const updatedUser = await user.save();

          res.send({
            order: updatedOrder,
            user: updatedUser,
          });
        }
      }
    } else {
      res.status(404).send({ message: "Order Not Found" });
    }
  })
);
// Crea el turno
orderRouter.put(
  "/:id/turn",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const keyCode = random(100000, 999999);
    console.log("body", req.body);
    const order = await Order.findById(req.params.id);
    if (order) {
      if (req.body.length === 0) {
        res.status(400).send({ message: "No hay turno creado" });
      } else {
        const { day, hour, status } = req.body;

        order.turn.day = day;
        order.turn.hour = hour;
        order.turn.keyCode = keyCode;
        order.turn.status = status;

        const updatedOrder = await order.save();

        res.send({
          order: updatedOrder,
        });
      }

      if (updatedOrder) {
        const userSeller = await User.find({
          isSeller: true,
        });

        let count = 0;
        while (count <= userSeller.length - 1) {
          console.log("categorys seller", userSeller[count].seller.category);

          for (let j = 0; j < order.orderItems.length; j++) {
            if (
              userSeller[count].seller.category.includes(
                order.orderItems[j].category
              )
            ) {
              console.log("se envia el mensaje whatsApp a", userSeller[count]);

              // ---------------SEND WHATSAPP ------------
              try {
                await axios.post(
                  //"https://botwhatsapp4.herokuapp.com/received",
                  "http://44.201.159.167:3001/received",
                  // "http://localhost:3001/received",

                  {
                    body: {
                      // from: "573128596420@c.us",
                      // body: "servicio solicitado",
                      from: "57" + userSeller[count].phone,
                      body: `🚨 NUEVO SERVICIO 🚨 ${order.orderItems[j].name}, ${order.orderItems[j].price}, dirección ${order.shippingAddress.address}, para el dia ${order.turn.day} a las ${order.turn.hour} para aceptar el servicio ingrese a la sesión "Turnos Pendientes" https://www.calyaan.com.co (este es mensaje de prueba💻)`,
                    },
                  }
                );
                console.log(
                  "mensaje enviado al numero",
                  userSeller[count].phone
                );
              } catch (error) {
                console.log("The message was not sent by whatsapp");
              }
              webpush.setVapidDetails(
                "mailto:andres260382@gmail.com",
                process.env.PUBLIC_API_KEY_WEBPUSH,
                process.env.PRIVATE_API_KEY_WEBPUSH
              );
              if (
                Object.keys(userSeller[count].subscription.endpoint).length ===
                1
              ) {
                count++;
                continue;
              } else {
                const payload = JSON.stringify({
                  title: "Servicio solicitado",
                  message: `acaban de solicitar el servicio ${order.orderItems[j].name}, ${order.orderItems[j].price}`,
                  vibrate: [100, 50, 100],
                });
                try {
                  await webpush.sendNotification(
                    userSeller[count].subscription,
                    payload
                  );
                  // res.status(200).json();
                  console.log("web push enviado");
                  count++;
                } catch (error) {
                  count++;
                  console.log("The message was not sent by webpush");
                  // res.status(400).send(error).json();
                }
              }
            }
          }
          count++;
        }
      }
    } else {
      res.status(404).send({ message: "Order Not Found" });
    }
  })
);

export default orderRouter;

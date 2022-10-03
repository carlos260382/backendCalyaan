import express from "express";
import expressAsyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Service from "../models/serviceModel.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import webpush from "web-push";
import axios from "axios";
import { isAdmin, isAuth, isSellerOrAdmin } from "../utils.js";
import Turn from "../models/turnModel.js";

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

      const turn = await Turn.findById(order.turnId);

      // ----------- Envio por WHATSAPP ----------------------

      try {
        const sendWhatsApp = await axios.post(
          "https://sendwhatsapp2.herokuapp.com/received",
          // "http://localhost:3001/received",
          // "https://sendmessagewhatsapp.herokuapp.com/received",
          {
            body: {
              // from: "573128596420@c.us",
              // body: "servicio solicitado",
              from: "57" + seller.phone + "@c.us",
              body: `Fue confirmado el servicio ${order.orderItems[0].name}, para el dia ${turn.day}, hora ${turn.hour}, en la direccion ${turn.address}, el codigo de seguridad para presentar al cliente es ${turn.keyCode}, recuerde marcarlo como realizado una vez finalice la actividad`,
            },
          }
        );
      } catch (error) {
        console.log("este es el error", error);
      }

      // *-------Envio Norificacion Push-----------

      const payload = JSON.stringify({
        title: "Servicio Confirmado",
        message: `Fue confirmado el servicio ${order.orderItems[0].name}`,
        vibrate: [100, 50, 100],
      });

      try {
        await webpush.setVapidDetails(
          "mailto:andres260382@gmail.com",
          process.env.PUBLIC_API_KEY_WEBPUSH,
          process.env.PRIVATE_API_KEY_WEBPUSH
        );
        await webpush.sendNotification(seller.subscription, payload);
        // res.status(200).json();
      } catch (error) {
        console.log("No se pudo enviar la notificacion", error);
        res.status(400).send(error).json();
      }

      // const transporter = nodemailer.createTransport({
      //   host: "smtp.gmail.com",
      //   port: 465,
      //   secure: true,
      //   auth: {
      //     user: "ep3977752@gmail.com",
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
export default orderRouter;

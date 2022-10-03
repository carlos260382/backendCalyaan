import express from "express";
import expressAsyncHandler from "express-async-handler";
import Turn from "../models/turnModel.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import User from "../models/userModel.js";
import webpush from "web-push";
import axios from "axios";
import {
  isAdmin,
  isAuth,
  isSellerOrAdmin,
  random,
  isAuthTurn,
} from "../utils.js";

import Order from "../models/orderModel.js";
dotenv.config();

const turnRouter = express.Router();

turnRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    try {
      let turns = await Turn.find();
      res.json(turns);
    } catch (error) {
      res.send(error);
    }
  })
);

turnRouter.post(
  "/",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const keyCode = random(100000, 999999);
      if (req.body.length === 0) {
        res.status(400).send({ message: "No hay turno creado" });
      } else {
        const {
          service,
          day,
          seller,
          hour,
          status,
          orderId,
          user,
          country,
          postalCode,
          city,
          address,
          fullName,
          emailUser,
          phoneUser,
        } = req.body;
        const turn = new Turn({
          day: day,
          hour: hour,
          seller: seller,
          status: status,
          orderId: orderId,
          user: user,
          fullName: fullName,
          emailUser: emailUser,
          phoneUser: phoneUser,
          address: address,
          city: city,
          postalCode: postalCode,
          country: country,
          service: service,
          keyCode: keyCode,
        });
        const createdTurn = await turn.save();

        res
          .status(201)
          .send({ message: "New Turn Created", turn: createdTurn });

        if (createdTurn) {
          const userSeller = await User.find({
            isSeller: true,
          });

          // ----------SEND WHATSAPP ------------

          try {
            for (let i = 0; i < userSeller.length; i++) {
              const sendWhatsApp = await axios.post(
                "https://sendwhatsapp2.herokuapp.com/received",
                // "http://localhost:3001/received",
                // "https://sendmessagewhatsapp.herokuapp.com/received",
                {
                  body: {
                    // from: "573128596420@c.us",
                    // body: "servicio solicitado",
                    from: "57" + userSeller[i].phone + "@c.us",
                    body: `acaban de solicitar el servicio ${turn.service[0].name}, ${turn.service[0].price}, en la siguiente dirección ${turn.address}, para aceptar el servicio ingrese a la sesión "Turnos" https://calyaanwp.netlify.app`,
                  },
                }
              );
            }
          } catch (error) {
            console.log("este es el error", error);
          }

          // *-------Envio Norificacion Push-----------

          const payload = JSON.stringify({
            title: "Servicio solicitado",
            message: `acaban de solicitar el servicio ${turn.service[0].name}, ${turn.service[0].price}`,
            vibrate: [100, 50, 100],
          });

          try {
            for (let i = 0; i < userSeller.length; i++) {
              webpush.setVapidDetails(
                "mailto:andres260382@gmail.com",
                process.env.PUBLIC_API_KEY_WEBPUSH,
                process.env.PRIVATE_API_KEY_WEBPUSH
              );
              await webpush.sendNotification(
                userSeller[i].subscription,
                payload
              );
              // res.status(200).json();
            }
          } catch (error) {
            console.log("No se pudo enviar la notificacion", error);
            res.status(400).send(error).json();
          }
        }
      }
    } catch (error) {
      console.log(error);
      res.status(404).alert("turno no fue creado", error);
    }
  })
);

turnRouter.put(
  "/:id",
  isAuthTurn,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const turn = await Turn.findById(req.params.id);
    // console.log("el turno q llega body", req.body.Turn);
    // console.log("el turno q llega params", req.params);
    if (turn) {
      turn.status = true;

      const updatedTurn = await turn.save();
      res.send({
        message: "Turno Aceptado",
        Turn: updatedTurn,
      });

      const order = await Order.findById(turn.orderId);

      if (order) {
        order.seller = req.body.Turn.seller;
        order.turnId = req.params.id;
        const updatedOrder = await order.save();
      }

      // console.log("order modifi", order);

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
              from: "57" + turn.phoneUser + "@c.us",
              body: `¡Señor ${turn.fullName}, le informamos que ha sido aceptado el turno para su servicio, por el profesional ${req.body.Turn.name}, puede realizar el pago para finalizar el pedido`,
            },
          }
        );
      } catch (error) {
        console.log("este es el error", error);
      }

      // ---------------> Envio EMAIL---------------------->

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: "ep3977752@gmail.com",
          pass: process.env.KEY_NODEMAILER,
        },
      });

      const mailOptions = {
        from: "Remitente",
        to: turn.emailUser,
        subject: "Turno Aceptado",
        text: `¡Señor ${turn.fullName}, le informamos que ha sido aceptado el turno para su servicio, por el profesional ${req.body.Turn.name}, puede realizar el pago para confirmar el pedido`,
        html: `
              <p>¡Señor ${turn.fullName}, le informamos que ha sido aceptado el turno para su servicio, por el profesional ${req.body.Turn.name}, puede realizar el pago para confirmar el pedido</p>
              <img src=${req.body.Turn.img} width: "10" height: "10">
              `,
      };

      await transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Email enviado a cliente confirmando aceptacion Turno");
        }
      });

      // *-------Envio Norificacion Push-----------

      const user = await User.findById(turn.user);

      const payload = JSON.stringify({
        title: "Servicio Aprobado",
        message: `por el profesional ${req.body.Turn.name}, en su correo recibira los detalles para realizar el pago`,
        vibrate: [100, 50, 100],
      });

      try {
        await webpush.setVapidDetails(
          "mailto:andres260382@gmail.com",
          process.env.PUBLIC_API_KEY_WEBPUSH,
          process.env.PRIVATE_API_KEY_WEBPUSH
        );
        await webpush.sendNotification(user.subscription, payload);
        console.log("Notificación push enviada");
        // res.status(200).json();
      } catch (error) {
        console.log("No se pudo enviar la notificacion", error);
        res.status(400).send(error).json();
      }
    } else {
      res.status(404).send({ message: "Turn Not Found" });
    }
  })
);

turnRouter.get(
  "/:id",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orderId = req.params.id;
    try {
      const turn = await Turn.find({ orderId: orderId });
      res.json(turn);
    } catch (error) {
      res.send(error);
    }
  })
);

turnRouter.delete(
  "/:id",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const turn = await Turn.findById(req.params.id);
    if (turn) {
      const deleteTurn = await turn.remove();
      res.send({ message: "Turn Deleted", turn: deleteTurn });
    } else {
      res.status(404).send({ message: "Turn Not Found" });
    }
  })
);

export default turnRouter;

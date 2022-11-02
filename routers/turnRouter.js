import express from "express";
import expressAsyncHandler from "express-async-handler";
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
    const orders = await Order.find().populate("user", "name");
    res.send(orders);
  })
);

//crear turno
turnRouter.post(
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

        res
          .status(201)
          .send({ message: "New Turn Created", turn: updatedOrder });

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
                console.log(
                  "se envia el mensaje whatsApp a",
                  userSeller[count]
                );

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
                  Object.keys(userSeller[count].subscription.endpoint)
                    .length === 1
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
      }
    } else {
      res.status(404);
    }
  })
);

// turnRouter.post(
//   "/",
//   isAuth,
//   expressAsyncHandler(async (req, res) => {
//     try {
//       const keyCode = random(100000, 999999);
//       if (req.body.length === 0) {
//         res.status(400).send({ message: "No hay turno creado" });
//       } else {
//         const {
//           service,
//           day,
//           seller,
//           hour,
//           status,
//           orderId,
//           user,
//           country,
//           postalCode,
//           city,
//           address,
//           fullName,
//           emailUser,
//           phoneUser,
//           neighborhood,
//         } = req.body;
//         const turn = new Turn({
//           day: day,
//           hour: hour,
//           seller: seller,
//           status: status,
//           orderId: orderId,
//           user: user,
//           fullName: fullName,
//           emailUser: emailUser,
//           phoneUser: phoneUser,
//           address: address,
//           neighborhood: neighborhood,
//           city: city,
//           postalCode: postalCode,
//           country: country,
//           service: service,
//           keyCode: keyCode,
//         });
//         const createdTurn = await turn.save();

//         res
//           .status(201)
//           .send({ message: "New Turn Created", turn: createdTurn });

//         if (createdTurn) {
//           const userSeller = await User.find({
//             isSeller: true,
//           });

//           const payload = JSON.stringify({
//             title: "Servicio solicitado",
//             message: `acaban de solicitar el servicio ${turn.service[0].name}, ${turn.service[0].price}`,
//             vibrate: [100, 50, 100],
//           });
//           let count = 0;
//           while (count <= userSeller.length - 1) {
//             console.log("categorys seller", userSeller[count].seller.category);
//             // for (let i = 0; i < userSeller.length; i++) {
//             //    if (userSeller[count].phone.length != 10) {
//             //  count++;
//             //    continue;
//             //   } else {
//             for (let j = 0; j < turn.service.length; j++) {
//               if (
//                 userSeller[count].seller.category.includes(
//                   turn.service[j].category
//                 )
//               ) {
//                 console.log(
//                   "se envia el mensaje whatsApp a",
//                   userSeller[count]
//                 );

//                 console.log("turn Service", turn.service);

//                 // console.log(
//                 //   "subscriptio",
//                 //   Object.keys(userSeller[count].subscription.endpoint).length
//                 // );
//                 // ---------------SEND WHATSAPP ------------
//                 try {
//                   await axios.post(
//                     //"https://botwhatsapp4.herokuapp.com/received",
//                     "http://44.201.159.167:3001/received",
//                     // "http://localhost:3001/received",

//                     {
//                       body: {
//                         // from: "573128596420@c.us",
//                         // body: "servicio solicitado",
//                         from: "57" + userSeller[count].phone,
//                         body: `🚨 NUEVO SERVICIO 🚨 ${turn.service[j].name}, ${turn.service[j].price}, dirección ${turn.address}, para aceptar el servicio ingrese a la sesión "Turnos Pendientes" https://www.calyaan.com.co (este es mensaje de prueba💻)`,
//                       },
//                     }
//                   );
//                   console.log(
//                     "mensaje enviado al numero",
//                     userSeller[count].phone
//                   );
//                 } catch (error) {
//                   console.log("The message was not sent by whatsapp");
//                 }
//                 webpush.setVapidDetails(
//                   "mailto:andres260382@gmail.com",
//                   process.env.PUBLIC_API_KEY_WEBPUSH,
//                   process.env.PRIVATE_API_KEY_WEBPUSH
//                 );
//                 if (
//                   Object.keys(userSeller[count].subscription.endpoint)
//                     .length === 1
//                 ) {
//                   count++;
//                   continue;
//                 } else {
//                   try {
//                     await webpush.sendNotification(
//                       userSeller[count].subscription,
//                       payload
//                     );
//                     // res.status(200).json();
//                     console.log("web push enviado");
//                     count++;
//                   } catch (error) {
//                     count++;
//                     console.log("The message was not sent by webpush");
//                     // res.status(400).send(error).json();
//                   }
//                 }
//               }
//             }
//             count++;
//             //}
//           }

//           // *-------Envio Norificacion Push-----------
//           //let count = 0;
//           // while (count <= userSeller.length - 1) {
//           //   if (
//           //     Object.keys(userSeller[count].subscription.endpoint).length === 1
//           //   ) {
//           //     count++;
//           //     continue;
//           //   } else {
//           //     try {
//           //       await webpush.sendNotification(
//           //         userSeller[count].subscription,
//           //         payload
//           //       );
//           //       // res.status(200).json();
//           //       console.log("web push enviado");
//           //       count++;
//           //     } catch (error) {
//           //       count++;
//           //       console.log("The message was not sent by webpush");
//           //       // res.status(400).send(error).json();
//           //     }
//           //   }
//           // }
//         }
//       }
//       //}
//     } catch (error) {
//       console.log(error);
//       res.status(404).alert("turno no fue creado", error);
//     }
//   })
// );

turnRouter.put(
  "/:id",
  isAuthTurn,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    // console.log("el turno q llega body", req.body.Turn);
    // console.log("el turno q llega params", req.params);
    if (order) {
      order.turn.status = true;
      order.seller = req.body.Turn.seller;

      const updatedTurn = await order.save();
      res.send({
        message: "Turno Aceptado",
        Turn: updatedTurn,
      });

      const user = await User.findById(order.user);

      // ----------- Envio por WHATSAPP ----------------------
      console.log("user", user);
      try {
        const sendWhatsApp = await axios.post(
          "http://44.201.159.167:3001/received",
          //"https://sendwhatsapp2.herokuapp.com/received",
          // "http://localhost:3001/received",

          {
            body: {
              // from: "573128596420@c.us",
              // body: "servicio solicitado",
              from: "57" + user.phone,
              body: `¡Señor ${user.name}, le informamos que ha sido aceptado el turno para su servicio, por el profesional ${req.body.Turn.name}, puede realizar el pago para finalizar el pedido`,
            },
          }
        );
      } catch (error) {
        console.log("The message was not sent by whatsapp");
      }

      // ---------------> Envio EMAIL---------------------->

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: "calyaan.com@gmail.com",
          pass: process.env.KEY_NODEMAILER,
        },
      });

      const mailOptions = {
        from: "Remitente",
        to: user.email,
        subject: "Turno Aceptado",
        text: `¡Señor ${user.name}, le informamos que ha sido aceptado el turno para su servicio, por el profesional ${req.body.Turn.name}, puede realizar el pago para confirmar el pedido`,
        html: `
              <p>¡Señor ${user.name}, le informamos que ha sido aceptado el turno para su servicio, por el profesional ${req.body.Turn.name}, puede realizar el pago para confirmar el pedido</p>
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

      const payload = JSON.stringify({
        title: "Servicio Aceptado",
        message: `por el profesional ${req.body.Turn.name}, en su correo recibira los detalles para realizar el pago`,
        vibrate: [100, 50, 100],
      });

      if (Object.keys(user.subscription.endpoint).length === 1) {
        return;
      } else {
        try {
          await webpush.sendNotification(user.subscription, payload);
          // res.status(200).json();
          console.log("web push enviado");
        } catch (error) {
          console.log("The message was not sent by webpush");
          // res.status(400).send(error).json();
        }
      }
    } else {
      res.status(404).send({ message: "Turn Not Found" });
    }
  })
);

turnRouter.get(
  "/:id",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orderId = req.params.id;
    try {
      const turn = await Order.findById(orderId);
      res.json(turn);
    } catch (error) {
      res.send(error);
    }
  })
);

// PENDIENTE MODIFICAR POR NUEVA BASE DATOS ORDER
// turnRouter.delete(
//   "/:id",
//   isAuth,
//   isAdmin,
//   expressAsyncHandler(async (req, res) => {
//     const turn = await Turn.findById(req.params.id);
//     if (turn) {
//       const deleteTurn = await turn.remove();
//       res.send({ message: "Turn Deleted", turn: deleteTurn });
//     } else {
//       res.status(404).send({ message: "Turn Not Found" });
//     }
//   })
// );

export default turnRouter;

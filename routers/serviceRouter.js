import express from "express";
import expressAsyncHandler from "express-async-handler";
//import data from '../data.js';
import Service from "../models/serviceModel.js";
import User from "../models/userModel.js";
import { isAdmin, isAuth, isSellerOrAdmin } from "../utils.js";

const serviceRouter = express.Router();

serviceRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const pageSize = 6;
    const page = Number(req.query.pageNumber) || 1;
    const name = req.query.name || "";
    const category = req.query.category || "";
    const seller = req.query.seller || "";
    const order = req.query.order || "";
    const min =
      req.query.min && Number(req.query.min) !== 0 ? Number(req.query.min) : 0;
    const max =
      req.query.max && Number(req.query.max) !== 0 ? Number(req.query.max) : 0;
    const rating =
      req.query.rating && Number(req.query.rating) !== 0
        ? Number(req.query.rating)
        : 0;

    const nameFilter = name ? { name: { $regex: name, $options: "i" } } : {};
    const sellerFilter = seller ? { seller } : {};
    const categoryFilter = category ? { category } : {};
    const priceFilter = min && max ? { price: { $gte: min, $lte: max } } : {};
    const ratingFilter = rating ? { rating: { $gte: rating } } : {};
    const sortOrder =
      order === "lowest"
        ? { price: 1 }
        : order === "highest"
        ? { price: -1 }
        : order === "toprated"
        ? { rating: -1 }
        : { _id: -1 };
    const count = await Service.count({
      ...sellerFilter,
      ...nameFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
    });
    const services = await Service.find({
      ...sellerFilter,
      ...nameFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
    })

      .populate("seller", "seller.name seller.logo")
      .sort(sortOrder)
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    res.send({ services, page, pages: Math.ceil(count / pageSize) });
  })
);

serviceRouter.get(
  "/categories",
  expressAsyncHandler(async (req, res) => {
    const categories = await Service.find().distinct("category");
    res.send(categories);
  })
);

serviceRouter.get(
  "/seed",
  expressAsyncHandler(async (req, res) => {
    // await Product.remove({});

    try {
      const seller = await User.findOne({ isSeller: true });
      if (seller) {
        const services = data.service.map((servic) => ({
          ...servic,
          seller: seller._id,
        }));
        const createdService = await Service.insertMany(services);
        res.send({ createdService });
      } else {
        res
          .status(500)
          .send({ message: "No seller found. first run /api/users/seed" });
      }
    } catch (error) {
      console.log("este es el error", error);
    }
  })
);

serviceRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id).populate(
      "seller",
      "seller.name seller.logo seller.rating seller.numReviews"
    );
    if (service) {
      res.send(service);
    } else {
      res.status(404).send({ message: "service Not Found" });
    }
  })
);

serviceRouter.post(
  "/",
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const service = new Service({
      name: "servicio ejemplo " + Date.now(),
      seller: req.user._id,
      image: "/images/p1.jpg",
      price: 0,
      points: 0,
      category: "sample category",
      brand: "sample brand",
      countInStock: 0,
      rating: 0,
      numReviews: 0,
      description: "sample description",
    });
    const createdService = await service.save();
    res.send({ message: "service Created", service: createdService });
  })
);
serviceRouter.put(
  "/:id",
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const serviceId = req.params.id;
    const service = await Service.findById(serviceId);
    if (service) {
      service.name = req.body.name;
      service.price = req.body.price;
      service.points = req.body.price * 0.05;
      service.image = req.body.image;
      service.category = req.body.category;
      service.brand = req.body.brand;
      service.countInStock = req.body.countInStock;
      service.description = req.body.description;
      const updatedService = await service.save();
      res.send({ message: "Service Updated", service: updatedService });
    } else {
      res.status(404).send({ message: "service Not Found" });
    }
  })
);

serviceRouter.delete(
  "/:id",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id);
    if (service) {
      const deleteService = await service.remove();
      res.send({ message: "Service Deleted", service: deleteService });
    } else {
      res.status(404).send({ message: "Service Not Found" });
    }
  })
);

serviceRouter.post(
  "/:id/reviews",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const serviceId = req.params.id;
    const service = await Service.findById(serviceId);
    if (service) {
      if (service.reviews.find((x) => x.name === req.user.name)) {
        return res
          .status(400)
          .send({ message: "You already submitted a review" });
      }
      const review = {
        name: req.user.name,
        rating: Number(req.body.rating),
        comment: req.body.comment,
      };
      service.reviews.push(review);
      service.numReviews = service.reviews.length;
      service.rating =
        service.reviews.reduce((a, c) => c.rating + a, 0) /
        service.reviews.length;
      const updatedService = await service.save();
      res.status(201).send({
        message: "Review Created",
        review: updatedService.reviews[updatedService.reviews.length - 1],
      });
    } else {
      res.status(404).send({ message: "Service Not Found" });
    }
  })
);

export default serviceRouter;

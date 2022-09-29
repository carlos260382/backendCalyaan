import mongoose from "mongoose";
const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    comment: { type: String, required: true },
    rating: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);
const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    seller: { type: mongoose.Schema.Types.ObjectID, ref: "User" },
    image: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    points: { type: Number, required: false },
    countInStock: { type: Number, required: true },
    rating: { type: Number, required: true },
    numReviews: { type: Number, required: true },
    reviews: [reviewSchema],
  },
  {
    timestamps: true,
  }
);
const Service = mongoose.model("Service", serviceSchema);

export default Service;

// import mongoose from 'mongoose';
// const reviewSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     comment: { type: String, required: true },
//     rating: { type: Number, required: true },
//   },
//   {
//     timestamps: true,
//   }
// );
// const serviceSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, unique: true },
//     seller: { type: mongoose.Schema.Types.ObjectID, ref: 'User' },
//     image: { type: String, required: true },
//     city: { type: String, required: true },
//     category: { type: String, required: true },
//     description: { type: String, required: true },
//     price: { type: Number, required: true },
//     rating: { type: Number, },
//     numReviews: { type: Number,  },
//     reviews: [reviewSchema],
//   },
//   {
//     timestamps: true,
//   }
// );
// const Service = mongoose.model('Service', serviceSchema);

// export default Service;

import mongoose from "mongoose";

const turnSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    hour: { type: String, required: true, unique: false },
    status: { type: Boolean, default: false },
    orderId: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectID, ref: "User" },
    seller: { type: mongoose.Schema.Types.ObjectID, ref: "User" },
    fullName: { type: String, required: true },
    emailUser: { type: String, required: true },
    phoneUser: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: false },
    postalCode: { type: String, required: false },
    country: { type: String, required: true },
    keyCode: { type: Number, required: true },
    service: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    lat: Number,
    lng: Number,
  },
  {
    timestamps: true,
  }
);
const Turn = mongoose.model("Turn", turnSchema);
export default Turn;

import mongoose from "mongoose";
import { random } from "../utils.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    gender: { type: String, required: false },
    dateOfBirth: { type: String, required: false },
    password: { type: String, required: true },
    subscribed: { type: Boolean, default: false, required: true },
    isAdmin: { type: Boolean, default: false, required: true },
    isSeller: { type: Boolean, default: false, required: true },
    subscription: {
      endpoint: { type: String, default: 0, required: false },
      expirationTime: { type: String, default: 0, required: false },
      keys: {
        auth: { type: String, required: false },
        p256dh: { type: String, required: false },
      },
    },
    seller: {
      name: String,
      logo: String,
      description: String,
      category: [{ type: String, required: false }],
      rating: { type: Number, default: 0, required: true },
      numReviews: { type: Number, default: 0, required: true },
    },
    userfatherId: { type: String, required: false },
    userChildreId: [{ type: String, required: false }],
    numberPassword: {
      type: Number,
      default: random(100000, 999999),
      required: false,
    },
    phone: {
      type: String,
      required: true,
    },
    pointsUser: { type: Number, required: false },
  },
  {
    timestamps: true,
  }
);
const User = mongoose.model("User", userSchema);
export default User;

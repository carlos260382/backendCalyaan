import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subscription: {
      endpoint: { type: String, default: 0, required: false },
      expirationTime: { type: String, default: 0, required: false },
      keys: {
        auth: { type: String, required: false },
        p256dh: { type: String, required: false },
      },
    },
  },
  {
    timestamps: true,
  }
);
const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;

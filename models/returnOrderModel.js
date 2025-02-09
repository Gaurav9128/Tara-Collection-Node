import mongoose from "mongoose";
 
const returnOrderSchema = new mongoose.Schema({
    choice: { type: String, enum: ["refund", "exchange"], required: true }, // Ensuring it's either 'refund' or 'replacement'
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    reason: { type: String, required: true },
    userId: { type: String, required: true },  // Storing userId as a string
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }, // Default status is 'Pending'
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
}, { timestamps: true });
 
const returnOrderModel = mongoose.model("ReturnOrder", returnOrderSchema);
 
export default returnOrderModel;

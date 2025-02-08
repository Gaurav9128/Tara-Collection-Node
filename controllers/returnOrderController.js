import returnOrderModel from "../models/returnOrderModel.js";
 
// Create a return order
const createReturnOrder = async (req, res) => {
    try {
        const { choice, orderId, productId, reason, userId, name, mobile, address } = req.body;
 
        // Validate required fields
        if (!choice || !orderId || !productId || !reason || !userId) {
            return res.json({ success: false, message: "All fields are required" });
        }
 
        // Create new return order
        const newReturnOrder = new returnOrderModel({
            choice,
            orderId,
            productId,
            reason,
            userId,
            status: "Pending", // Default status
            name,
            mobile,
            address
        });
 
        // Save to database
        const savedReturnOrder = await newReturnOrder.save();
 
        res.json({ success: true, message: "Return order created successfully", data: savedReturnOrder });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};
 
// Fetch return orders by userId
const getUserReturnOrders = async (req, res) => {
    try {
        const { userId } = req.params;
 
        const returnOrders = await returnOrderModel.find({ userId }).populate("productId", "name price");
 
        res.json({ success: true, data: returnOrders });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};
 
// Fetch all return orders (Admin)
const getAllReturnOrders = async (req, res) => {
    try {
        const returnOrders = await returnOrderModel.find().populate("productId", "name price");
 
        res.json({ success: true, data: returnOrders });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};
 
export { createReturnOrder, getUserReturnOrders, getAllReturnOrders };
 
 

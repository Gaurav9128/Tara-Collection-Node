import express from "express";
import { createReturnOrder, getUserReturnOrders, getAllReturnOrders } from "../controllers/returnOrderController.js";


const router = express.Router();

// Create a return order
router.post("/", createReturnOrder);

// Get return orders for a specific user
router.get("/:userId", getUserReturnOrders);

// Get all return orders (Admin)
router.get("/", getAllReturnOrders);

export default router;

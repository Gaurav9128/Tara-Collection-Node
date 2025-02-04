import express from 'express';
import { createOrder, checkPaymentStatus } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-order',  createOrder);
router.post('/status', checkPaymentStatus);

export default router;

import express from 'express';
import { placeOrder, checkPaymentStatus } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-order',  placeOrder);
router.post('/status', checkPaymentStatus);

export default router;

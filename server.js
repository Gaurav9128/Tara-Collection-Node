import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connectDB } from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import returnOrderRouter from './routes/returnOrderRoute.js';
import paymentRouter from './routes/paymentRoute.js';  // Import the payment routes


// App Config
const app = express();
const port = process.env.PORT || 5000;
connectDB();
connectCloudinary();

// Middlewares
app.use(express.json());
app.use(cors());

// API Endpoints
app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/return-order', returnOrderRouter);
app.use('/api/payment', paymentRouter);  // Register payment routes

app.get('/', (req, res) => {
    res.send("API Working");
});

app.listen(port, () => console.log('Server started on PORT : ' + port));

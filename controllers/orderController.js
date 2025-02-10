import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe'
import razorpay from 'razorpay'
import crypto from 'crypto'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid';



// global variables
const currency = 'inr'
//const deliveryCharge

// gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// const razorpayInstance = new razorpay({
//     key_id : process.env.RAZORPAY_KEY_ID,
//     key_secret : process.env.RAZORPAY_KEY_SECRET,
// })

// Placing orders using COD Method
const placeOrder = async (req, res) => {

    try {

        const { userId, items, amount, address } = req.body;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "COD",
            payment: false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        await userModel.findByIdAndUpdate(userId, { cartData: {} })

        res.json({ success: true, message: "Order Placed" })


    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}


const placeOrderphonepe = async (req, res) => {


    // const MERCHANT_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
    // const redirectUrlone = "https://abhiramclasses.in/userDetails/25";
    // const successUrl = "http://localhost:5173/payment-success";
    // const failureUrl = "http://localhost:5173/payment-failure";
    // const MERCHANT_KEY = process.env.PHONE_PE_KEY_SECRET;

    try {
        const { amount, address, mobileNumber } = req.body;

        // // Validate required fields
        // if (!amount || !address || !mobileNumber) {
        //     return res.status(400).json({ message: "Missing required fields" });
        // }

        const orderId = uuidv4(); // Generate a unique order ID
        console.log("orderId ", orderId)
        const paymentPayload = {
            merchantId: process.env.MERCHANT_ID,
            merchantUserId: `Test_${Date.now()}`,
            mobileNumber: address.phone,
            amount: amount * 100, // Convert to smallest currency unit (e.g., paisa)
            merchantTransactionId: orderId,
            redirectUrl: `${redirectUrlone}/?id=${orderId}`,
            redirectMode: 'POST',
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };
        // console.log("paymentPayload ", paymentPayload)

        // console.log("Merchant ID:", process.env.MERCHANT_ID);
        // console.log("Merchant Key:", process.env.PHONE_PE_KEY_SECRET);


        // Create checksum
        const payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
        const keyIndex = 1;
        const stringToSign = payload + '/pg/v1/pay' + MERCHANT_KEY;
        const sha256 = crypto.createHash('sha256').update(stringToSign).digest('hex');
        const checksum = `${sha256}###${keyIndex}`;

        const options = {
            method: 'POST',
            url: MERCHANT_BASE_URL,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: {
                request: payload
            }
        };
        console.log("options ", options)
        const response = await axios.request(options);
        console.log("response ", response)
        const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;

        res.status(200).json({ msg: "OK", url: redirectUrl });
    } catch (error) {
        console.error("Error in placeOrderphonepe:", error.message);
        res.status(500).json({
            message: "Internal Server Error",
            error: error.response ? error.response.data : error.message, // Log detailed error information
        });
    }
};






// Placing orders using Stripe Method


const placeOrderStripe = async (req, res) => {
    try {

        const { userId, items, amount, address } = req.body
        const { origin } = req.headers;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "PhonePe",
            payment: false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const line_items = items.map((item) => ({
            price_data: {
                currency: currency,
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data: {
                currency: currency,
                product_data: {
                    name: 'Delivery Charges'
                },
                unit_amount: deliveryCharge * 100
            },
            quantity: 1
        })

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment',
        })

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Verify Stripe 
const verifyStripe = async (req, res) => {

    const { orderId, success, userId } = req.body

    try {
        if (success === "true") {
            await orderModel.findByIdAndUpdate(orderId, { payment: true });
            await userModel.findByIdAndUpdate(userId, { cartData: {} })
            res.json({ success: true });
        } else {
            await orderModel.findByIdAndDelete(orderId)
            res.json({ success: false })
        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// Placing orders using Razorpay Method
const placeOrderRazorpay = async (req, res) => {
    try {

        const { userId, items, amount, address } = req.body

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Razorpay",
            payment: false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const options = {
            amount: amount * 100,
            currency: currency.toUpperCase(),
            receipt: newOrder._id.toString()
        }

        await razorpayInstance.orders.create(options, (error, order) => {
            if (error) {
                console.log(error)
                return res.json({ success: false, message: error })
            }
            res.json({ success: true, order })
        })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const verifyRazorpay = async (req, res) => {
    try {

        const { userId, razorpay_order_id } = req.body

        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)
        if (orderInfo.status === 'paid') {
            await orderModel.findByIdAndUpdate(orderInfo.receipt, { payment: true });
            await userModel.findByIdAndUpdate(userId, { cartData: {} })
            res.json({ success: true, message: "Payment Successful" })
        } else {
            res.json({ success: false, message: 'Payment Failed' });
        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}


// All Orders data for Admin Panel
const allOrders = async (req, res) => {

    try {

        const orders = await orderModel.find({})
        res.json({ success: true, orders })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// User Order Data For Forntend
const userOrders = async (req, res) => {
    try {

        const { userId } = req.body

        const orders = await orderModel.find({ userId })
        res.json({ success: true, orders })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// update order status from Admin Panel
const updateStatus = async (req, res) => {
    try {

        const { orderId, status } = req.body

        await orderModel.findByIdAndUpdate(orderId, { status })
        res.json({ success: true, message: 'Status Updated' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export { verifyRazorpay, verifyStripe, placeOrder, placeOrderStripe, placeOrderRazorpay, allOrders, userOrders, updateStatus, placeOrderphonepe }
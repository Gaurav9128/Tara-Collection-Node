import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe'
import razorpay from 'razorpay'
import crypto from 'crypto'
import axios from 'axios'

// global variables
const currency = 'inr'
const deliveryCharge = 50

// gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// const razorpayInstance = new razorpay({
//     key_id : process.env.RAZORPAY_KEY_ID,
//     key_secret : process.env.RAZORPAY_KEY_SECRET,
// })

// Placing orders using COD Method
const placeOrder = async (req,res) => {
    
    try {
        
        const { userId, items, amount, address} = req.body;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"COD",
            payment:false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        await userModel.findByIdAndUpdate(userId,{cartData:{}})

        res.json({success:true,message:"Order Placed"})


    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}
// Placing
const placeOrderphonepe = async(req, res) => {
    try{
        const merchantId = process.env.MERCHANT_ID;
        const saltKey = process.env.SALT_KEY;
        const phonePeUrl = process.env.PHONE_PE_API;
        //const { userId } = req.body;
        const userId = "674704350e497cb28cf94209";
        const MOBILE_NOT_FOUND = "Mobile is required." 
        const PRICE_NOT_FOUND = "Item price is required." 
        const merchantTransactionId = 'M' + Date.now();
        const orderDetails = await orderModel.findOne({ userId });
        const { address, amount } = orderDetails
        const keyIndex = 1;
        if(!address?.phone) {
            throw Error(MOBILE_NOT_FOUND)
        }

        if(!amount) {
            throw Error(PRICE_NOT_FOUND)
        }

        const createPayload = {
            "merchantId": merchantId,
            "merchantTransactionId": merchantTransactionId,
            "merchantUserId": userId,
            "amount": amount,
            "redirectUrl": "https://webhook.site/redirect-url",
            "redirectMode": "REDIRECT",
            "callbackUrl": "https://webhook.site/callback-url",
            "mobileNumber": address?.phone,
            "paymentInstrument": {
                "type": "PAY_PAGE"
            }
        }
        const stringfyPayload = JSON.stringify(createPayload);
        const payload = Buffer.from(stringfyPayload).toString('base64');
        const string = payload + '/pg/v1/pay' + saltKey;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + '###' + keyIndex;
       
        const options = {
            method: 'POST',
            url: phonePeUrl,
            headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            'X-VERIFY': checksum
            },
            data: {
                request: payload
            }
        }
        axios.request(options)
        .then(async function (response) {
            const phonePeTransactionId = response.data.transactionId;
            res.status(201).send({
                msg: "payment done",
                status: "success",
                data: response.data,
                phonePeTransactionId: phonePeTransactionId,
            });
            console.log("Payment API Response:", response.data);
        })
        .catch(function (error) {
            console.error("Payment API Error:", error.message);
            res.status(500).json({ msg: "Payment Failed", status: "error", error: error.message });
        });
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}


// Placing orders using Stripe Method
const placeOrderStripe = async (req,res) => {
    try {
        
        const { userId, items, amount, address} = req.body
        const { origin } = req.headers;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"PhonePe",
            payment:false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const line_items = items.map((item) => ({
            price_data: {
                currency:currency,
                product_data: {
                    name:item.name
                },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data: {
                currency:currency,
                product_data: {
                    name:'Delivery Charges'
                },
                unit_amount: deliveryCharge * 100
            },
            quantity: 1
        })

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url:  `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment',
        })

        res.json({success:true,session_url:session.url});

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// Verify Stripe 
const verifyStripe = async (req,res) => {

    const { orderId, success, userId } = req.body

    try {
        if (success === "true") {
            await orderModel.findByIdAndUpdate(orderId, {payment:true});
            await userModel.findByIdAndUpdate(userId, {cartData: {}})
            res.json({success: true});
        } else {
            await orderModel.findByIdAndDelete(orderId)
            res.json({success:false})
        }
        
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

// Placing orders using Razorpay Method
const placeOrderRazorpay = async (req,res) => {
    try {
        
        const { userId, items, amount, address} = req.body

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"Razorpay",
            payment:false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const options = {
            amount: amount * 100,
            currency: currency.toUpperCase(),
            receipt : newOrder._id.toString()
        }

        await razorpayInstance.orders.create(options, (error,order)=>{
            if (error) {
                console.log(error)
                return res.json({success:false, message: error})
            }
            res.json({success:true,order})
        })

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

const verifyRazorpay = async (req,res) => {
    try {
        
        const { userId, razorpay_order_id  } = req.body

        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)
        if (orderInfo.status === 'paid') {
            await orderModel.findByIdAndUpdate(orderInfo.receipt,{payment:true});
            await userModel.findByIdAndUpdate(userId,{cartData:{}})
            res.json({ success: true, message: "Payment Successful" })
        } else {
             res.json({ success: false, message: 'Payment Failed' });
        }

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}


// All Orders data for Admin Panel
const allOrders = async (req,res) => {

    try {
        
        const orders = await orderModel.find({})
        res.json({success:true,orders})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

// User Order Data For Forntend
const userOrders = async (req,res) => {
    try {
        
        const { userId } = req.body

        const orders = await orderModel.find({ userId })
        res.json({success:true,orders})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// update order status from Admin Panel
const updateStatus = async (req,res) => {
    try {
        
        const { orderId, status } = req.body

        await orderModel.findByIdAndUpdate(orderId, { status })
        res.json({success:true,message:'Status Updated'})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

export {verifyRazorpay, verifyStripe ,placeOrder, placeOrderStripe, placeOrderRazorpay, allOrders, userOrders, updateStatus, placeOrderphonepe}
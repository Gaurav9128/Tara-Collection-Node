import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import orderModel from "../models/orderModel.js";

 
const MERCHANT_KEY = "b4650abc-8e26-4130-ae97-42af3ae2b2ae";
const MERCHANT_ID = "M22KT8OP23RUM";

const MERCHANT_BASE_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";
const MERCHANT_STATUS_URL = "https://api.phonepe.com/apis/hermes/pg/v1/status/";
 
const redirectUrl = "http://localhost:4000/status";
const successUrl = "http://localhost:5173/payment-success";
const failureUrl = "http://localhost:5173/payment-failure";
 
// Create Order and Initiate Payment
export const createOrder = async (req, res) => {
    try {
        const { firstName, lastName, phone, amount,userId, items, address} = req.body;
        const name = firstName + ' ' + lastName;
        const mobileNumber = phone;
        const orderId = uuidv4();
 
        // Payment Payload
        const paymentPayload = {
            merchantId: MERCHANT_ID,
            merchantUserId: name,
            mobileNumber: mobileNumber,
            amount: amount * 100,
            merchantTransactionId: orderId,
            redirectUrl: `${redirectUrl}/?id=${orderId}`,
            redirectMode: 'POST',
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };

        const orderData = {
            userId,
            items,
            address,
            amount,
            orderId,
            paymentMethod: "PhonePe",
            payment: false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()
        
 
        const payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
        const keyIndex = 1;
        const string = payload + '/pg/v1/pay' + MERCHANT_KEY;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + '###' + keyIndex;
 
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
 
        const response = await axios.request(options);
        console.log("Payment URL:", response.data.data.instrumentResponse.redirectInfo.url);
 
        res.status(200).json({ msg: "OK", url: response.data.data.instrumentResponse.redirectInfo.url });
    } catch (error) {
        console.error("Error in payment:", error);
        res.status(500).json({ error: 'Failed to initiate payment' });
    }
};
 
// Check Payment Status
export const checkPaymentStatus = async (req, res) => {
    try {
        const merchantTransactionId = req.query.id;
        const keyIndex = 1;
        const string = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + '###' + keyIndex;
 
        const options = {
            method: 'GET',
            url: `${MERCHANT_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': MERCHANT_ID
            }
        };
 
        const response = await axios.request(options);
        
        if (response.data.success === true) {
            return res.redirect(successUrl);
        } else {
            return res.redirect(failureUrl);
        }
    } catch (error) {
        console.error("Error checking payment status:", error);
        res.status(500).json({ error: 'Failed to check payment status' });
    }
};

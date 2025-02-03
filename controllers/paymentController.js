import axios from "axios";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import orderModel from "../models/orderModel.js"; // Ensure correct import
import userModel from "../models/userModel.js"; // Ensure correct import

const MERCHANT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const MERCHANT_ID = "M22KT8OP23RUM";
const MERCHANT_BASE_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";
const MERCHANT_STATUS_URL = "https://api.phonepe.com/apis/hermes/pg/v1/status/";

const redirectUrl = "http://localhost:5000/status";
const successUrl = "http://localhost:5173/success";
const failureUrl = "http://localhost:5173/failure";

// 🟢 **Step 1: Create Order & Initiate Payment**
export const createOrder = async (req, res) => {
    try {
        const { userId, firstName, lastName, phone, amount, items, address } = req.body;
        const name = firstName + ' ' + lastName;
        const mobileNumber = phone;
        const orderId = uuidv4(); // Generate unique transaction ID

        // 🟢 **Save Order Initially as "Pending"**
        const newOrder = new orderModel({
            userId,
            items,
            address,
            amount,
            paymentMethod: "Online",
            payment: false, // Initially, payment is false
            transactionId: orderId, // Store transaction ID
            date: Date.now()
        });

        await newOrder.save(); // Save pending order

        // Payment Payload
        const paymentPayload = {
            merchantId: MERCHANT_ID,
            merchantUserId: userId,
            mobileNumber: mobileNumber,
            amount: amount * 100, // Convert to paise
            merchantTransactionId: orderId,
            redirectUrl: `${redirectUrl}/?id=${orderId}`,
            redirectMode: "POST",
            paymentInstrument: {
                type: "PAY_PAGE",
            },
        };

        // Hashing & Checksum
        const payload = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
        const keyIndex = 1;
        const string = payload + "/pg/v1/pay" + MERCHANT_KEY;
        const sha256 = crypto.createHash("sha256").update(string).digest("hex");
        const checksum = sha256 + "###" + keyIndex;

        // API Request to PhonePe
        const options = {
            method: "POST",
            url: MERCHANT_BASE_URL,
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
                "X-VERIFY": checksum,
            },
            data: {
                request: payload,
            },
        };

        const response = await axios.request(options);
        console.log("Payment URL:", response.data.data.instrumentResponse.redirectInfo.url);

        // 🟢 **Return Payment URL to Frontend**
        res.status(200).json({ msg: "OK", url: response.data.data.instrumentResponse.redirectInfo.url });
    } catch (error) {
        console.error("Error in payment:", error);
        res.status(500).json({ error: "Failed to initiate payment" });
    }
};

// 🟢 **Step 2: Check Payment Status & Confirm Order**
export const checkPaymentStatus = async (req, res) => {
    try {
        const merchantTransactionId = req.query.id; // Get transaction ID from URL
        const keyIndex = 1;
        const string = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
        const sha256 = crypto.createHash("sha256").update(string).digest("hex");
        const checksum = sha256 + "###" + keyIndex;

        // API Call to PhonePe for Payment Status
        const options = {
            method: "GET",
            url: `${MERCHANT_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
                "X-VERIFY": checksum,
                "X-MERCHANT-ID": MERCHANT_ID,
            },
        };

        const response = await axios.request(options);

        if (response.data.success === true) {
            // ✅ **Update Order as Successful**
            await orderModel.findOneAndUpdate(
                { transactionId: merchantTransactionId },
                { payment: true } // Mark payment as done
            );

            return res.redirect(successUrl);
        } else {
            return res.redirect(failureUrl);
        }
    } catch (error) {
        console.error("Error checking payment status:", error);
        res.status(500).json({ error: "Failed to check payment status" });
    }
};

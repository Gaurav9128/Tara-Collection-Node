import mongoose from "mongoose";

export const connectDB = async () =>{
    await mongoose.connect('mongodb+srv://user2000:test2000@cluster0.9mme4.mongodb.net/').then(()=>console.log("DB Connected"));
}
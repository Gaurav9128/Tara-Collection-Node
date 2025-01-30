import { v2 as cloudinary } from "cloudinary";

// Directly set Cloudinary configuration
const connectCloudinary = () => {
  cloudinary.config({
    cloud_name: "df5woymdy", // Replace with your Cloudinary Name
    api_key: "641645998288182", // Replace with your API Key
    api_secret: "CuERwdVRpUGPGHp1M4_x3IF2yAc", // Replace with your Secret Key
  });

  console.log("Cloudinary configured successfully!");
};

// Test Cloudinary configuration
connectCloudinary();

export default connectCloudinary;

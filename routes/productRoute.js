import express from 'express';
import { listProducts, addProduct, removeProduct, singleProduct} from '../controllers/productController.js';
import upload from '../middleware/multer.js';

const productRouter = express.Router();

// Route to add a product with multiple image uploads
productRouter.post(
  '/add',
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
  ]),
  addProduct
);

// Route to remove a product
productRouter.post('/remove', removeProduct);

// Route to get a single product by ID
productRouter.post('/single', singleProduct);

// Route to get the list of all products
productRouter.get('/list', listProducts);


export default productRouter;

const express = require('express');
const cors = require('cors');
require('./db/config');
const User = require('./db/User');
const Product = require('./db/Product');
const Jwt = require('jsonwebtoken');
const jwtKey = 'e-comm';

const app = express();

app.use(express.json());
app.use(cors());

app.post("/register", async (req, res) => {
    try {
        let user = new User(req.body);
        let result = await user.save();
        result = result.toObject();
        delete result.password;
        Jwt.sign({ result }, jwtKey, { expiresIn: "2h" }, (err, token) => {
            if (err) {
                res.send({ result: "Something went wrong, please try after some time" });
            } else {
                res.send({ result, auth: token });
            }
        });
    } catch (error) {
        res.status(500).send({ error: 'Registration failed' });
    }
});

app.post("/login", async (req, res) => {
    try {
        let user = await User.findOne({ email: req.body.email, password: req.body.password }).select("-password");
        if (user) {
            Jwt.sign({ user }, jwtKey, { expiresIn: "2h" }, (err, token) => {
                if (err) {
                    res.send({ result: "Something went wrong, please try after some time" });
                } else {
                    res.send({ user, auth: token });
                }
            });
        } else {
            res.status(404).send({ result: 'No user found' });
        }
    } catch (error) {
        res.status(500).send({ error: 'Login failed' });
    }
});

app.post("/add-product", verifyToken, async (req, res) => {
    try {
        let product = new Product(req.body);
        let result = await product.save();
        res.send(result);
    } catch (error) {
        res.status(500).send({ error: 'Product creation failed' });
    }
});

app.get("/products", verifyToken, async (req, res) => {
    try {
        let products = await Product.find({userId:req.user._id});
        if (products.length > 0) {
            res.send(products);
        } else {
            res.send({ result: "No Products found" });
        }
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch products' });
    }
});

app.delete("/product/:id", verifyToken, async (req, res) => {
    try {
        const result = await Product.deleteOne({ _id: req.params.id });
        res.send(result);
    } catch (error) {
        res.status(500).send({ error: 'Product deletion failed' });
    }
});

app.get("/product/:id", verifyToken, async (req, res) => {
    try {
        let result = await Product.findOne({ _id: req.params.id });
        if (result) {
            res.send(result);
        } else {
            res.send({ result: "No record found" });
        }
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch product' });
    }
});

app.put("/product/:id", verifyToken, async (req, res) => {
    try {
        let result = await Product.updateOne(
            { _id: req.params.id },
            { $set: req.body }
        );
        res.send(result);
    } catch (error) {
        res.status(500).send({ error: 'Product update failed' });
    }
});

app.get("/search/:key", verifyToken, async (req, res) => {
    try {
        const key = req.params.key;
        const result = await Product.find({
            "$or": [
                { name: { $regex: key, $options: 'i' } }, // Case-insensitive regex search on name
                { company: { $regex: key, $options: 'i' } } // Case-insensitive regex search on company
            ]
        });
        if (result.length > 0) {
            res.send(result);
        } else {
            res.send({ result: "No matching products found" });
        }
    } catch (error) {
        res.status(500).send({ error: 'Search failed' });
    }
});

function verifyToken(req, res, next) {
    let token = req.headers['authorization'];
    if (token) {
        token = token.split(' ')[1]; // Split the "Bearer " part and get the token
        Jwt.verify(token, jwtKey, (err, valid) => {
            if (err) {
                res.status(401).send({ result: "Invalid Token" });
            } else {
                req.user=valid.user;
                next();
            }
        });
    } else {
        res.status(403).send({ result: "Token is missing" });
    }
}

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});

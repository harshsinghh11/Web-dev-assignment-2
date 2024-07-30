const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const app = express();

app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/mydatabase', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    password: String
});

const User = mongoose.model('User', UserSchema);

// Item Schema
const ItemSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    comments: [String],
    ratings: [Number]
});

const Item = mongoose.model('Item', ItemSchema);

// Authentication Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token) {
        jwt.verify(token, 'your_jwt_secret', (err, decoded) => {
            if (err) return res.status(401).json({ message: 'Unauthorized' });
            req.user = decoded;
            next();
        });
    } else {
        return res.status(401).json({ message: 'No token provided' });
    }
};

// Authentication Routes
app.post('/register', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = new User({
        username: req.body.username,
        password: hashedPassword
    });
    newUser.save((err, user) => {
        if (err) return res.status(500).json({ message: 'Error saving user' });
        res.status(201).json(user);
    });
});

app.post('/login', (req, res) => {
    User.findOne({ username: req.body.username }, async (err, user) => {
        if (err) return res.status(500).json({ message: 'Error finding user' });
        if (!user || !await bcrypt.compare(req.body.password, user.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id, username: user.username }, 'your_jwt_secret', { expiresIn: '1h' });
        res.status(200).json({ token });
    });
});

// CRUD Operations
app.post('/items', authMiddleware, (req, res) => {
    const newItem = new Item(req.body);
    newItem.save((err, item) => {
        if (err) return res.status(500).json({ message: 'Error saving item' });
        res.status(201).json(item);
    });
});

app.get('/items', (req, res) => {
    Item.find({}, (err, items) => {
        if (err) return res.status(500).json({ message: 'Error fetching items' });
        res.status(200).json(items);
    });
});

app.get('/items/:id', (req, res) => {
    Item.findById(req.params.id, (err, item) => {
        if (err) return res.status(500).json({ message: 'Error finding item' });
        res.status(200).json(item);
    });
});

app.put('/items/:id', authMiddleware, (req, res) => {
    Item.findByIdAndUpdate(req.params.id, req.body, { new: true }, (err, item) => {
        if (err) return res.status(500).json({ message: 'Error updating item' });
        res.status(200).json(item);
    });
});

app.delete('/items/:id', authMiddleware, (req, res) => {
    Item.findByIdAndDelete(req.params.id, (err) => {
        if (err) return res.status(500).json({ message: 'Error deleting item' });
        res.status(204).send();
    });
});

// User Interactions
app.post('/items/:id/comments', (req, res) => {
    Item.findById(req.params.id, (err, item) => {
        if (err) return res.status(500).json({ message: 'Error finding item' });
        item.comments.push(req.body.comment);
        item.save((err, updatedItem) => {
            if (err) return res.status(500).json({ message: 'Error saving comment' });
            res.status(200).json(updatedItem);
        });
    });
});

app.post('/items/:id/ratings', (req, res) => {
    Item.findById(req.params.id, (err, item) => {
        if (err) return res.status(500).json({ message: 'Error finding item' });
        item.ratings.push(req.body.rating);
        item.save((err, updatedItem) => {
            if (err) return res.status(500).json({ message: 'Error saving rating' });
            res.status(200).json(updatedItem);
        });
    });
});

// Dashboard
app.get('/dashboard', authMiddleware, (req, res) => {
    Item.countDocuments({}, (err, itemCount) => {
        if (err) return res.status(500).json({ message: 'Error counting items' });
        res.status(200).json({ itemCount });
    });
});

// Start Server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

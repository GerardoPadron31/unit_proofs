const express = require('express');
const User = require('../models/user');
const { auth } = require('../middleware/auth');

const router = express.Router();

function cookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    };
}

router.post('/register', async (req, res, next) => {
    const { email, password, password2, firstname, lastname } = req.body || {};

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        typeof password2 !== 'string' ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password !== password2) {
        return res.status(400).json({ message: "Passwords don't match" });
    }

    try {
        const user = await User.create({ email, password, firstname, lastname });
        return res.status(201).json({ success: true, user });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Email already exists' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        return next(error);
    }
});

router.post('/login', async (req, res, next) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ isAuth: false, message: 'Invalid email or password' });
        }

        const token = await user.generateToken();
        return res
            .cookie('auth', token, cookieOptions())
            .status(200)
            .json({ isAuth: true, id: user._id, email: user.email });
    } catch (error) {
        return next(error);
    }
});

router.get('/logout', auth, async (req, res, next) => {
    try {
        await req.user.deleteToken();
        return res.clearCookie('auth', cookieOptions()).status(204).end();
    } catch (error) {
        return next(error);
    }
});

router.get('/profile', auth, (req, res) => {
    return res.json({
        isAuth: true,
        id: req.user._id,
        email: req.user.email,
        name: [req.user.firstname, req.user.lastname].filter(Boolean).join(' ')
    });
});

module.exports = router;

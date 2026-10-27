const User = require('../models/user');

async function auth(req, res, next) {
    try {
        const user = await User.findByToken(req.cookies.auth);

        if (!user) {
            return res.status(401).json({ isAuth: false, error: true });
        }

        req.token = req.cookies.auth;
        req.user = user;
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = { auth };

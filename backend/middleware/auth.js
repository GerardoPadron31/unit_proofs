<<<<<<< HEAD
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
=======
// middleware/auth.js

const User = require('../models/user');

let auth = (req, res, next) => {
    let token = req.cookies.auth;

    User.findByToken(token, (err, user) => {
        if (err) throw err;
        if (!user) return res.json({ isAuth: false, error: true });

        req.token = token;
        req.user = user;
        next();
    });
};

module.exports = { auth };
>>>>>>> c7b4a07405339e8462c87aecbf5cc91b34e9c36c

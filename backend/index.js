<<<<<<< HEAD
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const authRoutes = require('./routes/auth');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/api', authRoutes);

app.get('/', (req, res) => {
    res.status(200).send('Welcome to login and sign-up API');
});

app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) {
        return next(error);
    }
    return res.status(500).json({ message: 'Internal server error' });
});

async function startServer() {
    const { DATABASE } = config.get(process.env.NODE_ENV);
    await mongoose.connect(DATABASE, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    const port = process.env.PORT || 3000;
    return app.listen(port, () => {
        console.log(`API listening on port ${port}`);
    });
}

if (require.main === module) {
    startServer().catch((error) => {
        console.error('Unable to start the API:', error);
        process.exitCode = 1;
    });
}

module.exports = app;
=======
//JS
//common JS -> antigua, mas compatible
//ES MODULE -> La mas reciente "import y from"
const express = require('express');
const mongoose = require('mongoose');
const bodyparser = require('body-parser');
const cookieParser = require('cookie-parser');
const User = require('./models/user');
const db = require('./config/config').get(process.env.NODE_ENV);
const { auth } = require('./middleware/auth');


const app = express();
// app use
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(cookieParser());

// database connection
mongoose.Promise = global.Promise;
mongoose.connect(db.DATABASE, { useNewUrlParser: true, useUnifiedTopology: true }, function (err) {
    if (err) console.log(err);
    console.log("database is connected");
});


// adding new user (sign-up route)
app.post('/api/register', async function (req, res) {
    if (req.body.password != req.body.password2) return res.status(400).json({ message: "password not match" });
    const newuser = new User(req.body);
    const user = await User.findOne({ email: newuser.email });
    if (user) return res.status(400).json({ auth: false, message: "email exits" });
    try {
        const user = await newuser.save();
        return res.status(200).json({
            success: true,
            user: user
        });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ success: false });
    }
});


// login user
app.post('/api/login', async function (req, res) {
    //solo se LET cuando se redeclara un valor
    const token = req.cookies.auth;
    //Para evitar el uso de callbacks usamos funciones asincronas
    //Manejamos el error try/catch
    //Manejamos en donde exista y ya esta logeado con IF
    try {
        const user = await User.findByToken(token);
        if (user) return res.status(400).json({
            error: true,
            message: "You are already logged in"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error });
    }

    try {
        const user = await User.findOne({ 'email': req.body.email });
        if (!user) return res.status(400).json({ isAuth: false, message: 'Auth failed' });
        const { e, isMatch } = user.comparepassword(req.body.password);
        if (!isMatch && e) return res.status(400).json({ isAuth: false, message: 'Auth failed' });
        await user.generateToken();
        return res.status(200).cookie('auth', user.token).json({
            isAuth: true,
            id: user._id,
            email: user.email
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error });
    }
});

//logout user
app.get('/api/logout', auth, async function (req, res) {
    try {
        await req.user.deleteToken();
        return res.status(200);
    } catch (error) {
        console.log(error);
        return res.status(500).json({msg:error});
    }
});

// get logged in user
app.get('/api/profile', auth, function (req, res) {
    res.json({
        isAuth: true,
        id: req.user._id,
        email: req.user.email,
        name: req.user.firstname + req.user.lastname

    })
});


app.get('/', function (req, res) {
    res.status(200).send(`Welcome to login , sign-up api`);
});

// listening port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`app is live at ${PORT}`);
});
>>>>>>> c7b4a07405339e8462c87aecbf5cc91b34e9c36c

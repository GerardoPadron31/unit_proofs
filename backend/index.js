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

<<<<<<< HEAD
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { SECRET } = require('../config/config').get(process.env.NODE_ENV);

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        // Normaliza el correo para evitar duplicados por mayúsculas o espacios.
        trim: true,
        lowercase: true,
        unique: true
=======
// models/user.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config').get(process.env.NODE_ENV);

const SALT_I = 10;

const userSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        unique: 1
>>>>>>> c7b4a07405339e8462c87aecbf5cc91b34e9c36c
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    firstname: {
        type: String,
<<<<<<< HEAD
        trim: true,
=======
>>>>>>> c7b4a07405339e8462c87aecbf5cc91b34e9c36c
        maxlength: 100
    },
    lastname: {
        type: String,
<<<<<<< HEAD
        trim: true,
=======
>>>>>>> c7b4a07405339e8462c87aecbf5cc91b34e9c36c
        maxlength: 100
    },
    token: {
        type: String
    }
});

<<<<<<< HEAD
// Hashea la contraseña solo cuando es nueva o fue modificada.
userSchema.pre('save', async function () {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    }
});

// Devuelve una promesa con el resultado de comparar la contraseña ingresada.
userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Firma el identificador del usuario, guarda el token y lo devuelve.
userSchema.methods.generateToken = async function () {
    this.token = jwt.sign(this._id.toString(), SECRET);
    await this.save();
    return this.token;
};

// Elimina el token persistido para invalidar la sesión actual.
userSchema.methods.deleteToken = async function () {
    this.token = undefined;
    await this.save();
};

// Verifica el JWT y confirma que coincida con el token guardado del usuario.
userSchema.statics.findByToken = async function (token) {
    if (!token) {
        return null;
    }

    let userId;
    try {
        userId = jwt.verify(token, SECRET);
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return null;
        }
        throw error;
    }

    if (typeof userId !== 'string') {
        return null;
    }

    return this.findOne({ _id: userId, token });
};

// Evita exponer credenciales o tokens en respuestas JSON de la API.
userSchema.set('toJSON', {
    transform: (document, user) => {
        delete user.password;
        delete user.token;
        return user;
    }
});

module.exports = mongoose.model('User', userSchema);
=======
// Encriptar la contraseña antes de guardar el usuario
userSchema.pre('save', function (next) {
    var user = this;

    if (user.isModified('password')) {
        bcrypt.genSalt(SALT_I, function (err, salt) {
            if (err) return next(err);

            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) return next(err);
                user.password = hash;
                next();
            });
        });
    } else {
        next();
    }
});

// Método para comparar contraseñas en el Login
userSchema.methods.comparepassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

// Generar Token JWT al iniciar sesión
userSchema.methods.generateToken = function (cb) {
    var user = this;
    var token = jwt.sign(user._id.toHexString(), config.SECRET);

    user.token = token;
    user.save(function (err, user) {
        if (err) return cb(err);
        cb(null, user);
    });
};

// Método estático para validar un usuario mediante su Token
userSchema.statics.findByToken = function (token, cb) {
    var user = this;

    jwt.verify(token, config.SECRET, function (err, decode) {
        user.findOne({ "_id": decode, "token": token }, function (err, user) {
            if (err) return cb(err);
            cb(null, user);
        });
    });
};

// Eliminar token en el Logout
userSchema.methods.deleteToken = function (token, cb) {
    var user = this;

    user.updateOne({ $unset: { token: 1 } }, function (err, raw) {
        if (err) return cb(err);
        cb(null, user);
    });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
>>>>>>> c7b4a07405339e8462c87aecbf5cc91b34e9c36c

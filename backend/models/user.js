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
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    firstname: {
        type: String,
        trim: true,
        maxlength: 100
    },
    lastname: {
        type: String,
        trim: true,
        maxlength: 100
    },
    token: {
        type: String
    }
});

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
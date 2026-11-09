const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
<<<<<<< HEAD
const app = require('../index');
const User = require('../models/user');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

=======
const User = require('../models/user');

// NOTA: Para las pruebas de integración con rutas, exporta app desde tu archivo principal:
// module.exports = app;

let mongoServer;

// 1. Configuración de la base de datos temporal antes de ejecutar los tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

// 2. Limpieza de colecciones entre cada prueba
>>>>>>> c7b4a07405339e8462c87aecbf5cc91b34e9c36c
afterEach(async () => {
    await User.deleteMany({});
});

<<<<<<< HEAD
afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

describe('User model', () => {
    test('hashes the password before saving', async () => {
        const user = await User.create({
            email: 'test@example.com',
            password: 'password123'
        });
=======
// 3. Cerrar conexión al terminar
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// -------------------------------------------------------------
// PRUEBAS UNITARIAS: Modelo de Usuario (Métodos internos)
// -------------------------------------------------------------
describe('Pruebas Unitarias: Modelo User', () => {

    test('Debe hashear/encriptar la contraseña al guardar un usuario', async () => {
        const userData = { email: 'test@example.com', password: 'password123' };
        const user = new User(userData);
        await user.save();
>>>>>>> c7b4a07405339e8462c87aecbf5cc91b34e9c36c

        expect(user.password).not.toBe('password123');
        expect(user.password.length).toBeGreaterThan(20);
    });

<<<<<<< HEAD
    test('compares valid and invalid passwords', async () => {
        const user = await User.create({
            email: 'test@example.com',
            password: 'password123'
        });

        await expect(user.comparePassword('password123')).resolves.toBe(true);
        await expect(user.comparePassword('wrongpassword')).resolves.toBe(false);
    });

    test('creates, finds, and removes an authentication token', async () => {
        const user = await User.create({
            email: 'jwt@example.com',
            password: 'password123'
        });

        const token = await user.generateToken();
        expect(typeof token).toBe('string');
        await expect(User.findByToken(token)).resolves.toMatchObject({
            email: user.email
        });

        await user.deleteToken();
        await expect(User.findByToken(token)).resolves.toBeNull();
    });

    test('rejects invalid authentication tokens', async () => {
        await expect(User.findByToken('invalid-token')).resolves.toBeNull();
        await expect(User.findByToken(null)).resolves.toBeNull();
    });

    test('does not serialize passwords or tokens', async () => {
        const user = await User.create({
            email: 'private@example.com',
            password: 'password123'
        });
        await user.generateToken();

        const serializedUser = user.toJSON();
        expect(serializedUser.password).toBeUndefined();
        expect(serializedUser.token).toBeUndefined();
    });
});

describe('Authentication API', () => {
    test('validates registration and handles login/logout/profile', async () => {
        const client = request.agent(app);

        await client
            .post('/api/register')
            .send({
                email: 'person@example.com',
                password: 'password123',
                password2: 'different'
            })
            .expect(400);

        const registration = await client
            .post('/api/register')
            .send({
                email: 'person@example.com',
                password: 'password123',
                password2: 'password123',
                firstname: 'Ada',
                lastname: 'Lovelace'
            })
            .expect(201);

        expect(registration.body.user.password).toBeUndefined();
        expect(registration.body.user.token).toBeUndefined();

        await client
            .post('/api/register')
            .send({
                email: 'person@example.com',
                password: 'password123',
                password2: 'password123'
            })
            .expect(409);

        await client
            .post('/api/login')
            .send({ email: 'person@example.com', password: 'wrong-password' })
            .expect(401);

        await client
            .post('/api/login')
            .send({ email: 'person@example.com', password: 'password123' })
            .expect(200)
            .expect((response) => {
                expect(response.body.isAuth).toBe(true);
                expect(response.headers['set-cookie']).toBeDefined();
            });

        await client
            .get('/api/profile')
            .expect(200)
            .expect((response) => {
                expect(response.body.name).toBe('Ada Lovelace');
            });

        await client.get('/api/logout').expect(204);
        await client.get('/api/profile').expect(401);
    });
});
=======
    test('comparepassword() debe retornar true para contraseñas correctas', (done) => {
        const user = new User({ email: 'test@example.com', password: 'password123' });
        
        user.save((err, savedUser) => {
            savedUser.comparepassword('password123', (err, isMatch) => {
                expect(err).toBeNull();
                expect(isMatch).toBe(true);
                done();
            });
        });
    });

    test('comparepassword() debe retornar false para contraseñas incorrectas', (done) => {
        const user = new User({ email: 'test@example.com', password: 'password123' });

        user.save((err, savedUser) => {
            savedUser.comparepassword('wrongpassword', (err, isMatch) => {
                expect(isMatch).toBe(false);
                done();
            });
        });
    });

    test('generateToken() debe adjuntar un JWT al usuario', (done) => {
        const user = new User({ email: 'jwt@example.com', password: 'password123' });

        user.save((err, savedUser) => {
            savedUser.generateToken((err, userWithToken) => {
                expect(err).toBeNull();
                expect(userWithToken.token).toBeDefined();
                expect(typeof userWithToken.token).toBe('string');
                done();
            });
        });
    });
});
>>>>>>> c7b4a07405339e8462c87aecbf5cc91b34e9c36c

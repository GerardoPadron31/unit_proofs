<<<<<<< HEAD
const config = {
    production: {
        SECRET: process.env.SECRET,
        DATABASE: process.env.MONGODB_URI
    },
    default: {
        SECRET: process.env.SECRET || 'SUPER_SECRET_KEY_DEV',
        DATABASE: process.env.MONGODB_URI || 'mongodb://localhost:27017/mi_app_dev'
=======
// config/config.js

const config = {
    production: {
        SECRET: process.env.SECRET || 'SUPER_SECRET_KEY_PROD',
        DATABASE: process.env.MONGODB_URI || 'mongodb://localhost:27017/mi_app_prod'
    },
    default: {
        SECRET: 'SUPER_SECRET_KEY_DEV',
        DATABASE: 'mongodb://localhost:27017/mi_app_dev'
>>>>>>> c7b4a07405339e8462c87aecbf5cc91b34e9c36c
    }
};

exports.get = function get(env) {
<<<<<<< HEAD
    const selectedConfig = env === 'production' ? config.production : config.default;

    if (!selectedConfig.SECRET) {
        throw new Error('SECRET must be configured in production');
    }

    if (!selectedConfig.DATABASE) {
        throw new Error('MONGODB_URI must be configured in production');
    }

    return selectedConfig;
=======
    return config[env] || config.default;
>>>>>>> c7b4a07405339e8462c87aecbf5cc91b34e9c36c
};
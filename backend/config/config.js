const config = {
    production: {
        SECRET: process.env.SECRET,
        DATABASE: process.env.MONGODB_URI
    },
    default: {
        SECRET: process.env.SECRET || 'SUPER_SECRET_KEY_DEV',
        DATABASE: process.env.MONGODB_URI || 'mongodb://localhost:27017/mi_app_dev'
    }
};

exports.get = function get(env) {
    const selectedConfig = env === 'production' ? config.production : config.default;

    if (!selectedConfig.SECRET) {
        throw new Error('SECRET must be configured in production');
    }

    if (!selectedConfig.DATABASE) {
        throw new Error('MONGODB_URI must be configured in production');
    }

    return selectedConfig;
};
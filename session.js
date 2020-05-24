const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

const params = {
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.BASE_URL.indexOf('https') === 0,
    maxage: 1000 * 60 * 30
  }
};

if (process.env.ENV === 'prod') {
  const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASS,
    db: 1
  });

  params.store = new RedisStore({ client: redisClient });
}

module.exports.session_params = params;

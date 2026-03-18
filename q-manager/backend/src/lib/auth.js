const { betterAuth } = require("better-auth");
const { dash } = require("@better-auth/infra");

const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [dash()]
});

module.exports = { auth };

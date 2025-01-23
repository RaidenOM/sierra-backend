const joi = require("joi");
const ExpressError = require("./utilities/ExpressError");
require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports.validateUser = (req, res, next) => {
  const userSchema = joi.object({
    username: joi.string().required(),
    password: joi.string().required(),
  });

  const { error } = userSchema.validate(req.body);

  if (error) {
    const message = error.details.map((e) => e.message).join(",");
    throw new ExpressError(message, 400);
  } else {
    next();
  }
};

module.exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    req.user = payload;
    next();
  });
};

module.exports.validateMessage = (req, res, next) => {
  const messageSchema = joi.object({
    message: joi.string().required(),
    senderId: joi.string().required(),
    receiverId: joi.string().required(),
  });

  const { error } = messageSchema.validate(req.body);

  if (error) {
    const message = error.details.map((e) => e.message).join(",");
    throw new ExpressError(message, 400);
  } else {
    next();
  }
};

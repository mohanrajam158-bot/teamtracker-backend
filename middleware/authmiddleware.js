const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "No Token Provided ❌" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("JWT Error:", err);
      return res.status(401).json({ message: "Invalid Token ❌" });
    }

    req.user = decoded;
    next();
  });
}

module.exports = verifyToken;
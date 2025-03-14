// Middleware to validate JWT token

import jwt from 'jsonwebtoken';
export const authenticateToken = (roles = []) => {
    return (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
  
      if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
      }
  
      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
          return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
        }
        if (roles.length && !roles.includes(user.role)) {
          return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
        }
        console.log("Token Validated")
        req.user = user;
        next();
      });
    };
  };
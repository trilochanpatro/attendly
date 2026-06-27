import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'attendly_super_secure_college_secret_key_2026';

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Use a secure JWT_SECRET in production.');
}

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access denied. Token malformed.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

// Middleware to restrict routes by user roles
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. User context missing.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access forbidden. Insufficient permissions.' });
    }

    next();
  };
};

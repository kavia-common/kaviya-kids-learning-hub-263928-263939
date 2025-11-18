import jwt from 'jsonwebtoken';
import { ApplicationError } from '../utils/errors.js';

/**
 * Generate JWT token for a user.
 * PUBLIC_INTERFACE
 * @param {{id:string, role:'kid'|'parent'}} payload
 * @returns {string} JWT token
 */
export function generateToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ApplicationError('Server misconfiguration', 'CONFIG_ERROR', 500);
  }
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

/**
 * Express middleware to verify JWT and attach user info to request.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new ApplicationError('Authentication required', 'AUTH_REQUIRED', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch {
    return next(new ApplicationError('Invalid or expired token', 'AUTH_INVALID', 401));
  }
}

/**
 * Ensure the user has one of the allowed roles.
 * @param {('kid'|'parent')[]} roles
 */
export function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApplicationError('Authentication required', 'AUTH_REQUIRED', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApplicationError('Forbidden', 'AUTHZ_FORBIDDEN', 403));
    }
    return next();
  };
}

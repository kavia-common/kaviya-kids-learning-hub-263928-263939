import jwt from 'jsonwebtoken';
import { ApplicationError } from '../utils/errors.js';

/**
 * PUBLIC_INTERFACE
 * Generate a JWT token for a given payload.
 * Throws a clear ApplicationError if JWT secret is not configured to avoid raw 500s.
 * @param {{id:string, role:'kid'|'parent'}} payload
 * @param {string} [expiresIn='7d']
 * @returns {string} JWT token
 */
export function generateToken(payload, expiresIn = '7d') {
  const secret = process.env.JWT_SECRET || process.env.JWT_KEY;
  if (!secret) {
    throw new ApplicationError('Auth configuration missing', 'AUTH_CONFIG_MISSING', 500);
  }
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * PUBLIC_INTERFACE
 * Express middleware to verify JWT and attach user info to request.
 * Always forwards errors via ApplicationError to ensure consistent JSON responses.
 */
export function authenticate(req, res, next) {
  try {
    const secret = process.env.JWT_SECRET || process.env.JWT_KEY;
    if (!secret) {
      throw new ApplicationError('Auth configuration missing', 'AUTH_CONFIG_MISSING', 500);
    }

    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      throw new ApplicationError('Authentication required', 'AUTH_REQUIRED', 401);
    }
    const [scheme, token] = parts;
    if (scheme !== 'Bearer' || !token) {
      throw new ApplicationError('Authentication required', 'AUTH_REQUIRED', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      throw new ApplicationError('Invalid or expired token', 'AUTH_INVALID', 401);
    }

    req.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch (err) {
    return next(err instanceof ApplicationError ? err : new ApplicationError('Invalid or expired token', 'AUTH_INVALID', 401));
  }
}

/**
 * PUBLIC_INTERFACE
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

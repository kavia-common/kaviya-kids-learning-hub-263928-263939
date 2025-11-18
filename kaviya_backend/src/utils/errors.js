export class ApplicationError extends Error {
  /**
   * Create an application error with standardized fields.
   * @param {string} message - Human readable error message (no secrets).
   * @param {string} code - Stable machine readable error code.
   * @param {number} statusCode - HTTP status code.
   * @param {object} [details] - Optional additional info (non-sensitive).
   */
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500, details = undefined) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toResponse() {
    const resp = {
      error: {
        code: this.code,
        message: this.message
      }
    };
    if (this.details) resp.error.details = this.details;
    return resp;
  }
}

/**
 * Express error handling middleware for consistent error responses.
 */
export function errorHandler(err, req, res, next) {
  if (err instanceof ApplicationError) {
    return res.status(err.statusCode).json(err.toResponse());
  }
  // Fallback unknown error
  // Avoid leaking stack traces to clients
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unable to process request'
    }
  });
}

/**
 * Helper to wrap async route handlers and forward errors to central handler.
 * @param {(req,res,next)=>Promise<any>} fn
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

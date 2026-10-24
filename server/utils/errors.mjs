/**
 * AppError — structured error thrown from services and controllers.
 * The global error middleware catches it and formats { error: { code, message, fields? } }.
 */
export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields; // optional: { fieldName: "error message" }
    this.isAppError = true;
  }
}

/**
 * asyncHandler — wraps an async Express route handler so thrown errors
 * are forwarded to next() instead of crashing the process.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

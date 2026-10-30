export class AppError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function asAppError(error, fallbackCode = "internal_error", fallbackStatus = 500) {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  return new AppError(fallbackCode, message, fallbackStatus);
}

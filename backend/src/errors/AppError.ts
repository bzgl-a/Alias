export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details: any = null,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

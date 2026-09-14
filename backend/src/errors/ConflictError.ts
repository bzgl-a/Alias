import { AppError } from "./AppError.js";

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict", details: any = null) {
    super(message, 409, true, details);
  }
}

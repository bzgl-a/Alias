import { AppError } from "./AppError.js";

export class ValidationError extends AppError {
  constructor(message: string = "Validation error", details: any = null) {
    super(message, 400, true, details);
  }
}

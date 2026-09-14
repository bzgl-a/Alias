import { AppError } from "./AppError.js";

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, true);
  }
}

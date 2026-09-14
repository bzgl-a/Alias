import type { Request, Response, NextFunction } from "express";

import { AppError } from "../errors/AppError.js";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      console.error("NonOperational error:", err);
    } else {
      console.warn("Operational error:", err.message);
    }

    const response: {
      error: string;
      details?: unknown;
    } = {
      error: err.message || "Something went wrong",
    };

    if (err.isOperational && err.details !== undefined) {
      response.details = err.details;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  console.error("Unknown error:", err);

  res.status(500).json({
    error: "Internal Server Error",
  });
};

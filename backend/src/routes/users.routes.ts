import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import type { UserService } from "../services/users.service.js";
import { ValidationError } from "../errors/ValidationError.js";

export function setupUserRoutes(
  app: Application,
  userService: UserService,
): void {
  const router = express.Router();

  router.get("/", getAllUsers);
  router.get("/:id", getUserById);
  router.post("/", createUser);
  router.patch("/:id/nickname", editUserNickname);

  async function getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getUsers();

      res.json(users);
    } catch (err) {
      next(err);
    }
  }

  async function getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (typeof id !== "string") {
        throw new ValidationError("Invalid user id");
      }

      const user = await userService.getById(id);

      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async function createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { nickname } = req.body;

      if (typeof nickname !== "string" || !nickname.trim()) {
        throw new ValidationError("Nickname is required");
      }

      const user = await userService.createUser(nickname.trim());

      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  }

  async function editUserNickname(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const { nickname } = req.body;

      if (typeof id !== "string") {
        throw new ValidationError("Invalid user id");
      }

      if (typeof nickname !== "string" || !nickname.trim()) {
        throw new ValidationError("Nickname is required");
      }

      const user = await userService.updateNickname(id, nickname.trim());

      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  app.use("/api/users", router);
}

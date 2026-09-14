import { NotFoundError } from "../errors/NotFoundError.js";
import { UserRepository } from "../repositories/users.repository.js";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUsers() {
    return this.userRepository.findUsers();
  }

  async getById(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError("User");
    }

    return user;
  }

  async createUser(nickname: string) {
    return this.userRepository.create(nickname);
  }

  async updateNickname(id: string, nickname: string) {
    const user = await this.userRepository.updateNickname(id, nickname);

    if (!user) {
      throw new NotFoundError("User");
    }

    return user;
  }
}

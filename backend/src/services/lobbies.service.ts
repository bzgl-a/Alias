import { LobbyRepository } from "../repositories/lobbies.repository.js";
import { AppError } from "../errors/AppError.js";
import { generateLobbyCode } from "../utils/generateLobbyCode.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ForbiddenError } from "../errors/ForbiddenError.js";
import type { TeamRepository } from "../repositories/team.repository.js";

export class LobbyService {
  constructor(
    private readonly lobbyRepository: LobbyRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  async createLobby(hostId: string) {
    let code = generateLobbyCode();
    let attempts = 0;

    while (await this.lobbyRepository.findByCode(code)) {
      if (++attempts > 5) {
        throw new AppError("Could not generate unique lobby code");
      }
      code = generateLobbyCode();
    }

    const lobby = await this.lobbyRepository.create(code, hostId);

    if (!lobby) {
      throw new AppError("Failed to create lobby");
    }
    await this.lobbyRepository.addMember(lobby.id, hostId);

    await this.teamRepository.create({ lobbyId: lobby.id, name: "Команда 1" });
    await this.teamRepository.create({ lobbyId: lobby.id, name: "Команда 2" });

    return this.getLobbyState(lobby.id);
  }

  async joinLobby(code: string, userId: string) {
    const lobby = await this.lobbyRepository.findByCode(code.toUpperCase());

    if (!lobby) {
      throw new NotFoundError("Lobby");
    }

    await this.lobbyRepository.addMember(lobby.id, userId);

    return this.getLobbyState(lobby.id);
  }

  async leaveLobby(lobbyId: string, userId: string) {
    await this.lobbyRepository.removeMember(lobbyId, userId);
    return this.getLobbyState(lobbyId);
  }

  async setReady(lobbyId: string, userId: string, isReady: boolean) {
    const member = await this.lobbyRepository.setReady(
      lobbyId,
      userId,
      isReady,
    );

    if (!member) {
      throw new NotFoundError("Member");
    }

    return this.getLobbyState(lobbyId);
  }

  async getLobbyState(lobbyId: string) {
    const lobby = await this.lobbyRepository.findById(lobbyId);

    if (!lobby) {
      throw new NotFoundError("Lobby");
    }

    const members = await this.lobbyRepository.findMembers(lobbyId);
    const teams = await this.teamRepository.findByLobby(lobbyId);

    return { ...lobby, members, teams };
  }

  async createTeam(lobbyId: string, requesterId: string, name: string) {
    const lobby = await this.lobbyRepository.findById(lobbyId);

    if (!lobby) {
      throw new NotFoundError("Lobby");
    }

    if (lobby.hostId !== requesterId) {
      throw new ForbiddenError("Only the host can create teams");
    }

    await this.teamRepository.create({ lobbyId, name });
    return this.getLobbyState(lobbyId);
  }

  async renameTeam(
    lobbyId: string,
    requesterId: string,
    teamId: string,
    name: string,
  ) {
    const lobby = await this.lobbyRepository.findById(lobbyId);

    if (!lobby) {
      throw new NotFoundError("Lobby");
    }

    if (lobby.hostId !== requesterId) {
      throw new ForbiddenError("Only the host can rename teams");
    }

    const team = await this.teamRepository.findById(teamId);
    if (!team || team.lobbyId !== lobbyId) {
      throw new NotFoundError("Team");
    }

    await this.teamRepository.rename(teamId, name);
    return this.getLobbyState(lobbyId);
  }

  async updateSettings(
    lobbyId: string,
    requesterId: string,
    settings: { roundSeconds?: number; targetScore?: number },
  ) {
    const lobby = await this.lobbyRepository.findById(lobbyId);

    if (!lobby) {
      throw new NotFoundError("Lobby");
    }

    if (lobby.hostId !== requesterId) {
      throw new ForbiddenError("Only the host can change lobby settings");
    }

    if (lobby.status !== "waiting") {
      throw new ForbiddenError("Cannot change settings while game is running");
    }

    if (
      settings.roundSeconds === undefined &&
      settings.targetScore === undefined
    ) {
      throw new AppError("Nothing to update");
    }

    await this.lobbyRepository.updateSettings(lobbyId, settings);
    return this.getLobbyState(lobbyId);
  }

  async assignTeam(lobbyId: string, userId: string, teamId: string | null) {
    const member = await this.teamRepository.assignMember({
      lobbyId,
      userId,
      teamId,
    });

    if (!member) {
      throw new NotFoundError("Member");
    }

    return this.getLobbyState(lobbyId);
  }

  async deleteTeam(lobbyId: string, requesterId: string, teamId: string) {
    const lobby = await this.lobbyRepository.findById(lobbyId);

    if (!lobby) {
      throw new NotFoundError("Lobby");
    }

    if (lobby.hostId !== requesterId) {
      throw new ForbiddenError("Only the host can delete teams");
    }

    const deleted = await this.teamRepository.delete(teamId);

    if (!deleted) {
      throw new NotFoundError("Team");
    }

    return this.getLobbyState(lobbyId);
  }

  async resetToWaiting(lobbyId: string, requesterId: string) {
    const lobby = await this.lobbyRepository.findById(lobbyId);

    if (!lobby) {
      throw new NotFoundError("Lobby");
    }

    if (lobby.hostId !== requesterId) {
      throw new ForbiddenError("Only the host can reset the lobby");
    }

    if (lobby.status !== "finished") {
      throw new AppError("Lobby is not finished");
    }

    await this.lobbyRepository.setStatus(lobbyId, "waiting");
    await this.lobbyRepository.resetAllReady(lobbyId);
    await this.teamRepository.resetScores(lobbyId);

    return this.getLobbyState(lobbyId);
  }
}

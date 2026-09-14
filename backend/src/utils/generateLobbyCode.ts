const CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateLobbyCode(length = 6): string {
  let code = "";

  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * CHARACTERS.length);

    code += CHARACTERS[index];
  }

  return code;
}

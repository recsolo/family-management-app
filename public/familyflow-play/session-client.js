export function createSessionClient() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const host = (params.get("host") || window.location.origin).replace(/\/+$/g, "");

  if (!token) {
    throw new Error("This game link is missing its launch token.");
  }

  async function readJson(response) {
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.data) {
      throw new Error(body?.error || "The game service did not respond the way we expected.");
    }

    return body.data;
  }

  return {
    token,
    host,
    async getSession() {
      const url = new URL(`${host}/api/games/session`);
      url.searchParams.set("token", token);
      const response = await fetch(url.toString(), {
        credentials: "include",
      });
      return readJson(response);
    },
    async saveStarSprint(result) {
      const response = await fetch(`${host}/api/games/session/finish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          token,
          gameKey: "star-sprint",
          result,
        }),
      });
      return readJson(response);
    },
  };
}

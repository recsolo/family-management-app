export type ExternalGameKey = "star-sprint" | "uno";

export type ExternalGameDefinition = {
  key: ExternalGameKey;
  label: string;
  detail: string;
  path: string;
  status: "live" | "coming-soon";
};

export const EXTERNAL_GAME_CATALOG: ExternalGameDefinition[] = [
  {
    key: "star-sprint",
    label: "Star Sprint",
    detail: "A full-screen arcade run built for quick family turns.",
    path: "star-sprint.html",
    status: "live",
  },
  {
    key: "uno",
    label: "UNO Table",
    detail: "The separate full-screen UNO table is planned next.",
    path: "uno-table.html",
    status: "coming-soon",
  },
];

export function isExternalGameKey(value: unknown): value is ExternalGameKey {
  return value === "star-sprint" || value === "uno";
}

export function getExternalGameDefinition(gameKey: ExternalGameKey) {
  return EXTERNAL_GAME_CATALOG.find((entry) => entry.key === gameKey) ?? EXTERNAL_GAME_CATALOG[0];
}

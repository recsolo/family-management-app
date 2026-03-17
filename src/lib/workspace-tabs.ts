export const WORKSPACE_TAB_ROUTES = {
  dashboard: "/dashboard",
  ops: "/family-ops",
  meals: "/meal-planner",
  budget: "/budget-lab",
  family: "/family-room",
  ai: "/ai-studio",
} as const;

export const WORKSPACE_AI_CHAT_PATH = "/ai-chat";

export type ActiveTab = keyof typeof WORKSPACE_TAB_ROUTES;

export function getWorkspacePath(tab: ActiveTab) {
  return WORKSPACE_TAB_ROUTES[tab];
}

export function getActiveTabFromSegment(segment: string | null | undefined): ActiveTab {
  switch (segment) {
    case "dashboard":
      return "dashboard";
    case "family-ops":
      return "ops";
    case "meal-planner":
      return "meals";
    case "budget-lab":
      return "budget";
    case "family-room":
      return "family";
    case "ai-studio":
      return "ai";
    default:
      return "dashboard";
  }
}

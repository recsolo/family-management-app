import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspacePath } from "@/lib/workspace-tabs";

export default function FamilyInboxRoute() {
  return <WorkspaceShell activeTab="inbox" redirectPath={getWorkspacePath("inbox")} />;
}

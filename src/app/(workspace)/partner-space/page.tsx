import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspacePath } from "@/lib/workspace-tabs";

export default function PartnerSpaceRoute() {
  return <WorkspaceShell activeTab="partner" redirectPath={getWorkspacePath("partner")} />;
}

import { WorkspaceShell } from "@/components/workspace-shell";
import { getMemberProfilePath } from "@/lib/workspace-tabs";

type Props = {
  params: Promise<{
    memberId: string;
  }>;
};

export default async function MemberProfilePage({ params }: Props) {
  const { memberId } = await params;

  return <WorkspaceShell activeTab="family" view="member-profile" memberProfileId={memberId} redirectPath={getMemberProfilePath(memberId)} />;
}

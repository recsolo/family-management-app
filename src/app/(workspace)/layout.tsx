"use client";

import { useSelectedLayoutSegment } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace-shell";
import { getActiveTabFromSegment } from "@/lib/workspace-tabs";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const segment = useSelectedLayoutSegment();
  const activeTab = getActiveTabFromSegment(segment);

  return (
    <>
      <WorkspaceShell activeTab={activeTab} />
      <div className="hidden">{children}</div>
    </>
  );
}

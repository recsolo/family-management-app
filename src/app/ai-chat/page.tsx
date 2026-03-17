"use client";

import { WorkspaceShell } from "@/components/workspace-shell";
import { WORKSPACE_AI_CHAT_PATH } from "@/lib/workspace-tabs";

export default function AiChatPage() {
  return <WorkspaceShell activeTab="ai" view="focus-chat" redirectPath={WORKSPACE_AI_CHAT_PATH} />;
}

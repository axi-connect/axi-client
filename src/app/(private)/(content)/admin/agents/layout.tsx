import { AgentsProvider } from "@/modules/agents/infrastructure/stores/agent.context";

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return <AgentsProvider>{children}</AgentsProvider>;
}

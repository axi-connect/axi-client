import { AgentsProvider } from "@/modules/agents/infrastructure/store/agent.context";

export default function AgentsLayout({ children, form }: { children: React.ReactNode; form: React.ReactNode }) {
    return (
        <AgentsProvider>
            {children}
            {form}
        </AgentsProvider>
    )
}
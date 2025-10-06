import { AgentsProvider } from "./context/agents.context";

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
    return (
        <AgentsProvider>
            {children}
        </AgentsProvider>
    )
}
import { useAgent } from "@/modules/agents/infrastructure/agent.context";
import { type TreeNode, TreeView } from "@/components/features/tree-view";

export default function IntentionsTreeView() {
    const { 
        loading, error,
        intentionsOverview,
    } = useAgent();

    return (
        <TreeView<TreeNode>
            showCounts
            showPriority
            onDelete={async (node) => {
                console.log(node);
            }}
            title="Intention Tree"
            data={intentionsOverview}
            mapToNode={(x) => x as TreeNode<TreeNode>}
        />
    )
}
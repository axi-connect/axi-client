import { useAgents } from "../context/agents.context";
import { type TreeNode, TreeView } from "@/components/features/tree-view";

export default function TreeViewIntentions() {
    const { 
        loading, error,
        intentionsOverview,
    } = useAgents();

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
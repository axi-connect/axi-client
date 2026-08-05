import { Skeleton } from "@/shared/components/ui/skeleton";
import { FormsEditorSkeleton } from "@/modules/forms/ui/components/FormsEditorSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-80" />
        <Skeleton className="mt-2 h-4 w-[28rem]" />
      </div>
      <FormsEditorSkeleton />
    </div>
  );
}

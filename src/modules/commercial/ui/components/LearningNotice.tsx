import { Hourglass } from "lucide-react";

import { learningLine } from "@/modules/commercial/domain/copy";
import { Callout } from "@/shared/components/ui/callout";

/** El aviso del estado «aprendiendo»: los dos hitos del método, sin dramatizar. */
export function LearningNotice() {
  return (
    <Callout tone="info" icon={Hourglass} className="text-[13px]">
      <b className="font-semibold text-foreground">Estamos aprendiendo tu ritmo.</b> {learningLine()}
    </Callout>
  );
}

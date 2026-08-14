import type { TaskPriority } from "@/types";
import { Badge } from "@/components/ui/badge";

const VARIANT: Record<TaskPriority, "danger" | "warning" | "muted"> = {
  P0: "danger",
  P1: "warning",
  P2: "muted",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant={VARIANT[priority]}>{priority}</Badge>;
}

import { useBmsSocket } from "../hooks/useBmsSocket";
import { MetricsSummary } from "./MetricsSummary";
import { PointsTable } from "./PointsTable";

export function Dashboard() {
  // Connect socket — gets all points, local filter is applied client-side
  useBmsSocket("ALL");

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 overflow-hidden">
      <MetricsSummary />
      <PointsTable />
    </div>
  );
}

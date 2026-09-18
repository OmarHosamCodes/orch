import { useFirstRun } from "../hooks/use-first-run";
import { FirstRunView } from "../views/first-run-view";

export function FirstRunContainer() {
  const viewModel = useFirstRun();
  return <FirstRunView {...viewModel} />;
}

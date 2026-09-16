import { useState, type ReactNode } from "react";

import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import { AgencySearchSelect } from "@/features/shared/agency-search-select";
import { MemberProfileLeaveRangePicker } from "@/features/shared/date/member-profile-leave-range-picker";
import { AgencyCurrencyGlyph } from "@/features/shared/dialog-kit/agency-currency-glyph";
import { AgencyIdentityField } from "@/features/shared/dialog-kit/agency-identity-field";
import { agencyDialogChipTriggerClass } from "@/features/shared/dialog-kit/agency-compact-dialog-shell";
import { AgencyModeSegment } from "@/features/shared/dialog-kit/agency-mode-segment";
import { AgencyMomentField } from "@/features/shared/dialog-kit/agency-moment-field";
import { AgencyMoneyPair } from "@/features/shared/dialog-kit/agency-money-pair";
import { AgencyNoteField } from "@/features/shared/dialog-kit/agency-note-field";
import { AgencyPasteChipField } from "@/features/shared/dialog-kit/agency-paste-chip-field";
import { AgencyMyTasksEstimatePopover } from "@/features/task-management/my-tasks-rail/agency-my-tasks-estimate-popover";

function InputSpecimen({
  name,
  usedIn,
  children,
}: {
  name: string;
  usedIn: string[];
  children: ReactNode;
}) {
  return (
    <li className="min-w-0">
      <p className="text-sm font-semibold text-highlighted">{name}</p>
      <div className="mt-2.5">{children}</div>
      <p className="mt-2 text-[11px] text-muted">{usedIn.join(" · ")}</p>
    </li>
  );
}

function IdentitySpecimen() {
  const [value, setValue] = useState("Website refresh");
  const [iconKey, setIconKey] = useState<string | null>("briefcase");
  const [colorHueId, setColorHueId] = useState(3);
  return (
    <InputSpecimen name="Identity" usedIn={["New project", "Create task", "Edit task"]}>
      <AgencyIdentityField
        value={value}
        onChange={setValue}
        iconKey={iconKey as never}
        onIconChange={(next) => setIconKey(next)}
        colorHueId={colorHueId}
        onColorHueChange={setColorHueId}
        projectId="draft"
        placeholder="Project name"
        aria-label="Identity"
      />
    </InputSpecimen>
  );
}

function EntitySearchSpecimen() {
  const [value, setValue] = useState("USD");
  const currencyOptions = ["USD", "EGP", "EUR"];
  return (
    <InputSpecimen name="Entity search" usedIn={["Client", "Currency", "Period", "Kind"]}>
      <AgencySearchSelect
        value={value}
        onValueChange={setValue}
        options={currencyOptions.map((code) => ({
          value: code,
          label: code,
          glyph: <AgencyCurrencyGlyph code={code} />,
        }))}
        variant="chip"
        aria-label="Currency"
        className="w-28"
      />
    </InputSpecimen>
  );
}

function PeopleStackSpecimen() {
  const [assignedToTeam, setAssignedToTeam] = useState(true);
  return (
    <InputSpecimen name="People stack" usedIn={["New project", "Edit task"]}>
      <AgencyMemberChooser
        mode="multiple"
        assignedToTeam={assignedToTeam}
        selectedUserIds={[]}
        onAssignedToTeamChange={setAssignedToTeam}
        onSelectedUserIdsChange={() => {}}
        members={[]}
        placeholder="Assignees"
        triggerVariant="stack"
      />
    </InputSpecimen>
  );
}

function MoneyPairSpecimen() {
  const [amount, setAmount] = useState("12");
  const [currency, setCurrency] = useState("USD");
  return (
    <InputSpecimen name="Money pair" usedIn={["Expense", "Edit task", "Bills"]}>
      <AgencyMoneyPair
        amount={amount}
        onAmountChange={setAmount}
        currency={currency}
        onCurrencyChange={setCurrency}
        currencyOptions={["USD", "EGP", "EUR"]}
        preview="≈ EGP 580.00"
        emphasis="hero"
      />
    </InputSpecimen>
  );
}

function MomentSpecimen() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  return (
    <InputSpecimen name="Moment" usedIn={["Expense create"]}>
      <AgencyMomentField
        dateId="dev-kit-moment"
        dateValue={date}
        onDateChange={setDate}
        dateAriaLabel="Expense date"
        timeId="dev-kit-time"
        timeValue={time}
        onTimeChange={setTime}
        hint="Blank means now."
      />
    </InputSpecimen>
  );
}

function RangeSpecimen() {
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  return (
    <InputSpecimen name="Range" usedIn={["Bills create"]}>
      <MemberProfileLeaveRangePicker
        triggerId="dev-kit-range"
        startDate={range.startDate}
        endDate={range.endDate}
        emptyLabel="Invoice period"
        ariaLabel="Invoice period"
        triggerClassName={agencyDialogChipTriggerClass}
        onRangeChange={setRange}
      />
    </InputSpecimen>
  );
}

function ModeSegmentSpecimen() {
  const [value, setValue] = useState("normal");
  return (
    <InputSpecimen name="Mode segment" usedIn={["New project", "Expense", "Knowledge"]}>
      <AgencyModeSegment
        aria-label="Mode"
        value={value}
        options={[
          { value: "normal", label: "Normal" },
          { value: "journey", label: "Journey" },
        ]}
        onChange={setValue}
      />
    </InputSpecimen>
  );
}

function PasteChipSpecimen() {
  const [values, setValues] = useState<string[]>([
    "https://linear.app/issue/ABC",
    "https://github.com/orch/brainiac",
  ]);
  return (
    <InputSpecimen name="Paste chip" usedIn={["Entry links", "Knowledge source"]}>
      <AgencyPasteChipField values={values} onChange={setValues} placeholder="Paste a URL" />
    </InputSpecimen>
  );
}

function NoteSpecimen() {
  const [value, setValue] = useState("");
  return (
    <InputSpecimen name="Note" usedIn={["Expense", "Bills", "Knowledge"]}>
      <AgencyNoteField id="dev-kit-note" value={value} onChange={setValue} />
    </InputSpecimen>
  );
}

function EstimateSpecimen() {
  const [value, setValue] = useState<number | null>(null);
  return (
    <InputSpecimen name="Estimate" usedIn={["Edit task"]}>
      <AgencyMyTasksEstimatePopover value={value} onChange={setValue} />
    </InputSpecimen>
  );
}

export function DialogInputsSection() {
  return (
    <section aria-label="Smart inputs" className="mt-10">
      <h2 className="text-lg font-semibold text-highlighted">Smart inputs</h2>
      <p className="mt-1 max-w-prose text-sm text-muted">
        Compound fields that replace the old type-per-control set. Same values go to the server.
      </p>
      <ul className="mt-5 grid list-none gap-x-8 gap-y-8 p-0 sm:grid-cols-2">
        <IdentitySpecimen />
        <EntitySearchSpecimen />
        <PeopleStackSpecimen />
        <MoneyPairSpecimen />
        <MomentSpecimen />
        <RangeSpecimen />
        <ModeSegmentSpecimen />
        <PasteChipSpecimen />
        <NoteSpecimen />
        <EstimateSpecimen />
      </ul>
    </section>
  );
}

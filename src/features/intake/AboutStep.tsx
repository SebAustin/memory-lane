import type { PiiKind } from "@/domain/pii";
import { MAX_BIRTH_YEAR, MIN_BIRTH_YEAR } from "@/domain/window";
import { FIELD_LABEL } from "./form";
import { TextField } from "./TextField";
import type { StepProps } from "./stepProps";

const NAME_HINTS: readonly PiiKind[] = ["surname", "address", "diagnosis"];

/** Step 1: first name and birth year (FR-3, FR-7). The Window preview sits beside it. */
export function AboutStep({ form, errors, onChange }: StepProps) {
  return (
    <>
      <TextField
        name="firstName"
        label={FIELD_LABEL.firstName}
        hint="First name only. No surnames or addresses."
        value={form.firstName}
        error={errors.firstName}
        onChange={onChange}
        piiKinds={NAME_HINTS}
        autoCapitalize="words"
      />
      <TextField
        name="birthYear"
        label={FIELD_LABEL.birthYear}
        hint={`Four digits, from ${MIN_BIRTH_YEAR} to ${MAX_BIRTH_YEAR}.`}
        value={form.birthYear}
        error={errors.birthYear}
        onChange={onChange}
        inputMode="numeric"
        width="short"
      />
    </>
  );
}

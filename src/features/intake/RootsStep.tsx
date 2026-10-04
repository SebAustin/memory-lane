import type { PiiKind } from "@/domain/pii";
import { FIELD_LABEL } from "./form";
import { TextField } from "./TextField";
import type { StepProps } from "./stepProps";
import styles from "./Wizard.module.css";

const ROOTS_HINTS: readonly PiiKind[] = ["address", "diagnosis"];

/** Step 3: heritage, language and occupation. Every field is optional. */
export function RootsStep({ form, errors, onChange }: StepProps) {
  return (
    <>
      <p className={styles.helper}>
        Every question here is optional. We replace their name with a placeholder before anything leaves this device.
      </p>
      <TextField
        name="heritage"
        label={FIELD_LABEL.heritage}
        optional
        hint="For example Irish, Italian or Gullah Geechee."
        value={form.heritage}
        error={errors.heritage}
        onChange={onChange}
        piiKinds={ROOTS_HINTS}
        autoCapitalize="words"
      />
      <TextField
        name="language"
        label={FIELD_LABEL.language}
        optional
        value={form.language}
        error={errors.language}
        onChange={onChange}
        piiKinds={ROOTS_HINTS}
        autoCapitalize="words"
      />
      <TextField
        name="occupation"
        label={FIELD_LABEL.occupation}
        optional
        hint="For example seamstress, bus driver or teacher."
        value={form.occupation}
        error={errors.occupation}
        onChange={onChange}
        piiKinds={ROOTS_HINTS}
      />
    </>
  );
}

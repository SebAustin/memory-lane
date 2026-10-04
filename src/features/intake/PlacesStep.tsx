import type { PiiKind } from "@/domain/pii";
import { FIELD_LABEL } from "./form";
import { TextField } from "./TextField";
import type { StepProps } from "./stepProps";

const PLACE_HINTS: readonly PiiKind[] = ["address", "diagnosis"];

/** Step 2: Hometown, Young-Adult City and Care Location, in the words from UX section 3. */
export function PlacesStep({ form, errors, onChange }: StepProps) {
  return (
    <>
      <TextField
        name="hometown"
        label={FIELD_LABEL.hometown}
        hint="A town or city is enough. This is the Hometown."
        value={form.hometown}
        error={errors.hometown}
        onChange={onChange}
        piiKinds={PLACE_HINTS}
        autoCapitalize="words"
      />
      <TextField
        name="youngAdultCity"
        label={FIELD_LABEL.youngAdultCity}
        optional
        hint="Only if it is somewhere different."
        value={form.youngAdultCity}
        error={errors.youngAdultCity}
        onChange={onChange}
        piiKinds={PLACE_HINTS}
        autoCapitalize="words"
      />
      <TextField
        name="careLocation"
        label={FIELD_LABEL.careLocation}
        optional
        hint="A town or city. Not the name of a care home."
        value={form.careLocation}
        error={errors.careLocation}
        onChange={onChange}
        piiKinds={PLACE_HINTS}
        autoCapitalize="words"
      />
    </>
  );
}

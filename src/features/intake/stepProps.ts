import type { FieldErrors, FieldName, FormValues } from "./form";

/** What every field step receives from the wizard. */
export interface StepProps {
  readonly form: FormValues;
  readonly errors: FieldErrors;
  readonly onChange: (name: FieldName, value: string) => void;
}

import { useId } from "react";
import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import fieldStyles from "./TextField.module.css";
import styles from "./SelectField.module.css";

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps
  extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    "id" | "name" | "className" | "children"
  > {
  label: string;
  name: string;
  options: readonly Option[];
  error?: string;
  hint?: string;
  className?: string;
}

export default function SelectField({
  label,
  name,
  options,
  error,
  hint,
  className,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  const messageId = error || hint ? `${id}-message` : undefined;

  return (
    <div className={clsx(fieldStyles.field, className)}>
      <label htmlFor={id} className={fieldStyles.label}>
        {label}
      </label>

      <div
        className={clsx(
          fieldStyles.control,
          error && fieldStyles.invalid,
          styles.selectControl
        )}
      >
        <select
          {...rest}
          id={id}
          name={name}
          className={clsx(fieldStyles.input, styles.select)}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} className={styles.caret} aria-hidden="true" />
      </div>

      {error ? (
        <p id={messageId} className={fieldStyles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className={fieldStyles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
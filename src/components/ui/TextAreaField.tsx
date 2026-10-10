import { useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import clsx from "clsx";
import fieldStyles from "./TextField.module.css";
import styles from "./TextAreaField.module.css";

interface TextAreaFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "name" | "className"> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  className?: string;
}

export default function TextAreaField({
  label,
  name,
  error,
  hint,
  className,
  ...rest
}: TextAreaFieldProps) {
  const id = useId();
  const messageId = error || hint ? `${id}-message` : undefined;

  return (
    <div className={clsx(fieldStyles.field, className)}>
      <label htmlFor={id} className={fieldStyles.label}>
        {label}
      </label>

      <div className={clsx(fieldStyles.control, error && fieldStyles.invalid, styles.control)}>
        <textarea
          {...rest}
          id={id}
          name={name}
          className={clsx(fieldStyles.input, styles.textarea)}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
        />
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
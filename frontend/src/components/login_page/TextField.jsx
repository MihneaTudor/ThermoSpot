import { useId } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./page.css";

export default function TextField({ label, icon, error, trailing, ...inputProps }) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={`text-field ${error ? "has-error" : ""}`}>
      <label htmlFor={id} className="text-field__label">
        {label}
      </label>

      <div className="text-field__control">
        {icon && <FontAwesomeIcon icon={icon} className="text-field__icon" />}
        <input
          id={id}
          className={`text-field__input ${icon ? "has-icon" : ""} ${trailing ? "has-trailing" : ""}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {trailing && <div className="text-field__trailing">{trailing}</div>}
      </div>

      {error && (
        <p id={errorId} className="text-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
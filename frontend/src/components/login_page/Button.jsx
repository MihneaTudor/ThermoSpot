import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import "./page.css";

export default function Button({
  variant = "primary", // "primary" | "ghost"
  fullWidth = false,
  loading = false,
  icon,
  children,
  ...props
}) {
  return (
    <button
      className={`ui-button ui-button--${variant} ${fullWidth ? "ui-button--full" : ""}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : icon && <FontAwesomeIcon icon={icon} />}
      {children}
    </button>
  );
}
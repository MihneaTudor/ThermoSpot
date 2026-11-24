import { useState } from "react";
import { faEnvelope, faRightToBracket, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import AuthCard from "./AuthCard";
import TextField from "./TextField";
import PasswordField from "./PasswordField";
import Button from "./Button";
import { login, ApiError } from "../../api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = "Enter your email.";
  else if (email.trim().length > 254) errors.email = "Keep your email under 255 characters.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

export default function LoginPage({ onLogin, onGoToSignUp }) {
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleChange = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    setServerError("");
    try {
      await login(values.email.trim(), values.password);
      onLogin({ email: values.email.trim() });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Sign-in page">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          name="email"
          icon={faEnvelope}
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={254}
          value={values.email}
          onChange={handleChange("email")}
          error={errors.email}
        />

        <PasswordField
          label="Password"
          name="password"
          placeholder="Your password"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange("password")}
          error={errors.password}
        />

        {serverError && <p className="text-field__error" role="alert">{serverError}</p>}
        <Button type="submit" fullWidth icon={faRightToBracket} loading={loading}>
          Sign in
        </Button>
      </form>
      <div className="auth-signup">
        <span>Don&apos;t have an account?</span>
        <Button type="button" variant="ghost" icon={faUserPlus} onClick={onGoToSignUp}>
          Sign up
        </Button>
      </div>
    </AuthCard>
  );
}
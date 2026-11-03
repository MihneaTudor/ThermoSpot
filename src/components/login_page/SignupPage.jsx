import { useState } from "react";
import { faEnvelope, faRightToBracket, faUser, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import AuthCard from "./AuthCard";
import Button from "./Button";
import PasswordField from "./PasswordField";
import TextField from "./TextField";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[\p{L}\p{M} .'-]+$/u;

function validate({ name, email, password, confirmPassword }) {
  const errors = {};
  if (!name.trim()) errors.name = "Enter your name.";
  else if (name.trim().length > 100) errors.name = "Keep your name under 100 characters.";
  else if (!NAME_PATTERN.test(name.trim())) {
    errors.name = "Use letters, spaces, apostrophes, periods, or hyphens.";
  }
  if (!email.trim()) errors.email = "Enter your email.";
  else if (email.trim().length > 254) errors.email = "Keep your email under 255 characters.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  else if (password.length > 128) errors.password = "Use no more than 128 characters.";
  if (!confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

export default function SignupPage({ onSignup, onGoToLogin }) {
  const [values, setValues] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // TODO: replace with a real account-creation request
    onSignup({ name: values.name.trim(), email: values.email.trim() });
  };

  return (
    <AuthCard title="Create account">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Name"
          type="text"
          name="name"
          icon={faUser}
          placeholder="Your name"
          autoComplete="name"
          maxLength={100}
          value={values.name}
          onChange={handleChange("name")}
          error={errors.name}
        />

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
          placeholder="At least 8 characters"
          autoComplete="new-password"
          maxLength={128}
          value={values.password}
          onChange={handleChange("password")}
          error={errors.password}
        />

        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          maxLength={128}
          value={values.confirmPassword}
          onChange={handleChange("confirmPassword")}
          error={errors.confirmPassword}
        />

        <Button type="submit" fullWidth icon={faUserPlus}>
          Create account
        </Button>
      </form>
      <div className="auth-signup">
        <span>Already have an account?</span>
        <Button type="button" variant="ghost" icon={faRightToBracket} onClick={onGoToLogin}>
          Sign in
        </Button>
      </div>
    </AuthCard>
  );
}
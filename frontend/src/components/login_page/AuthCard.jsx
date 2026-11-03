import "./LoginPage.css";
import logo from "../../assets/logo.png";

export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__heading">
          <img className="auth-card__brand" src={logo} alt="ThermSpot" />
          <h1 className="auth-card__title">{title}</h1>
        </div>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}

        {children}

        {footer && <div className="auth-card__footer">{footer}</div>}
      </div>
    </div>
  );
}
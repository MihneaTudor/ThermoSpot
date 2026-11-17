import "./WelcomeHeader.css";
import dashboardContent from "../../data/dashboardContent.json";

export default function WelcomeHeader({ userName }) {
    return (
        <header className="welcome-header">
            <h1 className="welcome-header__title">
                {dashboardContent.welcome.title}, <span className="welcome-header__name">{userName}</span>
            </h1>
        </header>
    );
}
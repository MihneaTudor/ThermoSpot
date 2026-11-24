import { useState } from 'react'
import logo from '../assets/logo.png'
import './Header.css'

function Header({ user, onOpenDeviceDetails, onGoDashboard, onOpenLogs, onLogout }) {
    const [showMenu, setShowMenu] = useState(false)

    const displayName = user?.display_name ?? ''
    const initial = displayName.trim().charAt(0).toUpperCase() || 'U'

    return (
        <header className='header'>
            <button type='button' className='header-logo' onClick={onGoDashboard} aria-label='Go to dashboard'>
                <img src={logo} alt="ThermSpot logo" />
            </button>

            <nav className='header-nav'>
                <button type='button' className='header-nav__device' onClick={onGoDashboard}>
                    Dashboard
                </button>
                <button type='button' className='header-nav__device' onClick={onOpenDeviceDetails}>
                    Device
                </button>
                <button type='button' className='header-nav__device' onClick={() => onOpenLogs && onOpenLogs()}>
                    Logs
                </button>
            </nav>

            <div
                className='header-user'
                onMouseEnter={() => setShowMenu(true)}
                onMouseLeave={() => setShowMenu(false)}
            >
                <div className='user-avatar' onClick={() => setShowMenu((open) => !open)}>
                    {initial}
                </div>
                {showMenu && user && (
                    <div className='user-tooltip'>
                        <div className='user-tooltip__name'>{user.display_name}</div>
                        <div className='user-tooltip__email'>{user.email}</div>
                        <button type='button' className='user-tooltip__logout' onClick={() => onLogout && onLogout()}>
                            Log out
                        </button>
                    </div>
                )}
            </div>
        </header>
    )
}

export default Header
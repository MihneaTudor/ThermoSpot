import { useState } from 'react'
import dashboardContent from '../data/dashboardContent.json'
import './Header.css'

function Header({ onOpenDeviceDetails, onGoDashboard, onOpenLogs }) {
    const [showTooltip, setShowTooltip] = useState(false)
    const { header, welcome } = dashboardContent

    return (
        <header className='header'>
            <div className='header-logo'>
                <img src='/src/assets/logo.png' alt="ThermSpot logo" />
            </div>

            <nav className='header-nav'>
                <button type='button' className='header-nav__device' onClick={onGoDashboard}>
                    {header.nav[0].label}
                </button>
                <button type='button' className='header-nav__device' onClick={onOpenDeviceDetails}>
                    {header.nav[1].label}
                </button>
                <button type='button' className='header-nav__device' onClick={() => onOpenLogs && onOpenLogs()}>
                    {header.nav[2].label}
                </button>
            </nav>

            <div className='header-user'
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            ><div className='user-avatar'>U</div>
            {showTooltip && ( <div className='user-tooltip'>{welcome.loggedInAs}</div>)}
            </div>
        </header>
    )
}

export default Header
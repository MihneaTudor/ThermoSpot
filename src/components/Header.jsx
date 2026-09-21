import { useState } from 'react'
import './Header.css'

function Header() {
    const [showTooltip, setShowTooltip] = useState(false)

    return (
        <header className='header'>
            <div className='header-logo'>
                <img src='/src/assets/logo.png' alt="ThermSpot logo" />
            </div>

            <nav className='header-nav'>
                <a href='#dashboard'>Dashboard</a>
                <a href='#device'>Device</a>
                <a href='#logs'>Logs</a>
            </nav>

            <div className='header-user'
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            ><div className='user-avatar'>U</div>
            {showTooltip && ( <div className='user-tooltip'>Logged in as user</div>)}
            </div>
        </header>
    )
}

export default Header
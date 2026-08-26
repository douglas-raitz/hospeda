import { Outlet } from 'react-router'

import { useUser } from '../context/UserContext'

const Layout = () => {
  const { user, logout } = useUser()

  return (
    <>
      <header className="app-header">
        <span className="app-brand">hospeda</span>
        <div className="app-user">
          <span>{user?.first_name || user?.username}</span>
          <button type="button" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </header>

      <Outlet />
    </>
  )
}

export default Layout

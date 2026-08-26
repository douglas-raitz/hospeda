import heroImg from '../assets/hero.png'
import reactLogo from '../assets/react.svg'
import viteLogo from '../assets/vite.svg'
import { useUser } from '../context/UserContext'

const Dashboard = () => {
  const { user } = useUser()

  return (
    <section id="center">
      <div className="hero">
        <img src={heroImg} className="base" width="170" height="179" alt="" />
        <img src={reactLogo} className="framework" alt="React logo" />
        <img src={viteLogo} className="vite" alt="Vite logo" />
      </div>
      <div>
        <h1>Olá, {user?.first_name || user?.username}</h1>
        <p>
          Sessão autenticada via JWT em cookie <code>HttpOnly</code>
        </p>
      </div>
    </section>
  )
}

export default Dashboard

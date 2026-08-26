import { UserContextProvider } from './context/UserContext'
import AppRouter from './router'
import './App.css'

function App() {
  return (
    <UserContextProvider>
      <AppRouter />
    </UserContextProvider>
  )
}

export default App

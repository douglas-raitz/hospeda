import { CssBaseline, ThemeProvider } from '@mui/material'

import { UserContextProvider } from './context/UserContext'
import AppRouter from './router'
import theme from './theme'
import './App.css'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UserContextProvider>
        <AppRouter />
      </UserContextProvider>
    </ThemeProvider>
  )
}

export default App

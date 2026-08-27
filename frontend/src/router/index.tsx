import type { ReactElement, ReactNode } from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
  useLocation,
} from 'react-router'

import Layout from '../components/Layout'
import { useUser } from '../context/UserContext'
import Cadastro from '../pages/Cadastro'
import Login from '../pages/Login'
import NovaReserva from '../pages/NovaReserva'
import Reservas from '../pages/Reservas'

const Carregando = () => <p className="auth-status">Verificando sessão…</p>

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { status } = useUser()
  const location = useLocation()

  if (status === 'loading') return <Carregando />

  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { status } = useUser()

  if (status === 'loading') return <Carregando />
  if (status === 'authenticated') return <Navigate to="/reservas" replace />

  return <>{children}</>
}

const RotaNaoEncontrada = () => {
  const { status } = useUser()

  if (status === 'loading') return <Carregando />

  return <Navigate to={status === 'authenticated' ? '/reservas' : '/login'} replace />
}

const PRIVATE_URLS: { title: string; url: string; component: () => ReactElement }[] = [
  { title: 'Reservas', url: '/reservas', component: () => <Reservas /> },
  { title: 'Nova reserva', url: '/reservas/nova', component: () => <NovaReserva /> },
]

const router = createBrowserRouter(
  createRoutesFromElements([
    <Route
      key="login"
      path="/login"
      element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      }
    />,
    <Route
      key="cadastro"
      path="/cadastro"
      element={
        <PublicRoute>
          <Cadastro />
        </PublicRoute>
      }
    />,
    <Route key="raiz" path="/" element={<Navigate to="/reservas" replace />} />,
    <Route key="layout" element={<Layout />}>
      {PRIVATE_URLS.map((route) => (
        <Route
          key={route.url}
          path={route.url}
          element={
            <PrivateRoute>
              <route.component />
            </PrivateRoute>
          }
        />
      ))}
    </Route>,
    <Route key="default" path="*" element={<RotaNaoEncontrada />} />,
  ]),
)

const AppRouter = () => <RouterProvider router={router} />

export default AppRouter

import { Box } from '@mui/material'
import { Outlet } from 'react-router'

import Sidebar from './Sidebar'

const Layout = () => (
  <Box
    sx={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      textAlign: 'left',
      colorScheme: 'light',
    }}
  >
    <Sidebar />
    <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'background.default' }}>
      <Outlet />
    </Box>
  </Box>
)

export default Layout

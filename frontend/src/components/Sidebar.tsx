import LogoutIcon from '@mui/icons-material/Logout'
import { Box, Button, List, ListItemButton, ListItemText, Typography } from '@mui/material'
import { NavLink } from 'react-router'

import { useUser } from '../context/UserContext'
import { cores } from '../theme'


const ITENS = [{ rotulo: 'Reservas', url: '/reservas' }]

const Sidebar = () => {
  const { logout } = useUser()

  return (
    <Box
      component="aside"
      sx={{
        width: 235,
        flexShrink: 0,
        bgcolor: cores.menu,
        color: cores.menuTexto,
        display: 'flex',
        flexDirection: 'column',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 1.5 }}>
        <Box
          aria-hidden
          sx={{
            width: 34,
            height: 34,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 1.5,
            bgcolor: cores.verde,
            color: cores.creme,
            fontSize: 18,
          }}
        >
          H
        </Box>
        <Box>
          <Typography variant="h2" sx={{ fontSize: 17, color: cores.creme }}>
            Hospeda
          </Typography>
          <Typography variant="overline" sx={{ display: 'block', lineHeight: 1.4 }}>
            RECEPÇÃO
          </Typography>
        </Box>
      </Box>

      <List component="nav" sx={{ mt: 2, flexGrow: 1 }}>
        {ITENS.map((item) => (
          <ListItemButton
            key={item.url}
            component={NavLink}
            to={item.url}
            sx={{
              borderRadius: 2,
              color: 'inherit',
              '&.active': { bgcolor: 'rgba(255,255,255,0.08)', color: cores.creme },
            }}
          >
            <Box
              aria-hidden
              sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor', mr: 1.5 }}
            />
            <ListItemText slotProps={{ primary: { sx: { fontSize: 15, fontWeight: 600 } } }}>
              {item.rotulo}
            </ListItemText>
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', pt: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon fontSize="small" />}
          onClick={() => logout()}
          sx={{
            py: 1.1,
            color: cores.creme,
            borderColor: 'rgba(255,255,255,0.18)',
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.4)',
              bgcolor: 'rgba(255,255,255,0.06)',
            },
          }}
        >
          Sair da conta
        </Button>
      </Box>
    </Box>
  )
}

export default Sidebar

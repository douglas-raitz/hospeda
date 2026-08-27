import { createTheme } from '@mui/material/styles'

export const cores = {
  verde: '#2c5449',
  verdeEscuro: '#23443a',
  menu: '#1e332b',
  menuTexto: '#9db3a9',
  verdeSuave: '#e3ebe6',
  creme: '#f1efe8',
  cremeEscuro: '#e8e4d9',
  borda: '#dcd8cc',
  tinta: '#1c2a25',
  suave: '#8c8677',
}

const display =
  "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif"

export const mono = "ui-monospace, Consolas, monospace"

const theme = createTheme({
  palette: {
    primary: { main: cores.verde, dark: cores.verdeEscuro },
    background: { default: cores.creme, paper: '#ffffff' },
    text: { primary: cores.tinta, secondary: cores.suave },
    divider: cores.borda,
  },
  shape: { borderRadius: 10 },
  typography: {
    htmlFontSize: 18,
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
    h1: { fontFamily: display, fontSize: 30, fontWeight: 400, letterSpacing: '-0.5px' },
    h2: { fontFamily: display, fontSize: 20, fontWeight: 400 },
    overline: { fontSize: 11, letterSpacing: '1.2px', color: cores.suave, fontWeight: 500 },
    body1: { fontSize: 15 },
    body2: { fontSize: 14 },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        h1: { color: cores.tinta },
        h2: { color: cores.tinta },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          color: cores.suave,
          borderColor: cores.borda,
          '&.Mui-selected': { color: cores.verde, background: cores.verdeSuave },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: `1px solid ${cores.borda}` },
      },
    },
  },
})

export default theme

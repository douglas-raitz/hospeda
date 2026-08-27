import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router'

import { ApiError, reservasApi } from '../api'
import { combinaHospede } from '../filtros'
import type { Cobranca, Reserva, StatusReserva } from '../api'
import { mono } from '../theme'
import { currencyBR } from '../components/currency'

const ROTULO: Record<StatusReserva, string> = {
  PENDENTE: 'a chegar',
  HOSPEDADO: 'no hotel',
  FINALIZADA: 'finalizada',
  CANCELADA: 'cancelada',
}

const dia = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

const diaDoExtrato = (data: string) => {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

const acaoDe = (reserva: Reserva) =>
  reserva.status === 'PENDENTE'
    ? 'check-in'
    : reserva.status === 'HOSPEDADO'
      ? 'check-out'
      : null

const alertaDeAntecipacao = (falha: unknown): string | null => {
  if (!(falha instanceof ApiError)) return null
  const corpo = falha.data as { codigo?: string; alerta?: string } | null
  return corpo?.codigo === 'check_in_antecipado' ? (corpo.alerta ?? null) : null
}

const Reservas = () => {
  const navigate = useNavigate()
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [selecionada, setSelecionada] = useState<Reserva | null>(null)
  const [alerta, setAlerta] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [historico, setHistorico] = useState<{ reserva: Reserva; cobranca: Cobranca } | null>(
    null,
  )
  const [falhaHistorico, setFalhaHistorico] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  const carregar = useCallback(() => {
    reservasApi.listar().then(setReservas).catch(() => setReservas([]))
  }, [])

  useEffect(carregar, [carregar])

  const abrir = (reserva: Reserva) => {
    if (!acaoDe(reserva)) return
    setSelecionada(reserva)
    setAlerta(null)
    setErro(null)
  }

  const fechar = () => {
    setSelecionada(null)
  }

  const abrirHistorico = async (reserva: Reserva) => {
    setFalhaHistorico(null)
    try {
      const cobranca = await reservasApi.resumo(reserva.id)
      setHistorico({ reserva, cobranca })
    } catch {
      setFalhaHistorico('Não foi possível carregar o histórico desta reserva.')
    }
  }

  const confirmar = async (forcar = false) => {
    if (!selecionada) return
    setEnviando(true)
    setErro(null)
    try {
      if (selecionada.status === 'PENDENTE') {
        await reservasApi.checkIn(selecionada.id, forcar)
      } else {
        await reservasApi.checkOut(selecionada.id)
      }
      fechar()
      carregar()
    } catch (falha) {
      const antecipado = alertaDeAntecipacao(falha)
      if (antecipado) setAlerta(antecipado)
      else setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir.')
    } finally {
      setEnviando(false)
    }
  }

  const visiveis = reservas.filter((r) => combinaHospede(r.hospede_detalhe, busca))

  const acao = selecionada ? acaoDe(selecionada) : null

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h1">Reservas</Typography>
        <Button variant="contained" onClick={() => navigate('/reservas/nova')}>
          Nova reserva
        </Button>
      </Box>

      {falhaHistorico && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {falhaHistorico}
        </Typography>
      )}

      <TextField
        size="small"
        placeholder="Buscar por nome, documento ou telefone"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        sx={{ mt: 3, width: 360, maxWidth: '100%' }}
      />

      <Stack spacing={1.5} sx={{ mt: 2, maxWidth: 720 }}>
        {visiveis.map((reserva) => {
          const clicavel = acaoDe(reserva) !== null

          return (
            <Paper
              key={reserva.id}
              onClick={() => abrir(reserva)}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: clicavel ? 'pointer' : 'default',
                '&:hover': clicavel ? { borderColor: 'primary.main' } : undefined,
              }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {reserva.hospede_detalhe.nome}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dia(reserva.data_entrada)} → {dia(reserva.data_saida)}
                </Typography>
              </Box>

              <Chip size="small" label={ROTULO[reserva.status]} />

              {reserva.valor_total && (
                <Typography sx={{ fontFamily: mono }}>
                  {currencyBR(reserva.valor_total)}
                </Typography>
              )}

              <Button
                size="small"
                variant="outlined"
                onClick={(evento) => {
                  evento.stopPropagation()
                  void abrirHistorico(reserva)
                }}
              >
                Histórico
              </Button>
            </Paper>
          )
        })}

        {!visiveis.length && (
          <Typography color="text.secondary">
            {reservas.length
              ? 'Nenhuma reserva para essa busca.'
              : 'Nenhuma reserva registrada.'}
          </Typography>
        )}
      </Stack>

      <Dialog
        open={historico !== null}
        onClose={() => setHistorico(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Histórico da reserva</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {historico?.reserva.hospede_detalhe.nome}
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Diária</TableCell>
                <TableCell align="right">Hospedagem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historico?.cobranca.diarias.map((diaria) => (
                <TableRow key={diaria.data}>
                  <TableCell>
                    {diaDoExtrato(diaria.data)}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {diaria.fim_de_semana ? 'fim de semana' : 'seg–sex'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: mono }}>
                   {currencyBR(diaria.valor_diaria)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={0.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                Diárias ({historico?.cobranca.noites})
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: mono }}>
                {currencyBR(historico?.cobranca.total_diarias ?? 0)}
              </Typography>
            </Box>

            {historico?.cobranca.check_out_atrasado && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="warning.main">
                  Checkout após as 12h (50%)
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: mono }}>
                 {currencyBR(historico.cobranca.multa_check_out)}
                </Typography>
              </Box>
            )}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 600 }}>Total geral</Typography>
            <Typography sx={{ fontFamily: mono, fontSize: 22, color: 'primary.main' }}>
             {currencyBR(historico?.cobranca.total_geral ?? 0)}
            </Typography>
          </Box>

          {historico?.reserva.status !== 'FINALIZADA' && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Valores previstos: a reserva ainda não passou pelo checkout.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setHistorico(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={selecionada !== null} onClose={fechar} maxWidth="xs" fullWidth>
        <DialogTitle variant='h2'>{acao === 'check-in' ? 'Check-in' : 'Check-out'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Confirmar o {acao} de <strong>{selecionada?.hospede_detalhe.nome}</strong>?
          </Typography>

          {alerta && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {alerta}
            </Alert>
          )}
          {erro && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {erro}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={fechar} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={enviando}
            onClick={() => void confirmar(alerta !== null)}
          >
            {alerta ? 'Confirmar mesmo assim' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Reservas

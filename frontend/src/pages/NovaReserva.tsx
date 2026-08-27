import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router'

import { hospedesApi, reservasApi } from '../api'
import { combinaHospede } from '../filtros'
import type { Cobranca, Hospede } from '../api'
import { cores, mono } from '../theme'
import { currencyBR } from '../components/currency'

const documento = (valor: string) =>
  valor.length === 11
    ? valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : valor

const dataLocal = (data: Date) => {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}

const entradaEm = (dia: string) => `${dia}T14:00:00`
const saidaEm = (dia: string) => `${dia}T12:00:00`

const horaDeAgora = () => {
  const agora = new Date()
  return `${String(agora.getHours()).padStart(2, '0')}h${String(agora.getMinutes()).padStart(2, '0')}`
}

const Campo = ({ rotulo, children }: { rotulo: string; children: ReactNode }) => (
  <Box sx={{ flex: 1 }}>
    <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
      {rotulo}
    </Typography>
    {children}
  </Box>
)

const linhasDoExtrato = (cobranca: Cobranca) => {
  const linhas: { texto: string; valor: number }[] = []

  for (const grupo of [
    { fimDeSemana: false, rotulo: 'diária seg–sex' },
    { fimDeSemana: true, rotulo: 'diária fim de semana' },
  ]) {
    const itens = cobranca.diarias.filter((d) => d.fim_de_semana === grupo.fimDeSemana)
    if (!itens.length) continue
    const unitario = Number(itens[0].valor_diaria)
    linhas.push({
      texto: `${itens.length}× ${grupo.rotulo} (${currencyBR(unitario)})`,
      valor: itens.length * unitario,
    })
  }
  return linhas
}

const NovaReserva = () => {
  const navigate = useNavigate()
  const hoje = new Date()
  const amanha = new Date(hoje.getTime() + 86_400_000)

  const [modo, setModo] = useState<'cadastrado' | 'novo'>('cadastrado')
  const [hospedes, setHospedes] = useState<Hospede[]>([])
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<number | null>(null)
  const [novo, setNovo] = useState({ nome: '', documento: '', telefone: '' })

  const [entrada, setEntrada] = useState(dataLocal(hoje))
  const [saida, setSaida] = useState(dataLocal(amanha))

  const [cobranca, setCobranca] = useState<Cobranca | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    hospedesApi.listar().then(setHospedes).catch(() => setHospedes([]))
  }, [])

  const datasValidas = saida > entrada

  useEffect(() => {
    if (!datasValidas) return

    let cancelado = false
    reservasApi
      .estimativa({
        data_entrada: entradaEm(entrada),
        data_saida: saidaEm(saida),
      })
      .then((dados) => !cancelado && setCobranca(dados))
      .catch(() => !cancelado && setCobranca(null))

    return () => {
      cancelado = true
    }
  }, [entrada, saida, datasValidas])

  const estimativa = datasValidas ? cobranca : null

  const visiveis = hospedes.filter((h) => combinaHospede(h, busca))

  const confirmar = async () => {
    setErro(null)
    setEnviando(true)
    try {
      const hospedeId =
        modo === 'novo' ? (await hospedesApi.criar(novo)).id : selecionado
      if (!hospedeId) throw new Error('Selecione um hóspede para a reserva.')

      await reservasApi.criar({
        hospede: hospedeId,
        data_entrada: entradaEm(entrada),
        data_saida: saidaEm(saida),
      })
      navigate('/reservas')
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível reservar.')
    } finally {
      setEnviando(false)
    }
  }

  const pronto = modo === 'novo' ? novo.nome && novo.documento : selecionado !== null

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Button
            onClick={() => navigate('/reservas')}
            sx={{ ml: -1, color: 'text.secondary' }}
          >
            ‹ Voltar
          </Button>
          <Typography sx={{mb: 2}} variant="h1">Nova reserva</Typography>
        </Box>
        <Chip label={horaDeAgora()} size="small" sx={{ fontFamily: mono }} />
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Paper sx={{ p: 3, flex: '1 1 460px', maxWidth: 490 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={modo}
            onChange={(_, valor) => valor && setModo(valor)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="cadastrado">Hóspede cadastrado</ToggleButton>
            <ToggleButton value="novo">Cadastrar novo</ToggleButton>
          </ToggleButtonGroup>

          {modo === 'cadastrado' ? (
            <>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar hóspede cadastrado"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <Stack spacing={1} sx={{ mt: 2, maxHeight: 232, overflowY: 'auto' }}>
                {visiveis.map((hospede) => (
                  <Paper
                    key={hospede.id}
                    onClick={() => setSelecionado(hospede.id)}
                    sx={{
                      p: 1.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                      cursor: 'pointer',
                      borderColor:
                        selecionado === hospede.id ? cores.verde : cores.borda,
                      bgcolor:
                        selecionado === hospede.id ? cores.verdeSuave : 'background.paper',
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
                      {hospede.nome}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: mono, color: 'text.secondary' }}
                    >
                      {documento(hospede.documento)}
                    </Typography>
                  </Paper>
                ))}
                {!visiveis.length && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                    Nenhum hóspede encontrado. Use “Cadastrar novo”.
                  </Typography>
                )}
              </Stack>
            </>
          ) : (
            <Stack spacing={2}>
              <Campo rotulo="NOME">
                <TextField
                  fullWidth
                  size="small"
                  value={novo.nome}
                  onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                />
              </Campo>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Campo rotulo="DOCUMENTO">
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="somente números"
                    value={novo.documento}
                    onChange={(e) => setNovo({ ...novo, documento: e.target.value })}
                  />
                </Campo>
                <Campo rotulo="TELEFONE">
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="com DDD"
                    value={novo.telefone}
                    onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
                  />
                </Campo>
              </Box>
            </Stack>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Campo rotulo="ENTRADA">
              <TextField
                fullWidth
                size="small"
                type="date"
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
              />
            </Campo>
            <Campo rotulo="SAÍDA">
              <TextField
                fullWidth
                size="small"
                type="date"
                value={saida}
                onChange={(e) => setSaida(e.target.value)}
              />
            </Campo>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, flex: '1 1 380px', maxWidth: 500 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 2 }}>
            ESTIMATIVA
          </Typography>

          {estimativa ? (
            <>
              {linhasDoExtrato(estimativa).map((linha) => (
                <Box
                  key={linha.texto}
                  sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                >
                  <Typography variant="body2">{linha.texto}</Typography>
                  <Typography variant="body2" sx={{ fontFamily: mono }}>
                    {currencyBR(linha.valor)}
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography sx={{ fontWeight: 600 }}>Total previsto</Typography>
                <Typography sx={{ fontFamily: mono, fontSize: 26, color: cores.verde }}>
                  {currencyBR(estimativa.total_geral)}
                </Typography>
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Informe entrada e saída para ver o total.
            </Typography>
          )}

          {erro && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {erro}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3, py: 1.5 }}
            disabled={!pronto || !estimativa || enviando}
            onClick={() => void confirmar()}
          >
            {enviando ? 'Confirmando…' : 'Confirmar reserva'}
          </Button>
        </Paper>
      </Box>
    </Box>
  )
}

export default NovaReserva

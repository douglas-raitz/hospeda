import type { Hospede } from './api'

export const combinaHospede = (hospede: Hospede, termo: string) => {
  const alvo = termo.trim().toLowerCase()
  if (!alvo) return true

  const digitos = alvo.replace(/\D/g, '')

  return (
    hospede.nome.toLowerCase().includes(alvo) ||
    (digitos !== '' &&
      (hospede.documento.includes(digitos) || hospede.telefone.includes(digitos)))
  )
}

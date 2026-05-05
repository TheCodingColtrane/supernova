import type { Worker } from "./workers"

export type Defenders = {
    ativo: boolean
    atuacoes: Array<{
        data_final: Date | string
        data_inicial: Date | string
        defensoria: {
            name: string
            id: number
        }
        documento: any
        id: number
        tipo: number
        titular: any
    }>
    trabalhadores: Worker[]
    cpf: string
    credenciais_expiradas: boolean
    data_expiracao_credenciais_mni: any
    id: number
    nome: string
    servidor: number
    supervisor: any
    usuario: number
}

export type DefendersAPIResponse = {
    count: number
    next: any
    previous: any
    results: Defenders[]
}
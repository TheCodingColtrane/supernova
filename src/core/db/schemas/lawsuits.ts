export type Lawsuits = {
    id?: number
    number: string
    circuit: string
    status: string
    assisted: string
    isDefendant: boolean
    source: string
    awarenessDate: Date | string
    initialDeadline: Date | string
    deadline: Date | string
    givenDeadLine: number
    defender: {
        ativo: boolean
        atuacoes: [{
            data_final: Date | string
            data_inicial: Date | string
            defensoria: {
                name: string
                id: number
            }
            documento: null
            id: number
            tipo: number
            titular: null
        }]

        cpf: string
        credenciais_expiradas: boolean
        data_expiracao_credenciais_mni: null
        id: number
        nome: string
        servidor: number
        supervisor: null
        usuario: number
    }
} 
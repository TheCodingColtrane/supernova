export type Lawsuits = {
    id?: number
    number: string // numero do processo
    circuit: string // vara 
    status: string // status 
    assisted: string // nome do assistido
    isDefendant: boolean // reu 
    source: string // nome da API
    awarenessDate: Date | string // data de ciencia
    initialDeadline: Date | string // prazo inicial de prazo 
    deadline: Date | string // prazo final
    givenDeadLine: number // data em dias
    summon: string // intimacao
    summonURL: string // url da intimação
    class: string // tipo de ação
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
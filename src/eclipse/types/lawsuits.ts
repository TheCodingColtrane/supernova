import type { Defenders } from "./office"

export type Lawsuits = {
    id?: number
    number: string,
    circuit: string,
    status: string,
    assisted: string,
    isDefendant: boolean,
    source: string,
    awarenessDate: Date | string,
    initialDeadline: Date | string,
    deadline: Date | string,
    givenDeadLine: number,
    daysLeft?: number
    defender?: Defenders[] | Defenders
    summon?: string // intimacao
    summonURL?: string // url da intimação
    class?: string // tipo de ação
    favoriteEvents?: string[] // eventos favoritados.
    releaseDate?: string | Date // data de disponibilização
    publicDefendersOffice?: {
        id?: number
        name?: string
    } // id da defensoria
    summons?: [{
        number: string
        url: string
        status: string;
        initialDeadline: string
        deadline: string
    }]
    createdAt?: Date
    updatedAt?: Date
}


export type SummonAction =
    | 'AWARENESS'
    | 'INITIAL_PLEADING'
    | 'DEFENSE'
    | 'REPLY'
    | 'COUNTERARGUMENTS'
    | 'APPEAL'
    | 'EVIDENCE'
    | 'EXPERT_REPORT'
    | 'HEARING'
    | 'DOCUMENT_PRESENTATION'
    | 'CALCULATION'
    | 'COMPLIANCE'
    | 'PAYMENT'
    | 'STATEMENT'
    | 'RESPONSE'
    | 'OTHER'



export type SummonClassification = {
    action: SummonAction
    matchedRules: string[]
    confidence: number
    score: number
      alternatives?: {
        action: SummonAction
        score: number
    }[]
}

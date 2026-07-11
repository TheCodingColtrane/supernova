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
} 
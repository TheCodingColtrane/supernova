import type { Atuacoes } from "./api"

export type User = {
    id: number
    nome: string
    email: string
    roles: Atuacoes[]
    locality: {
        id: number
        name: string
    }
    districtCourt: string
}

export type UserPreferences = {
    office?: {
        deadlinesPriorities?: {
            highest: number
            high: number
            medium: number
            low: number
            lowest: number
        },
        customRolesDates?: Array<{
            pdoId: number
            isOdd: boolean
            startDate: string | Date
            endDate: string | Date
        }>,
        holidaysEnabled: boolean
        elapsedDaysEnabled: boolean
        customRolesEnabled: boolean
    },
    solar?: {
        experimentalFeatures?: { // recursos experimentais, código interno que manipula o solar.
            service?: { // atendimento
                eproc?: {
                    sortLawsuitDocs: false
                    concurrentDownload: false
                }
            },
            summons?: { // intimações, processos
                apiAssistedSideCall: false 
            }
        }

    }

}
export type User = {
    id: number
    nome: string
    email: string
    roles: [{
        id: number
        nome: string
    }]
    locality: {
        id: number
        name: string
    }
    districtCourt: string
}

export type UserPreferences = {
    office: {
        deadlinesPriorities: {
            highest: number
            high: number
            medium: number
            low: number
            lowest: number
        }
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
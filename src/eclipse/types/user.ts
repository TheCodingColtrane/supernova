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
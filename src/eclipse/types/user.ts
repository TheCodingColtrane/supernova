export type User = {
    id: number
    name: string
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
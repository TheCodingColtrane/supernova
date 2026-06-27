export type User = {
    id: number
    name: string
    email: string
    roles: [{
        id: number
        nome: string
    }]
    districtCourt: string
}
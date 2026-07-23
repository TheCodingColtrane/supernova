export type Workers = {
    id?: number
    defenderId: number
    name: string
    email: string
    role: "Estagiário(a)" | "Servidor(a)" | "Defensor(a)"
    joinedAt: Date
    isActive: boolean
    startDate?: Date | string 
    endDate?: Date | string
    isCriminal?: boolean
}
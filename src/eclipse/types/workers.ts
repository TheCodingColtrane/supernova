export type Worker = {
    id?: number
    defenderId: number
    name: string
    email: string
    role: "Estagiário(a)" | "Servidor(a)" | "Defensor(a)"
    joinedAt: Date
    startDate?: Date | string
    endDate?: Date | string
    isActive: boolean
    isCriminal?: boolean
}
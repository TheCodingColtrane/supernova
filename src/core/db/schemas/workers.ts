export type Worker = {
    id?: number
    name: string
    email: string
    role: "INTERN" | "PUBLIC_EMPLOYEE" | "PUBLIC_DEFENDER"
    joinedAt: Date

}
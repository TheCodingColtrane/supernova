import type { Lawsuits } from "../../types/lawsuits"
import type { Worker } from "../../types/workers"

export type Tasks = {
    id?: number
    title: string
    description: string
    status: "Não Iniciada" | "Em Andamento" | "Concluida" | "Vencida"
    createdAt?: Date 
    updatedAt?: Date
    workerId: number
    lawsuitNumber: string
    assignedTo?: Worker
    lawsuit?: Lawsuits
    dueDate: Date | string
}
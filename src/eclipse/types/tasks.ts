import type { Lawsuits } from "./lawsuits"
import type { Worker } from "./workers"

export type Tasks = {
    id?: number
    title: string
    description: string
    status: "Não Iniciada" | "Em Andamento" | "Concluida" | "Vencida"
    createdAt?: Date 
    updatedAt?: Date
    assignedTo: Worker
    lawsuit?: Lawsuits
    dueDate: Date | string
}
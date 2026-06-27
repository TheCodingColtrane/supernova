import Dexie, { type EntityTable } from "dexie";
import type { Holidays } from "./schemas/holidays";
import { baseSchema } from "./schemas/index";
import type { Lawsuits } from "./schemas/lawsuits";
import type { Tasks } from "./schemas/tasks";
import type { Workers } from "./schemas/workers";


export function dbInstance() {
    const db = new Dexie("supernova") as Dexie & {
        holidays: EntityTable<Holidays , "id">,
        lawsuits: EntityTable<Lawsuits, "id">,
        tasks: EntityTable<Tasks, "id">,
        workers: EntityTable<Workers, "id">
    }
    db.version(1).stores(baseSchema)
    return db
}
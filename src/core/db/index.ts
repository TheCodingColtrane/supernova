import Dexie, { type EntityTable } from "../../../node_modules/dexie/dist/dexie";
import type { Holidays } from "./schemas/holidays";
import { baseSchema } from "./schemas/index";
import type { Lawsuits } from "./schemas/lawsuits";
import type { Tasks } from "./schemas/tasks";

export function dbInstance() {
    const db = new Dexie("supernova") as Dexie & {
        holidays: EntityTable<Holidays , "id">,
        lawsuits: EntityTable<Lawsuits, "id">,
        tasks: EntityTable<Tasks, "id">
    }
    db.version(1).stores(baseSchema)
    return db
}
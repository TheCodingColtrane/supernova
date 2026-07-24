import { Document, Paragraph, Packer, TextRun } from "docx";
import type { Lawsuits } from "../types/lawsuits";
import { getBusinessDays } from "../utils/date";

export async function writeDOCX(lawsuits: Lawsuits[]) {
    const paragraphs = lawsuits.map(c =>
        new Paragraph({
            children: [
                new TextRun({ text: c.number, bold: true, break: 1 }),
                new TextRun({ text: c.class, break: 1 }),
                new TextRun({ text: c.circuit, break: 1 }),
                new TextRun({ text: `Link da intimação: ${c.summonURL ?? "oculto"}`, break: 1 }),
                new TextRun({ text: c.assisted, break: 1 }),
                new TextRun({ text: `Início: ${c.initialDeadline ? convertDate(String(c.initialDeadline)) : "Data inicial não definida"}`, break: 1 }),
                new TextRun({ text: `Prazo Final: ${c.deadline ? convertDate(String(c.deadline)) : "Data final não definida"}`, break: 1 }),
                new TextRun({ text: `${c.source} ${c.status}`, break: 1 }),
                new TextRun({ text: `${c.initialDeadline && c.deadline ? getDays(String(c.initialDeadline), String(c.deadline))?.days + " dias concedidos" : ""}`, break: 1 }),
                new TextRun({ text: `${c.deadline ? getDays(new Date().toISOString().split("T")[0], String(c.deadline))?.days + " dias restantes" : ""}`, break: 1 }),

            ],
            spacing: {
                after: 300, // space between reports
            },
        })
    );

    const doc = new Document({
        sections: [
            {
                children: paragraphs
            }
        ]
    })

    const file = await Packer.toBlob(doc)
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date()
    a.download = `Relatório-${today.getDate()}.${today.getMonth() - 1 > 9 ? today.getMonth() - 1 : "0" + (today.getMonth() - 1) }.${today.getFullYear()}.${today.getHours() +"h"+today.getMinutes()+"m"+today.getSeconds()+"s"}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

}

function convertDate(date: string) {
    const dateParts = date.split("-")
    return dateParts[0] + "/" + dateParts[1] + "/" + dateParts[2]
}

function getDays(earlierDate: string, endDate: string){
    if(earlierDate && endDate){
        const firstDateComponents = earlierDate.split("-")
        const lastDateComponents = endDate.split("-")
        const firstDate = new Date(Number(firstDateComponents[0]), Number(firstDateComponents[1]) - 1, Number(firstDateComponents[2]))
        const lastDate = new Date(Number(lastDateComponents[0]), Number(lastDateComponents[1]) - 1, Number(lastDateComponents[2]))
        return getBusinessDays(firstDate, lastDate, undefined, false)

    }
    
}


export function writeJSON(lawsuits: Lawsuits[]){
    const lawsuitJSON = JSON.stringify(lawsuits)
    let utf8Encode = new TextEncoder();
    const bytes = utf8Encode.encode(lawsuitJSON);
    const file = new Blob([new Uint8Array(bytes), "application/json"])
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date()
    a.download = `Relatório-${today.getDate()}.${today.getMonth() - 1 > 9 ? today.getMonth() - 1 : "0" + (today.getMonth() - 1) }.${today.getFullYear()}.${today.getHours() +"h"+today.getMinutes()+"m"+today.getSeconds()+"s"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


export async function writePDF(){
    
}
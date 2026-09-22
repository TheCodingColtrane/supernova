import { Document, Paragraph, Packer, TextRun } from "docx";
import type { Lawsuits } from "../types/lawsuits";
// import { getDeadline } from "../utils/date";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function writeDOCX(lawsuits: Lawsuits[]) {
    const paragraphs = lawsuits.map(c => {
        // const dates = getDays(String(c.initialDeadline),String(c.deadline))
        return new Paragraph({
            children: [
                new TextRun({ text: formatLawsuitNumber(c.number), bold: true, break: 1 }),
                new TextRun({ text: c.class, break: 1 }),
                new TextRun({ text: c.circuit, break: 1 }),
                new TextRun({ text: c.publicDefendersOffice?.name, break: 1 }),
                new TextRun({ text: `Link da intimação: ${c.summonURL ?? "oculto"}`, break: 1 }),
                new TextRun({ text: c.assisted, break: 1 }),
                new TextRun({ text: `Início: ${c.initialDeadline ? convertDate(String(c.initialDeadline)) : "Data inicial não definida"}`, break: 1 }),
                new TextRun({ text: `Prazo Final: ${c?.deadline ? convertDate(String(c.deadline)) : "Data final não definida"}`, break: 1 }),
                new TextRun({ text: `Data de distribuição: ${c.releaseDate ? new Date(c.releaseDate).toLocaleString() : "Data de distribuição não definida"}`, break: 1 }),
                new TextRun({ text: `${c.source} ${c.status}`, break: 1 }),
            ],
            spacing: {
                after: 300, // space between reports
            },
        })


    }


    );

    paragraphs.unshift(new Paragraph({
        alignment: "center",
        text: "Os prazos do dia. Relatório emitido" + new Date().toLocaleString() + "\n \n",

    }))

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
    a.download = `Relatório-${today.getDate()}.${today.getMonth() - 1 > 9 ? today.getMonth() - 1 : "0" + (today.getMonth() - 1)}.${today.getFullYear()}.${today.getHours() + "h" + today.getMinutes() + "m" + today.getSeconds() + "s"}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

}

function convertDate(date: string) {
    const dateParts = date.split("-")
    return dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0]
}

function formatLawsuitNumber(number: string) {
    return `${number.substring(0, 7)}-${number.substring(7, 9)}.${number.substring(9, 13)}.${number[13]}.${number.substring(14, 16)}.${number.substring(16)}`
}
export function writeJSON(lawsuits: Lawsuits[]) {
    const lawsuitJSON = JSON.stringify(lawsuits)
    let utf8Encode = new TextEncoder();
    const bytes = utf8Encode.encode(lawsuitJSON);
    const file = new Blob([new Uint8Array(bytes), "application/json"])
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date()
    a.download = `Relatório-${today.getDate()}.${today.getMonth() - 1 > 9 ? today.getMonth() - 1 : "0" + (today.getMonth() - 1)}.${today.getFullYear()}.${today.getHours() + "h" + today.getMinutes() + "m" + today.getSeconds() + "s"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


export async function writePDF(lawsuits: Lawsuits[]) {
    const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
});
    pdf.text("Relatório de Processos", 14, 15)
   autoTable(pdf, {
    startY: 25,
    theme: 'grid',

    margin: {
        top: 15,
        right: 10,
        bottom: 15,
        left: 10
    },

    styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'middle'
    },

    headStyles: {
        fontSize: 7,
        halign: 'center',
        valign: 'middle'
    },

    columnStyles: {
        0: { cellWidth: 20 }, // Status
        1: { cellWidth: 35 }, // Processo
        2: { cellWidth: 35 }, // Classe
        3: { cellWidth: 25 }, // Vara
        4: { cellWidth: 35 }, // Defensoria
        5: { cellWidth: 45 }, // Assistido
        6: { cellWidth: 25 }, // Prazo Inicial
        7: { cellWidth: 25 }  // Prazo Final
    },
        head: [["Status", "Processo", "Classe", "Vara", "Defensoria", "Assistido", "Prazo Inicial", "Prazo Final"]],
        body: lawsuits.map(item => [
            item.status,
            formatLawsuitNumber(item.number),
            item.class ?? "",
            item.circuit,
            item.publicDefendersOffice?.name ?? "",
            `${item.assisted} ${item.isDefendant ? "(passivo)" : "(ativo)"}`,
            convertDate(String(item.initialDeadline)),
            convertDate(String(item.deadline))
        ])
    });
    const today = new Date()
    pdf.save(`Relatório-${today.getDate()}.${today.getMonth() - 1 > 9 ? today.getMonth() - 1 : "0" + (today.getMonth() - 1)}.${today.getFullYear()}.${today.getHours() + "h" + today.getMinutes() + "m" + today.getSeconds() + "s"}.pdf`);


}
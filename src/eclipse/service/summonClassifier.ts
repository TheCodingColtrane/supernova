import type { SummonAction, SummonClassification } from "../types/lawsuits"

function normalizeSummonText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const classificationRuleSet = [
  {
    action: 'DEFENSE',
    weight: 100,
    patterns: [
      /\bapresentar contestacao\b/,
      /\bapresentar a contestacao\b/,
      /\boferecer contestacao\b/,
      /\boferecer a contestacao\b/,
      /\bapresentar defesa\b/,
      /\bapresentar a defesa\b/,
      /\boferecer defesa\b/,
      /\boferecer a defesa\b/,
      /\bcontestar a acao\b/,
      /\bcontestar o pedido\b/,
      /\bapresentar resposta do reu\b/,
      /\bapresentar resposta à acusacao\b/,
      /\bapresentar resposta a acusacao\b/
    ]
  },

  {
    action: 'REPLY',
    weight: 100,
    patterns: [
      /apresentar\s+replica/,
      /manifestar[-\s]+se\s+(sobre|acerca)\s+(a|da)\s+contestacao/,
      /\bapresentar replica\b/,
      /\bapresentar a replica\b/,
      /\boferecer replica\b/,
      /\bmanifestar[-\s]+se sobre a contestacao\b/,
      /\bmanifestar[-\s]+se acerca da contestacao\b/,
      /\bmanifestar[-\s]+se sobre a defesa\b/,
      /\bmanifestar[-\s]+se acerca da defesa\b/,
      /\bresponder a contestacao\b/,
      /\bresponder à contestacao\b/,
      /\bimpugnar a contestacao\b/,
      /\bimpugnar a defesa\b/
    ]
  },

  {
    action: 'COUNTERARGUMENTS',
    weight: 40,
    patterns: [
        /\bapresentar contrarrazoes\b/,
        /\bapresentar as contrarrazoes\b/,
        /\boferecer contrarrazoes\b/,
        /\boferecer as contrarrazoes\b/,
        /\bapresentar resposta ao recurso\b/,
        /\bapresentar resposta ao agravo\b/,
        /\bresponder ao recurso\b/,
        /\bresponder ao agravo\b/,
        /\bcontrarrazoar\b/
    ]
},

{
    action: 'APPEAL',
    weight: 50,
    patterns: [
        /\binterpor recurso\b/,
        /\binterpor o recurso\b/,
        /\binterpor apelacao\b/,
        /\binterpor a apelacao\b/,
        /\binterpor agravo\b/,
        /\binterpor agravo de instrumento\b/,
        /\binterpor recurso inominado\b/,
        /\binterpor embargos de declaracao\b/,
        /\bopor embargos de declaracao\b/,
        /\bapresentar recurso\b/,
        /\bapresentar apelacao\b/,
        /\bapresentar agravo\b/,
        /\brecorrer da sentenca\b/,
        /\brecorrer da decisao\b/
    ]
},

{
    action: 'EVIDENCE',
    weight: 35,
    patterns: [
        /\bespecificar as provas\b/,
        /\bespecificar provas\b/,
        /\bindicar as provas\b/,
        /\bindicar provas\b/,
        /\brequerer a producao de provas\b/,
        /\brequerer producao de provas\b/,
        /\bproduzir provas\b/,
        /\bproduzir as provas\b/,
        /\bjustificar a necessidade da prova\b/,
        /\bmanifestar[-\s]+se sobre as provas\b/,
        /\bmanifestar[-\s]+se acerca das provas\b/,
        /\brol de testemunhas\b/,
        /\bapresentar rol de testemunhas\b/,
        /\bindicar testemunhas\b/
    ]
},

{
    action: 'EXPERT_REPORT',
    weight: 40,
    patterns: [
        /\bmanifestar[-\s]+se sobre o laudo pericial\b/,
        /\bmanifestar[-\s]+se acerca do laudo pericial\b/,
        /\bmanifestar[-\s]+se sobre o laudo\b/,
        /\bimpugnar o laudo pericial\b/,
        /\bimpugnar o laudo\b/,
        /\bapresentar quesitos\b/,
        /\bformular quesitos\b/,
        /\bapresentar quesitos suplementares\b/,
        /\bindicar assistente tecnico\b/,
        /\bindicar assistente técnico\b/,
        /\bmanifestar[-\s]+se sobre a pericia\b/,
        /\bmanifestar[-\s]+se acerca da pericia\b/,
        /\brequerer nova pericia\b/,
        /\bimpugnar a pericia\b/
    ]
},
{
    action: 'HEARING',
    weight: 20,
    patterns: [
        /\bcomparecer a audiencia\b/,
        /\bcomparecer à audiencia\b/,
        /\bcomparecer na audiencia\b/,
        /\baudiencia de conciliacao\b/,
        /\baudiencia de instrucao\b/,
        /\baudiencia de instrucao e julgamento\b/,
        /\baudiencia de mediacao\b/,
        /\bdesignada audiencia\b/,
        /\baudiencia por videoconferencia\b/,
        /\baudiencia virtual\b/,
        /\bparticipar da audiencia\b/
    ]
},
{
    action: 'DOCUMENT_PRESENTATION',
    weight: 15,
    patterns: [
        /\bjuntar documentos\b/,
        /\bjuntar documento\b/,
        /\bapresentar documentos\b/,
        /\bapresentar documento\b/,
        /\bjuntada de documentos\b/,
        /\bcomprovar documentalmente\b/,
        /\bapresentar comprovante\b/,
        /\bapresentar comprovantes\b/,
        /\bjuntar comprovante\b/,
        /\bjuntar comprovantes\b/,
        /\bregularizar a documentacao\b/,
        /\bregularizar a documentação\b/,
        /\bcomplementar a documentacao\b/,
        /\bcomplementar a documentação\b/
    ]
},
{
    action: 'CALCULATION',
    weight: 30,
    patterns: [
        /\bapresentar calculos\b/,
        /\bapresentar cálculos\b/,
        /\bapresentar memoria de calculo\b/,
        /\bapresentar memória de cálculo\b/,
        /\belaborar calculos\b/,
        /\belaborar cálculos\b/,
        /\bapresentar planilha de calculo\b/,
        /\bapresentar planilha de cálculo\b/,
        /\batualizar os calculos\b/,
        /\batualizar os cálculos\b/,
        /\bapurar o valor\b/,
        /\bapresentar o valor atualizado\b/,
        /\bapresentar calculo do debito\b/
    ]
},
{
    action: 'COMPLIANCE',
    weight: 20,
    patterns: [
        /\bcumprir a determinacao\b/,
        /\bcumprir a determinação\b/,
        /\bcumprir a decisao\b/,
        /\bcumprir a decisão\b/,
        /\bcumprir o despacho\b/,
        /\bcumprir o determinado\b/,
        /\bcumprir integralmente\b/,
        /\bcomprovar o cumprimento\b/,
        /\bregularizar\b/,
        /\bproceder à regularizacao\b/,
        /\bproceder a regularizacao\b/
    ]
},
{
    action: 'PAYMENT',
    weight: 20,
    patterns: [
        /\befetuar o pagamento\b/,
        /\brealizar o pagamento\b/,
        /\bproceder ao pagamento\b/,
        /\bcomprovar o pagamento\b/,
        /\bcomprovar o deposito\b/,
        /\bcomprovar o depósito\b/,
        /\bdepositar o valor\b/,
        /\bdepositar a quantia\b/,
        /\brecolher as custas\b/,
        /\brecolher custas\b/,
        /\bpagar as custas\b/,
        /\bcomprovar o recolhimento\b/
    ]
},
{
    action: 'STATEMENT',
    weight: 10,
    patterns: [
        /\bmanifestar[-\s]+se\b/,
        /\bmanifeste[-\s]+se\b/,
        /\bdizer sobre\b/,
        /\bdizer acerca de\b/,
        /\bse pronunciar\b/,
        /\bpronunciar[-\s]+se\b/,
        /\bprestar esclarecimentos\b/,
        /\bprestar os esclarecimentos\b/
    ]
},
{
    action: 'RESPONSE',
    weight: 25,
    patterns: [
        /\bapresentar resposta\b/,
        /\bapresentar resposta ao pedido\b/,
        /\bresponder ao pedido\b/,
        /\bresponder à manifestação\b/,
        /\bmanifestar[-\s]+se sobre a manifestação\b/,
        /\bmanifestar[-\s]+se acerca da manifestação\b/,
        /\bresponder aos argumentos\b/,
        /\bimpugnar a manifestação\b/,
        /\bimpugnar os argumentos\b/
    ]
}




]



// function calculateConfidence(matches: SummonAction[]) {

// }

export function classifySummon(text: string): SummonClassification {
  const normalized = normalizeSummonText(text)

  const matches = classificationRuleSet
    .map(rule => {
      const matched = rule.patterns.filter(p => p.test(normalized))

      return {
        action: rule.action,
        score: matched.length * rule.weight,
        matchedRules: matched.map(String)
      }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!matches.length) {
    return {
      action: 'OTHER',
      score: 0,
      confidence: 0,
      matchedRules: []
    }
  }

  return {
    action: matches[0].action as SummonAction,
    score: matches[0].score,
    confidence: 0,//calculateConfidence(matches),
    matchedRules: matches[0].matchedRules
  }
}

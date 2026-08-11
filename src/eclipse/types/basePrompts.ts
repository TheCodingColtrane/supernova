export interface Prompt {
  results: PromptResult[]
}

export interface PromptResult {
  id: string
  nome: string
  contexto: string
  objetivo: string
  instrucoes: Instruc[]
  regras_obrigatorias: string[]
  formato_saida: string[]
}

export interface Instruc {
  titulo: string
  itens: string[]
}

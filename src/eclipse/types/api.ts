export interface SolarAPIResponse {
  results: SolarResponse[];
  defensores: Defensores[];
  avisos: {
    count: number;
    results: SolarResponse[]
  }
  options: Options;
}

interface Options {
  defensorias: Defensoria2[];
  defensores: Defensores[];
  sistemas: Defensoria2[];
  prioridades: Defensoria2[];
  etiquetas: Etiqueta[];
  defensoriasComAtuacao: Defensoria2[];
}
interface Etiqueta {
  type: string;
  id: number;
  nome: string;
  cor: string;
  defensoria: number;
  usuarios_autorizados: any[];
}

interface Defensoria2 {
  type: string;
  id: number;
  nome: string;
}

interface Defensores {
  id: number;
  nome: string;
  cpf: string;
  servidor: number;
  usuario: number;
  supervisor?: any;
  atuacoes: Atuacoes[];
  data_expiracao_credenciais_mni?: string;
  credenciais_expiradas: boolean;
  ativo: boolean;
}
interface Atuacoes {
  id: number;
  tipo: number;
  data_inicial: string;
  data_final?: string;
  defensoria: Defensoria;
  titular?: any;
  documento?: any;
}

interface Defensoria {
  id: number;
  nome: string;
}

export interface SolarResponse {
  id: string;
  comunicacao: Comunicacao;
  evento?: Evento;
  situacao: string;
  esta_aberto: boolean;
  esta_fechado: boolean;
  grau: number;
  cadastrado_em: string;
  modificado_em: string;
  desativado_em?: any;
  numero: string;
  tipo: string;
  tipo_documento?: any;
  meio_comunicacao: number;
  processo: Processo;
  destinatario: Destinatario;
  polo_destinatario?: string;
  data_disponibilizacao: string;
  prazo: number;
  prazo_ciencia: string;
  prazo_inicial: string;
  prazo_final: string;
  prazo_alterado: boolean;
  prioridades: string[];
  outros_parametros: Outrosparametros2;
  comunicacao_tipo_prazo: string;
  sistema_webservice: string;
  usuario_webservice: string;
  curadoria: boolean;
  distribuido: boolean;
  distribuido_em: string;
  distribuido_cpf: string;
  distribuido_defensoria: string;
  etiquetas: any[];
  aviso_original?: string;
  caixa?: any;
  cpf_responsavel_fechamento?: any;
  justificativa_fechamento?: any;
  fechado_em?: any;
  tem_analise?: any;
  defensor: string;
}
interface Outrosparametros2 {
  identificadorMovimento?: string;
  descricaoMovimento?: string;
  dataHoraMovimento?: string;
  codigoMovimento?: string;
  codigoCNJ?: string;
  prazo?: string;
  status?: string;
  inicioPrazo?: string;
  finalPrazo?: string;
}

interface Processo {
  polo?: any;
  assunto: Assunto[] | string;
  magistradoAtuante: any[];
  processoVinculado: any[];
  prioridade: any[];
  outroParametro: OutroParametro[];
  valorCausa?: number;
  orgaoJulgador: OrgaoJulgador;
  outrosnumeros: any[];
  numero: string;
  competencia: number;
  classeProcessual: number;
  codigoLocalidade?: string;
  nivelSigilo: number;
  intervencaoMP?: boolean;
  tamanhoProcesso?: number;
  dataAjuizamento: string;
  classe: Classe;
}
interface Classe {
  codigo: number;
  nome: string;
}
interface OrgaoJulgador {
  codigoOrgao: string;
  nomeOrgao: string;
  instancia: string;
  codigoMunicipioIBGE: number;
}
interface OutroParametro {
  nome: string;
  valor: string;
}
interface Assunto {
  codigoNacional: number;
  assuntoLocal?: any;
  principal: boolean;
}
interface Evento {
  numero: number;
  data_protocolo: string;
  descricao: string;
  tipo_local: string;
  tipo_nacional: string;
}
interface Comunicacao {
  id: string;
  documentos: Documento[];
  cadastrado_em: string;
  modificado_em: string;
  desativado_em?: any;
  numero: string;
  tipo: string;
  tipo_prazo: string;
  data_referencia: string;
  prazo: number;
  nivel_sigilo: number;
  processo: string;
  destinatario: Destinatario;
  teor?: string;
  outros_parametros: Outrosparametros;
}
interface Outrosparametros {
  meioComunicacao?: string;
  dataHoraInicioPrazo?: string;
  dataInicioPrazo?: string;
}
interface Destinatario {
  pessoa: Pessoa;
  interessePublico?: any;
  advogado: any[];
  pessoaProcessualRelacionada: any[];
  assistenciaJudiciaria?: boolean;
  intimacaoPendente?: number;
  relacionamentoProcessual?: any;
  _value_1?: any;
}
interface Pessoa {
  outroNome: any[];
  documento: any[];
  endereco: any[];
  pessoaRelacionada: any[];
  pessoaVinculada?: any;
  nome: string;
  sexo?: string;
  nomeGenitor?: string;
  nomeGenitora?: string;
  dataNascimento?: string;
  dataObito?: string;
  numeroDocumentoPrincipal?: string;
  tipoPessoa?: string;
  cidadeNatural?: any;
  estadoNatural?: any;
  nacionalidade?: string;
}

interface Parametros2 {
}
interface Documento {
  documento: string;
  evento: number;
  tipo: string;
  nome: string;
  vinculado?: any;
  vinculados: Documento[];
  tipo_local: string;
  data_protocolo: string;
  nivel_sigilo: number;
  mimetype: string;
  hash_conteudo: string;
  parametros: Parametros | Parametros2;
}
interface Parametros {
  rotulo: string;
  tamanho: string;
}
export interface Welcome {
    data:     Date;
    sucesso:  boolean;
    mensagem: null;
    processo: Processo;
}

export interface Processo {
    id:                                   ID;
    numero:                               string;
    classe:                               Classe;
    localidade:                           Localidade;
    orgao_julgador:                       Competencia;
    competencia:                          Competencia;
    assuntos:                             Assunto[];
    vinculados:                           any[];
    consulta_alteracao:                   null;
    motivo_bloqueio:                      null;
    honorario_situacao:                   string;
    cadastrado_em:                        Date;
    modificado_em:                        Date;
    desativado_em:                        null;
    tipo_webservice:                      string;
    sistema_webservice:                   SistemaWebservice;
    sistemas_webservice:                  SistemaWebservice[];
    migrado_sistema_data:                 null;
    curadoria:                            boolean;
    chave:                                null;
    grau:                                 number;
    area_de_vara:                         null;
    nivel_sigilo:                         number;
    intervencao_mp:                       boolean;
    valor_causa:                          number;
    orgao_julgador_origem:                null;
    magistrado_que_proferiu_ato_judicial: null;
    prioridades:                          any[];
    data_primeiro_movimento:              Date;
    data_ultimo_movimento:                null;
    data_ultima_atualizacao:              Date;
    data_ultima_modificacao:              Date;
    atualizado:                           boolean;
    atualizando:                          Date;
    na_fila_para_execucao:                boolean;
    desbloqueando:                        null;
    sigiloso:                             boolean;
    parametros:                           ProcessoParametros;
    arquivado:                            boolean;
    data_bloqueio:                        null;
    total_erros:                          number;
    partes:                               Parte[];
    eventos:                              Evento[];
    existe_no_solar:                      boolean;
}

export interface Assunto {
    principal:           boolean;
    nacional:            boolean;
    codigo:              number;
    codigo_pai_nacional: null;
    nome:                string;
}

export interface Classe {
    codigo:     number;
    nome:       string;
    inquerito:  boolean;
    acao_penal: boolean;
}

export interface Competencia {
    codigo: string;
    nome:   string;
}

export interface Evento {
    id:                     string;
    documentos:             Documento[];
    cadastrado_em:          Date;
    modificado_em:          Date;
    desativado_em:          null;
    numero:                 number;
    data_protocolo:         Date;
    descricao:              string;
    descricao_amigavel:     null;
    descricao_complementar: null;
    nivel_sigilo:           number | null;
    tipo_local:             null | string;
    tipo_nacional:          null | string;
    usuario:                null;
    defensoria:             boolean;
    ficticio:               boolean;
    complementos:           any[];
    sistema_webservice:     SistemaWebservice | null;
    eventos:                any[];
    processo:               ID;
}

export interface Documento {
    documento:      string;
    evento:         number | null;
    tipo:           string;
    nome:           string;
    vinculado:      null;
    vinculados:     Vinculado[];
    tipo_local:     null;
    data_protocolo: Date;
    nivel_sigilo:   number;
    mimetype:       Mimetype;
    hash_conteudo:  string;
    parametros:     DocumentoParametros;
}

export enum Mimetype {
    ApplicationPDF = "application/pdf",
    TextHTML = "text/html",
}

export interface DocumentoParametros {
}

export interface Vinculado {
    documento:      string;
    evento:         null;
    tipo:           string;
    nome:           string;
    vinculado:      boolean;
    vinculados:     any[];
    tipo_local:     null;
    data_protocolo: Date;
    nivel_sigilo:   number;
    mimetype:       Mimetype;
    hash_conteudo:  string;
    parametros:     VinculadoParametros;
}

export interface VinculadoParametros {
    "mni:pje:documento:numeroOrdem"?: string;
}

export enum ID {
    The685C6Fdacbb18Eded718E50A = "685c6fdacbb18eded718e50a",
}

export enum SistemaWebservice {
    PJE1GMg = "PJE-1G-MG",
    PJE2GMg = "PJE-2G-MG",
    EPROC1GMg = "EPROC-1G-MG",
    EPROC2GMg = "EPROC-2G-MG"

}

export interface Localidade {
    codigo:  number;
    nome:    string;
    comarca: number;
}

export interface ProcessoParametros {
    "mni:pje:pedidoLiminarOuAntecipacaoTutela": string;
    "mni:situacaoProcesso":                     string;
}

export interface Parte {
    id:            string;
    pessoa:        Pessoa;
    advogados:     Advogado[];
    cadastrado_em: Date;
    modificado_em: Date;
    desativado_em: null;
    tipo:          string;
    processo:      ID;
}

export interface Advogado {
    endereco:             null;
    nome:                 string;
    documento_principal:  null | string;
    identidade_principal: null;
    tipo_representante:   string;
}

export interface Pessoa {
    documentos:          any[];
    enderecos:           Endereco[];
    pessoa_vinculada:    null;
    tipo:                string;
    documento_principal: string;
    nome:                string;
    outro_nome:          null;
    nome_genitor:        null;
    nome_genitora:       null | string;
    data_nascimento:     Date;
    data_obito:          null;
    sexo:                null | string;
    cidade_natural:      null | string;
    estado_natural:      null | string;
    nacionalidade:       null | string;
}

export interface Endereco {
    cep:         string;
    logradouro:  string;
    numero:      string;
    complemento: null | string;
    bairro:      string;
    cidade:      string;
    estado:      string;
    pais:        null;
}

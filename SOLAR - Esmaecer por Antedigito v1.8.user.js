// ==UserScript==
// @name         SOLAR - Esmaecer por Antedígito
// @namespace    https://solar.defensoria.mg.def.br/
// @version      1.8
// @description  Esmaece as comunicações processuais que não são de responsabilidade do defensor — por antedígito (7º dígito do sequencial CNJ) e por período de atuação em cada defensoria. Aviso em texto no hover. Funciona na página v2 (Comunicações Processuais) e na página antiga de intimações.
// @author       Automação Defensoria
// @match        https://solar.defensoria.mg.def.br/v2/*
// @match        https://solar.defensoria.mg.def.br/processo/intimacao/buscar/*
// @grant        none
// ==/UserScript==

/* HISTÓRICO DE VERSÕES
 * 1.0 — Esmaecimento por antedígito (7º dígito do sequencial CNJ) na página v2; widget circular flutuante
 *       com os modos Todos/ímpares/pares; validade opcional; tooltip com o Galo no hover.
 * 1.1 — Widget circular substituído por botão "Filtrar Antedígito" na linha nativa de botões; filtro por
 *       perfil/defensoria (Padrão/Sem filtro/ímpares/pares); suporte à página antiga de intimações;
 *       tooltip com fundo claro contínuo; validade global com reset de fábrica ao vencer.
 * 1.2 — Tooltip com PAR/ÍMPAR em maiúsculas e 10% menor; botão espelha fonte, altura, padding e bordas do
 *       botão nativo ao lado; rótulo centralizado (inline-flex).
 * 1.3 — Perfis passam a vir das ATUAÇÕES ATIVAS do próprio defensor (GET /defensor/<id>/atuacoes/, id do
 *       cookie de sessão): acaba o acúmulo de perfis já encerrados e de nomes espúrios lidos da tela;
 *       nova opção "Defensoria de cadastro" (perfil permanente, editável, sem filtro por padrão);
 *       correção do layout quebrado no primeiro carregamento — o botão passa a ser rígido (flex 0 0 auto),
 *       a linha nativa ganha quebra automática (não encolhe mais os botões do SOLAR) e a escolha da linha
 *       de destino prefere a visível com mais botões, com reposicionamento e reespelhamento contínuos.
 * 1.4 — Período de responsabilidade por perfil: fora do período o aviso é esmaecido qualquer que seja o
 *       antedígito; dentro dele vale o filtro por antedígito. As datas vêm preenchidas da própria
 *       designação no SOLAR (data_ini/data_fim da atuação) e são editáveis; há também um período geral,
 *       usado nos perfis sem datas próprias e nos avisos de defensorias não vinculadas. A data comparada
 *       é a de expedição/comunicação do aviso. Avisos de defensoria não vinculada ganham contorno vermelho
 *       discreto (mesma moldura do Divisor de PDFs). Tooltip passa a dizer o motivo com a data explícita.
 *       Defensoria de cadastro identificada pela atuação sem data de fim. Campo "Válido até" removido.
 *       CORREÇÃO: a detecção do número do processo ignorava os avisos quando outro script injeta um
 *       elemento dentro do número (era o caso do "Copiar Número do Processo", que zerava o filtro na
 *       grade da v2); agora usa o elemento mais interno que contém o número, não a folha da árvore.
 *       Ainda na 1.4, quatro acréscimos de usabilidade e segurança: (a) configuração isolada por
 *       defensor — a chave do localStorage ganha o id no sufixo e a chave antiga é migrada uma única
 *       vez, para que outra pessoa logada no mesmo navegador não herde o filtro nem os nomes das suas
 *       defensorias; (b) contador de esmaecidos no rótulo do botão; (c) alerta no painel quando o
 *       filtro esmaece TODOS os avisos da tela; (d) vigia de vínculo — designação nova aparece marcada
 *       no painel, com ponto vermelho no botão, e cada perfil com prazo mostra quanto falta para o fim.
 * 1.5 — CORREÇÃO do piscar na página antiga de intimações: a data do aviso era lida do outerHTML da
 *       linha, que passa a conter o próprio atributo data-galo-motivo gravado pelo script ("Antes de
 *       12/08/2026"); na passada seguinte essa era a primeira data encontrada, a linha desmarcava e o
 *       ciclo recomeçava a cada 2 s — só nas linhas cortadas por DATA, porque o motivo por antedígito
 *       não contém data. Agora o outerHTML serve apenas para identificar a defensoria (que na página
 *       antiga vive num atributo) e a data vem sempre do texto visível. Também: período geral
 *       preenchido com a data de ingresso da designação quando há exatamente dois perfis vinculados
 *       (com três ou mais volta a ser opcional), sem nunca sobrescrever edição manual; botão mostra só
 *       o número de esmaecidos; painel reorganizado — nome do perfil em destaque, marcas viram
 *       etiquetas, rótulos de seção recuam e o resumo final ganha respiro, com uma linha por perfil.
 * 1.6 — CORREÇÃO: o diálogo "Cadastrar Processo Judicial" da v2 era tratado como se fosse um aviso da
 *       lista. Ele traz o número do processo e o nome da defensoria TRUNCADO pelo select ("... CONFLITO
 *       ..."), que não casa com nenhum perfil vinculado — resultado: o modal inteiro ganhava o contorno
 *       vermelho de "Defensoria não vinculada", com o Galo por cima do formulário, e ainda entrava na
 *       contagem do botão. Agora a varredura ignora o que está dentro de diálogos e modais, nas duas
 *       páginas (o modal da v2 é um DIV.MuiModal-root com role="presentation", sem aria-modal) e,
 *       além disso, o filtro inteiro fica suspenso enquanto houver diálogo aberto na tela: o processo
 *       em cadastro ainda não é vinculado a defensoria nenhuma, então nada ali deve ser apontado.
 *       Ao fechar o diálogo, o esmaecimento é reaplicado na passada seguinte.
 * 1.7 — O painel deixa de ser cortado pela borda da janela. Antes ele era ancorado à direita do botão
 *       (position: absolute), e bastava o botão ficar perto de uma borda — ou a página estar com zoom —
 *       para metade do painel sair da tela. Agora ele é posicionado contra a janela (position: fixed) a
 *       cada abertura, redesenho, rolagem e redimensionamento: tenta alinhar pela direita do botão,
 *       depois pela esquerda e, se não couber de nenhum lado, CENTRALIZA; na vertical abre para baixo,
 *       para cima se não couber, e ganha rolagem própria quando é mais alto que a janela.
 *       Ainda na 1.7: filtro por CONJUNTO DE DÍGITOS além de par/ímpar — no filtro geral e em cada
 *       perfil, a opção "Responsável pelos dígitos" abre um campo livre que aceita "0,1,2", "0-3" e
 *       "3 e 7" (par e ímpar continuam como atalhos). E leitura da distribuição no NOME da defensoria
 *       ("- IMPAR", "DIGITO 6", "DIGITOS 3 e 7", "DIGITOS 0 a 3"): enquanto o perfil estiver em
 *       "Padrão", o painel mostra a sugestão com um botão "aplicar".
 * 1.8 — Removida a imagem embutida do tooltip: cai a constante GALO_B64 (JPEG em base64) e o <img> que a
 *       desenhava; o aviso do hover passa a ser apenas o texto do motivo. A caixa perde a largura fixa de
 *       135 px, que existia para caber a imagem de 126 px, e passa a se ajustar ao texto (máx. 230 px).
 */

(function () {
    'use strict';

    const CONFIG = {
        STORAGE_KEY: 'solar-galo-antedigito',
        ROTA_V2: 'buscar-processos-judiciais',
        CHECK_INTERVAL: 2000,
        DEBOUNCE: 200,
        // altura máxima plausível de um card; trava a subida na árvore quando
        // a página tem um único resultado (sem segundo CNJ para delimitar)
        ALTURA_MAX_CARD: 700,
        // revalidação das atuações ativas (uma requisição GET barata)
        TTL_PERFIS: 30 * 60 * 1000,
        // tempo tolerado sem a linha nativa de botões antes de recorrer à posição fixa
        CARENCIA_ANCORA: 8000,
        COR_MOLDURA: '#d9534f',
    };

    const CNJ_RE = /(\d{7})-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
    const PAG_ANTIGA = location.pathname.includes('/processo/intimacao/buscar');
    const T_INICIO = Date.now();


    // ─── Configuração persistida ──────────────────────────────────────────────────
    // { modoGeral: 'todos'|'impar'|'par',
    //   perfis: { 'NOME': 'padrao'|'sem'|'impar'|'par' },
    //   periodos: { 'NOME': { ini: 'YYYY-MM-DD'|null, fim: 'YYYY-MM-DD'|null, manual: bool } },
    //   periodoGeral: { ini, fim }, perfisAtivos: ['NOME'], cadastro: 'NOME'|null,
    //   defensorId: '208'|null, perfisEm: timestamp }
    // 'impar' = responsável pelos ímpares (esmaece os pares); 'par' = o inverso.

    const MODOS_PERFIL = ['padrao', 'sem', 'impar', 'par', 'digitos'];
    const RE_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

    function normalizar(nome) {
        return (nome || '').toUpperCase().replace(/\s+/g, ' ').trim();
    }

    function dataValida(v) {
        return (typeof v === 'string' && RE_DATA_ISO.test(v)) ? v : null;
    }

    function periodoLimpo(p) {
        if (!p || typeof p !== 'object') return { ini: null, fim: null, manual: false };
        return { ini: dataValida(p.ini), fim: dataValida(p.fim), manual: !!p.manual };
    }

    // Id do defensor logado, lido do cookie de sessão. O cookie é um JSON dentro de
    // string, com aspas escapadas (\") e vírgulas como \054 (padrão Django): remover
    // as barras antes de casar grudaria o \054 nos dígitos e daria o id de outra pessoa.
    function idDoCookie() {
        try {
            const bruto = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('user='));
            if (bruto) {
                const m = decodeURIComponent(bruto.slice(5)).match(/\\?"servidor_id\\?"\s*:\s*(\d{1,8})(?!\d)/);
                if (m) return m[1];
            }
        } catch (e) { /* cookie ausente ou ilegível */ }
        return null;
    }

    // Armazenamento isolado por usuário: sem o sufixo, outro defensor que logasse neste
    // navegador herdaria o filtro e enxergaria os nomes das defensorias alheias.
    function chaveConfig() {
        const id = idDoCookie();
        return id ? CONFIG.STORAGE_KEY + '.' + id : CONFIG.STORAGE_KEY;
    }

    // Migração única da chave sem sufixo (v1.0 a v1.4 inicial) para a chave do usuário.
    function migrarConfigLegado() {
        const chave = chaveConfig();
        if (chave === CONFIG.STORAGE_KEY) return; // sem id no cookie: nada a isolar
        const legado = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (legado === null) return;
        if (localStorage.getItem(chave) === null) localStorage.setItem(chave, legado);
        localStorage.removeItem(CONFIG.STORAGE_KEY); // já copiado; deixá-lo vazaria para o próximo usuário
    }

    function lerConfig() {
        let cfg;
        try { cfg = JSON.parse(localStorage.getItem(chaveConfig())) || {}; } catch (e) { cfg = {}; }
        if (cfg.mode && !cfg.modoGeral) { cfg.modoGeral = cfg.mode; delete cfg.mode; } // migração v1.0
        delete cfg.validade;                                                            // saiu na v1.4
        if (!['impar', 'par', 'digitos'].includes(cfg.modoGeral)) cfg.modoGeral = 'todos';
        if (!cfg.perfis || typeof cfg.perfis !== 'object' || Array.isArray(cfg.perfis)) cfg.perfis = {};
        for (const k of Object.keys(cfg.perfis)) {
            if (!MODOS_PERFIL.includes(cfg.perfis[k])) cfg.perfis[k] = 'padrao';
        }
        if (!cfg.digitos || typeof cfg.digitos !== 'object' || Array.isArray(cfg.digitos)) cfg.digitos = {};
        for (const k of Object.keys(cfg.digitos)) cfg.digitos[k] = String(cfg.digitos[k] || '').slice(0, 40);
        cfg.digitosGeral = String(cfg.digitosGeral || '').slice(0, 40);
        if (!cfg.periodos || typeof cfg.periodos !== 'object' || Array.isArray(cfg.periodos)) cfg.periodos = {};
        for (const k of Object.keys(cfg.periodos)) cfg.periodos[k] = periodoLimpo(cfg.periodos[k]);
        cfg.periodoGeral = periodoLimpo(cfg.periodoGeral);
        if (!Array.isArray(cfg.perfisAtivos)) cfg.perfisAtivos = [];
        if (typeof cfg.cadastro !== 'string') cfg.cadastro = null;
        if (typeof cfg.defensorId !== 'string') cfg.defensorId = null;
        if (typeof cfg.perfisEm !== 'number') cfg.perfisEm = 0;
        cfg.novos = Array.isArray(cfg.novos) ? cfg.novos.filter(n => typeof n === 'string') : [];
        return cfg;
    }

    function salvarConfig(cfg) {
        localStorage.setItem(chaveConfig(), JSON.stringify(cfg));
    }

    function modoEfetivo(cfg, nomePerfil) {
        const proprio = nomePerfil && cfg.perfis[nomePerfil] ? cfg.perfis[nomePerfil] : 'padrao';
        return proprio === 'padrao' ? cfg.modoGeral : proprio;
    }

    // Período do perfil quando ele tem datas próprias; caso contrário, o período geral.
    function periodoEfetivo(cfg, nomePerfil) {
        const p = nomePerfil && cfg.periodos[nomePerfil];
        if (p && (p.ini || p.fim)) return p;
        return cfg.periodoGeral;
    }

    function algumFiltroAtivo(cfg) {
        if (cfg.modoGeral !== 'todos') return true;
        if (cfg.periodoGeral.ini || cfg.periodoGeral.fim) return true;
        return perfisExibidos(cfg).some(n => {
            if (modoEfetivo(cfg, n) === 'sem') return false;
            const p = cfg.periodos[n];
            return modoEfetivo(cfg, n) !== 'todos' || (p && (p.ini || p.fim));
        });
    }

    function ordenarPorNumero(nomes) {
        return nomes.slice().sort((a, b) => {
            const na = parseInt((a.match(/^(\d+)ª/) || [])[1] || '9999', 10);
            const nb = parseInt((b.match(/^(\d+)ª/) || [])[1] || '9999', 10);
            return na !== nb ? na - nb : a.localeCompare(b, 'pt-BR');
        });
    }

    // Perfis exibidos no painel: apenas as atuações ativas (mais a defensoria de
    // cadastro, que é permanente por definição).
    function perfisExibidos(cfg) {
        const conj = new Set(cfg.perfisAtivos);
        if (cfg.cadastro) conj.add(cfg.cadastro);
        return ordenarPorNumero([...conj]);
    }

    function formatarDataBR(iso) {
        const [a, m, d] = iso.split('-');
        return `${d}/${m}/${a}`;
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ─── Perfis vinculados: fonte autoritativa ────────────────────────────────────
    // O SOLAR expõe as atuações do defensor em /defensor/<id>/atuacoes/. O id é o
    // "servidor_id" do cookie de sessão do próprio usuário logado — nenhum outro id
    // é consultado, e nada sai do navegador.

    function idDoDefensor(cfg) {
        // último id conhecido como reserva, para não perder a lista sem o cookie
        return idDoCookie() || cfg.defensorId;
    }

    // Dias que faltam para uma data (negativo quando já passou), sem depender de fuso.
    function diasAte(iso) {
        const [a, m, d] = iso.split('-').map(Number);
        const agora = new Date();
        const hoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
        return Math.round((Date.UTC(a, m - 1, d) - hoje) / 86400000);
    }

    function textoPrazo(iso) {
        const n = diasAte(iso);
        if (n < 0) return 'terminou em ' + formatarDataBR(iso);
        if (n === 0) return 'termina hoje';
        if (n === 1) return 'termina amanhã';
        return `termina em ${n} dias`;
    }

    function rotuloCurto(nome) {
        return (nome.match(/^\d+ª/) || [nome.split(' ')[0]])[0];
    }

    // Aceita "0,1,2", "0-3" e "3 e 7"; devolve os dígitos como números, sem repetição.
    function parseDigitos(txt) {
        const set = new Set();
        String(txt || '').split(/[^0-9-]+/).filter(Boolean).forEach(p => {
            const m = p.match(/^(\d)-(\d)$/);
            if (m) {
                let a = +m[1], b = +m[2];
                if (a > b) { const t = a; a = b; b = t; }
                for (let i = a; i <= b; i++) set.add(i);
            } else {
                for (const c of p) if (c >= '0' && c <= '9') set.add(+c);
            }
        });
        return [...set].sort();
    }

    // Dígitos que valem para o perfil: os dele quando o modo é próprio, os gerais quando herda.
    function digitosEfetivos(cfg, nome) {
        const proprio = nome && cfg.perfis[nome];
        return parseDigitos(proprio === 'digitos' ? cfg.digitos[nome] : cfg.digitosGeral);
    }

    // A DPMG escreve a divisão no próprio nome da defensoria: "- IMPAR", "DIGITO 6",
    // "DIGITOS 3 e 7", "DIGITOS 0 a 3". Quando dá para ler, o painel oferece o filtro pronto.
    function sugestaoDoNome(nome) {
        const t = normalizar(nome);
        const m = t.match(/D[IÍ]GITOS?\s+(\d(?:\s*(?:,|E|ATÉ|ATE|A|-)\s*\d)*)/);
        if (m) {
            const lista = parseDigitos(m[1].replace(/\s*(?:ATÉ|ATE|A|-)\s*/g, '-').replace(/\s*(?:,|E)\s*/g, ','));
            if (lista.length) return { modo: 'digitos', digitos: lista.join(','), rotulo: 'dígitos ' + lista.join(', ') };
        }
        if (/(^|[^A-ZÀ-Ÿ])[IÍ]MPAR(ES)?([^A-ZÀ-Ÿ]|$)/.test(t)) return { modo: 'impar', digitos: '', rotulo: 'ímpares' };
        if (/(^|[^A-ZÀ-Ÿ])PAR(ES)?([^A-ZÀ-Ÿ]|$)/.test(t)) return { modo: 'par', digitos: '', rotulo: 'pares' };
        return null;
    }

    // As datas da atuação chegam em ISO com meia-noite UTC; a fatia YYYY-MM-DD é a
    // data pretendida (converter para o fuso local jogaria o dia para trás).
    function diaDaAtuacao(iso) {
        return (typeof iso === 'string' && iso.length >= 10) ? dataValida(iso.slice(0, 10)) : null;
    }

    let buscandoPerfis = false;

    async function atualizarPerfisVinculados(forcar) {
        if (buscandoPerfis) return;
        const cfg = lerConfig();
        if (!forcar && cfg.perfisEm && Date.now() - cfg.perfisEm < CONFIG.TTL_PERFIS) return;

        const id = idDoDefensor(cfg);
        if (!id) return;

        buscandoPerfis = true;
        try {
            const resp = await fetch('/defensor/' + encodeURIComponent(id) + '/atuacoes/',
                { credentials: 'include', headers: { Accept: 'application/json' } });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const lista = await resp.json();
            if (!Array.isArray(lista)) throw new Error('resposta inesperada');

            const atuacoes = new Map(); // nome -> { ini, fim }
            for (const a of lista) {
                if (!a || a.ativo === false || !a.defensoria || !a.defensoria.nome) continue;
                atuacoes.set(normalizar(a.defensoria.nome), {
                    ini: diaDaAtuacao(a.data_ini),
                    fim: diaDaAtuacao(a.data_fim),
                });
            }
            const ativos = ordenarPorNumero([...atuacoes.keys()]);

            const atual = lerConfig();
            // vigia de vínculo: o que apareceu desde a última leitura (a primeira leitura
            // não gera novidade — seria marcar tudo o que já existia)
            const primeiraLeitura = !atual.perfisEm;
            const anteriores = new Set(atual.perfisAtivos);
            atual.novos = primeiraLeitura ? []
                : [...new Set([...atual.novos, ...ativos.filter(n => !anteriores.has(n))])].filter(n => ativos.includes(n));

            atual.defensorId = String(id);
            atual.perfisEm = Date.now();
            atual.perfisAtivos = ativos;

            // Defensoria de cadastro = a atuação permanente (sem data de fim). Mantém a
            // escolha do usuário enquanto ela continuar ativa.
            if (!atual.cadastro || !ativos.includes(atual.cadastro)) {
                const permanente = ativos.find(n => !atuacoes.get(n).fim);
                atual.cadastro = permanente || (ativos.length === 1 ? ativos[0] : atual.cadastro);
            }

            // Poda: só sobrevivem os perfis ativos e a defensoria de cadastro.
            const manter = new Set(ativos);
            if (atual.cadastro) manter.add(atual.cadastro);
            for (const k of Object.keys(atual.perfis)) if (!manter.has(k)) delete atual.perfis[k];
            for (const k of Object.keys(atual.periodos)) if (!manter.has(k)) delete atual.periodos[k];

            for (const n of manter) {
                if (!(n in atual.perfis)) atual.perfis[n] = (n === atual.cadastro) ? 'sem' : 'padrao';
                const daAtuacao = atuacoes.get(n);
                const guardado = atual.periodos[n];
                // datas editadas à mão são preservadas; as demais acompanham a designação
                if (daAtuacao && (!guardado || !guardado.manual)) {
                    atual.periodos[n] = { ini: daAtuacao.ini, fim: daAtuacao.fim, manual: false };
                } else if (!guardado) {
                    atual.periodos[n] = { ini: null, fim: null, manual: false };
                }
            }

            // Com exatamente dois perfis (a defensoria de cadastro e uma designação), a data de
            // ingresso da designação vale também como corte geral — inclusive para avisos de
            // defensorias não vinculadas. Com três ou mais, não há uma data única: o geral volta a
            // ser opcional. Datas gerais editadas à mão nunca são tocadas.
            if (!atual.periodoGeral.manual) {
                const designacao = ativos.length !== 2 ? null
                    : (atual.cadastro ? ativos.find(n => n !== atual.cadastro)
                                      : ativos.find(n => atuacoes.get(n).fim));
                const p = designacao ? atuacoes.get(designacao) : null;
                atual.periodoGeral.ini = (p && p.ini) ? p.ini : null;
            }

            salvarConfig(atual);
            renderPainel(atual);
            atualizarBotao(atual);
            aplicar();
        } catch (e) {
            console.warn('[SOLAR Galo] não foi possível ler as defensorias vinculadas: ' + (e && e.message || e));
        } finally {
            buscandoPerfis = false;
        }
    }

    // ─── Estilos ──────────────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        .galo-esmaecido:not(tr) { opacity: 0.35 !important; filter: grayscale(60%); transition: opacity 0.25s ease, filter 0.25s ease; }
        .galo-esmaecido:not(tr):hover { opacity: 0.55 !important; }
        tr.galo-esmaecido > td { opacity: 0.35; filter: grayscale(60%); transition: opacity 0.25s ease, filter 0.25s ease; }
        tr.galo-esmaecido:hover > td { opacity: 0.55; }
        .galo-alheio:not(tr) { box-shadow: inset 0 0 0 2px ${CONFIG.COR_MOLDURA}; border-radius: 4px; }
        tr.galo-alheio > td { box-shadow: inset 0 0 0 2px ${CONFIG.COR_MOLDURA}; }

        #galo-tooltip { position: fixed; display: none; z-index: 2147483647; background: #fafafa; border-radius: 9px;
            box-shadow: 0 5px 22px rgba(0,0,0,0.25); padding: 7px 11px 8px; max-width: 230px; text-align: center;
            pointer-events: none; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
        #galo-tooltip .galo-tip-txt { font-size: 13.5px; color: #222; font-weight: 700; line-height: 1.3; }

        #galo-wrap { position: relative; display: inline-block; flex: 0 0 auto; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
        #galo-btn { display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;
            background: #fff; color: #1a1a1a; border: 1px solid #1a1a1a; border-radius: 18px; padding: 7px 16px;
            font-size: 13.5px; font-weight: 500; cursor: pointer; box-shadow: 0 2px 3px rgba(0,0,0,0.12);
            font-family: inherit; line-height: 1.45; text-transform: none; transition: background 0.15s, color 0.15s; }
        #galo-btn:hover { background: #f2f2f2; }
        #galo-btn.galo-ativo { background: #1a1a1a; color: #fff; }
        #galo-btn.galo-ativo:hover { background: #333; }

        /* posição definida por posicionarPainel(): fixa em relação à janela, nunca cortada pela borda */
        #galo-panel { display: none; position: fixed; top: 0; left: 0; z-index: 99999; background: #fff;
            border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 8px 28px rgba(0,0,0,0.22); padding: 15px 17px;
            width: 340px; max-width: calc(100vw - 16px); max-height: calc(100vh - 24px); overflow-y: auto;
            font-size: 13px; color: #333; text-align: left; cursor: default; }
        #galo-panel.galo-aberto { display: block; }
        #galo-panel .galo-titulo { font-weight: 600; color: #1a1a1a; margin-bottom: 9px; font-size: 13.5px; }
        #galo-panel label.galo-opt { display: flex; align-items: center; gap: 7px; padding: 3.5px 0; cursor: pointer;
            font-weight: normal; margin: 0; color: #333; font-size: 13px; }
        #galo-panel input[type="radio"] { accent-color: #1a1a1a; margin: 0; cursor: pointer; position: static; }
        #galo-panel .galo-secao { margin-top: 13px; padding-top: 11px; border-top: 1px solid #eee; }
        /* rótulo de seção recua: quem manda na leitura é o nome do perfil */
        #galo-panel .galo-sub { font-weight: 600; color: #8a8a8a; font-size: 10.5px; margin-bottom: 7px;
            text-transform: uppercase; letter-spacing: 0.05em; }
        #galo-panel .galo-perfil { padding: 9px 0 2px; }
        #galo-panel .galo-perfil + .galo-perfil { border-top: 1px solid #f4f4f4; }
        #galo-panel .galo-pnome { display: block; font-size: 12px; font-weight: 600; line-height: 1.3; color: #1a1a1a; }
        #galo-panel .galo-marcas { display: flex; flex-wrap: wrap; gap: 4px; margin: 5px 0 7px; }
        #galo-panel .galo-marca { font-size: 10px; line-height: 17px; padding: 0 7px; border-radius: 9px;
            background: #f1f1f1; color: #5c5c5c; white-space: nowrap; }
        #galo-panel .galo-marca-cadastro { background: #1a1a1a; color: #fff; }
        #galo-panel .galo-marca-nova { background: #fdf3f2; color: #8a3b36; box-shadow: inset 0 0 0 1px #f0c9c6; }
        #galo-panel .galo-datas { display: flex; align-items: center; gap: 5px; margin-top: 5px; flex-wrap: wrap;
            font-size: 11px; color: #8a8a8a; }
        #galo-panel select.galo-sel { font-size: 12px; border: 1px solid #ccc; border-radius: 6px; padding: 2px 5px;
            color: #333; background: #fff; width: auto; height: auto; cursor: pointer; max-width: 100%; }
        #galo-panel select#galo-cadastro { width: 100%; }
        /* largura fixa: na página antiga o Bootstrap estica os inputs e quebra o "de / até" */
        #galo-panel input.galo-data { border: 1px solid #ccc; border-radius: 6px; padding: 2px 5px; font-size: 11.5px;
            color: #333; font-family: inherit; width: 118px; max-width: 45%; height: auto; flex: 0 0 auto;
            box-sizing: content-box; }
        #galo-panel .galo-linha-dig { margin: 5px 0 1px; }
        #galo-panel input.galo-digitos { border: 1px solid #ccc; border-radius: 6px; padding: 3px 7px; font-size: 12px;
            color: #333; font-family: inherit; width: 150px; max-width: 100%; }
        #galo-panel .galo-sugestao { margin: 6px 0 1px; font-size: 11px; color: #5c5c5c; line-height: 1.45; }
        #galo-panel .galo-aplicar { border: 1px solid #1a1a1a; background: #fff; color: #1a1a1a; border-radius: 9px;
            font-size: 10.5px; line-height: 16px; padding: 0 8px; cursor: pointer; font-family: inherit; }
        #galo-panel .galo-aplicar:hover { background: #1a1a1a; color: #fff; }
        #galo-panel .galo-hint { color: #999; font-size: 11px; font-weight: normal; text-transform: none; letter-spacing: 0; }
        /* resumo: afastado do último perfil, menor e em itálico — é leitura de conferência */
        #galo-panel .galo-status { margin-top: 16px; padding-top: 12px; border-top: 1px solid #eee;
            font-size: 11px; color: #6b6b6b; font-style: italic; line-height: 1.55; }
        #galo-panel .galo-status div + div { margin-top: 3px; }
        #galo-panel .galo-alerta { margin-top: 10px; padding: 7px 9px; border-radius: 6px; background: #fdf3f2;
            border: 1px solid #f0c9c6; color: #8a3b36; font-size: 11.5px; line-height: 1.4; }
        #galo-panel .galo-alerta:empty { display: none; }
        #galo-btn.galo-novo::after { content: ''; display: inline-block; width: 7px; height: 7px; border-radius: 50%;
            background: ${CONFIG.COR_MOLDURA}; margin-left: 7px; flex: 0 0 auto; }
    `;
    document.head.appendChild(style);

    // ─── Tooltip do motivo ────────────────────────────────────────────────────────
    const tip = document.createElement('div');
    tip.id = 'galo-tooltip';
    tip.innerHTML = `<div class="galo-tip-txt"></div>`;
    document.body.appendChild(tip);

    function posicionarTip(e) {
        const margem = 18;
        const r = tip.getBoundingClientRect();
        let x = e.clientX + margem;
        let y = e.clientY + margem;
        if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - margem;
        if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - margem;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
    }

    document.addEventListener('mouseover', e => {
        const alvo = e.target && e.target.closest ? e.target.closest('.galo-esmaecido, .galo-alheio') : null;
        if (!alvo || !alvo.dataset.galoMotivo) {
            tip.style.display = 'none';
            return;
        }
        tip.querySelector('.galo-tip-txt').textContent = alvo.dataset.galoMotivo;
        tip.style.display = 'block';
        posicionarTip(e);
    });

    document.addEventListener('mousemove', e => {
        if (tip.style.display === 'block') posicionarTip(e);
    });

    // ─── Botão + painel ───────────────────────────────────────────────────────────

    // A v2 mantém mais de uma linha de botões no DOM (uma delas oculta, com menos
    // botões). Escolhe a melhor: visível na frente, depois a de mais botões.
    function acharBotaoReferencia() {
        const cands = Array.from(document.querySelectorAll('button')).filter(b =>
            b.id !== 'galo-btn' && /avisos atribu[ií]dos a mim/i.test(b.textContent || ''));
        if (!cands.length) return null;
        let melhor = null, melhorNota = -1;
        for (const b of cands) {
            const r = b.getBoundingClientRect();
            const visivel = r.width > 0 && r.height > 0;
            const irmaos = b.parentElement ? b.parentElement.children.length : 0;
            const nota = (visivel ? 1000 : 0) + irmaos;
            if (nota > melhorNota) { melhorNota = nota; melhor = b; }
        }
        return melhor;
    }

    // Copia do botão nativo as métricas visuais (fonte, tamanho, padding, raio das
    // bordas), preservando as cores preto e branco do filtro.
    function espelharEstilo(meuBtn, ref) {
        if (!meuBtn || !ref || ref.offsetWidth === 0) return false;
        const cs = getComputedStyle(ref);
        ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform', 'lineHeight',
         'borderRadius', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
         'minHeight', 'height', 'boxSizing', 'boxShadow'].forEach(p => { meuBtn.style[p] = cs[p]; });
        meuBtn.dataset.galoEspelho = cs.fontSize + '|' + cs.borderRadius + '|' + cs.height;
        return true;
    }

    // A linha nativa é um flex de largura contada: sem permitir quebra, o botão novo
    // espremeria os botões do SOLAR (foi o "design quebrado" do primeiro carregamento).
    function permitirQuebra(linha) {
        if (!linha || linha.dataset.galoQuebra === '1') return;
        const cs = getComputedStyle(linha);
        if (cs.display.includes('flex') && cs.flexWrap === 'nowrap') {
            linha.style.flexWrap = 'wrap';
            linha.dataset.galoQuebra = '1';
        }
    }

    function htmlPainel(cfg) {
        const campoDigitos = (chave, valor) =>
            `<div class="galo-linha-dig"><input type="text" class="galo-digitos" data-alvo="${chave}" maxlength="40"
                value="${esc(valor || '')}" placeholder="ex.: 0,1,2 ou 0-3"></div>`;

        const radios = [
            ['todos', 'Ver todos (sem filtro)'],
            ['impar', 'Responsável pelos ímpares'],
            ['par', 'Responsável pelos pares'],
            ['digitos', 'Responsável pelos dígitos'],
        ].map(([v, t]) =>
            `<label class="galo-opt"><input type="radio" name="galo-modo-geral" value="${v}"${cfg.modoGeral === v ? ' checked' : ''}> ${t}</label>`
        ).join('') + (cfg.modoGeral === 'digitos' ? campoDigitos('__geral__', cfg.digitosGeral) : '');

        const lista = perfisExibidos(cfg);

        const opcoesCadastro = lista.map(n =>
            `<option value="${encodeURIComponent(n)}"${cfg.cadastro === n ? ' selected' : ''}>${esc(n)}</option>`
        ).join('');

        const opcoesPerfil = sel => [
            ['padrao', 'Padrão (segue o filtro geral)'],
            ['sem', 'Sem filtro'],
            ['impar', 'Responsável: ímpares'],
            ['par', 'Responsável: pares'],
            ['digitos', 'Responsável: dígitos...'],
        ].map(([v, t]) => `<option value="${v}"${sel === v ? ' selected' : ''}>${t}</option>`).join('');

        const linhaDatas = (chave, per) => `
            <div class="galo-datas">de
                <input type="date" class="galo-data" data-alvo="${chave}" data-campo="ini" value="${per.ini || ''}">
                até
                <input type="date" class="galo-data" data-alvo="${chave}" data-campo="fim" value="${per.fim || ''}">
            </div>`;

        const perfis = lista.map(nome => {
            const modo = cfg.perfis[nome] || 'padrao';
            const per = cfg.periodos[nome] || { ini: null, fim: null };
            const chave = encodeURIComponent(nome);
            const marcas = [
                nome === cfg.cadastro ? '<span class="galo-marca galo-marca-cadastro">cadastro</span>' : '',
                cfg.novos.includes(nome) ? '<span class="galo-marca galo-marca-nova">designação nova</span>' : '',
                per.fim ? `<span class="galo-marca">${esc(textoPrazo(per.fim))}</span>` : '',
            ].filter(Boolean).join('');
            // sugestão lida do próprio nome da defensoria, oferecida só enquanto o perfil
            // estiver em "Padrão" — depois de configurado, some
            const sug = modo === 'padrao' ? sugestaoDoNome(nome) : null;
            const sugestao = sug
                ? `<div class="galo-sugestao">O nome indica <b>${esc(sug.rotulo)}</b>.
                    <button type="button" class="galo-aplicar" data-perfil="${chave}" data-modo="${sug.modo}" data-digitos="${esc(sug.digitos)}">aplicar</button></div>`
                : '';
            return `<div class="galo-perfil"><span class="galo-pnome">${esc(nome)}</span>
                ${marcas ? `<div class="galo-marcas">${marcas}</div>` : ''}
                <select class="galo-sel galo-perfil-sel" data-perfil="${chave}">${opcoesPerfil(modo)}</select>
                ${modo === 'digitos' ? campoDigitos(chave, cfg.digitos[nome]) : ''}${sugestao}
                ${modo === 'sem' ? '' : linhaDatas(chave, per)}</div>`;
        }).join('') || '<div class="galo-hint">Nenhuma defensoria vinculada foi lida ainda.</div>';

        return `
            <div class="galo-titulo">Filtrar Antedígito</div>
            ${radios}
            <div class="galo-secao">
                <div class="galo-sub">Período geral <span class="galo-hint">(opcional)</span></div>
                ${linhaDatas('__geral__', cfg.periodoGeral)}
            </div>
            <div class="galo-secao">
                <div class="galo-sub">Defensoria de cadastro <span class="galo-hint">(vínculo permanente)</span></div>
                <select class="galo-sel" id="galo-cadastro"><option value="">— nenhuma —</option>${opcoesCadastro}</select>
            </div>
            <div class="galo-secao">
                <div class="galo-sub">Perfis <span class="galo-hint">(filtro e período de cada um)</span></div>
                ${perfis}
            </div>
            <div class="galo-status"></div>
            <div class="galo-alerta"></div>`;
    }

    // Avisos que dependem do estado da tela, não só da configuração.
    function textoAlerta(cfg) {
        const partes = [];
        if (cfg.novos.length) {
            partes.push('Designação nova: ' + cfg.novos.map(rotuloCurto).join(', ') + '. Defina o filtro dela abaixo.');
        }
        if (contagem.total > 0 && contagem.esmaecidos === contagem.total) {
            partes.push(`Todos os ${contagem.total} avisos desta tela estão esmaecidos — confira o filtro.`);
        }
        return partes.join(' ');
    }

    function atualizarAlerta(cfg) {
        const el = document.querySelector('#galo-panel .galo-alerta');
        if (el) el.textContent = textoAlerta(cfg || lerConfig());
    }

    // Uma linha por perfil: em bloco corrido as situações se confundiam entre si.
    function resumoLinhas(cfg) {
        const nomes = perfisExibidos(cfg);
        if (nomes.length === 0) {
            const geral = cfg.modoGeral === 'impar' ? 'pares'
                : cfg.modoGeral === 'par' ? 'ímpares' : 'o que estiver fora dos dígitos informados';
            return [cfg.modoGeral === 'todos' ? 'Filtro inativo.'
                : 'Esmaecendo ' + geral + ' (nenhuma defensoria vinculada lida).'];
        }
        return nomes.map(nome => {
            const rot = rotuloCurto(nome);
            const m = modoEfetivo(cfg, nome);
            if (m === 'sem') return `${rot}: sempre visível.`;
            const per = periodoEfetivo(cfg, nome);
            const quando = per.ini || per.fim
                ? ` ${per.ini ? 'de ' + formatarDataBR(per.ini) : ''}${per.ini && per.fim ? ' ' : ''}${per.fim ? 'até ' + formatarDataBR(per.fim) : ''}`
                : '';
            const dig = m === 'digitos' ? digitosEfetivos(cfg, nome) : [];
            const alvo = m === 'impar' ? 'esmaecendo pares'
                : m === 'par' ? 'esmaecendo ímpares'
                : m === 'digitos' ? (dig.length ? 'responsável pelos dígitos ' + dig.join(', ') : 'dígitos ainda não informados')
                : 'sem corte por antedígito';
            return `${rot}: ${alvo}${quando}${quando ? '; fora disso, tudo esmaecido.' : '.'}`;
        });
    }

    function atualizarStatus(cfg) {
        const el = document.querySelector('#galo-panel .galo-status');
        if (el) el.innerHTML = resumoLinhas(cfg).map(l => `<div>${esc(l)}</div>`).join('');
    }

    // Encosta o painel no botão sem deixá-lo sair da janela: direita do botão, senão
    // esquerda, senão centralizado; para baixo, senão para cima.
    function posicionarPainel() {
        const painel = document.getElementById('galo-panel');
        const btn = document.getElementById('galo-btn');
        if (!painel || !btn || !painel.classList.contains('galo-aberto')) return;

        const MARGEM = 8;
        const b = btn.getBoundingClientRect();
        const p = painel.getBoundingClientRect();
        const larguraJanela = document.documentElement.clientWidth;
        const alturaJanela = document.documentElement.clientHeight;

        let x = b.right - p.width;                                   // alinhado pela direita do botão
        if (x < MARGEM) x = b.left;                                  // não coube: alinha pela esquerda
        if (x + p.width > larguraJanela - MARGEM) x = (larguraJanela - p.width) / 2;  // nem assim: centraliza
        x = Math.max(MARGEM, Math.min(x, larguraJanela - p.width - MARGEM));

        let y = b.bottom + MARGEM;                                   // abaixo do botão
        if (y + p.height > alturaJanela - MARGEM) {
            const acima = b.top - p.height - MARGEM;
            y = acima >= MARGEM ? acima : Math.max(MARGEM, alturaJanela - p.height - MARGEM);
        }

        painel.style.left = Math.round(x) + 'px';
        painel.style.top = Math.round(y) + 'px';
    }

    function renderPainel(cfg) {
        const painel = document.getElementById('galo-panel');
        if (!painel) return;
        const aberto = painel.classList.contains('galo-aberto');
        painel.innerHTML = htmlPainel(cfg);
        atualizarStatus(cfg);
        atualizarAlerta(cfg);
        if (aberto) { painel.classList.add('galo-aberto'); posicionarPainel(); }
    }

    function atualizarBotao(cfg) {
        const btn = document.getElementById('galo-btn');
        if (!btn) return;
        btn.classList.toggle('galo-ativo', algumFiltroAtivo(cfg));
        btn.classList.toggle('galo-novo', cfg.novos.length > 0);
        const n = contagem.esmaecidos;
        const rotulo = n ? `Filtrar Antedígito · ${n}` : 'Filtrar Antedígito';
        if (btn.textContent !== rotulo) btn.textContent = rotulo;
        btn.title = n ? `${n} aviso(s) esmaecido(s) nesta tela` : 'Filtrar comunicações por antedígito';
    }

    function criarWrap() {
        const wrap = document.createElement('span');
        wrap.id = 'galo-wrap';
        wrap.innerHTML = `<button id="galo-btn" type="button" title="Filtrar comunicações por antedígito">Filtrar Antedígito</button><div id="galo-panel"></div>`;
        const painel = wrap.querySelector('#galo-panel');

        wrap.querySelector('#galo-btn').addEventListener('click', e => {
            e.stopPropagation();
            const cfg = lerConfig();
            if (!painel.classList.contains('galo-aberto')) {
                renderPainel(cfg);
                atualizarPerfisVinculados(false);
            }
            painel.classList.toggle('galo-aberto');
            posicionarPainel();
        });

        painel.addEventListener('click', e => {
            e.stopPropagation();
            const botao = e.target.closest && e.target.closest('.galo-aplicar');
            if (!botao) return;
            const cfg = lerConfig();
            const nome = decodeURIComponent(botao.dataset.perfil);
            cfg.perfis[nome] = botao.dataset.modo;
            if (botao.dataset.modo === 'digitos') cfg.digitos[nome] = botao.dataset.digitos;
            cfg.novos = cfg.novos.filter(n => n !== nome);
            salvarConfig(cfg);
            renderPainel(cfg);
            atualizarBotao(cfg);
            aplicar();
        });

        painel.addEventListener('change', e => {
            const t = e.target;
            const cfg = lerConfig();
            let redesenhar = false;
            if (t.name === 'galo-modo-geral') {
                cfg.modoGeral = t.value;
                redesenhar = true; // mostra ou esconde o campo de dígitos
            } else if (t.id === 'galo-cadastro') {
                cfg.cadastro = t.value ? decodeURIComponent(t.value) : null;
                // a defensoria de cadastro é aquela em que se atua por inteiro
                if (cfg.cadastro) cfg.perfis[cfg.cadastro] = 'sem';
                redesenhar = true;
            } else if (t.classList.contains('galo-perfil-sel')) {
                const nome = decodeURIComponent(t.dataset.perfil);
                cfg.perfis[nome] = t.value;
                cfg.novos = cfg.novos.filter(n => n !== nome); // configurado: deixa de ser novidade
                redesenhar = true; // mostrar/ocultar as datas conforme o modo
            } else if (t.classList.contains('galo-digitos')) {
                const v = String(t.value || '').slice(0, 40);
                if (t.dataset.alvo === '__geral__') cfg.digitosGeral = v;
                else cfg.digitos[decodeURIComponent(t.dataset.alvo)] = v;
            } else if (t.classList.contains('galo-data')) {
                const valor = dataValida(t.value);
                if (t.dataset.alvo === '__geral__') {
                    cfg.periodoGeral[t.dataset.campo] = valor;
                    cfg.periodoGeral.manual = true; // deixa de acompanhar a designação
                } else {
                    const nome = decodeURIComponent(t.dataset.alvo);
                    const per = cfg.periodos[nome] || { ini: null, fim: null, manual: false };
                    per[t.dataset.campo] = valor;
                    per.manual = true; // editado à mão: não é mais sobrescrito pela designação
                    cfg.periodos[nome] = per;
                    cfg.novos = cfg.novos.filter(n => n !== nome);
                    redesenhar = true; // o prazo restante muda junto com a data de fim
                }
            }
            salvarConfig(cfg);
            if (redesenhar) renderPainel(cfg);
            else atualizarStatus(cfg);
            atualizarBotao(cfg);
            aplicar();
        });

        return wrap;
    }

    // Mantém o botão na linha certa: reposiciona quando a SPA re-renderiza a barra e
    // reespelha o estilo assim que o botão nativo tem medidas (no primeiro instante
    // do carregamento ele ainda não tem).
    function garantirBotao() {
        let wrap = document.getElementById('galo-wrap');
        if (!wrap) wrap = criarWrap();

        const ref = acharBotaoReferencia();
        const linha = ref && ref.parentElement;

        if (linha) {
            if (wrap.parentElement !== linha) {
                wrap.style.position = '';
                wrap.style.top = '';
                wrap.style.right = '';
                wrap.style.zIndex = '';
                linha.appendChild(wrap);
            }
            permitirQuebra(linha);
            const btn = document.getElementById('galo-btn');
            const cs = ref.offsetWidth ? getComputedStyle(ref) : null;
            if (cs && btn.dataset.galoEspelho !== cs.fontSize + '|' + cs.borderRadius + '|' + cs.height) {
                espelharEstilo(btn, ref);
            }
        } else if (!wrap.isConnected && Date.now() - T_INICIO > CONFIG.CARENCIA_ANCORA) {
            // sem a linha nativa por tempo demais: garante o acesso ao filtro
            wrap.style.cssText = 'position:fixed;top:72px;right:24px;z-index:99998;';
            document.body.appendChild(wrap);
        }
    }

    document.addEventListener('click', e => {
        const painel = document.getElementById('galo-panel');
        const wrap = document.getElementById('galo-wrap');
        if (painel && painel.classList.contains('galo-aberto') && wrap && !wrap.contains(e.target)) {
            painel.classList.remove('galo-aberto');
        }
    });

    // ─── Núcleo: detecção e esmaecimento ──────────────────────────────────────────

    // Contagem da última passada, usada no rótulo do botão e no alerta do painel.
    let contagem = { total: 0, esmaecidos: 0 };

    const temCNJ = el => CNJ_RE.test(el.textContent || '');

    // Diálogos e modais não são avisos da lista: o "Cadastrar Processo Judicial" da v2
    // mostra o número do processo e a defensoria truncada pelo select, e por isso era
    // marcado como aviso de defensoria não vinculada.
    const SELETOR_MODAL = '[role="dialog"], [aria-modal="true"], .MuiDialog-root, .MuiModal-root, .modal';
    const emModal = el => !!(el.closest && el.closest(SELETOR_MODAL));

    // Diálogo aberto na tela (a página antiga mantém modais do Bootstrap ocultos no DOM,
    // por isso a checagem é por altura, não por presença).
    function modalAberto() {
        return Array.from(document.querySelectorAll(SELETOR_MODAL))
            .some(m => m.getBoundingClientRect().height > 0);
    }

    // O elemento MAIS INTERNO que contém o número — e não a folha da árvore: outros
    // scripts (o "Copiar Número do Processo") injetam um <span> dentro do número, e
    // a busca por folha deixava de encontrar qualquer aviso.
    function elementosComNumero() {
        return Array.from(document.querySelectorAll('span, p, div, td, a'))
            .filter(el => temCNJ(el) && !Array.from(el.children).some(temCNJ) && !emModal(el));
    }

    // Sobe na árvore a partir do elemento com o número até o último ancestral que
    // contém apenas um CNJ (= o card da comunicação, na página v2).
    function encontrarCard(el) {
        const g = new RegExp(CNJ_RE.source, 'g');
        let cur = el;
        let card = el;
        for (let i = 0; i < 15; i++) {
            const pai = cur.parentElement;
            if (!pai || pai === document.body || pai.tagName === 'MAIN') break;
            const qtd = ((pai.textContent || '').match(g) || []).length;
            if (qtd > 1) break;
            if (pai.getBoundingClientRect().height > CONFIG.ALTURA_MAX_CARD) break;
            cur = pai;
            card = cur;
        }
        return card;
    }

    // Data de expedição/comunicação do aviso, como 'YYYY-MM-DD'. Preferência para a
    // data seguida do código do evento — "10/08/2026, 10:27:03 (22) Expedida/..." —
    // e, quando o evento não está disponível, a primeira data do item, que é a da
    // coluna Comunicação nas duas páginas.
    function diaDoAviso(texto) {
        const t = (texto || '').replace(/\s+/g, ' ');
        const m = t.match(/(\d{2})\/(\d{2})\/(\d{4})(?:,?\s*\d{2}:\d{2}(?::\d{2})?)?\s*\(\d+\)/)
               || t.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
    }

    // Nome do perfil de um item, restrito às defensorias realmente vinculadas — nada
    // de nomes novos vindos da tela (foi o que enchia a lista de perfis alheios).
    function perfilDoTexto(texto, conhecidos) {
        const norm = normalizar(texto);
        let achado = null;
        for (const n of conhecidos) {
            if (norm.includes(n) && (!achado || n.length > achado.length)) achado = n;
        }
        return achado;
    }

    // Motivo do esmaecimento, ou null quando o aviso deve ficar como está.
    function motivoEsmaecer(seq, nome, cfg, texto) {
        const modo = modoEfetivo(cfg, nome);
        if (modo === 'sem') return null; // defensoria em que se atua por inteiro

        const per = periodoEfetivo(cfg, nome);
        if (per.ini || per.fim) {
            const dia = diaDoAviso(texto);
            if (dia) {
                if (per.ini && dia < per.ini) return 'Antes de ' + formatarDataBR(per.ini);
                if (per.fim && dia > per.fim) return 'Depois de ' + formatarDataBR(per.fim);
            }
        }

        if (modo === 'todos') return null;
        const d = seq.charCodeAt(6) - 48;
        if (modo === 'digitos') {
            const alvo = digitosEfetivos(cfg, nome);
            return (alvo.length && !alvo.includes(d)) ? 'Antedígito ' + d : null;
        }
        const ehPar = d % 2 === 0;
        if ((modo === 'impar' && ehPar) || (modo === 'par' && !ehPar)) {
            return 'Antedígito ' + (ehPar ? 'PAR' : 'ÍMPAR');
        }
        return null;
    }

    function limparMarca(el) {
        el.classList.remove('galo-esmaecido', 'galo-alheio');
        delete el.dataset.galoMotivo;
    }

    function limparTudo() {
        document.querySelectorAll('.galo-esmaecido, .galo-alheio').forEach(limparMarca);
    }

    function aplicar() {
        const naRota = PAG_ANTIGA || location.pathname.includes(CONFIG.ROTA_V2);
        let wrap = document.getElementById('galo-wrap');
        if (!naRota) {
            if (wrap) wrap.style.display = 'none';
            limparTudo();
            return;
        }
        garantirBotao();
        wrap = document.getElementById('galo-wrap');
        if (wrap) wrap.style.display = '';

        const cfg = lerConfig();

        // Exceção temporária: com um diálogo aberto — "Cadastrar Processo Judicial" à
        // frente —, o filtro sai inteiramente de cena. O processo que está sendo
        // cadastrado ainda não é vinculado a defensoria nenhuma, e marcá-lo seria
        // apontar um problema que não existe. Tudo volta ao normal ao fechar.
        if (modalAberto()) {
            limparTudo();
            contagem = { total: 0, esmaecidos: 0 };
            atualizarBotao(cfg);
            atualizarAlerta(cfg);
            return;
        }

        const conhecidos = perfisExibidos(cfg);
        const marcados = new Set();

        // textoPerfil identifica a defensoria — na página antiga ela vive num atributo, por isso o
        // outerHTML. textoData é sempre o texto visível: o outerHTML carrega o data-galo-motivo que
        // o próprio script grava, e ler a data dali fazia a linha piscar a cada passada.
        const itens = PAG_ANTIGA
            ? Array.from(document.querySelectorAll('tr')).filter(t => CNJ_RE.test(t.textContent || '') && !emModal(t))
                .map(tr => ({ alvo: tr, textoPerfil: tr.outerHTML, textoData: tr.textContent, num: (tr.textContent || '').match(CNJ_RE) }))
            : elementosComNumero().map(el => {
                const card = encontrarCard(el);
                return { alvo: card, textoPerfil: card.textContent, textoData: card.textContent, num: (el.textContent || '').match(CNJ_RE) };
            });

        const contagemNova = { total: 0, esmaecidos: 0 };

        for (const item of itens) {
            if (!item.num) continue;
            const nome = perfilDoTexto(item.textoPerfil, conhecidos);
            // "alheio" só quando o aviso nomeia uma defensoria e ela não é vinculada
            const alheio = !nome && /defensoria/i.test(item.textoPerfil);
            const motivo = motivoEsmaecer(item.num[1], nome, cfg, item.textoData);

            // a v2 mantém uma cópia oculta da lista: contar só o que está na tela
            if (item.alvo.getBoundingClientRect().height > 0) {
                contagemNova.total++;
                if (motivo) contagemNova.esmaecidos++;
            }

            if (motivo || alheio) {
                if (motivo) item.alvo.classList.add('galo-esmaecido');
                else item.alvo.classList.remove('galo-esmaecido');
                if (alheio) item.alvo.classList.add('galo-alheio');
                else item.alvo.classList.remove('galo-alheio');
                item.alvo.dataset.galoMotivo = alheio ? 'Defensoria não vinculada' : motivo;
                marcados.add(item.alvo);
            } else if (item.alvo.dataset.galoMotivo) {
                limparMarca(item.alvo);
            }
        }

        // Remove marcações órfãs (itens re-renderizados ou troca de modo).
        document.querySelectorAll('.galo-esmaecido, .galo-alheio').forEach(el => {
            if (!marcados.has(el)) limparMarca(el);
        });

        contagem = contagemNova;
        atualizarBotao(cfg);
        atualizarAlerta(cfg);
    }

    // ─── Inicialização (padrão MutationObserver + intervalo de segurança) ─────────
    let debounceTimer = null;
    new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(aplicar, CONFIG.DEBOUNCE);
    }).observe(document.body, { childList: true, subtree: true });

    setInterval(aplicar, CONFIG.CHECK_INTERVAL);
    window.addEventListener('load', () => setTimeout(aplicar, 2000));
    // o painel é fixo em relação à janela: acompanha rolagem, zoom e redimensionamento
    window.addEventListener('resize', posicionarPainel);
    window.addEventListener('scroll', posicionarPainel, true);

    migrarConfigLegado();
    aplicar();
    renderPainel(lerConfig());
    atualizarPerfisVinculados(false);
    setInterval(() => atualizarPerfisVinculados(false), CONFIG.TTL_PERFIS);

    console.log('[SOLAR Galo] Esmaecer por Antedígito v1.8 carregado.');
})();

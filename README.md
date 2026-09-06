# SUPERNOVA

## Bem-vindo ao ELIPSE 🌞

uma extensão de navegador de ETL (extract, transfer, load) de processos que a Defensoria Pública de Minas Gerais (DPMG) atua.

Ciente da dificuldade dos gabinetes em fazer a gestão dos prazos, desenvolvi essa extensão para ajudá-los na gestão de seus processos no gabinete.

A extensão é responsável por fazer várias requisições em parelalo do solar, platforma que permite acesso aos processos da DPMG, os extrai e cria um dashboard personalizado ao gosto do defensor do gabinete. Todos os dados são salvos no navegador, utilizando o banco de dados embutido no navegador, indexeddb.

Embora a aplicação esteja em desenvolvimento, ela é bastante perfomática. Foi utilizado massivamente concorrência para otimização das consultas às api do solar, mantendo os dados na memoria do dispositivo. 

Como desenvolvi a extensão de forma isolada, isto é, como desenvolvedor único, fora da equipe de desenvolmento do solar. Aprendi a fazer a leitura integral das APIs e funcionalidades obscuradas do solar. Deduzi bastante coisa, utilizei a experiência de desenolvimento e mais importante, usei de engenharia reversa para obter o real significado das informações que tive contato das requisições ao backend do site, para fazer o eclipse, a presente extensão. No geral deu certo.


[!NOTE]

Diante de tal cenário desenvolvi uma extensão que é mais rápida que os sites em que são extraídos os dados. 

### Arquitetura

- Índice

A extensão é como se fosse um site hospedado num servidor comum. Entende-se que a extensão é fornece os dados por meio de server side rendering, noutras palavras, o servidor que gera o html ao invés do navegador.

A extensão possui "duas" aplicações, Service Worker (sw) e outros scripts.

A analogia seria a seguinte: O service worker seria o backend. O SW é um arquivo html que faz atividades no segundo plano. Não tem acesso ao DOM. Bem similar a um backend feito em php, python e tantos outros. O SW fica responsável para lidar com os dados.

Já os scripts esparços fazem as funcionalidades do site e geram o conteúdo. Ele seria o client side mesmo. Sem muitas firulas.

A extensão foi feita com TS/JS puro, ou seja, nada de reatividade, só js. O resultado? Perfomace ultra rápida.

- Organização de pastas

Utilizei a feature based archictecture, isto é, arquitetura baseada em recursos.

Todas as páginas têm uma(s) pasta(s) com seu próprio arquivo js/ts para trazer vida ao html. 

Optei por utilizar este estilo de arquitetura, pois na minha cebeça fazia mais sentido, dado a espera "simplicidade" da solução



- Armazenamento

Optei por utilizar um estilo de armazemento "híbrido", utilizei significativamente o indexeddb e armazemento local.

Indexeddb, é um banco de dados nosql, embutido diretamente nos navegadores para uso conforme necessário pelos sites. Eu o utilizei, diretamente com a biblioteca dexie, para melhorar a experiência de desenolvimento, visto a simplicidade da biblioteca padrão. Ademais, trás o benefício de tornar a experiência de desenolver bem similar ao SQL.

O indexeddb foi utilizado principalmente para salvar os dados das requisições do solar, com pequenas adições de regras de negócios minhas, tentando simular o PJE e melhorarias que julguei interessantes.

Já o local storage utilizei para salvar, em suma, dados provenientes das preferências do usuário.

Futuramente, implementarei o TTL (time to live) dos dados para o deletar automático ou senão a funcionalidade de delete automático com base no tempo, mas acionado pelo usuário.






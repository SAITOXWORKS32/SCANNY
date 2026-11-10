# SCANNY: interface (protótipo)

Interface do SCANNY em HTML, CSS e JavaScript puro, sem dependências. Abra `index.html` no navegador.
Cada tela é uma função que recebe o estado e devolve HTML, então dá para reprogramar uma tela sem mexer nas outras.

## Estrutura

```
index.html            casca: barra lateral (busca e computador), topo, rodapé, modal, avisos
css/style.css         cores (tokens), layout, componentes e responsivo
js/data.js            dados de exemplo (SCANNY_SAMPLE), inclui Arquivo do SCANNY e Recentes
js/icons.js           ícones (Font Awesome Free 7.3.1, estilo sólido, CC BY 4.0)
js/ui.js              funções de interface: escape, formatação, alerta, estado vazio, modal, avisos, persistência
js/views.js           TELAS: uma função por página (vVisaoGeral, vArquivo, vAoVivo…) + ondas e helpers
js/recomendacoes.js   regras de recomendação com base no hardware e no estado real
js/app.js             estado, menu, rotas, ações (com confirmação), desfazer, ticker das telas ao vivo
assets/               ícone do aplicativo (PNG)
```

Ordem de carregamento (em `index.html`): data, icons, ui, views, recomendacoes, app.

## Menu

Grupos e categorias (`NAV` em `app.js`):

| Grupo | Categoria | Subcategorias |
|---|---|---|
| Painel | Início | Resumo, Recomendações |
| Painel | Arquivos | Arquivo do SCANNY, Recentes, Armazenamento |
| Painel | Atividade | Ao vivo, Histórico |
| Ferramentas | Otimização | Análise, Limpeza, Desempenho, Inicialização |
| Ferramentas | Sistema | Jogos, Reparos |
| Ferramentas | Proteção | Privacidade, Segurança e restauração |
| Aplicativo | Aplicativo | Configurações, Sobre |

A busca da barra lateral filtra os itens; Enter abre o primeiro.

## Arquivo do SCANNY

Cópias que o próprio SCANNY guarda antes de um arquivo sair do Windows. Cada item tem uma situação:

- **Só no SCANNY**: o original foi apagado do Windows; a cópia é a única.
- **Também no Windows**: o original continua no lugar; a cópia é uma reserva.
- **Conflito no destino**: não dá para restaurar no caminho original (já existe outro arquivo ali).

Recursos: busca por nome ou pasta, filtros por situação e por tipo, ordenação, seleção em lote, restaurar (com desfazer), remover do arquivo (aviso quando é a única cópia), esvaziar, e limite de espaço (5, 10, 20 ou 50 GB). A barra de espaço usa hachura. Nada é removido sozinho ao passar do limite: aparece um aviso e uma recomendação.

Para guardar a cópia ao excluir: em **Armazenamento**, marque arquivos grandes e clique em *Excluir selecionados*. Com a opção *Guardar cópia antes de excluir* ligada (padrão), a cópia entra no arquivo. Temporários da limpeza não entram, porque o Windows recria o que precisa.

Recentes lista o que o app tocou (arquivado, restaurado, removido, arquivo grande), com filtro por tipo.

## Ao vivo (ondas e taxa de atualização)

- Ondas de processador, memória e atividade do disco C, com os últimos 60 registros.
- Taxa de atualização: 2 s, 5 s, 15 s ou pausado (botões em *Ao vivo* e em *Configurações > Atualização ao vivo*). A barra mostra quanto falta para a próxima leitura.
- Indicador de processamento: quando uma análise, limpeza ou reparo roda, aparece o passo atual no topo da página.
- Só tem dados com *Dados de exemplo* ligado. Sem eles, a tela mostra o estado vazio.

Na versão real, `liveStep()` (em `views.js`) deve ser trocado pela leitura do sistema, no mesmo formato (`LIVE.cpu`, `LIVE.ram`, `LIVE.disk`, valores de 0 a 100).

## Como as ações funcionam

- Elementos com `data-action="nome"` chamam `ACTIONS.nome(arg)` em `app.js`. O `data-arg` vira o argumento.
- `data-toggle="settings.x"` inverte um booleano. `data-set="caminho" data-value="v"` define um valor (números são convertidos).
- `data-check` marca checkboxes (`clean`, `recycle`, `browser`, `big`, `arch`, `effect`). `data-archive` ligam busca, ordenação e tipo do Arquivo.
- Mudança destrutiva sempre passa por `openModal()` (confirmação). Ações com desfazer gravam `undo` no histórico.
- Analisar nunca altera nada.

## Dados de exemplo

*Configurações > Desenvolvimento > Dados de exemplo*. Desligado, cada número mostra "Não disponível". Ligado, usa `SCANNY_SAMPLE` e semeia o Arquivo e os Recentes na primeira vez.

## Simulação

Tudo que mexe no computador é simulado no protótipo: limpeza, reparos, exclusão de arquivos, restauração, pontos de restauração e medições. Os textos avisam isso.

## Tema

Escuro (padrão), claro ou automático. Cores só em preto, branco e cinzas: a paleta é checada pelos testes.

## Testes

Na pasta `scanny-teste/`: `python3 teste_scanny.py` (47 verificações: telas, arquivo, ao vivo, confirmações, desfazer, celular, tema, paleta e ícones) e `python3 gravar_demo.py` (gera os prints e o vídeo).

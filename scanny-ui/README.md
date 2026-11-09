# SCANNY — protótipo da interface

Base em HTML, CSS e JavaScript puro, sem dependências. Abra `index.html` no navegador.
Para programar de outro jeito, troque as partes que quiser: cada arquivo tem uma responsabilidade.

## Estrutura

```
index.html          casca do app: menu, cabeçalho, rodapé, modal e avisos
css/style.css       estilos. Cores e raios só em tokens no :root (tema claro/escuro)
js/data.js          dados de exemplo (window.SCANNY_SAMPLE). Substitua pela análise real
js/icons.js         ícones: pack Font Awesome Free, estilo sólido. icon('nome') devolve o SVG
js/ui.js            helpers: selos, riscos, barras, avisos, modal (Promise), toast, persistência
js/views.js         uma função por tela. Recebe o estado (S) e devolve HTML
js/recomendacoes.js regras que leem o hardware e o estado do PC e geram recomendações com botão
js/app.js           estado, roteamento (#/pagina), ações e fluxos de limpeza, reparos e desfazer
assets/app-icon.png   ícone do app (menu, favicon)
```

## Recomendações

`js/recomendacoes.js` gera as recomendações a partir dos dados reais do PC: modelo da placa de vídeo,
data do driver, memória, espaço livre de cada disco, plano de energia, temperatura etc.
Sem dados (Dados de exemplo desligados), nenhuma recomendação aparece.
Cada página mostra as recomendações que são dela, e a Visão geral mostra todas.

## Ícones

Pack: Font Awesome Free 7.3.1, estilo sólido (licença CC BY 4.0: https://fontawesome.com/license/free).
Para trocar um ícone, mude o nome em `ICON_SRC` dentro de `js/icons.js`.

## Como as ações funcionam

Todo clique passa por um único lugar, em `app.js`:

- `data-action="nome"` chama `ACTIONS.nome(arg)`.
- `data-toggle="caminho.do.estado"` inverte um valor booleano.
- `data-set` + `data-value` troca um valor (ex.: tema).
- `data-check` trata checkboxes no evento `change`.

Para criar uma ação nova, adicione uma função em `ACTIONS` e use `data-action` no HTML.

## Regras de segurança do protótipo

1. Analisar nunca altera nada. Só lê.
2. Limpeza tem duas fases: primeiro analisar (calcula tamanhos), depois limpar o que você escolheu, com confirmação.
3. Nada é excluído automaticamente. Arquivos grandes e Lixeira pedem confirmação.
4. Processos e componentes do sistema marcados como protegidos não podem ser encerrados ou desativados.
5. Toda mudança entra no histórico. As reversíveis têm botão "Desfazer".
6. Sem dados reais, a interface mostra "Não disponível". Não inventa número.
7. Paleta só em preto, branco e cinzas. Estados se distinguem pelo texto e pelo formato.

## Dados de exemplo

Em Configurações > Desenvolvimento, "Dados de exemplo" fica desligado por padrão.
Ligue para ver as telas preenchidas. No app real, o `js/data.js` deve ser substituído
pelo resultado da análise de somente leitura (WMI/PowerShell/registro, conforme sua escolha).

## Limites do protótipo (o que ainda é simulado)

- Limpeza, reparos (DISM, SFC etc.), troca de plano de energia e exclusão de arquivos só mostram o resultado; nada é executado de verdade.
- Backup exporta e importa um arquivo JSON com as configurações e o histórico.
- O histórico e as configurações ficam no `localStorage` do navegador, sob a chave `scanny.v1`.

## Testes

`testes/teste_scanny.py` (Playwright) abre cada tela, roda os fluxos principais, confere erros de console,
o modo mobile e o tema escuro, e grava prints. Rode com `python3 testes/teste_scanny.py` ajustando o caminho `BASE`.

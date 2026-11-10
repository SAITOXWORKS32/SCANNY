# SCANNY

**Analise. Limpe. Melhore.**

SCANNY é um protótipo de uma central leve e transparente para analisar, limpar e ajustar o Windows sem apagar arquivos pessoais ou desativar recursos importantes sem autorização.

> O repositório contém dois modos: uma demonstração web em HTML/CSS/JavaScript e um aplicativo desktop Tauri. Quando empacotado para Windows, a camada nativa executa somente ações permitidas e confirmadas, como análise de temporários, limpeza de pastas temporárias permitidas, perfil visual, ponto de restauração e alguns reparos oficiais. O modo web continua sendo uma demonstração e não altera o Windows.

![SCANNY — visão geral](prints/01-resumo.png)

## O que existe neste repositório

- Aplicativo desktop leve com Tauri, frontend reutilizado e comandos nativos controlados;
- Interface responsiva com tema escuro e claro;
- Dashboard de visão geral;
- Telas de análise, limpeza, desempenho, inicialização, armazenamento, jogos, reparos, privacidade, segurança, histórico e configurações;
- Fluxos de confirmação, cancelamento, histórico e desfazer;
- Secção **Caches e Dados**, com toggle para selecionar todos os caches temporários e botão para abrir cada pasta;
- Estado de dados de exemplo desligado por padrão;
- Dados de exemplo opcionais para apresentar a interface preenchida;
- Ícone do aplicativo;
- Testes automatizados Playwright;
- Prints da interface em `prints/`;
- Vídeos de demonstração em `video/`.

## Aplicativo desktop para Windows

O projeto desktop usa Tauri 2 e Rust. O build oficial é executado pelo GitHub Actions em `windows-latest` e gera instaladores NSIS `.exe` e MSI. Para compilar localmente em Windows:

```powershell
npm ci
npm run build
```

Os artefatos aparecem em `src-tauri/target/release/bundle/`. A versão desktop não deve ser executada com privilégios de administrador sem necessidade; o Windows solicitará elevação somente quando uma ação exigir.

## Como executar a demonstração web

O protótipo não possui dependências de frontend. A forma mais simples é iniciar um servidor local na pasta `scanny-ui`:

```bash
cd scanny-ui
python3 -m http.server 4173
```

Depois abra <http://localhost:4173> no navegador.

Também é possível abrir `scanny-ui/index.html` diretamente, mas um servidor local é recomendado para uma experiência mais próxima da publicação.

## Testes

Com Python, Playwright e Chromium disponíveis:

```bash
pip install playwright
python3 testes/teste_scanny.py
```

O teste usa caminhos relativos ao próprio repositório e tenta utilizar `/usr/bin/chromium`. Para escolher outro executável:

```bash
CHROMIUM_PATH=/caminho/para/chromium python3 testes/teste_scanny.py
```

Os prints gerados pelos testes ficam em `prints-test/`, que é uma pasta local de validação e não precisa ser publicada.

## Estrutura

```text
scanny-ui/
├── index.html          casca do aplicativo
├── css/style.css       tokens, layout, temas e responsividade
├── js/data.js          dados de exemplo
├── js/icons.js         ícones SVG
├── js/ui.js            helpers de interface, modal, toast e persistência
├── js/views.js         telas do aplicativo
├── js/recomendacoes.js regras de recomendações
├── js/app.js           estado, roteamento e ações
└── assets/             ícones do aplicativo

prints/                 capturas de apresentação
video/                  demonstrações em MP4 e WebM
testes/                testes Playwright
```

## Segurança e limites atuais

A demonstração web foi desenhada para não fingir que executou uma operação real. Com dados de exemplo desligados, informações indisponíveis são exibidas como **Não disponível**. A camada desktop adiciona comandos nativos somente por uma ponte Tauri explícita e com listas permitidas. O projeto ainda não:

- limpa pastas fora das raízes temporárias permitidas;
- altera arquivos pessoais, Downloads ou WinSxS;
- altera serviços ou entradas de inicialização automaticamente;
- desativa o Defender, Firewall ou Windows Update;
- executa comandos fora da lista de reparos permitidos;
- envia telemetria própria;
- possui assinatura digital de código ou atualização automática.

Na limpeza nativa, apenas IDs de cache temporário allowlisted podem ser processados. A pasta-base nunca é removida, ficheiros recentes (menos de 24 horas) e ficheiros em uso são ignorados, e Downloads, documentos, dados pessoais, lixeira e caches de navegador ficam fora da otimização segura. Nenhuma função destrutiva deve ser adicionada sem estes controles.

## Mídia

- [Galeria de prints](prints/)
- [Vídeo MP4](video/scanny-demo.mp4)
- [Vídeo WebM](video/scanny-demo.webm)
- [Especificação detalhada](docs/SCANNY-especificacao-completa.md)

## Licença

O SCANNY é distribuído sob a licença MIT. O pacote de ícones Font Awesome Free usado pelo protótipo possui a licença indicada em `scanny-ui/README.md`.

## Contribuição

Leia `CONTRIBUTING.md` antes de abrir um pull request. Alterações que executem comandos no Windows devem incluir documentação do risco, caminho de restauração e testes.

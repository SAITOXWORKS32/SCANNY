# SCANNY — Especificação Completa do Aplicativo

**Versão do documento:** 1.0  
**Plataforma inicial:** Windows 10 e Windows 11, 64-bit  
**Tipo:** utilitário leve de análise, manutenção e otimização segura  
**Nome do produto:** SCANNY  
**Slogan:** Analise. Limpe. Melhore.

---

## 1. Visão geral

O SCANNY será um aplicativo de manutenção e otimização do Windows com foco em segurança, transparência e baixo consumo de recursos. Ele deve ajudar o usuário a descobrir o que está ocupando espaço, quais programas estão iniciando com o sistema, quais efeitos visuais podem ser reduzidos e quais tarefas de manutenção podem melhorar a organização e a responsividade do computador.

O aplicativo não deve prometer milagres, duplicação de FPS ou aumento artificial de desempenho. Todas as ações precisam mostrar o que será alterado, qual o possível benefício, qual o risco e como desfazer a operação.

A principal diferença do SCANNY será a confiança. O usuário deve saber exatamente o que o programa encontrou, o que será apagado, qual configuração será alterada e como restaurar o estado anterior.

### Frase de posicionamento

> SCANNY é uma central leve e transparente para analisar, limpar e ajustar o Windows sem apagar arquivos pessoais ou desativar recursos importantes sem autorização.

### Princípios do produto

1. **Transparência:** nunca executar uma ação escondida.
2. **Segurança:** criar backup ou ponto de restauração antes de mudanças sensíveis.
3. **Reversibilidade:** permitir desfazer alterações sempre que tecnicamente possível.
4. **Leveza:** não ficar rodando em segundo plano sem necessidade.
5. **Medição real:** mostrar resultados concretos, como espaço liberado e tempo de execução.
6. **Respeito ao usuário:** não exibir anúncios, não instalar programas extras e não coletar dados pessoais.

---

## 2. O que o SCANNY fará

Ao abrir, o SCANNY fará uma análise somente de leitura. Essa análise poderá verificar:

- Sistema operacional e versão;
- Arquitetura do sistema;
- CPU, GPU, RAM e discos;
- Espaço livre e ocupado;
- Arquivos temporários encontrados;
- Programas que iniciam com o Windows;
- Efeitos visuais ativos;
- Plano de energia atual;
- Estado do Windows Update, Defender e Firewall;
- Programas em execução e consumo aproximado;
- Existência de ponto de restauração recente;
- Necessidade de reinicialização pendente.

Nenhuma alteração será feita apenas porque o aplicativo foi aberto. O usuário deverá clicar em uma ação específica e confirmar antes de operações que possam apagar arquivos ou modificar configurações.

---

## 3. Público-alvo

O SCANNY será voltado para:

- Usuários comuns do Windows 10 e 11;
- Pessoas com pouco espaço no SSD ou HD;
- Usuários que querem reduzir animações e transparência;
- Pessoas que desejam controlar programas de inicialização;
- Jogadores que querem reduzir processos desnecessários, sem promessas falsas;
- Técnicos que precisam de uma ferramenta visual para manutenção básica;
- Usuários que preferem software gratuito e de código aberto.

O aplicativo não deve assumir que todos os usuários são técnicos. Cada opção avançada deverá ter uma explicação simples e, quando necessário, um modo detalhado.

---

## 4. Estrutura principal da interface

### Menu lateral

O menu principal poderá ter estas áreas:

1. Visão geral
2. Analisar sistema
3. Limpeza
4. Desempenho
5. Inicialização
6. Armazenamento
7. Jogos
8. Reparos
9. Privacidade
10. Segurança e restauração
11. Histórico
12. Configurações
13. Sobre o SCANNY

### Cabeçalho

O cabeçalho deve mostrar:

- Logo do SCANNY;
- Nome da página atual;
- Indicador de proteção ou estado do sistema;
- Botão para criar ponto de restauração;
- Menu de notificações;
- Botão de configurações;
- Estado de privilégios: usuário normal ou administrador.

### Rodapé ou barra inferior

Exibir:

- Versão do SCANNY;
- Última análise;
- Última limpeza;
- Estado do modo administrador;
- Link para logs;
- Link para o repositório no GitHub.

---

# 5. Categorias e funcionamento detalhado

## 5.1 Visão geral

A tela inicial deve ser um painel simples, não uma tela cheia de números sem contexto.

### Cartões principais

#### Saúde de armazenamento

Mostrar:

- Nome do disco;
- Tipo aproximado: SSD ou HDD, quando detectável;
- Espaço total;
- Espaço usado;
- Espaço livre;
- Barra visual de utilização;
- Alerta se o espaço livre estiver muito baixo.

Exemplo:

```text
Disco C:
412 GB usados de 512 GB
Espaço livre: 100 GB
Estado: Bom
```

#### Memória

Mostrar:

- RAM total;
- RAM em uso;
- RAM disponível;
- Percentual de uso;
- Processo que mais consome memória;
- Aviso somente quando o uso estiver consistentemente alto.

O SCANNY não deve liberar RAM artificialmente. Em vez disso, deve mostrar quais programas estão usando memória e permitir que o usuário feche apenas os processos escolhidos.

#### Processador

Mostrar:

- Uso atual;
- Temperatura, se disponível;
- Processo que mais consome CPU;
- Frequência aproximada, se disponível.

#### Limpeza disponível

Mostrar uma estimativa baseada na análise:

```text
Arquivos temporários seguros: 2,4 GB
Cache de miniaturas: 180 MB
Lixeira: 1,2 GB
Total recomendado: 3,78 GB
```

#### Inicialização

Mostrar:

- Quantidade de aplicativos no início do Windows;
- Quantos têm impacto alto;
- Botão para revisar a lista.

### Botões principais

- **Analisar agora**
- **Otimização segura**
- **Ver detalhes**
- **Criar ponto de restauração**

A otimização segura nunca deve executar opções avançadas automaticamente. Ela poderá limpar temporários comuns, miniaturas antigas e lixeira somente depois de confirmação.

---

## 5.2 Analisar sistema

Esta tela executará a análise de diagnóstico sem alterar o computador.

### Etapas da análise

1. Detectar versão do Windows;
2. Detectar privilégios disponíveis;
3. Verificar discos;
4. Calcular espaço de arquivos temporários;
5. Listar programas de inicialização;
6. Verificar efeitos visuais;
7. Verificar planos de energia;
8. Verificar serviços importantes;
9. Verificar proteção do Windows;
10. Gerar o relatório.

### Resultado da análise

Cada item deve ter um estado:

- **Normal:** nenhuma ação necessária;
- **Atenção:** existe uma melhoria opcional;
- **Recomendado:** ação segura que pode ajudar;
- **Avançado:** exige conhecimento e confirmação;
- **Bloqueado:** SCANNY não permitirá ação automática.

### Relatório

O usuário poderá salvar o relatório em `.html`, `.txt` ou `.json`.

O relatório deverá incluir:

- Data e hora;
- Versão do SCANNY;
- Versão do Windows;
- Resumo do hardware;
- Itens encontrados;
- Ações sugeridas;
- Nenhum conteúdo pessoal desnecessário.

---

## 5.3 Limpeza

A limpeza deve funcionar em duas fases:

1. **Analisar** — localizar arquivos e calcular o tamanho.
2. **Limpar** — apagar somente os itens selecionados pelo usuário.

### Itens recomendados

#### Arquivos temporários do usuário

Pode incluir arquivos antigos em `%TEMP%` que não estejam em uso.

#### Arquivos temporários do Windows

Executar somente em pastas conhecidas e ignorar arquivos em uso.

#### Cache de miniaturas

O Windows recriará as miniaturas quando necessário. O app deve explicar isso.

#### Cache de shaders

Pode ser limpo como opção de manutenção. O usuário deve saber que alguns jogos poderão recriar o cache na próxima inicialização.

#### Relatórios de erro antigos

Limpar somente relatórios antigos, sem impedir a criação futura de relatórios.

#### Logs antigos

Limpar apenas logs considerados seguros e antigos. Nunca apagar logs necessários para auditoria ou diagnóstico recente sem confirmação.

#### Lixeira

Sempre mostrar o tamanho e pedir confirmação separada, pois a ação pode não ser reversível.

#### Cache de navegadores

Deve ficar em uma seção separada, com aviso de que pode desconectar o usuário de alguns sites ou remover dados temporários offline.

### Itens que nunca devem ser apagados automaticamente

- Downloads;
- Documentos, imagens, vídeos ou músicas;
- Arquivos pessoais;
- Arquivos de jogos sem identificação segura;
- System32;
- WinSxS manualmente;
- Prefetch como suposta otimização;
- Arquivos `.dll` aleatórios;
- Registro do Windows;
- Pastas de instalação desconhecidas.

### Confirmação antes da limpeza

A tela final deverá mostrar:

```text
Você selecionou 6 categorias.
Espaço estimado: 3,78 GB.
Arquivos pessoais não serão incluídos.
Alguns caches poderão ser recriados pelo Windows.
[Cancelar] [Criar backup] [Limpar selecionados]
```

### Resultado depois da limpeza

Mostrar:

- Espaço liberado;
- Arquivos ignorados por estarem em uso;
- Erros encontrados;
- Tempo da operação;
- Botão para abrir o log.

---

## 5.4 Desempenho e efeitos visuais

Esta categoria será responsável por animações, transparência e efeitos do Windows.

### Perfis prontos

#### Equilibrado

- Mantém suavização de fontes;
- Mantém miniaturas;
- Reduz transparência excessiva;
- Mantém alguns efeitos básicos;
- Desativa apenas animações menos importantes.

#### Desempenho

- Reduz animações;
- Desativa transparência;
- Reduz sombras;
- Mantém elementos necessários para leitura;
- Mantém fontes legíveis.

#### Máximo desempenho visual

- Desativa a maior parte das animações;
- Desativa transparência;
- Reduz sombras e efeitos;
- Pode deixar o Windows visualmente mais simples.

#### Personalizado

O usuário escolhe individualmente:

- Animar controles e elementos dentro das janelas;
- Animar janelas ao minimizar e maximizar;
- Animar a barra de tarefas;
- Desvanecer menus;
- Desvanecer tooltips;
- Mostrar sombra sob as janelas;
- Mostrar conteúdo durante o arraste;
- Mostrar miniaturas em vez de ícones;
- Suavizar fontes;
- Usar estilos visuais em janelas e botões;
- Usar transparência.

### Aplicação

Antes de aplicar:

1. Salvar o estado atual;
2. Mostrar resumo das mudanças;
3. Aplicar somente as opções marcadas;
4. Registrar tudo no histórico;
5. Oferecer restauração.

---

## 5.5 Inicialização

O SCANNY listará tudo que inicia junto com o Windows, com uma explicação clara.

### Colunas

- Nome;
- Fabricante;
- Local do arquivo;
- Tipo de inicialização;
- Impacto estimado;
- Última alteração;
- Estado atual;
- Ação disponível.

### Classificação

#### Baixo risco

Aplicativos comuns de atualização ou inicialização rápida, desde que o usuário os reconheça.

#### Analisar antes

Itens sem fabricante, arquivos em local estranho ou programas desconhecidos.

#### Essencial

Defender, drivers, áudio, rede, touchpad, placa de vídeo e componentes importantes.

#### Desconhecido

Itens que o SCANNY não consegue identificar. O app não deve recomendar desativação automática.

### Ações

- Desativar inicialização;
- Reativar;
- Abrir localização do arquivo;
- Pesquisar nome no navegador, mediante clique do usuário;
- Ver assinatura digital;
- Criar restauração antes de aplicar alterações.

O SCANNY não deve apagar entradas. A primeira versão apenas desativa e permite reativar.

---

## 5.6 Armazenamento

Essa área ajudará o usuário a descobrir o que realmente está ocupando o disco.

### Recursos

- Lista de discos;
- Uso por pasta;
- Arquivos grandes;
- Arquivos antigos;
- Extensões mais comuns;
- Aplicativos instalados por tamanho;
- Pastas temporárias;
- Espaço livre;
- Histórico de crescimento, se o usuário ativar.

### Segurança

Por padrão, a análise será somente leitura. O usuário deverá selecionar manualmente arquivos para excluir.

O app deve evitar ler arquivos pessoais sem necessidade. Quando possível, deve analisar apenas nome, tamanho, data e caminho.

### Alertas

- Menos de 20% de espaço livre: atenção;
- Menos de 10%: crítico;
- Disco quase cheio: recomendar Sensor de Armazenamento do Windows;
- SSD com pouco espaço: recomendar limpeza segura, sem desfragmentação manual.

---

## 5.7 Memória RAM e processos

A categoria não será um “RAM booster”. Ela será um monitor e um gerenciador seguro.

### Mostrar

- Processos ordenados por CPU;
- Processos ordenados por RAM;
- Aplicativo responsável;
- Caminho do executável;
- Usuário que iniciou o processo;
- Estado do processo;
- Se é processo do sistema;
- Uso aproximado de CPU, RAM e disco.

### Ações permitidas

- Abrir localização;
- Ver detalhes;
- Copiar informações;
- Encerrar aplicativo selecionado;
- Encerrar processo somente com confirmação;
- Ignorar processo nas futuras análises.

### Proteções

Não permitir encerramento automático de:

- `csrss.exe`;
- `wininit.exe`;
- `services.exe`;
- `lsass.exe`;
- `svchost.exe`, sem modo avançado e confirmação;
- Processos de segurança;
- Processos sem identificação, salvo ação manual avançada.

---

## 5.8 Energia

### Perfis

- Economia;
- Equilibrado;
- Alto desempenho;
- Melhor desempenho, quando disponível;
- Personalizado.

### Informações

- Plano atual;
- Uso de bateria;
- Tempo estimado, quando disponível;
- Temperatura, se disponível;
- Estado de suspensão;
- Brilho e tela, quando acessível.

### Avisos

O perfil de alto desempenho pode aumentar consumo de bateria, calor e ruído. Em notebooks, o SCANNY deve recomendar o modo equilibrado para uso comum.

---

## 5.9 Jogos

O objetivo é preparar o sistema sem inventar otimizações perigosas.

### Recursos

- Identificar jogos instalados;
- Mostrar processos em segundo plano;
- Abrir Modo de Jogo do Windows;
- Controlar Xbox Game Bar;
- Controlar gravação em segundo plano;
- Limpar cache de shaders com aviso;
- Selecionar plano de energia;
- Criar uma lista de jogos favoritos;
- Mostrar uso de CPU, GPU, RAM e disco durante a sessão.

### Medição

O SCANNY poderá registrar uma comparação antes e depois:

```text
Antes: 82% de RAM em uso
Depois: 68% de RAM em uso
Arquivos liberados: 1,2 GB
FPS: não medido pelo SCANNY
```

O aplicativo não deve afirmar que aumentou FPS se não tiver uma medição confiável.

---

## 5.10 Reparos do Windows

Esta área será avançada e deverá explicar que algumas tarefas demoram.

### Ferramentas possíveis

- SFC para verificar arquivos protegidos;
- DISM para reparar a imagem do Windows;
- Verificação do Windows Update;
- Reinicialização dos componentes do Windows Update;
- Renovação de DNS;
- Limpeza do cache DNS;
- Reinicialização de componentes de rede;
- Verificação básica do disco;
- Abertura de ferramentas oficiais do Windows.

### Regras

- Mostrar o comando antes de executá-lo;
- Exibir saída em tempo real ou log;
- Não fechar a janela durante a tarefa;
- Avisar se será necessário reiniciar;
- Não executar comandos obtidos de sites externos;
- Permitir cancelar quando o comando suportar cancelamento.

---

## 5.11 Privacidade

A privacidade deve ser opcional e reversível.

### Opções possíveis

- Desativar anúncios personalizados;
- Desativar sugestões do menu Iniciar;
- Reduzir histórico de atividades;
- Revisar permissões de localização;
- Revisar permissões de câmera e microfone;
- Desativar sugestões do Explorador de Arquivos;
- Abrir configurações oficiais de privacidade.

### O que não fazer automaticamente

- Desativar Defender;
- Desativar Firewall;
- Bloquear totalmente o Windows Update;
- Alterar arquivos HOSTS sem explicação;
- Remover componentes de segurança;
- Impedir atualizações críticas.

---

## 5.12 Segurança e restauração

Esta será uma das partes mais importantes do produto.

### Recursos

- Criar ponto de restauração;
- Salvar configurações alteradas pelo SCANNY;
- Restaurar alteração individual;
- Restaurar uma sessão completa;
- Exportar backup em arquivo;
- Importar backup;
- Ver data do último backup;
- Verificar se o Defender está ativo;
- Verificar se o Firewall está ativo;
- Avisar sobre reinicialização pendente.

### Histórico

Cada registro deverá conter:

- Data e hora;
- Usuário;
- Categoria;
- Ação;
- Configuração anterior;
- Configuração nova;
- Resultado;
- Botão de desfazer, quando disponível.

---

## 5.13 Configurações do SCANNY

### Geral

- Iniciar com o Windows: desativado por padrão;
- Minimizar para a bandeja: opcional;
- Tema claro, escuro ou automático;
- Idioma português e inglês;
- Confirmar ações perigosas;
- Mostrar notificações.

### Privacidade do próprio SCANNY

- Telemetria própria desativada por padrão;
- Nenhum envio automático de dados pessoais;
- Logs salvos localmente;
- Botão para apagar dados do SCANNY;
- Opção de relatório anônimo somente se o usuário escolher.

### Atualizações

- Verificar atualizações manualmente;
- Verificar automaticamente sem instalar;
- Baixar somente releases do GitHub oficial;
- Mostrar versão, data e changelog;
- Validar hash ou assinatura quando disponível.

---

# 6. Fluxo da otimização segura

Ao clicar em **Otimização segura**, o SCANNY deverá:

1. Exibir o que será analisado;
2. Executar a análise somente de leitura;
3. Apresentar uma lista de ações recomendadas;
4. Deixar todas as ações selecionáveis;
5. Desmarcar ações avançadas por padrão;
6. Criar ponto de restauração se necessário;
7. Pedir confirmação;
8. Executar uma ação por vez;
9. Mostrar progresso;
10. Registrar o resultado;
11. Exibir o resumo final;
12. Oferecer desfazer ou abrir o histórico.

A interface nunca deve mostrar apenas um botão mágico que modifica dezenas de configurações sem explicar cada uma.

---

# 7. Sistema de riscos

Cada ação deverá ter um nível:

### Seguro

Limpeza de temporários não utilizados, análise de disco e geração de relatório.

### Baixo risco

Redução de transparência, efeitos visuais e desativação de um programa conhecido na inicialização.

### Médio risco

Limpeza de cache de navegador, alteração de plano de energia e reparos do Windows.

### Alto risco

Alteração de serviços, políticas, registro avançado e componentes do Windows.

Ações de alto risco não devem fazer parte da otimização segura. Elas devem ficar em uma área avançada, com explicação e confirmação extra.

---

# 8. Aplicativo leve

O SCANNY não deverá manter um serviço ativo o tempo todo.

### Regras de desempenho

- Abrir somente quando solicitado;
- Não iniciar com o Windows por padrão;
- Não usar navegador embutido pesado se não for necessário;
- Não carregar módulos de reparo até o usuário abrir a categoria;
- Não fazer varredura constante;
- Não monitorar temperatura continuamente sem autorização;
- Não executar limpeza em segundo plano sem confirmação;
- Liberar memória depois que uma tarefa terminar;
- Não armazenar caches grandes.

### Tecnologia recomendada

Para facilitar a manutenção por Claude e outros desenvolvedores:

- C#;
- .NET 8 LTS ou versão LTS atual;
- WPF para a primeira versão, se a prioridade for leveza e compatibilidade;
- MVVM para separar a interface da lógica;
- SQLite opcional para histórico local;
- Inno Setup ou MSIX para distribuição;
- GitHub Actions para compilação.

Uma alternativa futura seria WinUI 3, mas WPF tende a ser mais simples e leve para a primeira versão do Windows 10.

---

# 9. Arquitetura do projeto

```text
SCANNY/
├── src/
│   ├── SCANNY.App/
│   │   ├── Views/
│   │   ├── ViewModels/
│   │   ├── Resources/
│   │   └── App.xaml
│   ├── SCANNY.Core/
│   │   ├── Models/
│   │   ├── Interfaces/
│   │   ├── Results/
│   │   └── Exceptions/
│   ├── SCANNY.Analysis/
│   ├── SCANNY.Cleanup/
│   ├── SCANNY.VisualEffects/
│   ├── SCANNY.Startup/
│   ├── SCANNY.Storage/
│   ├── SCANNY.Power/
│   ├── SCANNY.Gaming/
│   ├── SCANNY.Repair/
│   ├── SCANNY.Privacy/
│   ├── SCANNY.Security/
│   ├── SCANNY.Logging/
│   └── SCANNY.Update/
├── tests/
│   ├── SCANNY.Core.Tests/
│   ├── SCANNY.Cleanup.Tests/
│   └── SCANNY.Analysis.Tests/
├── docs/
│   ├── architecture.md
│   ├── safety.md
│   ├── supported-actions.md
│   └── translations.md
├── assets/
├── scripts/
├── .github/
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
├── LICENSE
├── README.md
├── CHANGELOG.md
└── CONTRIBUTING.md
```

---

# 10. Modelo de execução das ações

Cada ação deve implementar uma estrutura semelhante a:

```text
Nome: Limpar cache de miniaturas
Categoria: Limpeza
Risco: Seguro
Reversível: Não, mas o Windows recria o cache
Precisa de administrador: Não ou depende da pasta
Análise: tamanho atual e quantidade de arquivos
Execução: apagar apenas arquivos encontrados
Resultado: espaço liberado e arquivos ignorados
Log: obrigatório
```

A lógica deve separar:

- Detecção;
- Prévia;
- Confirmação;
- Execução;
- Verificação;
- Registro;
- Restauração.

Nunca misturar análise e exclusão na mesma função sem uma confirmação intermediária.

---

# 11. Mensagens da interface

### Mensagens boas

- “Encontramos 2,4 GB de arquivos temporários que podem ser removidos.”
- “Esta alteração afeta os efeitos visuais do Windows e pode ser desfeita.”
- “O arquivo está em uso e foi ignorado.”
- “Nenhum dado pessoal será incluído nesta análise.”
- “O SCANNY não encontrou uma forma segura de classificar este item.”

### Mensagens que devem ser evitadas

- “Seu PC está 97% lento.”
- “Clique aqui para acelerar 300%.”
- “Todos os serviços são inúteis.”
- “Seu registro está cheio de erros.”
- “Libere RAM instantaneamente.”
- “Seu computador está infectado” sem evidência.

---

# 12. Identidade visual

### Direção visual

- Tema escuro como padrão;
- Fundo grafite;
- Azul-ciano ou verde-limão como cor de ação;
- Vermelho apenas para riscos reais;
- Amarelo para avisos;
- Verde para resultados concluídos;
- Cards com cantos levemente arredondados;
- Ícones simples e consistentes;
- Tipografia legível;
- Sem excesso de gradientes;
- Sem visual de antivírus alarmista.

### Ideia do logo

Uma lupa estilizada formando a letra “S”, combinada com uma pequena linha de verificação. O logo deve funcionar em 16, 32, 64 e 256 pixels.

### Tom de voz

- Direto;
- Claro;
- Técnico apenas quando necessário;
- Sem assustar o usuário;
- Sem promessas impossíveis;
- Explicando sempre o benefício e o risco.

---

# 13. Primeira versão — MVP

A versão 1.0 deve ser menor e confiável.

### Obrigatório no MVP

1. Dashboard;
2. Análise do sistema;
3. Limpeza de temporários;
4. Limpeza de miniaturas;
5. Limpeza de cache de shaders;
6. Limpeza opcional da lixeira;
7. Controle de animações e transparência;
8. Lista de programas de inicialização;
9. Planos de energia;
10. Criação de ponto de restauração;
11. Histórico de ações;
12. Logs;
13. Português e inglês;
14. Modo claro e escuro;
15. GitHub Actions;
16. README completo.

### Não incluir no primeiro MVP

- Desativação automática de serviços;
- Limpeza de registro;
- Otimização automática de drivers;
- Overclock;
- Promessa de aumento de FPS;
- Limpeza automática de navegadores;
- Monitoramento permanente;
- Funcionalidades de antivírus;
- Modificação avançada de políticas do Windows.

---

# 14. Roadmap

## Versão 1.0 — Base segura

- Análise;
- Limpeza segura;
- Efeitos visuais;
- Inicialização;
- Energia;
- Backup;
- Histórico.

## Versão 1.1 — Melhorias de usabilidade

- Mais categorias de cache;
- Exportação de relatório;
- Detecção melhor de programas;
- Acessibilidade;
- Atalhos de teclado;
- Traduções adicionais.

## Versão 1.5 — Diagnóstico

- SFC;
- DISM;
- Diagnóstico de rede;
- Diagnóstico de Windows Update;
- Relatório avançado de hardware.

## Versão 2.0 — Jogos e monitoramento opcional

- Painel de jogos;
- Comparação antes/depois;
- Monitoramento durante uma sessão;
- Perfil por jogo;
- Histórico de desempenho.

## Versão 3.0 — Recursos avançados

- Serviços com perfis seguros;
- Mais opções de privacidade;
- Agendamento opcional de análise;
- Integração com ferramentas oficiais;
- Sistema de plugins muito restrito e revisado.

---

# 15. GitHub e distribuição

O repositório deverá conter:

- Código fonte completo;
- Licença MIT ou GPL-3.0;
- README em português e inglês;
- Capturas da interface;
- Guia de compilação;
- Guia de segurança;
- Lista de todas as alterações que o app pode fazer;
- Releases versionadas;
- Changelog;
- Código de conduta;
- Política de segurança;
- Modelo de issue para bugs;
- Modelo de issue para sugestões.

### GitHub Actions

O pipeline poderá:

1. Restaurar dependências;
2. Compilar em modo Release;
3. Executar testes;
4. Verificar formato do código;
5. Gerar instalador;
6. Gerar hash SHA-256;
7. Publicar artefato;
8. Criar release somente com aprovação.

### Distribuição

Inicialmente, disponibilizar:

- Instalador `.exe`;
- Versão portátil `.zip`;
- Código fonte;
- Hash dos arquivos.

O instalador não deve incluir programas de terceiros nem ofertas adicionais.

---

# 16. Segurança do projeto

O SCANNY deve ser especialmente cuidadoso porque possui acesso a configurações do sistema.

### Regras

- Não baixar scripts externos para executar;
- Não executar comandos ocultos;
- Mostrar comandos sensíveis;
- Validar caminhos antes de apagar arquivos;
- Usar listas permitidas para pastas de limpeza;
- Recusar caminhos perigosos;
- Verificar permissões;
- Registrar falhas;
- Não armazenar senhas ou tokens;
- Não fazer chamadas de rede sem necessidade;
- Validar downloads e atualizações.

### Proteção contra exclusão errada

Antes de excluir um caminho, validar:

- Se está dentro de uma pasta permitida;
- Se não é raiz de disco;
- Se não é pasta do sistema protegida;
- Se não contém arquivos pessoais;
- Se não está sendo usado por outro processo;
- Se a regra permite exclusão.

---

# 17. Critérios de qualidade

O SCANNY estará pronto para uma primeira release quando:

- Nenhuma ação ocorrer sem consentimento;
- As operações principais tiverem prévia;
- Houver logs compreensíveis;
- As alterações de efeitos visuais puderem ser desfeitas;
- A desativação de inicialização puder ser revertida;
- O app não apagar pastas pessoais;
- O app não desativar Defender, Firewall ou Windows Update automaticamente;
- O app funcionar sem internet depois de instalado, exceto para atualizações opcionais;
- O consumo em repouso for baixo;
- O instalador não incluir software extra;
- O código compilar pelo GitHub Actions;
- Existirem testes para as regras de limpeza;
- O README explicar exatamente os riscos.

---

# 18. Prompt para entregar ao Claude

Use o texto abaixo como briefing:

> Crie um aplicativo desktop para Windows chamado SCANNY, usando C# com .NET 8 LTS e WPF seguindo MVVM. O SCANNY é um utilitário leve de análise, limpeza e otimização segura do Windows 10 e Windows 11 64-bit.
>
> O aplicativo deve ter tema escuro moderno, azul-ciano como cor de destaque, navegação lateral e dashboard com CPU, RAM, armazenamento, arquivos temporários e programas de inicialização. O produto deve ser transparente: nenhuma ação destrutiva pode ser executada sem prévia, seleção do usuário e confirmação.
>
> Implemente primeiro o MVP com dashboard, análise de sistema, limpeza de arquivos temporários, limpeza de miniaturas, limpeza de cache de shaders, limpeza opcional da lixeira, controle de animações e transparência, gerenciador de inicialização, planos de energia, criação de ponto de restauração, histórico e logs.
>
> Separe os projetos em SCANNY.App, SCANNY.Core, SCANNY.Analysis, SCANNY.Cleanup, SCANNY.VisualEffects, SCANNY.Startup, SCANNY.Power, SCANNY.Security e SCANNY.Logging. Separe análise, prévia, confirmação, execução, verificação, log e restauração.
>
> Não implemente limpador de registro, desativação automática do Defender, Firewall ou Windows Update, limpeza de Downloads, encerramento automático de processos do sistema, promessa de aumento de FPS ou scripts baixados da internet. O app deve usar listas permitidas para pastas de limpeza, validar caminhos e ignorar arquivos em uso.
>
> Crie README em português e inglês, LICENSE, CHANGELOG, CONTRIBUTING, SECURITY, workflows do GitHub Actions, testes unitários e instalador. Inclua documentação de todas as ações e dos riscos. O app deve ser leve, não iniciar com o Windows por padrão, não ficar em segundo plano e não enviar telemetria própria.
>
> Antes de implementar recursos avançados, construa uma interface funcional com dados reais e estados de carregamento, vazio, erro, sucesso e confirmação. Não use números falsos no dashboard. Quando um dado não estiver disponível, mostre “Não disponível”.

---

## Conclusão

O SCANNY deve ser construído como uma ferramenta de manutenção confiável, não como um programa agressivo que altera o sistema inteiro com um clique. O maior diferencial será explicar cada ação, medir o resultado, criar restauração e permitir desfazer alterações.

A primeira versão deve ser menor, segura e bem testada. Depois que a base estiver estável, será possível adicionar diagnóstico, jogos, privacidade e recursos avançados sem transformar o projeto em um “otimizador perigoso”.

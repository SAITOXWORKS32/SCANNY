# Segurança

## Estado atual

O repositório atual contém um protótipo de interface. As operações de limpeza, reparo e otimização são simuladas e não modificam o Windows.

## Reportar vulnerabilidades

Não publique detalhes de uma vulnerabilidade explorável em uma issue pública. Abra uma issue privada quando disponível ou contate os mantenedores pelo canal indicado no perfil do repositório, incluindo versão, sistema operacional, passos para reproduzir e impacto.

Não envie arquivos pessoais, senhas, tokens ou dumps completos do sistema.

## Princípios para novas funções

- Não executar scripts remotos;
- Validar caminhos antes de apagar arquivos;
- Não desativar recursos de segurança automaticamente;
- Exigir confirmação para ações destrutivas;
- Registrar e permitir desfazer alterações quando possível;
- Manter o comportamento documentado no README.

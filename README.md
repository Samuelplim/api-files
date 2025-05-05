# API de Files - Documentação do Projeto

Este repositório contém uma API Node.js para upload e gerenciamento de arquivos, implementada seguindo os princípios de Domain-Driven Design (DDD).

## Índice de Documentação

1. [Configuração do Projeto](./docs/01-configuracao-projeto.md)
2. [Implementação da API](./docs/02-implementacao-api.md)
3. [Armazenamento e Gerenciamento](./docs/03-armazenamento-gerenciamento.md)
4. [Segurança e Limitações](./docs/04-seguranca-limitacoes.md)
5. [Testes e Documentação](./docs/05-testes-documentacao.md)
6. [Estrutura DDD](./docs/06-estrutura-ddd.md)

## Visão Geral

Este projeto implementa uma API para upload e gerenciamento de arquivos com as seguintes funcionalidades principais:

- Upload de múltiplos arquivos via rota `/add-files/`
- Recuperação de arquivos por URI via rota `/load-files`
- Armazenamento organizado seguindo princípios DDD
- Validação e verificação de integridade dos arquivos

## Como Iniciar

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Executar testes
npm test
```

Para detalhes completos sobre cada aspecto do projeto, consulte os documentos específicos listados no índice acima.

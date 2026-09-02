# Juliana Macedo — API

API responsável pela autenticação, publicação de conteúdo, gestão de pacientes e recursos de acompanhamento nutricional da plataforma Juliana Macedo.

## Sobre

Este backend faz parte da plataforma originalmente desenvolvida com o nome **Vida & Sabor**. Durante a evolução do projeto, a identidade pública foi alterada para **Juliana Macedo**, acompanhando a marca profissional da nutricionista. A mudança de identidade não altera os nomes técnicos já utilizados nos repositórios e no código.

A API centraliza regras de negócio, persistência em PostgreSQL, autenticação e autorização, gestão de mídia e os módulos nutricionais da plataforma. Frontend e backend são mantidos em repositórios independentes.

## Arquitetura

A aplicação utiliza Node.js, Express e TypeScript, com separação entre camadas de entrada, regras de negócio e persistência:

- **controllers:** recebem requisições e coordenam respostas HTTP;
- **services:** concentram regras de negócio;
- **models:** representam entidades persistidas pelo TypeORM;
- **routes:** definem os endpoints e seus middlewares;
- **middleware:** autenticação, autorização e tratamento transversal;
- **config:** banco de dados e integrações;
- **migrations:** evolução versionada do esquema PostgreSQL;
- **seeds:** criação controlada de dados administrativos;
- **`__tests__`:** testes automatizados existentes.

## Módulos

### Autenticação e usuários

- cadastro e login;
- cadastro completo de usuário;
- consulta do usuário autenticado;
- atualização de perfil;
- recuperação de e-mail;
- recuperação e alteração de senha;
- gestão de usuários e pacientes;
- endereços, telefones e e-mails associados.

### Blog

- criação, consulta e atualização de posts;
- publicação, arquivamento e gestão administrativa;
- comentários;
- curtidas;
- registro de visualizações;
- upload de imagens.

### Métricas e cálculos

- registro e consulta de métricas;
- cálculo de IMC;
- cálculo de taxa metabólica basal;
- estimativa de gasto energético diário;
- cálculo de macronutrientes;
- recomendação de ingestão de água.

### Antropometria

- criação e consulta de avaliações;
- cálculo automático;
- cálculo por método específico;
- consulta da avaliação mais recente e de histórico.

### Gestação

- acompanhamento gestacional;
- registro e consulta de visitas.

### Alimentos e planos alimentares

A API possui estrutura para:

- cadastro, consulta, atualização e ativação de alimentos;
- modelos, variantes, aliases, nutrientes, fontes e medidas;
- criação e manutenção de planos alimentares;
- organização por dias, refeições e itens.

Esses módulos estão em evolução e ainda não possuem toda a experiência correspondente consolidada no frontend.

## Autenticação e autorização

A autenticação utiliza JWT. Senhas são processadas com BCrypt e as rotas protegidas utilizam middleware de autenticação e verificações de perfil.

Os perfis `USER` e `ADMIN` aparecem nos fluxos centrais. Determinados serviços também verificam o contexto profissional. A autorização ainda está sendo consolidada: parte das verificações ocorre em middlewares e parte em controllers ou services.

## Banco de dados

- PostgreSQL como banco relacional;
- TypeORM para mapeamento e acesso aos dados;
- migrations versionadas para evolução do esquema.

Nenhuma configuração, credencial ou dado de produção deve ser incluído na documentação ou no repositório.

## Integrações

- **Cloudinary:** armazenamento e gerenciamento de imagens enviadas pela aplicação;
- **Nodemailer:** envio de e-mails transacionais;
- **Google reCAPTCHA:** validação utilizada nos fluxos configurados para exigi-la.

## Testes

O repositório contém testes com Jest, ts-jest e Supertest para áreas como:

- comentários;
- curtidas em posts;
- cadastro completo de usuário;
- métricas de usuário;
- serviço de posts.

Os testes não foram executados como parte desta documentação e não é declarada uma porcentagem de cobertura.

## Variáveis de ambiente

Configure apenas as variáveis aplicáveis ao ambiente utilizado. Nunca versione valores reais.

### Aplicação e banco

```env
PORT=<application_port>
DB_HOST=<database_host>
DB_PORT=<database_port>
DB_USER=<database_user>
DB_PASS=<database_password>
DB_NAME=<database_name>
DATABASE_URL=<database_connection_url>
JWT_SECRET=<jwt_secret>
NODE_ENV=<environment>
```

A aplicação pode utilizar configuração por campos individuais ou `DATABASE_URL`, conforme o ambiente.

### Integrações

```env
CLOUDINARY_CLOUD_NAME=<cloudinary_cloud_name>
CLOUDINARY_API_KEY=<cloudinary_api_key>
CLOUDINARY_API_SECRET=<cloudinary_api_secret>
EMAIL_USER=<smtp_user>
EMAIL_PASS=<smtp_password>
RECAPTCHA_REQUIRED=<true_or_false>
RECAPTCHA_SECRET_KEY=<recaptcha_secret>
DEV_BYPASS_KEY=<development_bypass_key>
```

### Testes

O arquivo `.env.test.example` documenta a configuração segura esperada para testes, incluindo:

```env
DB_TEST_NAME=<test_database_name>
```

### Seed administrativo

O script de seed utiliza conjuntos de variáveis `ADMIN_1_*` e `ADMIN_2_*` para nome, e-mail, CPF, data de nascimento e senha. Preencha-os somente em ambiente controlado e nunca publique dados ou credenciais reais.

## Executando localmente

### Requisitos

- Node.js compatível com as dependências do projeto;
- npm;
- PostgreSQL.

### Instalação

```bash
npm install
```

Configure as variáveis de ambiente necessárias e crie um banco local próprio para desenvolvimento.

### Migrations

```bash
npm run migration:run
```

### Desenvolvimento

```bash
npm run dev
```

### Build e execução

```bash
npm run build
npm start
```

### Testes

Use um banco exclusivo para testes e uma configuração baseada em `.env.test.example`:

```bash
npm test
```

Outros scripts de migrations e seed podem ser consultados no `package.json`. Revise o ambiente antes de executá-los.

## Estado do projeto

### Implementado

- autenticação e usuários;
- blog, comentários, curtidas e visualizações;
- pacientes e métricas;
- cálculos nutricionais;
- antropometria;
- gestação;
- upload e gestão de imagens.

### Em desenvolvimento

- consolidação do catálogo de alimentos;
- evolução do módulo de planos alimentares;
- integração completa desses módulos com o frontend;
- ampliação da padronização de autorização e dos testes.

## Segurança e privacidade

O domínio da aplicação pode envolver dados pessoais e clínicos. Para desenvolvimento, testes, documentação e demonstrações:

- utilize somente pessoas e informações fictícias;
- não publique bancos, dumps ou arquivos de ambiente;
- não versione tokens, senhas ou chaves de integrações;
- mantenha bancos de teste separados de qualquer ambiente real;
- revise uploads e screenshots antes de torná-los públicos.

## Frontend relacionado

A interface que consome esta API está disponível em:

- [Juliana Macedo — Plataforma de Nutrição](https://github.com/ruhanrmacedo/juliana-macedo-frontend)

## Roadmap

- consolidar o catálogo e a modelagem de alimentos;
- integrar os fluxos de planos alimentares ao frontend;
- evoluir a importação estruturada de fontes nutricionais, incluindo a futura integração com dados da TACO;
- ampliar testes dos módulos nutricionais;
- continuar a padronização de autorização e documentação técnica.

Não há datas públicas definidas para esses itens.

## Autoria

Desenvolvido por **Ruhan Macedo**.

## Licença

Este projeto ainda não possui uma licença pública definida.

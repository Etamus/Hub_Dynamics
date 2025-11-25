# Hub Spare Parts

Servidor web desenvolvido em **Python** com **Flask**, projetado como um portal centralizado e multi-usuário (Hub) para orquestrar, acessar e interagir com diversas ferramentas de automação e Business Intelligence.

A aplicação oferece uma interface web unificada com sistema de perfis, permissões (RBAC) e personalização, permitindo executar tarefas, visualizar dashboards, planilhas e interagir com sistemas legados como **SAP** e portais web como o **BW HANA** em uma interface web única, limpa e moderna.

---

<img width="1919" height="921" alt="{0AE0844E-2FCB-435A-AE3D-5910A1D50077}" src="https://github.com/user-attachments/assets/5314a64e-d9b0-45d0-9383-c8ac72afd08c" />

---

## Funcionalidades

**Portal e Acesso**

- **Hub de Aplicações:** Página inicial (gateway) que direciona o usuário para as diferentes ferramentas.

- **Controle de Acesso (RBAC) (v1.9):**
  - **Executor (Operador):** Acesso total (Automação, Dashboards, Drive).
  - **Analista (Visualizador):** Acesso limitado (Dashboards, Drive).
  - **Deslogado (Guest):** Acesso apenas a Dashboards.

- **Renderização Otimizada (Flicker-Free):** Os cards de aplicação são renderizados condicionalmente pelo servidor (Flask/Jinja2) com base na role do usuário, eliminando o "flicker" (piscar) da interface no carregamento da página.

---

<img width="960" height="540" alt="Staff Supply LTL   Spare Parts - Novembro 2025 (1)" src="https://github.com/user-attachments/assets/785352de-638f-4543-936e-113c7381352e" />

---

**Sistema de Perfis e Personalização**

- **Autenticação de Usuário (v1.7):** Sistema completo de Login, Logout e Registro.

- **Perfis de Usuário (v1.8):**
  - O usuário pode fazer upload de uma foto de perfil personalizada.
  - Inclui modal de recorte (Cropper.js) para garantir que a foto seja redonda.
  - Imagens são salvas no diretório /cache do servidor.

- **Conexões Persistentes (v1.7):** Usuários logados podem salvar suas credenciais de SAP e BW em seu perfil, permitindo login automático nas automações.

- **Acesso Rápido por Perfil (v1.7):** O "Acesso Rápido" e os dashboards "Fixados" agora são salvos por usuário (ex: recentDashboards_admin, recentDashboards_guest).

- **Sincronização de Tema (v1.8):** O tema (Claro/Escuro/Sistema) é salvo no localStorage e compartilhado entre o Hub e todas as páginas internas (Automações, Drive, etc.).

---

**Automação e Agendamento**

- **Painel de Automação:** Interface que gerencia o login (manual ou salvo) em SAP e BW HANA.

- **Agendador de Tarefas Avançado (v1.8):**
  - **Fila Persistente:** A fila e o histórico são salvos em um scheduler_db.json global, visível para todos os usuários.
  - **Propriedade de Tarefa:** Apenas o usuário que criou uma tarefa (o creator) pode vê-la e excluí-la da fila (outros usuários veem o nome do criador em maiúsculas).
  - **Interface Aprimorada:** Seleção de tarefas feita por botões paginados em vez de um menu suspenso.
  - **Inputs de Data/Hora:** Utiliza máscaras de texto (JS) para DD/MM/AAAA e HH:MM, com ícones de calendário/relógio que abrem os seletores nativos.

- **Execução de Macros (VBA):** Dispara a execução de macros VBA em planilhas Excel através de scripts PowerShell.

- **Automação Web (Playwright):** Realiza automações complexas em portais web (como o BW HANA) utilizando a biblioteca Playwright.

- **Gerenciamento de Processos:** Inclui script de limpeza forçada de processos (SAP, Excel, navegadores) para resetar o ambiente.

- **Download de Relatórios:** Permite baixar arquivos gerados pelas automações (como relatórios do Excel) diretamente pela interface web.

---

**Acesso e Administração de Contas (v1.9)**

- **Solicitação de Acesso:** Usuários deslogados podem acessar o menu "Registrar" para solicitar uma conta.

- **Sistema de Token:** A solicitação gera um token único que o usuário usa na aba "Consultar" para verificar o status (Aguardando, Aprovado, Reprovado, Expirado).

- **Criação de Senha:** Após a aprovação, o usuário usa o token para definir sua senha final.

- **Painel de Administração (Exclusivo para 'admin'):**
  - **Gerenciamento de Solicitações:** O admin pode ver todas as solicitações pendentes e Aprová-las ou Reprová-las (com justificativa obrigatória).
  - **Gerenciamento de Usuários:** O admin pode ver, editar (Senha, Área, Função) ou excluir qualquer usuário existente no sistema.

---

**Ferramentas Adicionais**

- **Portal de Dashboards:** Integra relatórios de BI como Looker Studio e Tableau diretamente na interface.

- **Preview Lateral Interativo (v1.0.4):** Exibe um GIF de preview e etiquetas coloridas ao passar o mouse sobre um dashboard.

- **Navegador de Arquivos (Drive Online) (v1.0.1):** Interface web que permite navegar, consultar e baixar arquivos de um diretório de rede no servidor.

- **Assistente Virtual Interativo (v1.0.2):** Chatbot flutuante que direciona o usuário para formulários de Demandas ou Sugestões.

---

## Como Executar

### Pré-requisitos
- Python 3.x  
- Navegador moderno (Chrome, Edge, etc.)  
- Ambiente Windows (necessário para os scripts PowerShell e automação de macros)

### Instalação
1. Clone o repositório ou baixe os arquivos:  
   git clone https://github.com/Etamus/Hub_Spare_Parts.git  
   cd Hub_Spare_Parts

2. Crie um arquivo chamado requirements.txt na pasta principal e adicione:  
   Flask  
   playwright  

3. Instale as dependências:  
   pip install -r requirements.txt  

---

## Execução

1. Inicie o servidor Flask:  
   python main_server.py  

2. Acesse no navegador:  
   http://localhost:5000  

3. Para executar toda a automação de uma vez (Windows):  
   initialize.bat  

---

## Scripts de Automação

| Script | Função |
|--------|--------|
| main_server.py | Servidor Flask principal que gerencia todas as rotas e a lógica de API. |
| runner.ps1 | Script (PowerShell) genérico que abre um Excel e executa uma macro específica. |
| cleanup_processes.ps1 | Script (PowerShell) que força o encerramento de processos (SAP, Excel, Navegadores). |
| sap_login_runner.ps1 | Script (PowerShell) que insere credenciais no Excel e inicia o login SAP. |
| bw_hana_extractor.py | Script (Python + Playwright) para automação web do BW HANA. |
| convert_xls_to_csv.ps1 | Script (PowerShell) que converte arquivos .xls para .csv. |

---

## Arquivos de dados

| Arquivo | Função |
|--------|--------|
| users.json | Armazena os perfis de usuários, senhas, roles, áreas e conexões salvas. |
| scheduler_db.json | Armazena a fila e o histórico (globais) do Agendador de Tarefas. |
| requests_db.json | Armazena as solicitações de acesso (pendentes, aprovadas, reprovadas). |

---

## Tecnologias

- Python + Flask → Backend e Servidor Local 
- HTML/CSS/JS → Frontend e Interface web 
- Playwright → Automação Web  
- PowerShell → Scripts de integração no Windows  
- Recorte de Imagem: Cropper.js
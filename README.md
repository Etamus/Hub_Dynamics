# Hub Dynamics

Hub corporativo em **Flask** que centraliza automações, dashboards, arquivos e fluxos de acesso em uma única experiência responsiva. O Hub abstrai integrações com SAP, BW HANA, macros em Excel e relatórios Looker/Tableau, oferecendo RBAC completo, perfis personalizados e um scheduler persistente.

---

<img width="1917" height="918" alt="{FDE172BF-CEC4-4F9F-93F9-B2500C2681D5}" src="https://github.com/user-attachments/assets/4555a720-f31c-4d56-a17e-5acb0cba975f" />

---

## Destaques atuais

| Área | O que existe hoje |
| --- | --- |
| **Portal & RBAC** | Landing inteligente que libera/oculta Automação, Dashboards e Drive conforme a role (Executor, Analista ou Visitante). Renderização server-side evita flicker ao carregar. |
| **Perfis & Personalização** | Login/registro, upload e recorte de avatar via Cropper.js, preferências de idioma/tema sincronizadas e armazenamento das últimas automações/dashboards usados por usuário. |
| **Automação SAP/BW** | Painel com preview animado, login automático via conexões salvas, execução de macros PowerShell/Excel, limpeza de processos e gatilhos para Playwright (BW HANA). |
| **Scheduler compacto** | Modal em abas (“Tarefas”, “Fila”, “Histórico”), inputs com máscara + seletor nativo, fila/histórico persistentes em `scheduler_db.json`, propriedade de tarefas e paginação de botões. |
| **Dashboards & Drive** | Busca global, preview GIF com tags, esconder/exibir busca ao abrir dashboards, controle de iframe responsivo e Drive web para navegar pelo storage da operação. |
| **Admin & Acessos** | Fluxo de solicitação com token, consulta de status, criação de senha pós-aprovação e painel do admin para aprovar, justificar e gerir usuários. |

---

<img width="960" height="540" alt="Staff Supply LTL   Spare Parts - Novembro 2025" src="https://github.com/user-attachments/assets/50a0793c-df2c-4618-8a42-24061477c819" />

---

## Arquitetura e tecnologias

- **Backend:** Python 3 + Flask, rotas REST + renderização Jinja2.
- **Frontend:** HTML5, CSS modular (`hub.css`, `automacao.css`, etc.), JavaScript vanilla organizado por página (`hub.js`, `automacao.js`, `dashboards.js`).
- **Automação:** PowerShell para macros SAP/Excel, Playwright Python para BW, scripts utilitários (limpeza de processos, conversões XLS → CSV).
- **Persistência leve:** Arquivos JSON (`users.json`, `scheduler_db.json`, `requests_db.json`) e cache local (`/cache`, `/drive`).
- **Assets:** Cropper.js, Font Awesome, animações próprias e componentes reutilizáveis em `static/js/shared.js`.

---

## Fluxos principais

### 1. Acesso e perfis
1. Usuário se registra (ou solicita acesso) → sistema gera token.
2. Admin aprova/reprova com justificativa → usuário consulta status e define senha final.
3. Perfil salva foto, tema, idioma e credenciais SAP/BW para login automático.

### 2. Automações SAP / BW HANA
1. Usuário escolhe sistema (SAP/BW) e tarefa, visualiza preview (GIF + tags) e executa.
2. Login usa modo manual, credencial salva ou sessão ativa; status real-time exibe sucesso/erro.
3. Execuções podem disparar downloads (ex. “Base Mãe”) e atualizar botões de download.

### 3. Agendador de tarefas
1. Abas “Tarefas / Fila / Histórico” dentro do modal compacto.
2. Inputs mascarados para data/hora + seletor nativo com ícones.
3. Seleção de automações paginada e botão “Adicionar à Fila” estreito.
4. Fila/histórico persistem em `scheduler_db.json`; somente o criador remove sua tarefa.

### 4. Dashboards e Drive
1. Busca global com atalhos (Ctrl + K) e preview lateral.
2. Ao abrir dashboard, barra de busca recolhe e iframe expande (desktop/mobile responsivo).
3. Drive emula navegador de arquivos web, permitindo download direto do servidor.

---

## Pré-requisitos

- Windows 10+ (necessário para PowerShell, Excel e SAP GUI utilizados pelas automações).
- Python 3.10+.
- Navegador moderno (Chrome/Edge) com suporte a ES6.
- Acesso às ferramentas corporativas (SAP GUI, BW HANA, diretórios de rede) quando aplicável.

---

## Como executar localmente

```bash
git clone https://github.com/Etamus/Hub_Spare_Parts.git
cd Hub_Spare_Parts

python -m venv .venv
.venv\Scripts\activate

pip install -r requirements.txt  # Flask, Playwright, dotenv etc.
playwright install               # caso use os fluxos BW
```

```bash
python main_server.py
# acessar http://localhost:5000
```

Para rodar o pacote completo de automações (scripts PowerShell + macros):

```powershell
initialize.bat
```

> **Observação:** `requirements.txt` não é versionado para facilitar deploy customizado. Gere o arquivo com os pacotes acima caso esteja iniciando do zero.

---

## Estrutura relevante

| Pasta / Arquivo | Descrição |
| --- | --- |
| `main_server.py` | Servidor Flask (rotas web, APIs, autenticação, RBAC e integração com JSONs). |
| `static/css/` | Camadas de estilo segmentadas (hub, automacao, dashboards, drive). Contém os ajustes recentes do scheduler compacto. |
| `static/js/automacao.js` | Lógica do painel SAP/BW, scheduler, preview, login automático e status das execuções. |
| `static/js/dashboards.js` | Busca global, preview lateral dos dashboards, controle de iframe e ocultação de busca. |
| `runner.ps1`, `sap_login_runner.ps1`, `cleanup_processes.ps1` | Scripts PowerShell para controlar Excel/SAP, logins e limpeza de ambiente. |
| `bw_hana_extractor.py` | Automação Playwright para BW HANA. |
| `scheduler_db.json` | Persistência compartilhada da fila/histórico. |
| `users.json`, `requests_db.json` | Usuários, roles, credenciais salvas e solicitações pendentes. |

---

## Scripts & dados

### Automação

| Script | Finalidade |
| --- | --- |
| `main_server.py` | Controla servidor, APIs e integração com scripts externos. |
| `runner.ps1` | Executa macros específicas em planilhas Excel. |
| `sap_login_runner.ps1` | Preenche credenciais e dispara login SAP. |
| `cleanup_processes.ps1` | Mata processos (SAP, Excel, navegadores) para restabelecer o ambiente. |
| `bw_hana_extractor.py` | Fluxo Playwright para extrações no portal BW HANA. |
| `convert_xls_to_csv.ps1` | Conversão de relatórios para CSV. |

### Bases JSON

| Arquivo | Uso |
| --- | --- |
| `users.json` | Usuários, roles, áreas, hashes de senha, conexões salvas. |
| `scheduler_db.json` | Fila/histórico do agendador (compartilhado). |
| `requests_db.json` | Solicitações de acesso e tokens. |

---

## Checklist rápido pós-clone

1. Configure variáveis de ambiente (se necessário) para SAP/BW.
2. Garanta acesso às pastas `cache/` e `drive/` para leitura/escrita.
3. Execute `python main_server.py` e valide:
   - Login/registro/troca de tema.
   - Painel de automação (logins, previews e status box no canto superior direito).
   - Scheduler (abas responsivas + fila persistente).
   - Dashboards (busca, preview, ocultar barra ao abrir um dashboard).
4. (Opcional) Rode `initialize.bat` para validar automações completas em Windows.

---

## Roadmap curto

- Monitoramento de jobs (notificações e-mail/Teams após execução agendada).
- Persistência em banco relacional leve (SQLite/Postgres) para usuários/histórico.
- Painel unificado de logs (execuções SAP/BW, uploads e downloads).
- Layout mobile dedicado para o Drive online.
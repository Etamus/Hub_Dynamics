// --- SCRIPT UNIFICADO E COMPLETO ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores dos elementos ---
    const selectionScreen = document.getElementById('selection-screen');
    const dashboardView = document.getElementById('dashboard-view');
    const radios = document.querySelectorAll('input[name="dashboard_system"]');
    const backButton = document.getElementById('back-btn');
    let isViewingDashboard = false;
    const allViewButtons = document.querySelectorAll('.view-button');
    const lookerOptions = document.getElementById('looker-options');
    const tableauOptions = document.getElementById('tableau-options');
    const libraryOptions = document.getElementById('library-options');
    const allAreaContainers = document.querySelectorAll('.area-selection-container');
    const allAreaButtons = document.querySelectorAll('.area-button');
    const allDashboardGroups = document.querySelectorAll('.dashboard-options[id^="dashboards-"]');
    const allBackToAreasButtons = document.querySelectorAll('.back-to-areas-button');
    const previewPanel = document.getElementById('preview-panel');
    const previewImage = document.getElementById('preview-image');
    const previewDescription = document.getElementById('preview-description');
    const previewTagsContainer = document.getElementById('preview-tags-container');
    const translate = (key, fallback, vars = {}) => {
        const base = (window.hubI18n && typeof hubI18n.t === 'function') ? hubI18n.t(key, fallback) : (fallback || key);
        return base.replace(/\{(\w+)\}/g, (match, token) => (token in vars ? vars[token] : match));
    };
    // --- ADICIONAR: Seletores da Paginação Looker ---
    const lookerPaginationControls = document.getElementById('looker-pagination');
    const lookerPrevPage = document.getElementById('looker-prev-page');
    const lookerNextPage = document.getElementById('looker-next-page');
    const lookerPageInfo = document.getElementById('looker-page-info');
    const lookerAreaButtons = document.querySelectorAll('#looker-area-selection .area-button');

    // --- (Req 1) INÍCIO: Seletores e Variáveis do Modal de Login ---
    let isTableauLoggedIn = false;
    let currentTaskInfo = null; // (Armazena o botão clicado)
    let savedConnections = {}; // (Armazena as conexões do Hub)

    const modalOverlay = document.getElementById('login-modal-overlay');
    const modalUser = document.getElementById('modal-user');
    const modalPass = document.getElementById('modal-pass');
    const modalExecuteBtn = document.getElementById('modal-execute-btn');
    const modalLoginCloseBtn = document.getElementById('login-modal-close-btn');
    const modalSaveConnBtn = document.getElementById('modal-save-conn-btn'); 
    const modalLogoTableauLight = document.getElementById('modal-logo-tableau-light');
    const modalLogoTableauDark = document.getElementById('modal-logo-tableau-dark');
    
    // --- FIM: Seletores do Modal ---
    
    const LOOKER_PAGE_SIZE = 4;
    let lookerCurrentPage = 1;
    const lookerTotalPages = Math.ceil(lookerAreaButtons.length / LOOKER_PAGE_SIZE);
    // --- FIM DA ADIÇÃO ---

    // =================================================================
    // ===== INÍCIO: NOVAS FUNÇÕES PARA O "ACESSO RÁPIDO" =====
    // =================================================================
    
    /**
     * Atualiza o localStorage com o item recém-clicado.
     * Mantém apenas os 4 itens mais recentes.
     */
    function updateLocalStorage(id, name, icon) {
        if (!id || !name || !icon) return;

        // --- LÓGICA DE USUÁRIO (Req 1) ---
        // Lê o usuário salvo pelo hub.js ou usa '_guest'
        const username = localStorage.getItem('hubUsername') || '_guest';
        const storageKey = `recentDashboards_${username}`;
        // --------------------------------

        let recents = JSON.parse(localStorage.getItem(storageKey)) || [];
        
        const newItem = { id, name, icon };

        // Remove o item se ele já existir...
        recents = recents.filter(item => item.id !== id);
        
        // Adiciona o novo item no início...
        recents.unshift(newItem);

        // --- CORREÇÃO APLICADA AQUI ---
        // Lê a contagem salva do localStorage (padrão 4)
        const savedCount = parseInt(localStorage.getItem('hubItemCount') || 4);
        
        // Limita a lista com base na contagem salva
        recents = recents.slice(0, savedCount); 
        // --- FIM DA CORREÇÃO ---
        
        localStorage.setItem(storageKey, JSON.stringify(recents));
    }

/**
     * Pega o botão clicado, extrai seus dados e salva no localStorage.
     */
    function saveToRecents(button) {
        try {
            const name = button.textContent.trim();
            const id = button.dataset.id;
            
            // Lógica para determinar o ícone (MAIS PRECISA)
            let icon = 'fas fa-chart-pie'; // Ícone padrão (Looker/Tableau)
            const parentSection = button.closest('#looker-options, #tableau-options, #library-options');
            
            if (parentSection && parentSection.id === 'library-options') {
                const tags = (button.dataset.previewTags || '').toLowerCase();
                
                // Mapeia ícones com base nas tags de preview
                if (id === 'caminhos_bq' || tags.includes('database')) {
                    icon = 'fas fa-database';
                } else if (id === 'jira_ongoing' || tags.includes('tracking')) {
                    icon = 'fas fa-tasks';
                } else if (id === 'sgi_spareparts') {
                    icon = 'fas fa-clipboard-list';
                } else if (id === 'folheto_devolucao' || tags.includes('consultation') || tags.includes('presentation')) {
                    icon = 'fas fa-book-open';
                } else {
                    icon = 'fas fa-file-alt'; // Ícone genérico de biblioteca
                }
            }
            
            // (1) Lógica de Recência (para Acesso Rápido)
            updateLocalStorage(id, name, icon);

            // --- INÍCIO DA MODIFICAÇÃO (Req 1: Frequência) ---
            // (2) Lógica de Frequência (para "Mais Acessados")
            // (Usamos o nome de usuário do localStorage, que o hub.js já salvou)
            const username = localStorage.getItem('hubUsername') || '_guest';
            const countStorageKey = `dashboardAccessCounts_${username}`;
            
            let counts = JSON.parse(localStorage.getItem(countStorageKey)) || {};
            // Incrementa a contagem para este ID (ou define como 1)
            counts[id] = (counts[id] || 0) + 1;
            
            localStorage.setItem(countStorageKey, JSON.stringify(counts));
            // --- FIM DA MODIFICAÇÃO ---
        
        } catch (e) {
            console.error("Falha ao salvar item recente/contagem:", e);
        }
    }

    /**
     * Verifica se a URL tem um parâmetro "open" e clica no botão correspondente.
     */
    function checkForAutoOpen() {
        const urlParams = new URLSearchParams(window.location.search);
        const dashboardToOpen = urlParams.get('open');
        
        if (dashboardToOpen) {
            const button = document.querySelector(`.view-button[data-id="${dashboardToOpen}"]`);
            if (button) {
                // Remove o parâmetro da URL para evitar reabertura no refresh
                history.replaceState(null, '', window.location.pathname);
                
                // Simula a navegação manual
                const system = button.closest('#looker-options, #tableau-options, #library-options');
                if (system) {
                    // 1. Clica no rádio do sistema correto
                    const radioValue = system.id.replace('-options', ''); // 'looker', 'tableau', 'library'
                    document.querySelector(`input[name="dashboard_system"][value="${radioValue}"]`).click();
                    
                    // 2. Clica no botão de área (se aplicável)
                    const dashboardGroup = button.closest('.dashboard-options[id^="dashboards-"]');
                    if (dashboardGroup) {
                        const areaId = dashboardGroup.id.replace('dashboards-', '');
                        const areaButton = document.querySelector(`.area-button[data-area="${areaId}"]`);
                        if (areaButton) {
                            areaButton.click();
                        }
                    }
                }
                
                // 3. Clica no botão final do dashboard
                button.click();
            }
        }
    }
    
    // (Helper) Abre o modal de login
    function openLoginModal(button) {
        currentTaskInfo = button; // Salva o botão que o usuário quer abrir
        
        // --- INÍCIO DA MODIFICAÇÃO ---
        // Mostra ambos os logos (o CSS cuida de qual exibir)
        if (modalLogoTableauLight) modalLogoTableauLight.classList.remove('hidden');
        if (modalLogoTableauDark) modalLogoTableauDark.classList.remove('hidden');
        // --- FIM DA MODIFICAÇÃO ---

        // Se tivermos uma conexão salva, pré-preenche
        if (savedConnections.tableau) {
            modalUser.value = savedConnections.tableau.user || '';
            modalPass.value = savedConnections.tableau.pass || '';
        } else {
            modalUser.value = '';
            modalPass.value = '';
        }
        
        modalOverlay.classList.add('visible');
        modalUser.focus();
    }

    // (Helper) Fecha o modal
    function closeLoginModal() {
        modalOverlay.classList.remove('visible');
    }

    // (Helper) Ação principal de login (chama a API)
    function handleTableauLogin(saveConnection = false) {
        const user = modalUser.value;
        const pass = modalPass.value;

        if (!user || !pass) {
            alert('Por favor, preencha o usuário e a senha.');
            return;
        }

        modalExecuteBtn.disabled = true;
        if (modalSaveConnBtn) modalSaveConnBtn.disabled = true;

        const formData = new URLSearchParams();
        formData.append('usuario', user);
        formData.append('senha', pass);
        if (saveConnection) {
            formData.append('save_connection', 'true');
        }

        // Chama a nova API do backend
        fetch('/api/tableau/login', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'sucesso') {
                    isTableauLoggedIn = true; // Define o estado de login
                    closeLoginModal();
                    
                    if (saveConnection) {
                         // Atualiza o estado local das conexões
                         if (!savedConnections.tableau) savedConnections.tableau = {};
                         savedConnections.tableau.user = user;
                         savedConnections.tableau.pass = pass;
                    }

                    // (CRÍTICO) Abre o dashboard que o usuário clicou
                    showDashboard(currentTaskInfo); 
                } else {
                    alert('ERRO: ' + data.mensagem);
                }
            })
            .catch(err => {
                alert('Erro de comunicação com o servidor.');
            })
            .finally(() => {
                modalExecuteBtn.disabled = false;
                if (modalSaveConnBtn) modalSaveConnBtn.disabled = false;
            });
    }

    // (Helper) Adiciona os listeners aos botões do modal
    function initializeLoginModalListeners() {
        if (!modalOverlay) return; // Sai se o modal não foi carregado

        modalExecuteBtn.addEventListener('click', () => handleTableauLogin(false));
        if (modalSaveConnBtn) {
            modalSaveConnBtn.addEventListener('click', () => handleTableauLogin(true));
        }
        modalLoginCloseBtn.addEventListener('click', closeLoginModal);
        modalOverlay.addEventListener('mousedown', (e) => {
            if (e.target === modalOverlay) closeLoginModal();
        });
        modalPass.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleTableauLogin(false);
        });
    }
    
    // (Helper) Refatoração da lógica que cria o Iframe
    function showDashboard(button) {
        if (!button) return;
        
        // --- INÍCIO DA MODIFICAÇÃO (Req 1: Forçar Paisagem) ---
        // 1. Verifica se estamos em um dispositivo móvel (baseado na largura da tela)
        const isMobile = window.matchMedia("(max-width: 768px)").matches;

        if (isMobile) {
            // 2. Tenta entrar em tela cheia (obrigatório para o lock)
            const elem = document.documentElement; // Pega a raiz <html>
            if (elem.requestFullscreen) {
                elem.requestFullscreen().then(() => {
                    // 3. Tenta travar a orientação
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(err => {
                            // Aviso (pode falhar se o usuário não permitir)
                            console.warn("Aviso: Não foi possível travar a orientação:", err.message);
                        });
                    } else {
                        console.warn("Aviso: API screen.orientation.lock() não suportada (ex: Safari/iOS).");
                    }
                }).catch(err => {
                    console.warn("Aviso: Não foi possível entrar em tela cheia:", err.message);
                });
            }
        }
        // --- FIM DA MODIFICAÇÃO ---

        // (Lógica original de clique movida para cá)
        saveToRecents(button); // Salva no Acesso Rápido

        const dashboardUrl = button.getAttribute('data-url');
        const customMaxWidth = button.dataset.width;

        dashboardView.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = dashboardUrl;
        iframe.className = 'dashboard-iframe';
        iframe.setAttribute('allowfullscreen', '');

        if (customMaxWidth) {
            iframe.style.maxWidth = customMaxWidth;
        }

        const fab = document.getElementById('feedback-fab');
        if (fab) {
            fab.classList.add('hidden');
        }

        dashboardView.appendChild(iframe);
        selectionScreen.style.display = 'none';
        dashboardView.style.display = 'flex';
        isViewingDashboard = true;
        updateBackButton();
    }
    // --- FIM: Funções de Login ---

    // =================================================================
    // ===== FIM: NOVAS FUNÇÕES PARA O "ACESSO RÁPIDO" =====
    // =================================================================

    // =================================================================
    // ===== INÍCIO: NOVAS FUNÇÕES DA PAGINAÇÃO LOOKER =====
    // =================================================================

    function updateLookerPagination() {
        if (!lookerPaginationControls) return; // Segurança
        
        // Atualiza o texto
        lookerPageInfo.textContent = translate('pagination.pageInfo', `Página ${lookerCurrentPage} de ${lookerTotalPages}`, {
            current: lookerCurrentPage,
            total: lookerTotalPages
        });

        // Habilita/Desabilita botões
        lookerPrevPage.disabled = (lookerCurrentPage === 1);
        lookerNextPage.disabled = (lookerCurrentPage === lookerTotalPages);

        // Calcula os índices
        const startIndex = (lookerCurrentPage - 1) * LOOKER_PAGE_SIZE;
        const endIndex = startIndex + LOOKER_PAGE_SIZE;

        // Mostra/Esconde os botões de área
        lookerAreaButtons.forEach((button, index) => {
            if (index >= startIndex && index < endIndex) {
                button.style.display = 'block';
            } else {
                button.style.display = 'none';
            }
        });
    }

    // Adiciona Listeners aos botões de paginação
    if (lookerNextPage) {
        lookerNextPage.addEventListener('click', () => {
            if (lookerCurrentPage < lookerTotalPages) {
                lookerCurrentPage++;
                updateLookerPagination();
            }
        });
    }
    
    if (lookerPrevPage) {
        lookerPrevPage.addEventListener('click', () => {
            if (lookerCurrentPage > 1) {
                lookerCurrentPage--;
                updateLookerPagination();
            }
        });
    }

        const dashboardsSearchInput = document.getElementById('dashboards-search-input');
    if (dashboardsSearchInput) {
    function handleDashboardSearch() {
    const searchInput = document.getElementById('dashboards-search-input');
    const searchTerm = searchInput.value.toLowerCase();
    
    // 1. --- Lógica de Reset Limpa (Voltar ao Estado Inicial) ---
    if (searchTerm === '') {
        // Seleciona TODOS os botões de área e view em TODOS os sistemas
        const allSystemButtons = document.querySelectorAll('.area-button, .view-button');
        
        // Remove a propriedade de display inline que o filtro adicionou (display: none/block)
        allSystemButtons.forEach(button => {
            button.style.removeProperty('display');
        });

        // Restaura o estado paginado (hiding buttons > 4)
        updateLookerPagination(); 
        
        return; 
    }
    // --- FIM DA LÓGICA DE RESET ---

    // 2. --- Lógica de Filtragem (Se há termo) ---
    // Seleciona TODOS os botões que estão em containers visíveis/ativos
    const activeButtons = document.querySelectorAll('.dashboard-options:not(.hidden) .area-button, .dashboard-options:not(.hidden) .view-button');

    activeButtons.forEach(button => {
        const name = button.textContent.toLowerCase();

        // Determina o display correto (view buttons são inline-block, area buttons são block)
        const displayType = button.classList.contains('view-button') ? 'inline-block' : 'block';

        if (name.includes(searchTerm)) {
            // Aplica a regra de exibição
            button.style.display = displayType; 
        } else {
            // Esconde
            button.style.display = 'none'; 
        }
    });
}

    dashboardsSearchInput.addEventListener('keyup', handleDashboardSearch);
}
    
    // =================================================================
    // ===== FIM: NOVAS FUNÇÕES DA PAGINAÇÃO LOOKER =====
    // =================================================================

    // --- LÓGICA DE EVENTOS (Modificada) ---

    function resetViews() {
        allDashboardGroups.forEach(group => group.classList.add('hidden'));
        allAreaContainers.forEach(container => container.classList.remove('hidden'));
    }

    function handleRadioChange() {
        resetViews();
        const selectedSystem = document.querySelector('input[name="dashboard_system"]:checked').value;
        
        // Esconde tudo
        lookerOptions.classList.add('hidden');
        tableauOptions.classList.add('hidden');
        if (libraryOptions) { libraryOptions.classList.add('hidden'); }
        if (lookerPaginationControls) { lookerPaginationControls.classList.add('hidden'); } // ADICIONADO

        // Mostra o selecionado
        if (selectedSystem === 'looker') {
            lookerOptions.classList.remove('hidden');
            if (lookerPaginationControls) { lookerPaginationControls.classList.remove('hidden'); } // ADICIONADO
        } else if (selectedSystem === 'tableau') {
            tableauOptions.classList.remove('hidden');
        } else if (selectedSystem === 'library') {
            if (libraryOptions) { libraryOptions.classList.remove('hidden'); }
        }
    }
    radios.forEach(radio => radio.addEventListener('change', handleRadioChange));

    allViewButtons.forEach(button => {
        
        // Lógica do clique (para abrir o dashboard)
        button.addEventListener('click', () => {
            
            // Verifica se é um dashboard do Tableau
            const isTableau = button.closest('#tableau-options');
            
            if (isTableau) {
                // Se for Tableau, verifica o login
                
                // 1. Verifica conexão salva (auto-login)
                if (savedConnections.tableau && !isTableauLoggedIn) {
                    // Tenta logar automaticamente com a conexão salva
                    openLoginModal(button); // Pré-preenche
                    handleTableauLogin(false); // Tenta logar
                
                // 2. Se já estiver logado (sessão)
                } else if (isTableauLoggedIn) {
                    showDashboard(button);
                
                // 3. Se não tiver conexão salva E não estiver logado
                } else {
                    openLoginModal(button); // Pede login manual
                }

            } else {
                // Se for Looker ou Library, abre direto
                showDashboard(button);
            }
        }); 

        // Lógica do mouseover (para mostrar o preview com etiquetas)
        button.addEventListener('mouseover', () => {
            // 1. Verifica se estamos em um dispositivo móvel
            const isMobile = window.matchMedia("(max-width: 768px)").matches;
            
            // 2. Se for mobile, NÃO execute a função de preview.
            if (isMobile) {
                return; 
            }
            const gifPath = button.dataset.previewGif;
            const text = button.dataset.previewText;
            const tagsString = button.dataset.previewTags;

            if (gifPath && text) {
                previewImage.src = gifPath;
                previewDescription.textContent = text;
                previewTagsContainer.innerHTML = '';

                if (tagsString) {
                    const tagsArray = tagsString.split(',');
                    const knownNonKpiTags = [
                        'daily', 'weekly', 'monthly', 'gcp', 'sheets', 'drive', 'consultation',
                        'dashboard', 'database', 'revenue', 'efficiency', 'accuracy',
                        'management', 'performance', 'planning', 'sla', 'tracking',
                        'safety', 'costs', 'data'
                    ];

                    tagsArray.forEach(tagText => {
                        const cleanTagText = tagText.trim();
                        const tagElement = document.createElement('span');
                        tagElement.className = 'preview-tag';
                        tagElement.textContent = cleanTagText;

                        const lowerCaseTag = cleanTagText.toLowerCase();

                        if (['consultation', 'dashboard', 'database'].includes(lowerCaseTag)) {
                            tagElement.classList.add('tag-orange');
                        } else if (['daily', 'weekly', 'monthly'].includes(lowerCaseTag)) {
                            tagElement.classList.add('tag-green');
                        } else if (['gcp', 'gardem', 'sheets', 'drive', 'presentation'].includes(lowerCaseTag)) {
                            tagElement.classList.add('tag-blue');
                        } else if (knownNonKpiTags.includes(lowerCaseTag)) {
                            tagElement.classList.add('tag-gray');
                        } else {
                            tagElement.classList.add('tag-purple'); // KPI
                        }

                        previewTagsContainer.appendChild(tagElement);
                    });
                }

                previewPanel.classList.add('visible');
            }
        }); 

        // Lógica do mouseout (para esconder o preview)
        button.addEventListener('mouseout', () => {
            previewPanel.classList.remove('visible');
        });
    }); // Fim do 'allViewButtons.forEach'

    
    function updateBackButton() {
            if (isViewingDashboard) {
                // Estado: VENDO DASHBOARD (Botão "Voltar")
                // --- INÍCIO DA MODIFICAÇÃO (Req 1) ---
                backButton.innerHTML = '<i class="fas fa-arrow-left"></i>'; // Seta para voltar
                // --- FIM DA MODIFICAÇÃO ---
                backButton.href = '#'; 
                backButton.title = 'Voltar'; 
            } else {
                // Estado: TELA DE SELEÇÃO (Botão "Voltar ao Hub")
                // --- INÍCIO DA MODIFICAÇÃO (Req 1) ---
                backButton.innerHTML = '<i class="fas fa-home"></i>'; // Casa para ir ao Hub
                // --- FIM DA MODIFICAÇÃO ---
                backButton.href = '/'; 
                backButton.title = 'Voltar ao Hub';
                
                isTableauLoggedIn = false;
                currentTaskInfo = null;

                // (Lógica para sair da tela cheia/paisagem permanece a mesma)
                if (document.fullscreenElement && document.exitFullscreen) {
                    document.exitFullscreen().catch(err => {
                        console.warn("Falha ao sair da tela cheia:", err.message);
                    });
                }
                if (screen.orientation && screen.orientation.unlock) {
                    try {
                        screen.orientation.unlock();
                    } catch(e) {
                        // Ignora erros
                    }
                }
            }
        }

    backButton.addEventListener('click', (event) => {
        if (isViewingDashboard) {
            event.preventDefault();
            dashboardView.innerHTML = '';
            dashboardView.style.display = 'none';
            selectionScreen.style.display = 'flex';
            isViewingDashboard = false;
            updateBackButton();
            // Tenta encontrar o 'feedback-fab' e removê-lo.
            // Adicionado try-catch para não quebrar se o 'shared.js' ainda não carregou o fab
            try { 
                document.getElementById('feedback-fab').classList.remove('hidden');
            } catch (e) {
                // ignora se o fab não for encontrado
            }
        }
    });

    allAreaButtons.forEach(button => {
        button.addEventListener('click', () => {
            const area = button.dataset.area;
            const targetDashboardGroup = document.getElementById(`dashboards-${area}`);
            const parentAreaContainer = button.closest('.area-selection-container');

            // --- INÍCIO DA CORREÇÃO ---
            // Verifica se o botão clicado está dentro das opções do Looker
            if (button.closest('#looker-options')) {
                if (lookerPaginationControls) { // Garante que o elemento existe
                    lookerPaginationControls.classList.add('hidden');
                }
            }
            // --- FIM DA CORREÇÃO ---
            
            // --- ADICIONAR ESTAS 2 LINHAS ---
            if (parentAreaContainer && parentAreaContainer.id === 'area-selection') {
                lookerPaginationControls.classList.add('hidden');
            }
            // --- FIM DA ADIÇÃO ---
            
            if (parentAreaContainer) { parentAreaContainer.classList.add('hidden'); }
            if (targetDashboardGroup) { targetDashboardGroup.classList.remove('hidden'); }
        });
    });

    allBackToAreasButtons.forEach(button => {
        button.addEventListener('click', () => {
            const parentDashboardGroup = button.parentElement;
            const mainContainer = button.closest('#looker-options, #tableau-options, #library-options');
            parentDashboardGroup.classList.add('hidden');

            // --- ADICIONAR ESTAS 2 LINHAS ---
            if (mainContainer && mainContainer.id === 'looker-options') {
                lookerPaginationControls.classList.remove('hidden');
            }
            // --- FIM DA ADIÇÃO ---
            
            if (mainContainer) {
                mainContainer.querySelector('.area-selection-container').classList.remove('hidden');
            }
        });
    });

    // --- Script do Chatbot (Original, sem alteração) ---
    // (Omitido por brevidade, mas o seu 'shared.js' vai carregar isso)
    
    // --- CHAMADA DAS NOVAS FUNÇÕES ---
    handleRadioChange(); // Inicia o estado dos rádios
    checkForAutoOpen();  // Verifica se veio do Hub com um link
    updateLookerPagination(); // --- ADICIONAR ESTA LINHA ---

    // --- INÍCIO DA MODIFICAÇÃO (Mova o código para aqui) ---
    // Busca as conexões salvas do Hub
    fetch('/api/hub/get-connections')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                savedConnections = data.connections || {};
            }
        });
        
    // Adiciona os listeners ao modal de login
    initializeLoginModalListeners();
    // --- FIM DA MODIFICAÇÃO ---

}); // <-- Este é o fim do DOMContentLoaded

// --- LÓGICA DO BOTÃO DE ALTERNAR TEMA (Req 1 - Sincronizado com o Hub) ---
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const themeToggleIcon = themeToggleButton ? themeToggleButton.querySelector('i') : null;

    /**
     * Atualiza o ícone (Sol/Lua) com base no tema atual lido do localStorage.
     * @param {string} theme - O tema ('light', 'dark', ou 'system').
     */
    function updateThemeIcon(theme) {
        if (!themeToggleIcon) return;
        
        let visualTheme = theme;
        
        // Se o tema for 'system', precisamos descobrir qual tema o SO está usando
        if (theme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                visualTheme = 'dark'; // 'system' está resultando em escuro
            } else {
                visualTheme = 'light'; // 'system' está resultando em claro
            }
        }
        
        // Define o ícone com base no tema VISUAL
        if (visualTheme === 'dark') {
            themeToggleIcon.classList.remove('fa-sun');
            themeToggleIcon.classList.add('fa-moon');
        } else {
            themeToggleIcon.classList.remove('fa-moon');
            themeToggleIcon.classList.add('fa-sun');
        }
    }

    /**
     * Inicializa o botão de tema, lendo o estado do Hub.
     */
    function initializeThemeToggle() {
        if (!themeToggleButton || !themeToggleIcon) return;

        // 1. Define o ícone inicial
        // Lê a chave principal 'hubTheme' (a mesma do hub.js)
        let currentTheme = localStorage.getItem('hubTheme') || 'light';
        updateThemeIcon(currentTheme);

        // 2. Adiciona o listener de clique
        themeToggleButton.addEventListener('click', () => {
            // Pega o tema salvo (pode ser light, dark, ou system)
            let lastSavedTheme = localStorage.getItem('hubTheme') || 'light';
            
            // Determina o estado visual ATUAL (para saber para onde trocar)
            let isCurrentlyDark;
            if (lastSavedTheme === 'system') {
                isCurrentlyDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            } else {
                isCurrentlyDark = (lastSavedTheme === 'dark');
            }

            // Define o NOVO tema (sempre explícito, light or dark)
            const newTheme = isCurrentlyDark ? 'light' : 'dark';

            // Salva a escolha explícita (sobrescreve 'system')
            localStorage.setItem('hubTheme', newTheme);
            
            // Aplica a mudança visual (função global do shared.js)
            // (shared.js já deve ter definido 'applyGlobalTheme' globalmente)
            if (typeof applyGlobalTheme === 'function') {
                applyGlobalTheme(newTheme); 
            }
            
            // Atualiza o ícone
            updateThemeIcon(newTheme);
        });
        
        // Adiciona um listener para o SO (caso o Hub esteja em 'system')
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const currentTheme = localStorage.getItem('hubTheme') || 'system';
            // Se o usuário estiver no modo 'system', atualiza o ícone
            if (currentTheme === 'system') {
                applyGlobalTheme('system');
                updateThemeIcon('system');
            }
        });
    }

    initializeThemeToggle();

    const pageKey = window.location.pathname.replace('/', '').split('?')[0]; // Extrai "automacao", "dashboards", ou "drive"
    const currentTab = document.querySelector(`.main-nav-tabs .nav-tab[data-page="${pageKey}"]`);
    if (currentTab) {
        currentTab.classList.add('active');
    }

    const dashboardsSearchInput = document.getElementById('dashboards-search-input');
    if (dashboardsSearchInput) {
        function handleDashboardSearch() {
    const searchInput = document.getElementById('dashboards-search-input');
    const searchTerm = searchInput.value.toLowerCase();
    
    // --- NOVO RESET DE PESQUISA ---
    if (searchTerm === '') {
        // 1. Seleciona TODOS os botões de Área (genérico) e View
        const allAreaButtonsGen = document.querySelectorAll('.area-selection-container .area-button');
        const allViewButtons = document.querySelectorAll('.view-button');
        
        // 2. Limpa o display style de TODOS os botões de área genéricos
        allAreaButtonsGen.forEach(button => { 
            // Garante que TODOS os botões de área (Looker, Tableau, etc)
            // tenham seu estilo inline removido para voltarem ao padrão CSS.
            button.style.display = ''; 
        });
        
        // 3. Limpa o display style de TODOS os botões de view
        allViewButtons.forEach(button => { 
            button.style.display = ''; 
        });

        // 4. CHAVE: Reativa a lógica de paginação *apenas* para os botões Looker.
        // Isso re-esconde os botões Looker que excedem o limite da página atual (4).
        updateLookerPagination(); 
        
        return; 
    }
    // --- FIM DA MODIFICAÇÃO ---

    // Filtra todos os botões que estão visíveis no momento (Áreas ou Dashboards)
    const activeButtons = document.querySelectorAll('.dashboard-options:not(.hidden) .area-button, .dashboard-options:not(.hidden) .view-button');

    activeButtons.forEach(button => {
        const name = button.textContent.toLowerCase();

        // Determina o display correto (view buttons são inline-block, area buttons são block)
        const displayType = button.classList.contains('view-button') ? 'inline-block' : 'block';

        if (name.includes(searchTerm)) {
            button.style.display = displayType; 
        } else {
            button.style.display = 'none'; 
        }
    });
}

        dashboardsSearchInput.addEventListener('keyup', handleDashboardSearch);
    }
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
    // --- ADICIONAR: Seletores da Paginação Looker ---
    const lookerPaginationControls = document.getElementById('looker-pagination');
    const lookerPrevPage = document.getElementById('looker-prev-page');
    const lookerNextPage = document.getElementById('looker-next-page');
    const lookerPageInfo = document.getElementById('looker-page-info');
    const lookerAreaButtons = document.querySelectorAll('#area-selection .area-button');
    
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
            
            updateLocalStorage(id, name, icon);
        
        } catch (e) {
            console.error("Falha ao salvar item recente:", e);
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
    
    // =================================================================
    // ===== FIM: NOVAS FUNÇÕES PARA O "ACESSO RÁPIDO" =====
    // =================================================================

    // =================================================================
    // ===== INÍCIO: NOVAS FUNÇÕES DA PAGINAÇÃO LOOKER =====
    // =================================================================

    function updateLookerPagination() {
        if (!lookerPaginationControls) return; // Segurança
        
        // Atualiza o texto
        lookerPageInfo.textContent = `Página ${lookerCurrentPage} de ${lookerTotalPages}`;

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
    // --- AÇÃO ADICIONADA ---
    // Salva o clique no histórico de recentes
    saveToRecents(button);
    // --- FIM DA AÇÃO ---

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
    // Oculta o chatbot em QUALQUER visualização de dashboard
    if (fab) {
      fab.classList.add('hidden');
    }

    dashboardView.appendChild(iframe);
    selectionScreen.style.display = 'none';
    dashboardView.style.display = 'flex';
    isViewingDashboard = true;
    updateBackButton();
  }); // Fim do 'click'

  // Lógica do mouseover (para mostrar o preview com etiquetas)
  button.addEventListener('mouseover', () => {
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
  }); // Fim do 'mouseover'

  // Lógica do mouseout (para esconder o preview)
  button.addEventListener('mouseout', () => {
    previewPanel.classList.remove('visible');
  });
}); // Fim do 'allViewButtons.forEach'

    
    function updateBackButton() {
            if (isViewingDashboard) {
                // Estado: VENDO DASHBOARD (Botão "Voltar")
                backButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
                backButton.href = '#'; // Deixa de ser um link real
                backButton.title = 'Voltar'; // Adiciona o tooltip
            } else {
                // Estado: TELA DE SELEÇÃO (Botão "Voltar ao Hub")
                backButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
                backButton.href = '/'; // Vira um link para o Hub
                backButton.title = 'Voltar ao Hub'; // Adiciona o tooltip
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
});
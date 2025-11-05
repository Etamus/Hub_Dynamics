document.addEventListener('DOMContentLoaded', () => {
    
    // --- Seletores de Elementos ---
    const searchBar = document.getElementById('search-bar');
    const cards = document.querySelectorAll('.hub-card');
    const quickLinksSection = document.getElementById('quick-links-section');
    const quickLinksContainer = document.getElementById('quick-links-container');
    
    // --- 1. LÓGICA DO SELETOR DE TEMA ---
    
    const settingsBtn = document.getElementById('settings-btn');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const themeOptions = document.querySelectorAll('.theme-option');
    
    const aboutBtn = document.getElementById('about-btn');
    const aboutOverlay = document.getElementById('about-overlay');
    const aboutCloseBtn = document.getElementById('about-close-btn');

    const countOptions = document.querySelectorAll('.count-selector .setting-option');
    const clearRecentsBtn = document.getElementById('clear-recents-btn');
    
    function applyTheme(theme) {
        // 1. Chama a função global (de shared.js) para aplicar o tema
        applyGlobalTheme(theme); 
 
        // 2. Atualiza a seleção visual no modal
        themeOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.theme === theme);
        });
        
        // 3. Salva a preferência
        localStorage.setItem('hubTheme', theme);
    }

    /**
     * Aplica a configuração de contagem de itens.
     */
    function applyCountSetting(count) {
        const numericCount = parseInt(count) || 4; // Padrão é 4
        
        // Atualiza a seleção visual no modal
        countOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.count == numericCount);
        });
        
        // Salva a preferência
        localStorage.setItem('hubItemCount', numericCount);
        
        // Re-renderiza o acesso rápido para aplicar a mudança
        renderQuickLinks();
    }

    /**
     * Limpa o histórico de recentes.
     */
    function clearRecents() {
        localStorage.removeItem('recentDashboards');
        renderQuickLinks(); // Re-renderiza a lista
    }
    
    // Atualiza os botões do modal de tema no carregamento
    // (shared.js já aplicou o tema, aqui só atualizamos a UI dos botões)
    const savedTheme = localStorage.getItem('hubTheme') || 'light';
    themeOptions.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === savedTheme);
    });

    // Aplica a contagem salva ao carregar a página
    applyCountSetting(localStorage.getItem('hubItemCount') || 4);

    // Listeners do Modal de Configurações
    settingsBtn.addEventListener('click', () => {
        settingsOverlay.classList.add('visible');
    });
    settingsCloseBtn.addEventListener('click', () => {
        settingsOverlay.classList.remove('visible');
    });
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) { // Fecha se clicar fora do modal
            settingsOverlay.classList.remove('visible');
        }
    });
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            applyTheme(option.dataset.theme);
        });
    });

    // Listeners do Modal "Sobre"
    aboutBtn.addEventListener('click', () => {
        aboutOverlay.classList.add('visible');
    });
    aboutCloseBtn.addEventListener('click', () => {
        aboutOverlay.classList.remove('visible');
    });
    aboutOverlay.addEventListener('click', (e) => {
        if (e.target === aboutOverlay) { // Fecha se clicar fora do modal
            aboutOverlay.classList.remove('visible');
        }
    });

    // Listeners do Acesso Rápido (em Configurações)
    countOptions.forEach(option => {
        option.addEventListener('click', () => {
            applyCountSetting(option.dataset.count);
        });
    });

    clearRecentsBtn.addEventListener('click', clearRecents);          
    
    // --- 2. LÓGICA DE ACESSO RÁPIDO (COM PINS) ---

    function getRecents() {
        return JSON.parse(localStorage.getItem('recentDashboards')) || [];
    }
    function getPinned() {
        return JSON.parse(localStorage.getItem('pinnedDashboards')) || [];
    }
    function savePinned(pinned) {
        localStorage.setItem('pinnedDashboards', JSON.stringify(pinned));
    }

    function togglePin(item) {
        let pinned = getPinned();
        const isPinned = pinned.some(p => p.id === item.id);

        if (isPinned) {
            // Remove (unpin)
            pinned = pinned.filter(p => p.id !== item.id);
        } else {
            // Adiciona (pin)
            pinned.unshift(item); // Adiciona no início
            pinned = pinned.slice(0, 4); // Limita a 4 pins
        }
        savePinned(pinned);
        renderQuickLinks(); // Re-renderiza a lista
    }

    function renderQuickLinks() {
        quickLinksContainer.innerHTML = ''; // Limpa a lista
        
        const recents = getRecents();
        const pinned = getPinned();
        
        // Combina as listas: Pinned primeiro, depois Recentes (sem duplicatas)
        let combined = [...pinned];
        recents.forEach(recent => {
            if (!pinned.some(p => p.id === recent.id)) {
                combined.push(recent);
            }
        });

        // Lê a contagem salva do localStorage (padrão 4)
        const savedCount = parseInt(localStorage.getItem('hubItemCount') || 4);
        
        // Limita a lista com base na contagem salva
        const itemsToRender = combined.slice(0, savedCount);
        
        if (itemsToRender.length === 0) {
            quickLinksContainer.innerHTML = '<p class="no-recents">Nenhum item acessado recentemente.</p>';
            return;
        }
        
        itemsToRender.forEach(item => {
            const isPinned = pinned.some(p => p.id === item.id);
            
            const link = document.createElement('a');
            link.href = `/dashboards?open=${item.id}`; 
            link.className = 'quick-link';
            
            // Ícone do item (ex: fas fa-database)
            const itemIcon = document.createElement('i');
            itemIcon.className = item.icon;
            link.appendChild(itemIcon);
            
            // Texto do item
            const text = document.createElement('span');
            text.textContent = item.name;
            link.appendChild(text);
            
            // Ícone de Pin
            const pinIcon = document.createElement('i');
            pinIcon.className = `fas fa-thumbtack pin-icon ${isPinned ? 'pinned' : ''}`;
            pinIcon.title = isPinned ? 'Desafixar' : 'Fixar no Acesso Rápido';
            
            pinIcon.addEventListener('click', (e) => {
                e.preventDefault(); // Impede o link de ser seguido
                e.stopPropagation(); // Impede o clique de "borbulhar"
                togglePin(item);
            });
            
            link.appendChild(pinIcon);
            quickLinksContainer.appendChild(link);
        });
    }
    
    // Renderização inicial do Acesso Rápido
    renderQuickLinks();

    // --- 3. LÓGICA DA BARRA DE PESQUISA (ATUALIZADA) ---
    
    searchBar.addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        // Filtra os cards principais (lógica original)
        cards.forEach(card => {
            const title = card.querySelector('h2').textContent.toLowerCase();
            const description = card.querySelector('p').textContent.toLowerCase();
            card.style.display = (title.includes(searchTerm) || description.includes(searchTerm)) ? 'flex' : 'none';
        });

        // Filtra os links rápidos (lógica atualizada)
        const quickLinks = quickLinksContainer.querySelectorAll('.quick-link');
        let quickLinkVisible = false;
        quickLinks.forEach(link => {
            const text = link.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                link.style.display = 'flex';
                quickLinkVisible = true;
            } else {
                link.style.display = 'none';
            }
        });

        // Controla a visibilidade da *seção* de acesso rápido
        if (searchTerm === "") {
            quickLinksSection.style.display = 'block';
        } else {
            quickLinksSection.style.display = quickLinkVisible ? 'block' : 'none';
        }
    });
});
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Seletores de Elementos (Antigos) ---
    const searchBar = document.getElementById('search-bar');
    const cards = document.querySelectorAll('.hub-card');
    const quickLinksSection = document.getElementById('quick-links-section');
    const quickLinksContainer = document.getElementById('quick-links-container');
    
    // --- 1. LÓGICA DO SELETOR DE TEMA (Antiga) ---
    
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
        applyGlobalTheme(theme); 
        themeOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.theme === theme);
        });
        localStorage.setItem('hubTheme', theme);
    }

    function applyCountSetting(count) {
        const numericCount = parseInt(count) || 4;
        countOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.count == numericCount);
        });
        localStorage.setItem('hubItemCount', numericCount);
        renderQuickLinks();
    }

    function clearRecents() {
        localStorage.removeItem('recentDashboards');
        renderQuickLinks();
    }
    
    const savedTheme = localStorage.getItem('hubTheme') || 'light';
    themeOptions.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === savedTheme);
    });

    applyCountSetting(localStorage.getItem('hubItemCount') || 4);

    // Listeners do Modal de Configurações
    settingsBtn.addEventListener('click', () => {
        settingsOverlay.classList.add('visible');
    });
    settingsCloseBtn.addEventListener('click', () => {
        settingsOverlay.classList.remove('visible');
    });
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) { 
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
        if (e.target === aboutOverlay) { 
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
    
    
    // --- 2. LÓGICA DE ACESSO RÁPIDO (COM PINS) (Antiga) ---

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
            pinned = pinned.filter(p => p.id !== item.id);
        } else {
            pinned.unshift(item);
            pinned = pinned.slice(0, 4);
        }
        savePinned(pinned);
        renderQuickLinks();
    }

    function renderQuickLinks() {
        quickLinksContainer.innerHTML = ''; 
        
        const recents = getRecents();
        const pinned = getPinned();
        
        let combined = [...pinned];
        recents.forEach(recent => {
            if (!pinned.some(p => p.id === recent.id)) {
                combined.push(recent);
            }
        });

        const savedCount = parseInt(localStorage.getItem('hubItemCount') || 4);
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
            
            const itemIcon = document.createElement('i');
            itemIcon.className = item.icon;
            link.appendChild(itemIcon);
            
            const text = document.createElement('span');
            text.textContent = item.name;
            link.appendChild(text);
            
            const pinIcon = document.createElement('i');
            pinIcon.className = `fas fa-thumbtack pin-icon ${isPinned ? 'pinned' : ''}`;
            pinIcon.title = isPinned ? 'Desafixar' : 'Fixar no Acesso Rápido';
            
            pinIcon.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation(); 
                togglePin(item);
            });
            
            link.appendChild(pinIcon);
            quickLinksContainer.appendChild(link);
        });
    }
    
    renderQuickLinks();

    // --- 3. LÓGICA DA BARRA DE PESQUISA (Antiga) ---
    
    searchBar.addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        cards.forEach(card => {
            const title = card.querySelector('h2').textContent.toLowerCase();
            const description = card.querySelector('p').textContent.toLowerCase();
            card.style.display = (title.includes(searchTerm) || description.includes(searchTerm)) ? 'flex' : 'none';
        });

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

        if (searchTerm === "") {
            quickLinksSection.style.display = 'block';
        } else {
            quickLinksSection.style.display = quickLinkVisible ? 'block' : 'none';
        }
    });

    // ========================================================
    // ===== 4. LÓGICA (ACESSO, LOGIN HUB, CONEXÕES) ATUALIZADA =====
    // ========================================================

    let currentHubUser = null;

    // --- Seletores dos novos elementos ---
    const accessBtn = document.getElementById('access-btn');
    const accessIcon = accessBtn.querySelector('i'); // <-- NOVO: Seletor do ícone
    const accessDropdown = document.getElementById('access-dropdown');
    
    // Modal de Login do Hub
    const hubLoginOverlay = document.getElementById('hub-login-overlay');
    const hubLoginCloseBtn = document.getElementById('hub-login-close-btn');
    const hubLoginSubmitBtn = document.getElementById('hub-login-submit-btn');
    const hubUserInput = document.getElementById('hub-user');
    const hubPassInput = document.getElementById('hub-pass');
    const hubLoginError = document.getElementById('hub-login-error');

    // Modal de Conexões
    const connectionsOverlay = document.getElementById('connections-overlay');
    const connectionsCloseBtn = document.getElementById('connections-close-btn');
    const connectionsListContainer = document.getElementById('connections-list-container');

    // --- Funções de Acesso ---

    // Em: hub.js

/**
 * ATUALIZADO: Atualiza a UI do dropdown, o ícone do botão e a largura mínima do menu suspenso.
 */
function updateAccessDropdown(username = null) {
    currentHubUser = username;
    accessDropdown.innerHTML = ''; // Limpa o dropdown

    // --- NOVO: LÓGICA DE LARGURA MÍNIMA DINÂMICA ---
    if (username) {
        // Logado: 200px
        accessDropdown.style.minWidth = '200px';
    } else {
        // Deslogado: 120px
        accessDropdown.style.minWidth = '130px';
    }
    // --------------------------------------------------

    if (username) {
        // --- Usuário está LOGADO ---
        accessDropdown.innerHTML = `
            <div class="access-dropdown-header">
                <strong>${username}</strong>
                <span>Logado</span>
            </div>
            <button class="access-dropdown-item" id="access-connections-btn">
                <i class="fas fa-plug"></i>Minhas Conexões
            </button>
            <button class="access-dropdown-item danger" id="access-logout-btn">
                <i class="fas fa-sign-out-alt"></i>Deslogar
            </button>
        `;
        // Adiciona listeners
        document.getElementById('access-connections-btn').addEventListener('click', openConnectionsModal);
        document.getElementById('access-logout-btn').addEventListener('click', handleHubLogout);
        
        // ATUALIZA ÍCONE
        accessIcon.classList.remove('fa-user');
        accessIcon.classList.add('fa-user-check');

    } else {
        // --- Usuário está DESLOGADO ---
        accessDropdown.innerHTML = `
            <button class="access-dropdown-item" id="access-login-btn">
                <i class="fas fa-sign-in-alt"></i>Logar
            </button>
        `;
        // Adiciona listener
        document.getElementById('access-login-btn').addEventListener('click', openHubLoginModal);
        
        // ATUALIZA ÍCONE
        accessIcon.classList.remove('fa-user-check');
        accessIcon.classList.add('fa-user');
    }
}

    function openHubLoginModal() {
        accessDropdown.classList.remove('visible');
        hubLoginError.classList.add('hidden');
        hubUserInput.value = '';
        hubPassInput.value = '';
        hubLoginOverlay.classList.add('visible');
        hubUserInput.focus();
    }

    function closeHubLoginModal() {
        hubLoginOverlay.classList.remove('visible');
    }

    function handleHubLogin() {
        const username = hubUserInput.value;
        const password = hubPassInput.value;
        
        if (!username || !password) {
            showHubLoginError("Preencha usuário e senha.");
            return;
        }

        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        fetch('/api/hub/login', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                updateAccessDropdown(data.username);
                closeHubLoginModal();
                if (window.location.pathname.includes('/automacao')) {
                    window.location.reload();
                }
            } else {
                showHubLoginError(data.mensagem || "Erro desconhecido.");
            }
        })
        .catch(() => showHubLoginError("Erro de conexão com o servidor."));
    }

    function showHubLoginError(message) {
        hubLoginError.textContent = message;
        hubLoginError.classList.remove('hidden');
    }

    function handleHubLogout() {
        fetch('/api/hub/logout', { method: 'POST' })
        .then(() => {
            updateAccessDropdown(null);
            accessDropdown.classList.remove('visible');
            if (window.location.pathname.includes('/automacao')) {
                window.location.reload();
            }
        });
    }

    function openConnectionsModal() {
        accessDropdown.classList.remove('visible');
        connectionsListContainer.innerHTML = '<p class="no-connections">Carregando...</p>';
        connectionsOverlay.classList.add('visible');

        fetch('/api/hub/get-connections')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                renderConnections(data.connections);
            } else {
                connectionsListContainer.innerHTML = '<p class="no-connections">Erro ao carregar conexões.</p>';
            }
        });
    }

    /**
     * ATUALIZADO: Renderiza a lista de conexões (usando bwhanashort_logo.png).
     */
    function renderConnections(connections) {
        connectionsListContainer.innerHTML = ''; // Limpa
        const sapConn = connections.sap;
        const bwConn = connections.bw;

        // Renderiza SAP
        connectionsListContainer.appendChild(
            createConnectionItem('sap', '/static/icones/saplong_logo.png', 'SAP', sapConn)
        );
        // Renderiza BW (com ícone corrigido)
        connectionsListContainer.appendChild(
            createConnectionItem('bw', '/static/icones/bwhanashort_logo.png', 'BW HANA', bwConn)
        );

        if (!sapConn && !bwConn) {
             connectionsListContainer.innerHTML = '<p class="no-connections">Nenhuma conexão salva.</p>';
        }
    }

    function createConnectionItem(system, iconSrc, systemName, connectionData) {
        const item = document.createElement('div');
        item.className = 'connection-item';
        
        let userDisplay = 'Não conectada';
        let removeBtnHtml = '';

        if (connectionData) {
            userDisplay = `Usuário: ${connectionData.user}`;
            removeBtnHtml = `
                <button class="connection-remove-btn" data-system="${system}" title="Remover Conexão">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
        }

        item.innerHTML = `
            <img src="${iconSrc}" alt="${systemName} Logo" class="connection-icon">
            <div class="connection-details">
                <strong>${systemName}</strong>
                <span>${userDisplay}</span>
            </div>
            ${removeBtnHtml}
        `;

        if (connectionData) {
            item.querySelector('.connection-remove-btn').addEventListener('click', handleRemoveConnection);
        }
        
        return item;
    }

    function closeConnectionsModal() {
        connectionsOverlay.classList.remove('visible');
    }

    /**
     * ATUALIZADO: Remove o popup de confirmação.
     */
    function handleRemoveConnection(e) {
        const btn = e.currentTarget;
        const system = btn.dataset.system;
        
        // if (!confirm(`Tem certeza que deseja remover a conexão ${system.toUpperCase()}?`)) {
        //     return;
        // }
        // ^-- Confirmação removida conforme solicitado

        fetch(`/api/hub/remove-connection/${system}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                openConnectionsModal(); // Apenas atualiza a lista
                if (window.location.pathname.includes('/automacao')) {
                    window.location.reload();
                }
            } else {
                alert(data.mensagem || "Erro ao remover conexão.");
            }
        });
    }

    // --- Listeners dos novos elementos ---
    accessBtn.addEventListener('click', () => {
        accessDropdown.classList.toggle('visible');
    });
    document.addEventListener('click', (e) => {
        if (!accessBtn.contains(e.target) && !accessDropdown.contains(e.target)) {
            accessDropdown.classList.remove('visible');
        }
    });

    hubLoginCloseBtn.addEventListener('click', closeHubLoginModal);
    hubLoginOverlay.addEventListener('click', (e) => {
        if (e.target === hubLoginOverlay) closeHubLoginModal();
    });
    hubPassInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleHubLogin();
    });
    hubLoginSubmitBtn.addEventListener('click', handleHubLogin);

    connectionsCloseBtn.addEventListener('click', closeConnectionsModal);
    connectionsOverlay.addEventListener('click', (e) => {
        if (e.target === connectionsOverlay) closeConnectionsModal();
    });

    // --- Verificação de sessão no carregamento ---
    fetch('/api/hub/check-session')
    .then(response => response.json())
    .then(data => {
        if(data.status === 'logado') {
            updateAccessDropdown(data.username);
        } else {
            updateAccessDropdown(null);
        }
    });

});
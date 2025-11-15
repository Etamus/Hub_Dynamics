document.addEventListener('DOMContentLoaded', () => {
    
    // --- Seletores de Elementos ---
    const searchBar = document.getElementById('search-bar');
    const cards = document.querySelectorAll('.hub-card');
    const quickLinksSection = document.getElementById('quick-links-section');
    const quickLinksContainer = document.getElementById('quick-links-container');
    const hubSubtitle = document.querySelector('.hub-subtitle'); // <-- ADICIONE ESTA LINHA
    
    // --- CÓDIGO ALTERADO: Seletores da Busca Universal ---
    const hubCardsContainer = document.getElementById('hub-cards-container');
    const searchDropdown = document.getElementById('search-dropdown-results')

    // --- Seletores do Header e Acesso ---
    const accessBtn = document.getElementById('access-btn');
    const profileImgThumb = document.getElementById('profile-img'); // Imagem no header
    const defaultProfileUrl = "/static/icones/default_profile.png"; // Imagem padrão
    const accessDropdown = document.getElementById('access-dropdown');
    
    let currentHubUser = null;
    let currentHubArea = null; // <-- ADICIONE ESTA LINHA 
    let currentHubRole = null; // <-- ADICIONE ESTA LINHA
    let currentProfileUrl = defaultProfileUrl; // URL da imagem atual
    let globalCmsDashboards = {}; // Armazena o JSON de dashboards
    let globalCmsAutomations = {}; // Armazena o JSON de automações
    let globalCmsUsers = []; // <-- ADICIONE ESTA LINHA
    let cropper = null; // Instância do Cropper.js
    let selectedFile = null; // Arquivo original selecionado
    let currentUploadExtension = null; // Extensão do arquivo original

     // --- CÓDIGO ADICIONADO: Índice de Busca Universal ---
    let searchableIndex = [];

    // --- Seletores dos Modais ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const themeOptions = document.querySelectorAll('.theme-option');
    const aboutBtn = document.getElementById('about-btn');
    const aboutOverlay = document.getElementById('about-overlay');
    const aboutCloseBtn = document.getElementById('about-close-btn');
    const countOptions = document.querySelectorAll('.count-selector .setting-option');
    const clearRecentsBtn = document.getElementById('clear-recents-btn');
    
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
    
    // Modal de Perfil
    const profileOverlay = document.getElementById('profile-overlay');
    const profileCloseBtn = document.getElementById('profile-close-btn');
    const profilePreviewImg = document.getElementById('profile-preview-img');
    const profileUploadForm = document.getElementById('profile-upload-form');
    const profileFileInput = document.getElementById('profile-file-input');
    const profileRemoveBtn = document.getElementById('profile-remove-btn');
    const profileUsernameDisplay = document.querySelector('.profile-username-display');
    const profileAreaDisplay = document.getElementById('profile-area-display');
    const profileRoleDisplay = document.getElementById('profile-role-display');
    const profileUploadStatus = document.getElementById('profile-upload-status');
    
    // Modal de Recorte
    const cropperOverlay = document.getElementById('cropper-overlay');
    const cropperCloseBtn = document.getElementById('cropper-close-btn');
    const cropperImage = document.getElementById('cropper-image');
    const cropperSaveBtn = document.getElementById('cropper-save-btn');
    
    // Modal de Registro
    const registerOverlay = document.getElementById('register-overlay');
    const registerCloseBtn = document.getElementById('register-close-btn');
    const tabRegister = document.getElementById('tab-register');
    const tabConsult = document.getElementById('tab-consult');
    const registerTabContent = document.getElementById('register-tab-content');
    const consultTabContent = document.getElementById('consult-tab-content');
    
    // Form de Registro
    const registerForm = document.getElementById('register-form');
    const registerUser = document.getElementById('register-user');
    const registerArea = document.getElementById('register-area');
    const registerRole = document.getElementById('register-role');
    const registerSubmitBtn = document.getElementById('register-submit-btn');
    const registerStatus = document.getElementById('register-status');
    const registerTokenDisplay = document.getElementById('register-token-display');
    const tokenGenerated = document.getElementById('token-generated');
    
    // Form de Consulta
    const consultToken = document.getElementById('consult-token');
    const consultTokenBtn = document.getElementById('consult-token-btn');
    const consultStatusError = document.getElementById('consult-status-error');
    const consultStatusWrapper = document.getElementById('consult-status-wrapper');
    const consultStatusResult = document.getElementById('consult-status-result');
    const consultJustification = document.getElementById('consult-justification');
    const consultNewPasswordSection = document.getElementById('consult-new-password-section');
    const consultPasswordError = document.getElementById('consult-password-error');
    const consultNewPassword = document.getElementById('consult-new-password');
    const consultSavePasswordBtn = document.getElementById('consult-save-password-btn');

    // Modal de Admin
    const adminOverlay = document.getElementById('admin-overlay');
    const adminCloseBtn = document.getElementById('admin-close-btn');
    
    // Abas e Painéis Admin
    const tabAdminRequests = document.getElementById('tab-admin-requests');
    const tabAdminUsers = document.getElementById('tab-admin-users');
    const tabAdminDashboards = document.getElementById('tab-admin-dashboards');
    const tabAdminAutomations = document.getElementById('tab-admin-automations');
    
    const adminRequestsTab = document.getElementById('admin-requests-tab');
    const adminUsersTab = document.getElementById('admin-users-tab');
    const adminDashboardsTab = document.getElementById('admin-dashboards-tab');
    const adminAutomationsTab = document.getElementById('admin-automations-tab');

    // Contêineres de Lista Admin
    const adminListContainer = document.getElementById('admin-list-container');
    const adminUserListContainer = document.getElementById('admin-user-list-container');
    const adminDashboardsList = document.getElementById('admin-dashboards-list');
    const adminAutomationsList = document.getElementById('admin-automations-list');
    
    // Botões de Adicionar Admin
    const adminAddAutomationBtn = document.getElementById('admin-add-automation-btn');
    const adminAddDashboardBtn = document.getElementById('admin-add-dashboard-btn');

    // --- CÓDIGO ADICIONADO: Função para construir o Índice de Busca ---
    function buildSearchIndex() {
        searchableIndex = []; // Reseta o índice


        // 1. Adiciona os Cards Principais
        cards.forEach(card => {
            if (!card.classList.contains('disabled')) { // Só adiciona cards clicáveis
                searchableIndex.push({
                    type: 'card',
                    name: card.querySelector('h2').textContent,
                    description: card.querySelector('p').textContent,
                    href: card.href,
                    icon: card.querySelector('i.fas').className
                });
            }
        });


        // 2. Adiciona os Dashboards do JSON
        for (const systemKey in globalCmsDashboards) {
            const system = globalCmsDashboards[systemKey];
            for (const areaKey in system.areas) {
                const area = system.areas[areaKey];
                area.items.forEach(item => {
                    searchableIndex.push({
                        type: 'item',
                        name: item.name,
                        description: item.text,
                        tags: (item.tags || '').replace(/,/g, ' '), // Substitui vírgulas por espaços
                        href: `/dashboards?open=${item.id}`,
                        icon: 'fas fa-chart-pie' // Ícone padrão de dashboard
                    });
                });
            }
        }
       
        // 3. Adiciona as Automações do JSON
        for (const autoName in globalCmsAutomations) {
            const auto = globalCmsAutomations[autoName];
            searchableIndex.push({
                type: 'item',
                name: autoName,
                description: `Automação ${auto.type.toUpperCase()}: ${auto.macro || ''}`,
                tags: `${auto.type} automação`,
                href: `/automacao?open=${autoName.replace(/\s+/g, '-')}`, // URL amigável
                icon: 'fas fa-robot' // Ícone de automação
            });
        }
    }
    // --- FIM DA ADIÇÃO ---


    // --- CÓDIGO NOVO: Função para carregar os dados do CMS e construir o índice ---
    function loadSearchData() {
        // 1. Verifica se os dados já foram carregados (pelo sessionStorage, por exemplo)
        const automationsLoaded = Object.keys(globalCmsAutomations).length > 0;
        const dashboardsLoaded = Object.keys(globalCmsDashboards).length > 0;


        if (automationsLoaded && dashboardsLoaded) {
            // Se os dados já estão aqui (do cache da sessão), apenas construa o índice
            buildSearchIndex();
        } else {
            // Se não, busca os dados do servidor
            fetch('/api/admin/get-cms-data')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'sucesso') {
                    globalCmsDashboards = data.dashboards;
                    globalCmsAutomations = data.automations;
                }
            })
            .catch(err => {
                console.error("Erro ao carregar dados de busca do CMS:", err);
            })
            .finally(() => {
                // Concluindo, com ou sem erro, construa o índice com o que tiver
                buildSearchIndex();
            });
        }
    }

    // --- 1. LÓGICA DO SELETOR DE TEMA ---
    
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
        localStorage.removeItem(getStorageKey('recentDashboards'));
        localStorage.removeItem(getStorageKey('pinnedDashboards'));
        renderQuickLinks();
    }

    function updateAreaDropdown(systemSelect, areaSelect) {
    const selectedSystem = systemSelect.value;
    areaSelect.innerHTML = ''; // Limpa opções antigas

    // Busca as áreas do sistema selecionado no objeto global
    if (globalCmsDashboards[selectedSystem] && globalCmsDashboards[selectedSystem].areas) {
        const areas = globalCmsDashboards[selectedSystem].areas;
        
        // Cria as novas <option> para as áreas
        Object.keys(areas).forEach(areaKey => {
            const option = document.createElement('option');
            option.value = areaKey;
            option.textContent = areas[areaKey].name;
            areaSelect.appendChild(option);
        });
    }
}
    
    const savedTheme = localStorage.getItem('hubTheme') || 'light';
    themeOptions.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === savedTheme);
    });

    applyCountSetting(localStorage.getItem('hubItemCount') || 4);

    // Listeners dos Modais de Configurações e Sobre
    settingsBtn.addEventListener('click', () => { settingsOverlay.classList.add('visible'); });
    settingsCloseBtn.addEventListener('click', () => { settingsOverlay.classList.remove('visible'); });
    settingsOverlay.addEventListener('mousedown', (e) => { if (e.target === settingsOverlay) { settingsOverlay.classList.remove('visible'); } });
    themeOptions.forEach(option => { option.addEventListener('click', () => { applyTheme(option.dataset.theme); }); });
    aboutBtn.addEventListener('click', () => { aboutOverlay.classList.add('visible'); });
    aboutCloseBtn.addEventListener('click', () => { aboutOverlay.classList.remove('visible'); });
    aboutOverlay.addEventListener('mousedown', (e) => { if (e.target === aboutOverlay) { aboutOverlay.classList.remove('visible'); } });
    countOptions.forEach(option => { option.addEventListener('click', () => { applyCountSetting(option.dataset.count); }); });
    clearRecentsBtn.addEventListener('click', clearRecents);
    
    
    // --- 2. LÓGICA DE ACESSO RÁPIDO (COM PINS) (MODIFICADO) ---

    function getStorageKey(baseKey) {
        // Usa o usuário logado ou '_guest' se estiver deslogado
        const userKey = currentHubUser || '_guest';
        return `${baseKey}_${userKey}`;
    }

    function getRecents() { 
        return JSON.parse(localStorage.getItem(getStorageKey('recentDashboards'))) || []; 
    }
    function getPinned() { 
        return JSON.parse(localStorage.getItem(getStorageKey('pinnedDashboards'))) || []; 
    }
    function savePinned(pinned) { 
        localStorage.setItem(getStorageKey('pinnedDashboards'), JSON.stringify(pinned)); 
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

    // --- 3. LÓGICA DA BARRA DE PESQUISA (SUBSTITUÍDA PELA VERSÃO DROPDOWN) ---
    searchBar.addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase();

        // Limpa resultados anteriores
        searchDropdown.innerHTML = '';

        // Se a barra de pesquisa estiver vazia, esconde o dropdown e sai
        if (searchTerm === "") {
            searchDropdown.classList.remove('visible');
            return;
        }

        let itemsFound = 0;

        // Filtra o índice de busca universal
        searchableIndex.forEach(item => {
            const searchableText = [
                item.name.toLowerCase(),
                item.description.toLowerCase(),
                (item.tags || '').toLowerCase()
            ].join(' ');
            
            if (searchableText.includes(searchTerm)) {
                itemsFound++;
                
                // Cria o link do resultado (com a nova classe)
                const link = document.createElement('a');
                link.href = item.href;
                link.className = 'search-result-item'; // <-- Nova classe de estilo
                
                const itemIcon = document.createElement('i');
                itemIcon.className = item.icon;
                link.appendChild(itemIcon);
                
                const text = document.createElement('span');
                text.textContent = item.name;
                link.appendChild(text);
                
                searchDropdown.appendChild(link);
            }
        });

        // Mostra mensagem se nenhum resultado for encontrado
        if (itemsFound === 0) {
            searchDropdown.innerHTML = '<p class="no-results">Nenhum resultado encontrado.</p>';
        }

        // Mostra o dropdown
        searchDropdown.classList.add('visible');
    });

    // ========================================================
    // ===== 4. LÓGICA (ACESSO, LOGIN HUB, PERFIL) ATUALIZADA =====
    // ========================================================

    /**
     * ATUALIZADO: Atualiza a UI do dropdown, a IMAGEM do botão e a largura mínima.
     */
    function updateAccessDropdown(username = null, profileImageUrl = null, area = null, role = null) { // <-- Argumento 'role' adicionado
    currentHubUser = username;
    currentHubArea = area; // <-- Salva a área globalmente
    currentHubRole = role; // <-- ADICIONE ESTA LINHA
    accessDropdown.innerHTML = '';
    
    currentProfileUrl = profileImageUrl || defaultProfileUrl;
    profileImgThumb.src = currentProfileUrl;
    
    if (username) {
        accessDropdown.style.minWidth = '200px';
    } else {
        accessDropdown.style.minWidth = '180px';
    }

    if (username) {
        let adminButton = '';
        // Mostra o botão de Admin se o usuário for 'admin'
        if (username.toLowerCase() === 'admin') {
            adminButton = `
            <button class="access-dropdown-item" id="access-admin-btn">
                <i class="fas fa-user-shield"></i>Administração
            </button>`;
        }

        accessDropdown.innerHTML = `
            <div class="access-dropdown-header">
                <strong>${username}</strong>
                <span>${area || 'N/A'}</span>
            </div>
            <button class="access-dropdown-item" id="access-profile-btn">
                <i class="fas fa-camera"></i>Perfil
            </button>
            ${adminButton} 
            <button class="access-dropdown-item" id="access-connections-btn">
                <i class="fas fa-plug"></i>Minhas Conexões
            </button>
            <button class="access-dropdown-item danger" id="access-logout-btn">
                <i class="fas fa-sign-out-alt"></i>Deslogar
            </button>
        `;
        document.getElementById('access-profile-btn').addEventListener('click', () => openProfileModal(username, currentProfileUrl));
        document.getElementById('access-connections-btn').addEventListener('click', openConnectionsModal);
        document.getElementById('access-logout-btn').addEventListener('click', handleHubLogout);
        
        // Listener do botão de Admin (se ele existir)
        const adminBtn = document.getElementById('access-admin-btn');
        if (adminBtn) {
            adminBtn.addEventListener('click', openAdminModal);
        }
            
    } else {
        // --- Usuário está DESLOGADO (Adiciona "Registrar") ---
        accessDropdown.innerHTML = `
            <button class="access-dropdown-item" id="access-login-btn">
                <i class="fas fa-sign-in-alt"></i>Logar
            </button>
            <button class="access-dropdown-item" id="access-register-btn">
                <i class="fas fa-user-plus"></i>Solicitar Acesso
            </button>
        `;
        document.getElementById('access-login-btn').addEventListener('click', openHubLoginModal);
        document.getElementById('access-register-btn').addEventListener('click', openRegisterModal);
    }
}

    // --- Lógica de Recorte (Cropper.js) ---

    function openCropperModal(imageSrc) {
        profileOverlay.classList.remove('visible'); // Fecha o modal de perfil
        cropperImage.src = imageSrc;
        cropperOverlay.classList.add('visible');

        // Garante que o cropper só seja inicializado quando a imagem estiver carregada
        cropperImage.onload = () => {
            if (cropper) {
                cropper.destroy();
            }
            cropper = new Cropper(cropperImage, {
                aspectRatio: 1, // Quadrado
                viewMode: 1, // Garante que o cropper caiba na tela
                movable: true,
                zoomable: true,
                scalable: false,
                rotatable: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                background: false
            });
        };
    }
    
    function closeCropperModal() {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        cropperOverlay.classList.remove('visible');
    }

    cropperCloseBtn.addEventListener('click', closeCropperModal);
    cropperOverlay.addEventListener('mousedown', (e) => {
        if (e.target === cropperOverlay) closeCropperModal();
    });

    cropperSaveBtn.addEventListener('click', () => {
        if (!cropper || !currentHubUser || !selectedFile) return;

        // 1. Recorta a imagem para um Blob (tipo de arquivo)
        const croppedCanvas = cropper.getCroppedCanvas({
            width: 256,
            height: 256,
        });

        croppedCanvas.toBlob((blob) => {
            if (!blob) {
                profileUploadStatus.textContent = "Erro ao processar imagem.";
                return;
            }
            
            closeCropperModal();
            profileUploadStatus.textContent = "Recorte concluído. Enviando imagem...";

            // 2. Prepara para enviar o Blob como um FormData
            const formData = new FormData();
            // Renomeia o blob com o nome do arquivo original para manter a extensão
            formData.append('file', blob, `${currentHubUser}.${currentUploadExtension}`);

            // 3. Executa o upload
            uploadCroppedImage(formData);
        }, `image/${currentUploadExtension === 'png' ? 'png' : 'jpeg'}`, 0.9);
    });

    // Em: hub.js

function uploadCroppedImage(formData) {
    fetch('/api/profile/upload', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'sucesso') {
            profileUploadStatus.textContent = data.mensagem;
            
            // --- CORREÇÃO (Req. 4): Atualiza a URL local ---
            currentProfileUrl = data.url; 
            
            updateAccessDropdown(currentHubUser, data.url, currentHubArea); 
            profilePreviewImg.src = data.url;
        } else {
            profileUploadStatus.textContent = data.mensagem || "Erro ao fazer upload.";
        }
    })
    .catch(() => {
        profileUploadStatus.textContent = "Erro de comunicação com o servidor.";
    })
    .finally(() => {
        // --- CORREÇÃO (Req. 4): Chama a função de reabertura para reavaliar os botões ---
        openProfileModal(currentHubUser, currentProfileUrl);
    });
}

    // --- Lógica do Modal de Perfil (Input de Arquivo) ---

    function openProfileModal(username, currentImageUrl) {
    accessDropdown.classList.remove('visible');
    profileUsernameDisplay.textContent = username;

    // --- ADIÇÃO DA LÓGICA DE PREENCHIMENTO ---
    profileAreaDisplay.textContent = currentHubArea || 'N/A';
    profileRoleDisplay.textContent = currentHubRole || 'N/A';
    // ------------------------------------------

    profilePreviewImg.src = currentImageUrl;
    profileFileInput.value = null; // Limpa o input de arquivo
    profileUploadStatus.textContent = "Selecione uma imagem (PNG, JPG)";
    
    // --- CORREÇÃO AQUI ---
    // Gerencia a visibilidade E o estado 'disabled' do botão de remover
    if (currentImageUrl !== defaultProfileUrl) {
        profileRemoveBtn.classList.remove('hidden');
        profileRemoveBtn.disabled = false; // Habilita o botão
    } else {
        profileRemoveBtn.classList.add('hidden');
        profileRemoveBtn.disabled = true; // Desabilita o botão
    }
    
    profileOverlay.classList.add('visible');
}
    
    profileCloseBtn.addEventListener('click', () => profileOverlay.classList.remove('visible'));
    profileOverlay.addEventListener('mousedown', (e) => {
        if (e.target === profileOverlay) profileOverlay.classList.remove('visible');
    });

    // Dispara o modal de recorte ao selecionar um arquivo
    profileFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileNameParts = file.name.split('.');
        currentUploadExtension = fileNameParts.length > 1 ? fileNameParts.pop().toLowerCase() : 'jpg';

        // Verifica o tipo de arquivo
        if (!['png', 'jpg', 'jpeg'].includes(currentUploadExtension)) {
            profileUploadStatus.textContent = "Apenas arquivos PNG ou JPG são permitidos.";
            profileFileInput.value = null; // Limpa o input
            return;
        }

        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            // Abre o modal de recorte com a imagem selecionada
            openCropperModal(e.target.result);
        };
        reader.readAsDataURL(file);
        
        // --- CORREÇÃO (Req. 2): Reseta o input para permitir selecionar o mesmo arquivo novamente ---
        profileFileInput.value = null;
        // ----------------------------------------------------------------------------------
    });
    
    // Lógica para o novo botão "Remover Imagem"
profileRemoveBtn.addEventListener('click', () => {
    if (!currentHubUser || profileRemoveBtn.disabled) return;
    
    // --- CORREÇÃO (Req. 3): Remoção do popup de confirmação ---
    // if (!confirm("Tem certeza que deseja remover sua foto de perfil?")) return;
    
    profileUploadStatus.textContent = "Removendo imagem...";
    profileRemoveBtn.disabled = true; // Desabilita durante a remoção
    
    fetch('/api/profile/remove-image', { method: 'POST' })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'sucesso') {
            profileUploadStatus.textContent = data.mensagem;
            
            // --- CORREÇÃO (Req. 4): Atualiza a URL local ---
            currentProfileUrl = data.default_url; 

            updateAccessDropdown(currentHubUser, data.default_url, currentHubArea);
            profilePreviewImg.src = data.default_url;
            profileRemoveBtn.classList.add('hidden'); // Esconde o botão
        } else {
            profileUploadStatus.textContent = data.mensagem || "Erro ao remover imagem.";
            profileRemoveBtn.disabled = false; // Reabilita se falhar
        }
    })
    .catch(() => {
        profileUploadStatus.textContent = "Erro de comunicação ao remover imagem.";
        profileRemoveBtn.disabled = false; // Reabilita se falhar
    });
});

    // --- Lógica de Login/Sessão (Ajustadas para imagem) ---
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
    function showHubLoginError(message) {
        hubLoginError.textContent = message;
        hubLoginError.classList.remove('hidden');
    }
    
    function handleHubLogin() {
        const username = hubUserInput.value;
        const password = hubPassInput.value;
        
        if (!username || !password) { showHubLoginError("Preencha usuário e senha."); return; }
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        fetch('/api/hub/login', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                window.location.reload();
            } else { showHubLoginError(data.mensagem || "Erro desconhecido."); }
        })
        .catch(() => showHubLoginError("Erro de comunicação com o servidor."));
    }

    function handleHubLogout() {
        // --- INÍCIO DA MODIFICAÇÃO (Limpar Ordem) ---
        if (currentHubUser) {
            sessionStorage.removeItem(`sortedAutomations_${currentHubUser}`);
            sessionStorage.removeItem(`sortedDashboards_${currentHubUser}`);
        }
        // --- FIM DA MODIFICAÇÃO ---
        fetch('/api/hub/logout', { method: 'POST' })
        .then(() => {
            window.location.href = '/';
        });
    }

    // --- Modal de Conexões (Mantidas) ---
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

    function renderConnections(connections) {
        connectionsListContainer.innerHTML = '';
        const sapConn = connections.sap;
        const bwConn = connections.bw;
        
        // --- INÍCIO DA MODIFICAÇÃO ---
        const tableauConn = connections.tableau; 
        // --- FIM DA MODIFICAÇÃO ---

        connectionsListContainer.appendChild(
            createConnectionItem('sap', '/static/icones/saplong_logo.png', 'SAP', sapConn)
        );
        connectionsListContainer.appendChild(
            createConnectionItem('bw', '/static/icones/bwhanashort_logo.png', 'BW HANA', bwConn)
        );
        
        // --- INÍCIO DA MODIFICAÇÃO ---
        // (Assumindo que você tem um logo do tableau em /static/icones/)
        // (Se o caminho estiver errado, ajuste-o aqui)
        connectionsListContainer.appendChild(
            createConnectionItem('tableau', '/static/icones/tableau_logo.png', 'Tableau', tableauConn) 
        );
        // --- FIM DA MODIFICAÇÃO ---

        // (Atualiza a verificação de "vazio")
        if (!sapConn && !bwConn && !tableauConn) {
             connectionsListContainer.innerHTML = '<p class="no-connections">Nenhuma conexão salva.</p>';
        }
    }

    function createConnectionItem(system, iconSrc, systemName, connectionData) {
        const item = document.createElement('div');
        
        let itemClass = 'connection-item';
        if (system === 'sap' || system === 'bw') {
            itemClass += ' connection-item-padded';
        }
        item.className = itemClass;

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

        const iconClass = (system === 'tableau') ? 'connection-icon tableau-icon' : 'connection-icon';
        
        // --- INÍCIO DA MODIFICAÇÃO (Req 3) ---
        let iconHtml = '';
        if (system === 'sap') {
            // (Req 3: Remover _logo extra)
            iconHtml = `
                <img src="/static/icones/saplong_logo.png" alt="SAP Logo" class="${iconClass} logo-light">
                <img src="/static/icones/sapblacklong_logo.png" alt="SAP Logo" class="${iconClass} logo-dark">
            `;
        } else {
            iconHtml = `<img src="${iconSrc}" alt="${systemName} Logo" class="${iconClass}">`;
        }
        // --- FIM DA MODIFICAÇÃO ---

        item.innerHTML = `
            ${iconHtml}
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

    function handleRemoveConnection(e) {
        const btn = e.currentTarget;
        const system = btn.dataset.system;
        
        fetch(`/api/hub/remove-connection/${system}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                openConnectionsModal();
                if (window.location.pathname.includes('/automacao')) {
                    window.location.reload();
                }
            } else {
                alert(data.mensagem || "Erro ao remover conexão.");
            }
        });
    }

    // --- Listeners de Eventos Globais ---
    accessBtn.addEventListener('click', () => {
        accessDropdown.classList.toggle('visible');
    });
    // Atualizado para não fechar o dropdown se clicar nos modais de perfil/cropper
    document.addEventListener('click', (e) => {
        const inAccess = accessBtn.contains(e.target) || accessDropdown.contains(e.target);
        const inProfileModal = profileOverlay.contains(e.target) || (cropperOverlay && cropperOverlay.contains(e.target));
        
        if (!inAccess && !inProfileModal) {
            accessDropdown.classList.remove('visible');
        }

        // --- CÓDIGO ADICIONADO: Lógica para fechar o dropdown da busca ---
        const inSearch = searchBar.contains(e.target) || searchDropdown.contains(e.target);
        if (!inSearch) {
            searchDropdown.classList.remove('visible');
        }

    });

    hubLoginCloseBtn.addEventListener('click', closeHubLoginModal);
    hubLoginOverlay.addEventListener('mousedown', (e) => { if (e.target === hubLoginOverlay) closeHubLoginModal(); });
    hubPassInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleHubLogin(); });
    hubLoginSubmitBtn.addEventListener('click', handleHubLogin);

    connectionsCloseBtn.addEventListener('click', closeConnectionsModal);
    connectionsOverlay.addEventListener('mousedown', (e) => { if (e.target === connectionsOverlay) closeConnectionsModal(); });

    // --- Inicialização da Sessão ---
fetch('/api/hub/check-session')
.then(response => response.json())
.then(data => {
    // --- CORREÇÃO (Req. 1): Define a URL atual no carregamento ---
    currentProfileUrl = data.profile_image || defaultProfileUrl;
    
    if(data.status === 'logado') {
        currentHubUser = data.username; // Define o usuário global
        currentHubArea = data.area; // Define a área global
        currentHubRole = data.role; // Salva a role
        localStorage.setItem('hubUsername', data.username); // Sincroniza o localStorage
        updateAccessDropdown(data.username, data.profile_image, data.area, data.role);

        // --- INÍCIO DA MODIFICAÇÃO (Persistir Ordem) ---
        // Tenta carregar a ordem salva da sessão PARA ESTE USUÁRIO
        try {
            const savedAutomations = sessionStorage.getItem(`sortedAutomations_${data.username}`);
            if (savedAutomations) {
                globalCmsAutomations = JSON.parse(savedAutomations);
            }
            const savedDashboards = sessionStorage.getItem(`sortedDashboards_${data.username}`);
            if (savedDashboards) {
                globalCmsDashboards = JSON.parse(savedDashboards);
            }
        } catch (e) {
            console.error("Falha ao carregar CMS do sessionStorage", e);
            sessionStorage.removeItem(`sortedAutomations_${data.username}`);
            sessionStorage.removeItem(`sortedDashboards_${data.username}`);
        }
        // --- FIM DA MODIFICAÇÃO ---
    } else {
        currentHubUser = null;
        currentHubArea = null;
        currentHubRole = null;
        localStorage.removeItem('hubUsername');
        updateAccessDropdown(null, data.profile_image, null, null);
    }

    renderQuickLinks(); // Renderiza os links rápidos corretos (logado ou guest)
    // chamamos a função que CARREGA OS DADOS e DEPOIS constrói o índice.
    loadSearchData();
});

// --- NOVA LÓGICA: MODAL DE REGISTRO ---

    function openRegisterModal() {
        accessDropdown.classList.remove('visible');
        registerOverlay.classList.add('visible');
        // Reseta o modal para a aba de registro
        showRegisterTab('register');
        
        // --- CORREÇÃO: Reseta o layout do formulário ---
        document.getElementById('register-fields').classList.remove('hidden'); // Mostra os campos
        registerTokenDisplay.classList.add('hidden'); // Esconde o token
        
        consultStatusWrapper.classList.add('hidden');
        registerStatus.classList.add('hidden');
        consultPasswordError.classList.add('hidden');
        
        // Limpa os campos
        registerUser.value = '';
        registerArea.value = '';
        registerRole.value = '';
        consultToken.value = '';
        consultNewPassword.value = '';
    }

    function showRegisterTab(tabName) {
        if (tabName === 'register') {
            tabRegister.classList.add('active');
            tabConsult.classList.remove('active');
            registerTabContent.classList.remove('hidden');
            consultTabContent.classList.add('hidden');
        } else {
            tabRegister.classList.remove('active');
            tabConsult.classList.add('active');
            registerTabContent.classList.add('hidden');
            consultTabContent.classList.remove('hidden');
        }
    }
    
    // Listeners das Abas de Registro
    tabRegister.addEventListener('click', () => showRegisterTab('register'));
    tabConsult.addEventListener('click', () => showRegisterTab('consult'));
    registerCloseBtn.addEventListener('click', () => registerOverlay.classList.remove('visible'));
    registerOverlay.addEventListener('mousedown', (e) => {
        if (e.target === registerOverlay) registerOverlay.classList.remove('visible');
    });

    // Enviar Solicitação de Registro
    registerSubmitBtn.addEventListener('click', () => {
        const username = registerUser.value.trim();
        const area = registerArea.value;
        const role = registerRole.value;

        if (!username || !area) {
            registerStatus.textContent = "Preencha o N° de Funcionário e a Área.";
            registerStatus.classList.remove('hidden');
            return;
        }

        registerStatus.classList.add('hidden');
        registerSubmitBtn.disabled = true;

        fetch('/api/hub/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, area: area, role: role })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                tokenGenerated.textContent = data.token;
                
                // --- CORREÇÃO: Esconde apenas os campos, não o form todo ---
                document.getElementById('register-fields').classList.add('hidden');
                
                registerTokenDisplay.classList.remove('hidden');
            } else {
                registerStatus.textContent = data.mensagem;
                registerStatus.classList.remove('hidden');
            }
        })
        .finally(() => {
            registerSubmitBtn.disabled = false;
        });
    });

    // Consultar Token
    consultTokenBtn.addEventListener('click', () => {
        const token = consultToken.value.trim();
        if (!token) return;

        consultTokenBtn.disabled = true;
        consultStatusWrapper.classList.add('hidden');
        consultNewPasswordSection.classList.add('hidden');
        consultPasswordError.classList.add('hidden');
        consultStatusError.classList.add('hidden'); // <-- ADICIONADO: Esconde o erro
        
        fetch('/api/hub/consult', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                const status = data.request_data.status;
                consultStatusResult.textContent = status;
                consultStatusResult.className = 'consult-status-box'; // Reseta classes
                consultJustification.classList.add('hidden');

                if (status === 'Aguardando Aprovação') {
                    consultStatusResult.classList.add('pending');
                } else if (status === 'Aprovado') {
                    consultStatusResult.classList.add('approved');
                    consultNewPasswordSection.classList.remove('hidden');
                } else { // Reprovado ou Expirado
                    consultStatusResult.classList.add('rejected');
                    consultJustification.textContent = `Justificativa: ${data.request_data.justification || 'N/A'}`;
                    consultJustification.classList.remove('hidden');
                }
                consultStatusWrapper.classList.remove('hidden');
            } else {
                // --- CORREÇÃO: Remove o alert() e usa o <p> ---
                // alert(data.mensagem); 
                consultStatusError.textContent = data.mensagem;
                consultStatusError.classList.remove('hidden');
                // ---------------------------------------------
            }
        })
        .finally(() => {
            consultTokenBtn.disabled = false;
        });
    });
    
    // Salvar Nova Senha
    consultSavePasswordBtn.addEventListener('click', () => {
        const token = consultToken.value.trim();
        const password = consultNewPassword.value;
        
        if (!password || password.length < 4) {
            consultPasswordError.textContent = "A senha deve ter pelo menos 4 caracteres.";
            consultPasswordError.classList.remove('hidden');
            return;
        }

        consultPasswordError.classList.add('hidden');
        consultSavePasswordBtn.disabled = true;

        fetch('/api/hub/complete-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, password: password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                registerOverlay.classList.remove('visible'); // Fecha modal de registro
                openHubLoginModal(); // Abre modal de login
            } else {
                consultPasswordError.textContent = data.mensagem;
                consultPasswordError.classList.remove('hidden');
            }
        })
        .finally(() => {
            consultSavePasswordBtn.disabled = false;
        });
    });


    // --- NOVA LÓGICA: MODAL DE ADMINISTRAÇÃO ---

    function openAdminModal() {
        accessDropdown.classList.remove('visible');

        // --- INÍCIO DA MODIFICAÇÃO (Req 1: Adicionar Botão de Usuário) ---
        if (!document.getElementById('admin-add-user-btn')) {
            const userTabPanel = document.getElementById('admin-users-tab');
            if (userTabPanel) {
                const buttonHtml = `
                    <button class="button btn-success" id="admin-add-user-btn">
                        Adicionar
                    </button>
                `;
                // Insere o botão (ele será movido pelo showAdminTab)
                userTabPanel.insertAdjacentHTML('afterbegin', buttonHtml);
                
                // --- (LÓGICA DO LISTENER ATUALIZADA) ---
                document.getElementById('admin-add-user-btn').addEventListener('click', () => {
                    // 1. Fecha outros forms
                    closeAllEditForms(adminUserListContainer);

                    // 2. Cria um objeto de usuário temporário
                    const newUser = {
                        username: 'temp_user_' + Date.now(), // ID Temporário
                        password: '',
                        area: 'Logística', // Padrão
                        role: 'Analista',  // Padrão
                        isNew: true
                    };
                    
                    // 3. Adiciona o novo usuário ao TOPO da lista global
                    globalCmsUsers.unshift(newUser);
                    
                    // 4. Re-renderiza a lista inteira (que agora inclui o novo)
                    renderAdminUsers(); 

                    // 5. Encontra o card que acabou de ser renderizado
                    const newCard = adminUserListContainer.querySelector(`[data-temp-id="${newUser.username}"]`);
                    
                    if (newCard) {
                        // 6. Abre o formulário de edição (ele já está visível por padrão)
                        
                        // 7. Rola o container (a lista) para o topo
                        adminUserListContainer.scrollTop = 0;
                    }
                });
            }
        }
        // --- FIM DA MODIFICAÇÃO ---

        if (!document.getElementById('admin-search-container')) {
            const tabsContainer = adminOverlay.querySelector('.scheduler-queue-tabs');
            if (tabsContainer) {
                const searchHtml = `
                    <div id="admin-search-container" class="admin-search-container hidden">
                        <div id="admin-search-input-wrapper" class="admin-search-input-wrapper">
                            <i class="fas fa-search admin-search-icon"></i>
                            <input type="text" id="admin-search-input" class="admin-search-input" placeholder="Pesquisar nome...">
                        </div>
                    </div>
                `;
                tabsContainer.insertAdjacentHTML('afterend', searchHtml);
                document.getElementById('admin-search-input').addEventListener('keyup', handleAdminSearch);
            }
        }

        adminListContainer.innerHTML = '<p class="no-requests">Carregando solicitações...</p>';
        adminUserListContainer.innerHTML = '<p class="no-requests">Carregando usuários...</p>';
        adminDashboardsList.innerHTML = '<p class="no-requests">Carregando dashboards...</p>';
        adminAutomationsList.innerHTML = '<p class="no-requests">Carregando automações...</p>';
        
        showAdminTab('requests'); 
        adminOverlay.classList.add('visible');
        
        // 1. Busca Solicitações Pendentes
        fetch('/api/admin/get-requests')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                renderAdminRequests(data.requests);
            } else {
                adminListContainer.innerHTML = `<p class="no-requests">Erro: ${data.mensagem}</p>`;
            }
        });
        
        // 2. Busca Lista de Usuários (e salva globalmente)
        // (SÓ BUSCA SE A LISTA ESTIVER VAZIA)
        if (!globalCmsUsers || globalCmsUsers.length === 0) {
            fetch('/api/admin/get-users')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'sucesso') {
                    globalCmsUsers = data.users; // Salva na variável global
                    renderAdminUsers(); // Renderiza da global
                } else {
                    adminUserListContainer.innerHTML = `<p class="no-requests">Erro: ${data.mensagem}</p>`;
                }
            });
        } else {
            renderAdminUsers(); // Renderiza a lista local
        }
        
        // 3. Busca Dados do CMS (SÓ SE ESTIVER VAZIO)
        const automationsLoaded = Object.keys(globalCmsAutomations).length > 0;
        const dashboardsLoaded = Object.keys(globalCmsDashboards).length > 0;

        if (automationsLoaded && dashboardsLoaded) {
            renderAdminDashboards();
            renderAdminAutomations();
        } else {
            fetch('/api/admin/get-cms-data')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'sucesso') {
                    if (!dashboardsLoaded) {
                        globalCmsDashboards = data.dashboards;
                    }
                    if (!automationsLoaded) {
                        globalCmsAutomations = data.automations;
                    }
                    renderAdminDashboards();
                    renderAdminAutomations();
                } else {
                    adminDashboardsList.innerHTML = `<p class="no-requests">Erro: ${data.mensagem}</p>`;
                    adminAutomationsList.innerHTML = `<p class="no-requests">Erro: ${data.mensagem}</p>`;
                }
            });
        }
    }

    // SUBSTITUA a função renderAdminRequests por esta:
function renderAdminRequests(requests) {
    adminListContainer.innerHTML = '';
    const tokens = Object.keys(requests);
    
    if (tokens.length === 0) {
        adminListContainer.innerHTML = '<p class="no-requests">Nenhuma solicitação pendente.</p>';
        return;
    }
    
    tokens.forEach(token => {
        const req = requests[token];
        
        // --- CORREÇÃO (Req 2): Formata a data ISO (agora com fuso) para PT-BR local
        const requestDate = new Date(req.request_date).toLocaleString('pt-BR', {
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit'
        });
        
        const item = document.createElement('div');
        item.className = 'admin-request-card'; // <-- CORRIGIDO (estava item.className)
        item.dataset.token = token;
        
        item.innerHTML = `
            <div class="admin-request-main">
                <div class="admin-request-info">
                    <div class="username">${req.username.toUpperCase()}</div> 
                    <div class="details">
                        <strong>Área:</strong> ${req.area} | <strong>Função:</strong> ${req.role}
                        <br>
                        <strong>Solicitado em:</strong> ${requestDate}
                    </div>
                </div>
                <div class="admin-request-actions">
                    <button class="button btn-execute admin-approve-btn">Aprovar</button>
                    <button class="button btn-danger admin-reject-btn">Reprovar</button>
                </div>
            </div>
            <div class="admin-justification-form hidden">
                <textarea class="admin-justification-input" placeholder="Justificativa da reprovação..."></textarea>
                <div class="admin-justification-actions">
                    <button class="button btn-cancel admin-reject-cancel-btn">Cancelar</button>
                    <button class="button btn-danger admin-reject-save-btn">Confirmar</button>
                </div>
            </div>
        `;
        adminListContainer.appendChild(item);
    });

    // Adiciona listeners aos botões
    adminListContainer.querySelectorAll('.admin-approve-btn').forEach(btn => {
        btn.addEventListener('click', handleAdminApprove);
    });
    adminListContainer.querySelectorAll('.admin-reject-btn').forEach(btn => {
        btn.addEventListener('click', showAdminRejectionForm);
    });
    adminListContainer.querySelectorAll('.admin-reject-save-btn').forEach(btn => {
        btn.addEventListener('click', handleAdminReject);
    });
    adminListContainer.querySelectorAll('.admin-reject-cancel-btn').forEach(btn => {
        btn.addEventListener('click', hideAdminRejectionForm);
    });
}

    function handleAdminApprove(e) {
    const item = e.target.closest('.admin-request-card'); // <-- CORREÇÃO (Req 1)
    const token = item.dataset.token;
    e.target.disabled = true;
    
    fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'sucesso') {
            // --- CORREÇÃO (Req 2): Remove o item em vez de esmaecer ---
            item.remove();
            
            // Verifica se a lista ficou vazia
            if (adminListContainer.children.length === 0) {
                 adminListContainer.innerHTML = '<p class="no-requests">Nenhuma solicitação pendente.</p>';
            }
        } else {
            alert(data.mensagem);
            e.target.disabled = false;
        }
    });
}
    
    // SUBSTITUA a função showAdminRejectionForm por esta:
function showAdminRejectionForm(e) {
    const item = e.target.closest('.admin-request-card'); // <-- CORREÇÃO
    item.querySelector('.admin-justification-form').classList.remove('hidden');
    item.querySelector('.admin-request-main').classList.add('hidden'); // Esconde a linha principal
}

// SUBSTITUA a função hideAdminRejectionForm por esta:
function hideAdminRejectionForm(e) {
    const item = e.target.closest('.admin-request-card'); // <-- CORREÇÃO
    item.querySelector('.admin-justification-form').classList.add('hidden');
    item.querySelector('.admin-justification-input').value = ''; // Limpa o texto
    item.querySelector('.admin-request-main').classList.remove('hidden'); // Mostra a linha principal
}

// SUBSTITUA a função handleAdminReject por esta:
function handleAdminReject(e) {
    const item = e.target.closest('.admin-request-card'); // <-- CORREÇÃO (Req 1)
    const token = item.dataset.token;
    const justification = item.querySelector('.admin-justification-input').value;
    
    if (!justification) {
        alert("Por favor, insira uma justificativa.");
        return;
    }
    
    e.target.disabled = true;

    fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, justification: justification })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'sucesso') {
            // --- CORREÇÃO (Req 2): Remove o item em vez de esmaecer ---
            item.remove();
            
            // Verifica se a lista ficou vazia
            if (adminListContainer.children.length === 0) {
                 adminListContainer.innerHTML = '<p class="no-requests">Nenhuma solicitação pendente.</p>';
            }
        } else {
            alert(data.mensagem);
            e.target.disabled = false;
        }
    });
}

    // Listener de fechamento do Modal de Admin
    adminCloseBtn.addEventListener('click', () => {
        // --- INÍCIO DA MODIFICAÇÃO (Limpar "Novos" não salvos) ---
        // Limpa os forms abertos (e remove itens "isNew")
        closeAllEditForms(adminUserListContainer);
        closeAllEditForms(adminDashboardsList);
        closeAllEditForms(adminAutomationsList);
        // --- FIM DA MODIFICAÇÃO ---

        adminOverlay.classList.remove('visible');
    });
    adminOverlay.addEventListener('mousedown', (e) => {
        if (e.target === adminOverlay) {
            // --- INÍCIO DA MODIFICAÇÃO (Limpar "Novos" não salvos) ---
            // Limpa os forms abertos (e remove itens "isNew")
            closeAllEditForms(adminUserListContainer);
            closeAllEditForms(adminDashboardsList);
            closeAllEditForms(adminAutomationsList);
            // --- FIM DA MODIFICAÇÃO ---
            
            adminOverlay.classList.remove('visible');
        }
    });  

// --- NOVA LÓGICA: ADMIN - GERENCIAR USUÁRIOS ---
    
    // Função para trocar as abas do modal de Admin
    function showAdminTab(tabName) {
        // Esconde todos os painéis
        adminRequestsTab.classList.add('hidden');
        adminUsersTab.classList.add('hidden');
        adminDashboardsTab.classList.add('hidden');
        adminAutomationsTab.classList.add('hidden');
        
        // Remove 'active' de todas as abas
        tabAdminRequests.classList.remove('active');
        tabAdminUsers.classList.remove('active');
        tabAdminDashboards.classList.remove('active');
        tabAdminAutomations.classList.remove('active');

        const searchContainer = document.getElementById('admin-search-container');
        const searchInput = document.getElementById('admin-search-input');
        
        // (Req 1) Referencia o novo botão de usuário
        const adminAddUserBtn = document.getElementById('admin-add-user-btn');

        // 1. Reseta os botões (move de volta para suas abas e esconde)
        if (adminAddDashboardBtn) {
            adminDashboardsTab.prepend(adminAddDashboardBtn);
            adminAddDashboardBtn.style.display = 'none';
        }
        if (adminAddAutomationBtn) {
            adminAutomationsTab.prepend(adminAddAutomationBtn);
            adminAddAutomationBtn.style.display = 'none';
        }
        // (Req 1) Reseta o botão de usuário
        if (adminAddUserBtn) {
            adminUsersTab.prepend(adminAddUserBtn);
            adminAddUserBtn.style.display = 'none';
            searchContainer.classList.remove('users-active'); // Remove a classe CSS
        }

        const searchableTabs = ['users', 'dashboards', 'automations'];
        
        if (searchContainer) { 
            if (searchableTabs.includes(tabName)) {
                searchContainer.classList.remove('hidden');
            } else {
                searchContainer.classList.add('hidden');
            }
        }
        
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Mostra a aba e painel corretos E move o botão correto
        if (tabName === 'requests') {
            tabAdminRequests.classList.add('active');
            adminRequestsTab.classList.remove('hidden');
        
        } else if (tabName === 'users') {
            tabAdminUsers.classList.add('active');
            adminUsersTab.classList.remove('hidden');
            
            // (Req 1) Move o botão de Usuário e adiciona classe
            if (adminAddUserBtn && searchContainer) {
                searchContainer.appendChild(adminAddUserBtn);
                adminAddUserBtn.style.display = 'block';
                searchContainer.classList.add('users-active'); // Adiciona classe CSS
            }

        } else if (tabName === 'dashboards') {
            tabAdminDashboards.classList.add('active');
            adminDashboardsTab.classList.remove('hidden');
            
            if (adminAddDashboardBtn && searchContainer) {
                searchContainer.appendChild(adminAddDashboardBtn);
                adminAddDashboardBtn.style.display = 'block';
            }

        } else if (tabName === 'automations') {
            tabAdminAutomations.classList.add('active');
            adminAutomationsTab.classList.remove('hidden');
            
            if (adminAddAutomationBtn && searchContainer) {
                searchContainer.appendChild(adminAddAutomationBtn);
                adminAddAutomationBtn.style.display = 'block';
            }
        }
        
        handleAdminSearch();
    }
    
    // Listeners das Abas de Admin
    tabAdminRequests.addEventListener('click', () => showAdminTab('requests'));
    tabAdminUsers.addEventListener('click', () => showAdminTab('users'));


    // Renderiza a lista de usuários gerenciáveis
    function renderAdminUsers() {
        adminUserListContainer.innerHTML = ''; // Limpa a lista
        
        // 1. Verifica a variável global (que será preenchida pelo openAdminModal)
        if (!globalCmsUsers || globalCmsUsers.length === 0) {
            adminUserListContainer.innerHTML = '<p class="no-requests">Nenhum usuário (além do admin) encontrado.</p>';
            return;
        }

        // 2. Chama o "helper" (renderAdminUserCard) para cada usuário na lista
        globalCmsUsers.forEach(user => {
            // false = não colocar no início (append)
            renderAdminUserCard(user, adminUserListContainer, false); 
        });
    }
    
    // (Req 1) NOVO: Helper para renderizar um card de usuário (novo ou existente)
    function renderAdminUserCard(user, container, prepend = false) {
        const item = document.createElement('div');
        item.className = 'admin-user-card';
        
        const isNew = user.isNew || false;
        if (isNew) {
            item.dataset.isNew = 'true';
            // Usamos um ID temporário para o caso de "Cancelar"
            item.dataset.tempId = user.username; 
        } else {
            item.dataset.username = user.username;
        }

        // Opções para os <select>
        const areaOptions = ['Logística', 'Comercial', 'Financeiro', 'Jurídico', 'Vendas']
            .map(a => `<option value="${a}" ${user.area === a ? 'selected' : ''}>${a}</option>`).join('');
        const roleOptions = ['Analista', 'Executor']
            .map(r => `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r}</option>`).join('');

        // (Req 1) Define o HTML baseado se é [NOVO] ou [EXISTENTE]
        let mainHtml, editHtml;

        if (isNew) {
            // Formulário de [NOVO] usuário
            mainHtml = `
                <div class="admin-user-main hidden">
                </div>
            `;
            editHtml = `
                <div class="admin-user-edit-form">
                    <div class="modal-input-group">
                        <label>Login de Funcionário:</label>
                        <input type="text" class="hub-modal-input edit-username-input" value="">
                    </div>
                    <div class="modal-input-group">
                        <label>Senha:</label>
                        <div class="password-toggle-wrapper">
                            <input type="password" class="hub-modal-input edit-password-input" value="">
                            <i class="fas fa-eye admin-password-toggle-btn" title="Mostrar/Ocultar Senha"></i>
                        </div>
                    </div>
                    <div class="scheduler-datetime-group" style="gap: 15px;">
                        <div class="modal-input-group">
                            <label>Área</label>
                            <select class="hub-modal-input edit-area-select">${areaOptions}</select>
                        </div>
                        <div class="modal-input-group">
                            <label>Função</label>
                            <select class="hub-modal-input edit-role-select">${roleOptions}</select>
                        </div>
                    </div>
                    <div class="admin-user-edit-actions">
                        <button class="button btn-cancel admin-user-cancel-btn">Cancelar</button>
                        <button class="button btn-success admin-user-savenew-btn">Salvar</button>
                    </div>
                </div>
            `;
        } else {
            // Formulário de [EDITAR] usuário existente
            
            // --- INÍCIO DA MODIFICAÇÃO (Req 1: Status e Botão de Bloqueio) ---
            // Verifica se está bloqueado (se a data existe E é no futuro)
            const isLocked = user.lockout_until && (new Date(user.lockout_until) > new Date());
            const statusHtml = isLocked ? '<span class="user-status-locked">(Bloqueado)</span>' : '';
            const unlockBtnHtml = isLocked ? '<button class="button btn-unlock admin-user-unlock-btn">Desbloquear</button>' : '';
            // --- FIM DA MODIFICAÇÃO ---
            
            mainHtml = `
                <div class="admin-user-main">
                    <div class="admin-user-info">
                        <div class="username">${user.username.toUpperCase()} ${statusHtml}</div>
                        <div class="details">
                            <strong>Área:</strong> ${user.area} | <strong>Função:</strong> ${user.role}
                        </div>
                    </div>
                    <div class="admin-user-actions">
                        <button class="button btn-warning admin-user-edit-btn">Editar</button>
                        <button class="button btn-danger admin-user-delete-btn">Excluir</button>
                        ${unlockBtnHtml}
                    </div>
                </div>
            `;

            editHtml = `
                <div class="admin-user-edit-form hidden">
                    <div class="modal-input-group">
                        <label>Senha:</label>
                        <div class="password-toggle-wrapper">
                            <input type="password" class="hub-modal-input edit-password-input" value="${user.password || ''}">
                            <i class="fas fa-eye admin-password-toggle-btn" title="Mostrar/Ocultar Senha"></i>
                        </div>
                    </div>
                    <div class="scheduler-datetime-group" style="gap: 15px;">
                        <div class="modal-input-group">
                            <label>Área</label>
                            <select class="hub-modal-input edit-area-select">${areaOptions}</select>
                        </div>
                        <div class="modal-input-group">
                            <label>Função</label>
                            <select class="hub-modal-input edit-role-select">${roleOptions}</select>
                        </div>
                    </div>
                    <div class="admin-user-edit-actions">
                        <button class="button btn-cancel admin-user-cancel-btn">Cancelar</button>
                        <button class="button btn-success admin-user-save-btn">Salvar</button>
                    </div>
                </div>
            `;
        }
        
        item.innerHTML = mainHtml + editHtml;

        if (prepend) {
            container.prepend(item);
        } else {
            container.appendChild(item);
        }

        // Adiciona listeners para os botões do card
        if (isNew) {
            item.querySelector('.admin-user-savenew-btn').addEventListener('click', handleAdminSaveNewUser);
        } else {
            item.querySelector('.admin-user-edit-btn').addEventListener('click', showUserEditForm);
            item.querySelector('.admin-user-delete-btn').addEventListener('click', handleAdminDeleteUser);
            item.querySelector('.admin-user-save-btn').addEventListener('click', handleAdminUpdateUser);
            
            // (Req 1) Adiciona listener para o botão de desbloquear
            const unlockBtn = item.querySelector('.admin-user-unlock-btn');
            if (unlockBtn) {
                unlockBtn.addEventListener('click', handleAdminUnlockUser);
            }
        }
        item.querySelector('.admin-user-cancel-btn').addEventListener('click', hideUserEditForm);
        item.querySelector('.admin-password-toggle-btn').addEventListener('click', handlePasswordToggle);
    }

    // (Req 1) NOVO: Handler para o botão "Salvar Novo"
    function handleAdminSaveNewUser(e) {
        const item = e.target.closest('.admin-user-card');
        const btn = e.target;
        
        const newUsername = item.querySelector('.edit-username-input').value.trim();
        const newPassword = item.querySelector('.edit-password-input').value;
        const newArea = item.querySelector('.edit-area-select').value;
        const newRole = item.querySelector('.edit-role-select').value;

        if (!newUsername || !newPassword) {
            alert("Login de funcionário e Senha são obrigatórios para criar um novo usuário.");
            return;
        }

        const payload = {
            username: newUsername,
            password: newPassword,
            area: newArea,
            role: newRole
        };

        btn.disabled = true;

        // Chama o NOVO endpoint de API que você precisará adicionar ao backend
        fetch('/api/admin/add-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                
                // --- INÍCIO DA MODIFICAÇÃO (Remover o "Novo" e Adicionar o "Salvo") ---
                
                // 1. Remove o card temporário (com isNew: true) da lista global
                globalCmsUsers = globalCmsUsers.filter(user => !user.isNew);

                // 2. Cria o objeto de usuário salvo
                const savedUser = {
                    username: newUsername,
                    // (Oculto na UI de edição, mas precisamos dele na global para o caso de o admin editar de novo)
                    password: newPassword, 
                    area: newArea,
                    role: newRole,
                    isNew: false 
                };
                
                // 3. Adiciona o usuário salvo ao topo da lista global
                globalCmsUsers.unshift(savedUser);
                
                // 4. Re-renderiza a lista inteira (agora correta)
                renderAdminUsers(); 
                
                // --- FIM DA MODIFICAÇÃO ---

            } else {
                alert(`Erro: ${data.mensagem || 'Falha ao criar usuário'}`);
                btn.disabled = false;
            }
        })
        .catch((err) => {
             alert('Erro de comunicação. O usuário não foi criado.');
             btn.disabled = false;
        });
    }

    // NOVO: Função para filtrar as listas do admin
    function handleAdminSearch() {
        const searchInput = document.getElementById('admin-search-input');
        // Se o input não existir (ex: modal fechado), não faz nada
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.toLowerCase();

        // 1. Descobre qual painel de aba está ativo
        let activePanel = null;
        if (!adminUsersTab.classList.contains('hidden')) {
            activePanel = adminUsersTab;
        } else if (!adminDashboardsTab.classList.contains('hidden')) {
            activePanel = adminDashboardsTab;
        } else if (!adminAutomationsTab.classList.contains('hidden')) {
            activePanel = adminAutomationsTab;
        }

        // Se nenhum painel pesquisável estiver ativo, não faz nada
        if (!activePanel) return;

        // 2. Encontra o contêiner da lista dentro do painel ativo
        const listContainer = activePanel.querySelector('#admin-user-list-container, #admin-dashboards-list, #admin-automations-list');
        if (!listContainer) return;

        const allCards = listContainer.querySelectorAll('.admin-user-card, .admin-cms-card');
        let itemsFound = 0;

        // 3. Itera sobre os cards e aplica o filtro
        allCards.forEach(card => {
            // Seleciona o elemento que contém o nome (usuário ou nome do CMS)
            const nameElement = card.querySelector('.username, .admin-cms-info .name');
            if (nameElement) {
                const name = nameElement.textContent.toLowerCase();
                if (name.includes(searchTerm)) {
                    card.style.display = 'flex'; // 'flex' é o padrão de display do card
                    itemsFound++;
                } else {
                    card.style.display = 'none';
                }
            }
        });

        // 4. Gerencia a mensagem de "Nenhum resultado"
        let noResultsMsg = listContainer.querySelector('.no-results-message');
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('p');
            noResultsMsg.className = 'no-requests no-results-message'; // Reutiliza o estilo
            noResultsMsg.style.display = 'none'; // Começa oculto
            listContainer.appendChild(noResultsMsg);
        }

        if (itemsFound === 0 && searchTerm !== '') {
            noResultsMsg.textContent = 'Nenhum item encontrado para "' + searchInput.value + '".';
            noResultsMsg.style.display = 'block';
        } else {
            noResultsMsg.style.display = 'none';
        }
    }

    // --- NOVA FUNÇÃO (Req 3): Alterna a visibilidade da senha ---
    function handlePasswordToggle(e) {
        const btn = e.target;
        const wrapper = btn.closest('.password-toggle-wrapper');
        const input = wrapper.querySelector('.edit-password-input');
        
        if (input.type === 'password') {
            input.type = 'text';
            btn.classList.remove('fa-eye');
            btn.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            btn.classList.remove('fa-eye-slash');
            btn.classList.add('fa-eye');
        }
    }

    function showUserEditForm(e) {
        const itemClicked = e.target.closest('.admin-user-card');
        
        // --- INÍCIO DA MODIFICAÇÃO (Req 1: Fechar "Adicionar") ---
        // Fecha outros cards abertos (incluindo o card "Adicionar")
        closeAllEditForms(adminUserListContainer);
        // --- FIM DA MODIFICAÇÃO ---
        
        // Abre o card clicado
        itemClicked.querySelector('.admin-user-main').classList.add('hidden');
        itemClicked.querySelector('.admin-user-edit-form').classList.remove('hidden');
    }

    function hideUserEditForm(e) {
        const item = e.target.closest('.admin-user-card');

        // --- INÍCIO DA MODIFICAÇÃO (Req 1: Cancelar "Adicionar") ---
        if (item.dataset.isNew === 'true') {
            const tempId = item.dataset.tempId;
            globalCmsUsers = globalCmsUsers.filter(u => u.username !== tempId); // Remove da global
            item.remove(); // Remove o card
            
            if (adminUserListContainer.children.length === 0) {
                 adminUserListContainer.innerHTML = '<p class="no-requests">Nenhum usuário (além do admin) encontrado.</p>';
            }
            return;
        }
        // --- FIM DA MODIFICAÇÃO ---
        
        item.querySelector('.admin-user-main').classList.remove('hidden');
        item.querySelector('.admin-user-edit-form').classList.add('hidden');
        
        // Reseta o ícone e o tipo de input
        const input = item.querySelector('.edit-password-input');
        const icon = item.querySelector('.admin-password-toggle-btn');
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }

    function handleAdminUpdateUser(e) {
        const item = e.target.closest('.admin-user-card');
        const username = item.dataset.username;
        const btn = e.target;
        
        const payload = {
            username: username,
            password: item.querySelector('.edit-password-input').value, // Envia vazio ou preenchido
            area: item.querySelector('.edit-area-select').value,
            role: item.querySelector('.edit-role-select').value
        };

        btn.disabled = true;

        fetch('/api/admin/update-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                // Atualiza a UI localmente
                item.querySelector('.admin-user-info .details').innerHTML = `
                    <strong>Área:</strong> ${payload.area} | <strong>Função:</strong> ${payload.role}
                `;
                hideUserEditForm(e); // Volta para a tela de info
            } else {
                alert(`Erro: ${data.mensagem}`);
            }
        })
        .finally(() => {
            btn.disabled = false;
        });
    }

    function handleAdminUnlockUser(e) {
        const item = e.target.closest('.admin-user-card');
        const username = item.dataset.username;
        const btn = e.target;
        
        btn.disabled = true;
        btn.textContent = '...'; // Feedback visual

        fetch('/api/admin/unlock-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                // 1. Remove o status e o botão da UI
                const statusSpan = item.querySelector('.user-status-locked');
                if (statusSpan) statusSpan.remove();
                btn.remove(); // Remove o botão de desbloqueio
                
                // 2. Atualiza o estado global
                const userInGlobal = globalCmsUsers.find(u => u.username === username);
                if (userInGlobal) {
                    userInGlobal.lockout_until = null;
                }
            } else {
                alert(`Erro: ${data.mensagem || 'Falha ao desbloquear usuário'}`);
                btn.disabled = false;
                btn.textContent = 'Desbloquear'; // Restaura o texto
            }
        })
        .catch((err) => {
             alert('Erro de comunicação. O usuário não foi desbloqueado.');
             btn.disabled = false;
             btn.textContent = 'Desbloquear'; // Restaura o texto
        });
    }

    function handleAdminDeleteUser(e) {
        const item = e.target.closest('.admin-user-card');
        const username = item.dataset.username;
        
        // (Prevenção) Não deixa excluir o card de "novo usuário"
        if (item.dataset.isNew === 'true') {
            item.remove();
            return;
        }

        e.target.disabled = true;

        fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                item.remove(); // Remove o card da UI
                
                // --- INÍCIO DA MODIFICAÇÃO (Remover da Global) ---
                // Remove o usuário da lista local para evitar que ele reapareça
                globalCmsUsers = globalCmsUsers.filter(user => user.username !== username);
                // --- FIM DA MODIFICAÇÃO ---

                // Verifica se a lista (agora vazia no DOM) precisa da mensagem
                if (adminUserListContainer.children.length === 0) {
                    adminUserListContainer.innerHTML = '<p class="no-requests">Nenhum usuário (além do admin) encontrado.</p>';
                }
            } else {
                alert(`Erro: ${data.mensagem}`);
                e.target.disabled = false;
            }
        });
    }
    
    // Listeners das Abas
    tabAdminDashboards.addEventListener('click', () => showAdminTab('dashboards'));
    tabAdminAutomations.addEventListener('click', () => showAdminTab('automations'));

    // --- Gerenciamento de Automações ---
    
    function renderAdminAutomations() {
        adminAutomationsList.innerHTML = '';
        
        const keys = Object.keys(globalCmsAutomations);
        
        if (keys.length === 0) {
            adminAutomationsList.innerHTML = '<p class="no-requests">Nenhuma automação cadastrada.</p>';
            return;
        }

        keys.forEach((key, index) => {
            const auto = globalCmsAutomations[key];
            const item = document.createElement('div');
            item.className = 'admin-cms-card';
            item.dataset.key = key; // Usa a Chave (Nome) como ID

            const keyNameValue = auto.isNew ? '' : key;
            const upDisabled = (index === 0) ? 'disabled' : '';
            const downDisabled = (index === keys.length - 1) ? 'disabled' : '';

            item.innerHTML = `
                <div class="admin-cms-main">
                    <div class="admin-cms-info">
                        <div class="name">${key}</div>
                        <div class="details"><strong>Sistema:</strong> ${auto.type.toUpperCase()} | <strong>Macro:</strong> ${auto.macro || 'N/A'}</div>
                    </div>
                    <div class="admin-cms-actions">
                        
                        <div class="admin-reorder-controls">
                            <button class="button admin-move-btn admin-move-up-btn" title="Mover para Cima" ${upDisabled} data-key="${key}">
                                <i class="fas fa-arrow-up"></i>
                            </button>
                            <button class="button admin-move-btn admin-move-down-btn" title="Mover para Baixo" ${downDisabled} data-key="${key}">
                                <i class="fas fa-arrow-down"></i>
                            </button>
                        </div>

                        <button class="button btn-warning admin-auto-edit-btn">Editar</button>
                        <button class="button btn-danger admin-auto-delete-btn">Excluir</button>
                    </div>
                </div>
                <div class="admin-cms-edit-form hidden">
                    <div class="modal-input-group">
                        <label>Nome de Exibição:</label>
                        <input type="text" class="hub-modal-input edit-auto-name" value="${keyNameValue}">
                    </div>
                    <div class="modal-input-group">
                        <label>Tipo:</label>
                        <select class="hub-modal-input edit-auto-type">
                            <option value="sap" ${auto.type === 'sap' ? 'selected' : ''}>SAP</option>
                            <option value="bw" ${auto.type === 'bw' ? 'selected' : ''}>BW</option>
                        </select>
                    </div>
                    <div class="modal-input-group">
                        <label>Nome da Macro:</label>
                        <input type="text" class="hub-modal-input edit-auto-macro" value="${auto.macro || ''}">
                    </div>
                    <div class="modal-input-group">
                        <label>Caminho do Arquivo:</label>
                        <input type="text" class="hub-modal-input edit-auto-file" value="${auto.arquivo || ''}">
                    </div>
                    
                    <div class="modal-input-group">
                        <label>Caminho do Preview (Ex: /static/gifs/preview.gif):</label>
                        <input type="text" class="hub-modal-input edit-auto-gif" value="${auto.gif || ''}">
                    </div>
                    <div class="modal-input-group">
                        <label>Descrição do Preview:</label>
                        <textarea class="hub-modal-input edit-auto-text">${auto.text || ''}</textarea>
                    </div>
                    <div class="modal-input-group">
                        <label>Tags do Preview:</label>
                        <input type="text" class="hub-modal-input edit-auto-tags" value="${auto.tags || ''}">
                    </div>
                    <div class="modal-input-group">
                        <label>Largura do Preview:</label>
                        <input type="text" class="hub-modal-input edit-auto-width" value="${auto.width || ''}">
                    </div>
                    
                    <div class="admin-cms-edit-actions">
                        <button class="button btn-cancel admin-auto-cancel-btn">Cancelar</button>
                        <button class="button btn-success admin-auto-save-btn">Salvar</button>
                    </div>
                </div>
            `;
            adminAutomationsList.appendChild(item);
        });

        // Adiciona Listeners
        adminAutomationsList.querySelectorAll('.admin-move-up-btn').forEach(b => b.addEventListener('click', handleAutomationMove));
        adminAutomationsList.querySelectorAll('.admin-move-down-btn').forEach(b => b.addEventListener('click', handleAutomationMove));
        adminAutomationsList.querySelectorAll('.admin-auto-edit-btn').forEach(b => b.addEventListener('click', showCmsEditForm));
        adminAutomationsList.querySelectorAll('.admin-auto-cancel-btn').forEach(b => b.addEventListener('click', hideCmsEditForm));
        adminAutomationsList.querySelectorAll('.admin-auto-save-btn').forEach(b => b.addEventListener('click', handleAutomationSave));
        adminAutomationsList.querySelectorAll('.admin-auto-delete-btn').forEach(b => b.addEventListener('click', handleAutomationDelete));
    }

    // Botão Adicionar (Automação) - CORRIGIDO
    adminAddAutomationBtn.addEventListener('click', () => {
        // (Req 3: Evitar Auto-Save) - Fecha qualquer outro formulário
        closeAllEditForms(adminAutomationsList); 

        const newKey = `Nova Automação ${Date.now()}`; // Garante chave única
        
        // --- INÍCIO DA MODIFICAÇÃO (Req 1: Adicionar campos de preview) ---
        const newAutomation = {
            [newKey]: {
                arquivo: "", // Vazio
                macro: "", // Vazio
                type: "sap",
                isNew: true, // Flag para o "Cancelar"
                // Novos campos de preview
                gif: "",
                text: "",
                tags: "",
                width: null
            }
        };
        // --- FIM DA MODIFICAÇÃO ---

        // Coloca o novo item no início do objeto global
        globalCmsAutomations = { ...newAutomation, ...globalCmsAutomations };
        
        renderAdminAutomations();
        
        const newCard = adminAutomationsList.querySelector(`[data-key="${newKey}"]`);
        if (newCard) {
            newCard.querySelector('.admin-cms-main').classList.add('hidden');
            newCard.querySelector('.admin-cms-edit-form').classList.remove('hidden');
            adminAutomationsList.scrollTop = 0;
        }
    });

    function handleAutomationMove(e) {
        const btn = e.currentTarget;
        const keyToMove = btn.dataset.key;
        // -1 para "Cima", 1 para "Baixo"
        const direction = btn.classList.contains('admin-move-up-btn') ? -1 : 1; 

        let keys = Object.keys(globalCmsAutomations);
        const index = keys.indexOf(keyToMove);

        if (index === -1) return; // Chave não encontrada

        const newIndex = index + direction;

        // Verifica os limites (não deve mover o primeiro para cima, nem o último para baixo)
        if (newIndex < 0 || newIndex >= keys.length) {
            return;
        }

        // Realiza a troca no array de chaves
        [keys[index], keys[newIndex]] = [keys[newIndex], keys[index]];

        // Reconstrói o objeto global com a nova ordem
        const newGlobalCms = {};
        for (const key of keys) {
            newGlobalCms[key] = globalCmsAutomations[key];
        }
        globalCmsAutomations = newGlobalCms;

        // Salva a nova ordem no servidor e re-renderiza a lista
        saveCmsData('automations');
        renderAdminAutomations();
    }

    function handleAutomationSave(e) {
        const item = e.target.closest('.admin-cms-card');
        const oldKey = item.dataset.key;
        
        // --- INÍCIO DA MODIFICAÇÃO (Req 1: Check if new) ---
        // 1. Verifica se era um item "Novo" ANTES de modificar
        const wasNewItem = globalCmsAutomations[oldKey]?.isNew === true;
        // --- FIM DA MODIFICAÇÃO ---

        const form = item.querySelector('.admin-cms-edit-form');
        const newKey = form.querySelector('.edit-auto-name').value;
        const newType = form.querySelector('.edit-auto-type').value;
        const newMacro = form.querySelector('.edit-auto-macro').value;
        const newFile = form.querySelector('.edit-auto-file').value;
        
        const newGif = form.querySelector('.edit-auto-gif').value;
        const newText = form.querySelector('.edit-auto-text').value;
        const newTags = form.querySelector('.edit-auto-tags').value;
        const newWidth = form.querySelector('.edit-auto-width').value;

        if (!newKey) {
            alert("O Nome (Chave) é obrigatório.");
            return;
        }

        const newData = {
            type: newType,
            macro: newMacro || null,
            arquivo: newFile || null,
            gif: newGif || null,
            text: newText || null,
            tags: newTags || null,
            width: newWidth || null
            // A flag 'isNew' é omitida, removendo-a
        };

        // --- INÍCIO DA MODIFICAÇÃO (Req 1 & 2: Manter Ordem) ---

        // 2. Reconstrói o objeto global na ordem correta (em memória)
        const newGlobalCms = {};
        const currentKeys = Object.keys(globalCmsAutomations);

        if (wasNewItem) {
            // (Item NOVO) Adiciona o novo item salvo ao topo
            newGlobalCms[newKey] = newData;
            // Adiciona o restante, pulando a chave temporária ("Nova Automação...")
            currentKeys.forEach(key => {
                if (key !== oldKey) {
                    newGlobalCms[key] = globalCmsAutomations[key];
                }
            });

        } else {
            // (Item EDITADO) Reconstrói na mesma ordem, apenas substituindo a chave/dados
            currentKeys.forEach(key => {
                if (key === oldKey) {
                    // Se a chave mudou (ex: "Nome A" -> "Nome B"), usa a nova chave
                    newGlobalCms[newKey] = newData;
                } else {
                    // Senão, mantém o item antigo
                    newGlobalCms[key] = globalCmsAutomations[key];
                }
            });
        }
        
        // 3. Atualiza a memória global
        globalCmsAutomations = newGlobalCms;

        // 4. Salva a nova ordem (corrigida) no servidor e no sessionStorage
        saveCmsData('automations');
        
        // 5. Re-renderiza a lista (agora na ordem correta da memória)
        renderAdminAutomations();

        // 6. Se era um item NOVO, rola a lista para o topo
        if (wasNewItem) {
            adminAutomationsList.scrollTop = 0;
        }
        // --- FIM DA MODIFICAÇÃO ---
    }
    
    function handleAutomationDelete(e) {
        const item = e.target.closest('.admin-cms-card');
        const key = item.dataset.key;
        
        delete globalCmsAutomations[key];
        saveCmsData('automations');
        renderAdminAutomations();
    }


    // --- Gerenciamento de Dashboards ---
    
    function renderAdminDashboards() {
        adminDashboardsList.innerHTML = '';
        
        // (Req 1) Ordem Fixa
        const systemOrder = ['looker', 'tableau', 'library'];

        // (Req 1) Gera as <options> para o seletor de Sistema
        const systemOptionsHtml = systemOrder.map(sysKey => {
            if (!globalCmsDashboards[sysKey]) return '';
            return `<option value="${sysKey}">${globalCmsDashboards[sysKey].system_name}</option>`;
        }).join('');

        systemOrder.forEach(systemKey => {
            const systemData = globalCmsDashboards[systemKey];
            if (!systemData) return; 

            for (const [areaKey, areaData] of Object.entries(systemData.areas)) {
                areaData.items.forEach((item, index) => {
                    
                    // (Req 1) Gera as <options> de Área para este item específico
                    const areaOptionsHtml = Object.keys(systemData.areas).map(aKey => {
                        const selected = (aKey === areaKey) ? 'selected' : '';
                        return `<option value="${aKey}" ${selected}>${systemData.areas[aKey].name}</option>`;
                    }).join('');

                    // (Req 1) Atualiza o seletor de Sistema para este item
                    const itemSystemOptionsHtml = systemOrder.map(sysKey => {
                        if (!globalCmsDashboards[sysKey]) return '';
                        const selected = (sysKey === systemKey) ? 'selected' : '';
                        return `<option value="${sysKey}" ${selected}>${globalCmsDashboards[sysKey].system_name}</option>`;
                    }).join('');

                    const card = document.createElement('div');
                    card.className = 'admin-cms-card';
                    card.dataset.systemKey = systemKey;
                    card.dataset.areaKey = areaKey;
                    card.dataset.index = index; 

                    // --- INÍCIO DA MODIFICAÇÃO (Req 2) ---
                    card.innerHTML = `
                        <div class="admin-cms-main">
                            <div class="admin-cms-info">
                                <div class="name">${item.name}</div>
                                <div class="details">
                                    <strong>Plataforma:</strong> ${systemData.system_name} | <strong>Área:</strong> ${areaData.name}
                                </div>
                            </div>
                            <div class="admin-cms-actions">
                                <button class="button btn-warning admin-dash-edit-btn">Editar</button>
                                <button class="button btn-danger admin-dash-delete-btn">Excluir</button>
                            </div>
                        </div>
                        <div class="admin-cms-edit-form hidden">
                            
                            <div class="scheduler-datetime-group" style="gap: 15px;">
                                <div class="modal-input-group">
                                    <label>Plataforma:</label>
                                    <select class="hub-modal-input edit-dash-systemKey">${itemSystemOptionsHtml}</select>
                                </div>
                                <div class="modal-input-group">
                                    <label>Área:</label>
                                    <select class="hub-modal-input edit-dash-areaKey">${areaOptionsHtml}</select>
                                </div>
                            </div>

                            <div class="modal-input-group">
                                <label>ID:</label>
                                <input type="text" class="hub-modal-input edit-dash-id" value="${item.id}">
                            </div>
                            <div class="modal-input-group">
                                <label>Nome de Exibição:</label>
                                <input type="text" class="hub-modal-input edit-dash-name" value="${item.name}">
                            </div>
                            <div class="modal-input-group">
                                <label>URL:</label>
                                <input type="text" class="hub-modal-input edit-dash-url" value="${item.url}">
                            </div>
                            <div class="modal-input-group">
                                <label>Caminho do Preview (Ex: /static/gifs/preview.gif):</label>
                                <input type="text" class="hub-modal-input edit-dash-gif" value="${item.gif || ''}">
                            </div>
                            <div class="modal-input-group">
                                <label>Descrição do Preview:</label>
                                <textarea class="hub-modal-input edit-dash-text">${item.text || ''}</textarea>
                            </div>
                            <div class="modal-input-group">
                                <label>Tags do Preview:</label>
                                <input type="text" class="hub-modal-input edit-dash-tags" value="${item.tags || ''}">
                            </div>
                            
                            <div class="modal-input-group">
                                <label>Largura do Preview:</label>
                                <input type="text" class="hub-modal-input edit-dash-width" value="${item.width || ''}">
                            </div>
                            
                            <div class="admin-cms-edit-actions">
                                <button class="button btn-cancel admin-dash-cancel-btn">Cancelar</button>
                                <button class="button btn-success admin-dash-save-btn">Salvar</button>
                            </div>
                        </div>
                    `;
                    adminDashboardsList.appendChild(card);

                    // (Req 1) Adiciona o listener para atualizar as Áreas dinamicamente
                    const systemSelect = card.querySelector('.edit-dash-systemKey');
                    const areaSelect = card.querySelector('.edit-dash-areaKey');
                    systemSelect.addEventListener('change', () => updateAreaDropdown(systemSelect, areaSelect));
                });
            }
        }); 
        
        // Listeners (movidos para fora do loop)
        adminDashboardsList.querySelectorAll('.admin-dash-edit-btn').forEach(b => b.addEventListener('click', showCmsEditForm));
        adminDashboardsList.querySelectorAll('.admin-dash-cancel-btn').forEach(b => b.addEventListener('click', hideCmsEditForm));
        adminDashboardsList.querySelectorAll('.admin-dash-save-btn').forEach(b => b.addEventListener('click', handleDashboardSave));
        adminDashboardsList.querySelectorAll('.admin-dash-delete-btn').forEach(b => b.addEventListener('click', handleDashboardDelete));
    }
    
    // NOVO: Botão Adicionar Dashboard (Req 2)
    if (adminAddDashboardBtn) { 
        adminAddDashboardBtn.addEventListener('click', () => {
            
            // (Req 3: Evitar Auto-Save) - Fecha qualquer outro formulário
            closeAllEditForms(adminDashboardsList);

            const defaultSystemKey = 'looker';
            if (!globalCmsDashboards[defaultSystemKey] || !globalCmsDashboards[defaultSystemKey].areas) {
                alert("Erro: Sistema 'looker' não encontrado. Não é possível adicionar dashboard.");
                return;
            }
            const defaultAreaKey = Object.keys(globalCmsDashboards[defaultSystemKey].areas)[0];
            if (!defaultAreaKey) {
                alert("Erro: Sistema 'looker' não possui áreas. Não é possível adicionar dashboard.");
                return;
            }
            
            // (Req 1: Campos Vazios)
            const newItem = {
                id: "", // Vazio
                name: "", // Vazio
                url: "", // Vazio
                gif: "", // Vazio
                text: "", // Vazio
                tags: "", // Vazio
                width: null,
                isNew: true // Flag para o "Cancelar"
            };

            // Adiciona o novo item ao INÍCIO da área padrão
            globalCmsDashboards[defaultSystemKey].areas[defaultAreaKey].items.unshift(newItem);
            
            renderAdminDashboards();
            
            const newCard = adminDashboardsList.firstChild; 
            if (newCard) {
                newCard.querySelector('.admin-cms-main').classList.add('hidden');
                newCard.querySelector('.admin-cms-edit-form').classList.remove('hidden');
                
                // --- INÍCIO DA MODIFICAÇÃO (Rolar para o Topo) ---
                // Muda de 'center' para 'start'
                adminDashboardsList.scrollTop = 0;
                // --- FIM DA MODIFICAÇÃO ---
            }
        });
    } // <-- FECHA A VERIFICAÇÃO

    function handleDashboardSave(e) {
        const item = e.target.closest('.admin-cms-card');
        // Localização ANTIGA (de onde o item VEIO)
        const { systemKey: oldSystemKey, areaKey: oldAreaKey, index: oldIndex } = item.dataset;
        
        const form = item.querySelector('.admin-cms-edit-form');

        // --- INÍCIO DA MODIFICAÇÃO (Req 1) ---
        // Localização NOVA (para onde o item VAI)
        const newSystemKey = form.querySelector('.edit-dash-systemKey').value;
        const newAreaKey = form.querySelector('.edit-dash-areaKey').value;

        // Pega o item original (do local antigo)
        const dashboardItem = globalCmsDashboards[oldSystemKey].areas[oldAreaKey].items[oldIndex];
        
        // Atualiza o objeto com os dados do formulário
        dashboardItem.id = form.querySelector('.edit-dash-id').value;
        dashboardItem.name = form.querySelector('.edit-dash-name').value;
        dashboardItem.url = form.querySelector('.edit-dash-url').value;
        dashboardItem.gif = form.querySelector('.edit-dash-gif').value;
        dashboardItem.text = form.querySelector('.edit-dash-text').value;
        dashboardItem.tags = form.querySelector('.edit-dash-tags').value;
        dashboardItem.width = form.querySelector('.edit-dash-width').value || null;
        dashboardItem.isNew = false; // (Garante que a flag de "novo" seja removida)

        // (Req 1) Lógica de MOVER o item se o sistema ou área mudou
        if (oldSystemKey !== newSystemKey || oldAreaKey !== newAreaKey) {
            
            // 1. Verifica se a nova área existe (segurança)
            if (!globalCmsDashboards[newSystemKey] || !globalCmsDashboards[newSystemKey].areas[newAreaKey]) {
                alert(`Erro: A área '${newAreaKey}' não existe no sistema '${newSystemKey}'.`);
                return;
            }

            // 2. Remove do local antigo
            globalCmsDashboards[oldSystemKey].areas[oldAreaKey].items.splice(oldIndex, 1);
            // 3. Adiciona ao novo local (no final da lista)
            globalCmsDashboards[newSystemKey].areas[newAreaKey].items.push(dashboardItem);
        }
        // --- FIM DA MODIFICAÇÃO ---
        
        // Salva no servidor
        saveCmsData('dashboards');
        // Re-renderiza a UI inteira com a nova estrutura
        renderAdminDashboards();
    }
    
    function handleDashboardDelete(e) {
        const item = e.target.closest('.admin-cms-card');
        const { systemKey, areaKey, index } = item.dataset;
        const itemData = globalCmsDashboards[systemKey].areas[areaKey].items[index];
        
        // Remove o item do array
        globalCmsDashboards[systemKey].areas[areaKey].items.splice(index, 1);
        
        saveCmsData('dashboards');
        renderAdminDashboards();
    }


    // --- Funções Genéricas do CMS ---
    
    // NOVO: Fecha todos os formulários de edição abertos em um contêiner
    function closeAllEditForms(container) {
        if (!container) return;
        
        let itemRemoved = false; // Flag para ver se precisamos re-renderizar

        container.querySelectorAll('.admin-cms-card, .admin-user-card').forEach(card => {
            const editForm = card.querySelector('.admin-cms-edit-form') || card.querySelector('.admin-user-edit-form');
            const mainView = card.querySelector('.admin-cms-main') || card.querySelector('.admin-user-main');
            
            if (editForm && !editForm.classList.contains('hidden')) {
                
                // --- INÍCIO DA MODIFICAÇÃO (Req 1: Adicionar checagem de Usuário) ---
                const isNewUser = card.dataset.isNew === 'true';
                if (isNewUser) {
                    const tempId = card.dataset.tempId;
                    globalCmsUsers = globalCmsUsers.filter(u => u.username !== tempId); // Remove da global
                    itemRemoved = true; // Marca para re-renderizar
                    return; // Sai do loop deste card, pois ele será removido
                }
                // --- FIM DA MODIFICAÇÃO ---

                const autoKey = card.dataset.key;
                if (autoKey && globalCmsAutomations[autoKey]?.isNew) {
                    delete globalCmsAutomations[autoKey];
                    itemRemoved = true; 
                    return; 
                }

                const dashIndex = card.dataset.index;
                if (dashIndex) {
                    const { systemKey, areaKey } = card.dataset;
                    if (globalCmsDashboards[systemKey]?.areas[areaKey]?.items[dashIndex]?.isNew) {
                        globalCmsDashboards[systemKey].areas[areaKey].items.splice(dashIndex, 1);
                        itemRemoved = true; 
                        return; 
                    }
                }

                // Se não for um item novo, apenas esconde o form
                editForm.classList.add('hidden');
                if (mainView) mainView.classList.remove('hidden');
                
                // Reseta a senha se for um card de usuário
                const passInput = editForm.querySelector('.edit-password-input');
                if (passInput) passInput.type = 'password';
                const passIcon = editForm.querySelector('.admin-password-toggle-btn');
                if (passIcon) {
                    passIcon.classList.remove('fa-eye-slash');
                    passIcon.classList.add('fa-eye');
                }
            }
        });

        // Se removemos um item, re-renderiza a lista correta
        if (itemRemoved) {
            if (container.id === 'admin-automations-list') {
                renderAdminAutomations();
            } else if (container.id === 'admin-dashboards-list') {
                renderAdminDashboards();
            } else if (container.id === 'admin-user-list-container') {
                // (Req 1) Adiciona o re-render para usuários
                renderAdminUsers();
            }
        }
    }

    function showCmsEditForm(e) {
        const item = e.target.closest('.admin-cms-card');
        // REQ 3: Fecha outros forms abertos
        closeAllEditForms(item.parentElement); 
        
        item.querySelector('.admin-cms-main').classList.add('hidden');
        item.querySelector('.admin-cms-edit-form').classList.remove('hidden');
    }
    
    function hideCmsEditForm(e) {
        const item = e.target.closest('.admin-cms-card');

        // --- INÍCIO DA MODIFICAÇÃO (Req 3: Cancelar "Adicionar") ---
        const autoKey = item.dataset.key;
        if (autoKey && globalCmsAutomations[autoKey]?.isNew) {
            delete globalCmsAutomations[autoKey];
            renderAdminAutomations(); // Re-renderiza para remover
            return;
        }

        const dashIndex = item.dataset.index;
        if (dashIndex) {
            const { systemKey, areaKey } = item.dataset;
             if (globalCmsDashboards[systemKey]?.areas[areaKey]?.items[dashIndex]?.isNew) {
                globalCmsDashboards[systemKey].areas[areaKey].items.splice(dashIndex, 1);
                renderAdminDashboards(); // Re-renderiza para remover
                return;
            }
        }
        // --- FIM DA MODIFICAÇÃO ---

        // Comportamento normal (se não for um item novo)
        item.querySelector('.admin-cms-main').classList.remove('hidden');
        item.querySelector('.admin-cms-edit-form').classList.add('hidden');
    }
    
    // Função para salvar os dados globais no backend
    function saveCmsData(type, feedbackElement) {
        let endpoint = '';
        let payload = {};
        
        if (type === 'dashboards') {
            endpoint = '/api/admin/save-dashboards';

            // Reconstrói o payload na ordem correta para salvar o JSON
            payload = {
                "looker": globalCmsDashboards.looker,
                "tableau": globalCmsDashboards.tableau,
                "library": globalCmsDashboards.library
            };
            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined) {
                    delete payload[key];
                }
            });
            
            // --- INÍCIO DA MODIFICAÇÃO (Persistir Ordem) ---
            if (currentHubUser) { // Só salva se o usuário estiver logado
                try {
                    sessionStorage.setItem(`sortedDashboards_${currentHubUser}`, JSON.stringify(payload));
                } catch (e) {
                    console.error("Falha ao salvar dashboards no sessionStorage", e);
                }
            }
            // --- FIM DA MODIFICAÇÃO ---

        } else if (type === 'automations') {
            endpoint = '/api/admin/save-automations';
            
            // (Req 2: Forçar Ordem de Save)
            payload = {}; // Começa com um objeto vazio
            const automationKeys = Object.keys(globalCmsAutomations);
            automationKeys.forEach(key => {
                payload[key] = globalCmsAutomations[key];
            });
            
            // --- INÍCIO DA MODIFICAÇÃO (Persistir Ordem) ---
            if (currentHubUser) { // Só salva se o usuário estiver logado
                try {
                    sessionStorage.setItem(`sortedAutomations_${currentHubUser}`, JSON.stringify(payload));
                } catch (e) {
                    console.error("Falha ao salvar automações no sessionStorage", e);
                }
            }
            // --- FIM DA MODIFICAÇÃO ---

        } else {
            return;
        }
        
        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.status !== 'sucesso') {
                alert(`Falha ao salvar: ${data.mensagem}`);
            }
        })
        .catch(err => {
            alert(`Erro de rede ao salvar: ${err}`);
        });
    }

});
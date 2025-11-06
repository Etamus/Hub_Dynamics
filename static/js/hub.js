document.addEventListener('DOMContentLoaded', () => {
    
    // --- Seletores de Elementos ---
    const searchBar = document.getElementById('search-bar');
    const cards = document.querySelectorAll('.hub-card');
    const quickLinksSection = document.getElementById('quick-links-section');
    const quickLinksContainer = document.getElementById('quick-links-container');
    
    // --- Seletores do Header e Acesso ---
    const accessBtn = document.getElementById('access-btn');
    const profileImgThumb = document.getElementById('profile-img'); // Imagem no header
    const defaultProfileUrl = "/static/icones/default_profile.png"; // Imagem padrão
    const accessDropdown = document.getElementById('access-dropdown');
    
    let currentHubUser = null; 
    let currentProfileUrl = defaultProfileUrl; // URL da imagem atual
    let cropper = null; // Instância do Cropper.js
    let selectedFile = null; // Arquivo original selecionado
    let currentUploadExtension = null; // Extensão do arquivo original

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
    
    // Novo Modal de Perfil
    const profileOverlay = document.getElementById('profile-overlay');
    const profileCloseBtn = document.getElementById('profile-close-btn');
    const profilePreviewImg = document.getElementById('profile-preview-img');
    const profileUploadForm = document.getElementById('profile-upload-form');
    const profileFileInput = document.getElementById('profile-file-input');
    // const profileSaveBtn = document.getElementById('profile-save-btn'); // Botão 'Salvar Perfil'
    const profileRemoveBtn = document.getElementById('profile-remove-btn'); // NOVO: Botão de Remover
    const profileUsernameDisplay = document.querySelector('.profile-username-display');
    const profileUploadStatus = document.getElementById('profile-upload-status');
    
    // Novo Modal de Recorte
    const cropperOverlay = document.getElementById('cropper-overlay');
    const cropperCloseBtn = document.getElementById('cropper-close-btn');
    const cropperImage = document.getElementById('cropper-image');
    const cropperSaveBtn = document.getElementById('cropper-save-btn');
    

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
        localStorage.removeItem('recentDashboards');
        renderQuickLinks();
    }
    
    const savedTheme = localStorage.getItem('hubTheme') || 'light';
    themeOptions.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === savedTheme);
    });

    applyCountSetting(localStorage.getItem('hubItemCount') || 4);

    // Listeners dos Modais de Configurações e Sobre
    settingsBtn.addEventListener('click', () => { settingsOverlay.classList.add('visible'); });
    settingsCloseBtn.addEventListener('click', () => { settingsOverlay.classList.remove('visible'); });
    settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) { settingsOverlay.classList.remove('visible'); } });
    themeOptions.forEach(option => { option.addEventListener('click', () => { applyTheme(option.dataset.theme); }); });
    aboutBtn.addEventListener('click', () => { aboutOverlay.classList.add('visible'); });
    aboutCloseBtn.addEventListener('click', () => { aboutOverlay.classList.remove('visible'); });
    aboutOverlay.addEventListener('click', (e) => { if (e.target === aboutOverlay) { aboutOverlay.classList.remove('visible'); } });
    countOptions.forEach(option => { option.addEventListener('click', () => { applyCountSetting(option.dataset.count); }); });
    clearRecentsBtn.addEventListener('click', clearRecents);
    
    
    // --- 2. LÓGICA DE ACESSO RÁPIDO (COM PINS) ---

    function getRecents() { return JSON.parse(localStorage.getItem('recentDashboards')) || []; }
    function getPinned() { return JSON.parse(localStorage.getItem('pinnedDashboards')) || []; }
    function savePinned(pinned) { localStorage.setItem('pinnedDashboards', JSON.stringify(pinned)); }
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

    // --- 3. LÓGICA DA BARRA DE PESQUISA ---
    
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
    // ===== 4. LÓGICA (ACESSO, LOGIN HUB, PERFIL) ATUALIZADA =====
    // ========================================================

    /**
     * ATUALIZADO: Atualiza a UI do dropdown, a IMAGEM do botão e a largura mínima.
     */
    function updateAccessDropdown(username = null, profileImageUrl = null) {
        currentHubUser = username;
        accessDropdown.innerHTML = '';
        
        // 1. ATUALIZA A IMAGEM E LARGURA DO DROPDOWN
        currentProfileUrl = profileImageUrl || defaultProfileUrl;
        profileImgThumb.src = currentProfileUrl;
        
        if (username) {
            accessDropdown.style.minWidth = '200px';
        } else {
            accessDropdown.style.minWidth = '130px';
        }

        // 2. PREENCHE O DROPDOWN
        if (username) {
            accessDropdown.innerHTML = `
                <div class="access-dropdown-header">
                    <strong>${username}</strong>
                    <span>Logado</span>
                </div>
                <button class="access-dropdown-item" id="access-profile-btn">
                    <i class="fas fa-camera"></i>Perfil
                </button>
                <button class="access-dropdown-item" id="access-connections-btn">
                    <i class="fas fa-plug"></i>Minhas Conexões
                </button>
                <button class="access-dropdown-item danger" id="access-logout-btn">
                    <i class="fas fa-sign-out-alt"></i>Deslogar
                </button>
            `;
            // Adiciona listeners
            document.getElementById('access-profile-btn').addEventListener('click', () => openProfileModal(username, currentProfileUrl));
            document.getElementById('access-connections-btn').addEventListener('click', openConnectionsModal);
            document.getElementById('access-logout-btn').addEventListener('click', handleHubLogout);
            
        } else {
            accessDropdown.innerHTML = `
                <button class="access-dropdown-item" id="access-login-btn">
                    <i class="fas fa-sign-in-alt"></i>Logar
                </button>
            `;
            document.getElementById('access-login-btn').addEventListener('click', openHubLoginModal);
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
    cropperOverlay.addEventListener('click', (e) => {
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
            
            updateAccessDropdown(currentHubUser, data.url); 
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
    profileOverlay.addEventListener('click', (e) => {
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

            updateAccessDropdown(currentHubUser, data.default_url); 
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
                updateAccessDropdown(data.username, data.profile_image); 
                closeHubLoginModal();
                if (window.location.pathname.includes('/automacao')) { window.location.reload(); }
            } else { showHubLoginError(data.mensagem || "Erro desconhecido."); }
        })
        .catch(() => showHubLoginError("Erro de comunicação com o servidor."));
    }

    function handleHubLogout() {
        fetch('/api/hub/logout', { method: 'POST' })
        .then(() => {
            updateAccessDropdown(null); 
            profileImgThumb.src = defaultProfileUrl; // Garantir que a imagem volte ao default
            accessDropdown.classList.remove('visible');
            if (window.location.pathname.includes('/automacao')) { window.location.reload(); }
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

        connectionsListContainer.appendChild(
            createConnectionItem('sap', '/static/icones/saplong_logo.png', 'SAP', sapConn)
        );
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
    });

    hubLoginCloseBtn.addEventListener('click', closeHubLoginModal);
    hubLoginOverlay.addEventListener('click', (e) => { if (e.target === hubLoginOverlay) closeHubLoginModal(); });
    hubPassInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleHubLogin(); });
    hubLoginSubmitBtn.addEventListener('click', handleHubLogin);

    connectionsCloseBtn.addEventListener('click', closeConnectionsModal);
    connectionsOverlay.addEventListener('click', (e) => { if (e.target === connectionsOverlay) closeConnectionsModal(); });

    // --- Inicialização da Sessão ---
fetch('/api/hub/check-session')
.then(response => response.json())
.then(data => {
    // --- CORREÇÃO (Req. 1): Define a URL atual no carregamento ---
    currentProfileUrl = data.profile_image || defaultProfileUrl;
    
    if(data.status === 'logado') {
        updateAccessDropdown(data.username, data.profile_image); 
    } else {
        updateAccessDropdown(null, data.profile_image); // Envia a default_url
    }
});

});
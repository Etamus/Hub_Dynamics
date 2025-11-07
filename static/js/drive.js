document.addEventListener('DOMContentLoaded', () => {
    const fileList = document.getElementById('file-list');
    const breadcrumbs = document.getElementById('breadcrumbs');

    // Função principal para buscar e renderizar o conteúdo de uma pasta
    const fetchDirectory = async (path = '') => {
        try {
            const response = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
            if (!response.ok) {
                throw new Error('Falha ao carregar o diretório.');
            }
            const data = await response.json();
            render(data.path, data.content);
        } catch (error) {
            fileList.innerHTML = `<li class="file-item">${error.message}</li>`;
        }
    };

    // Função para renderizar os itens na tela
    const render = (currentPath, content) => {
        // Limpa a lista atual
        fileList.innerHTML = '';
        
        // Cria os breadcrumbs (navegação de caminho)
        renderBreadcrumbs(currentPath);

        // Adiciona um item para "voltar" se não estivermos na raiz
        if (currentPath) {
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('\\'));
            const upItem = document.createElement('li');
            upItem.className = 'file-item';
            upItem.innerHTML = `<i class="fas fa-arrow-up folder-icon"></i> <span>..</span>`;
            upItem.addEventListener('click', () => fetchDirectory(parentPath));
            fileList.appendChild(upItem);
        }

        // Renderiza as pastas e arquivos
        if (content.length === 0 && !currentPath) {
             fileList.innerHTML = `<li class="file-item">Nenhum item encontrado na pasta raiz.</li>`;
        } else {
            content.forEach(item => {
                const li = document.createElement('li');
                li.className = 'file-item';
                const itemPath = currentPath ? `${currentPath}\\${item.name}` : item.name;

                if (item.is_dir) {
                    li.innerHTML = `<i class="fas fa-folder folder-icon"></i> <span>${item.name}</span>`;
                    li.addEventListener('click', () => fetchDirectory(itemPath));
                } else {
                    li.innerHTML = `<i class="fas fa-file-alt file-icon"></i> <span>${item.name}</span>`;
                    li.addEventListener('click', () => {
                        // Inicia o download
                        window.location.href = `/api/download?path=${encodeURIComponent(itemPath)}`;
                    });
                }
                fileList.appendChild(li);
            });
        }
    };
    
    // Função para renderizar os breadcrumbs
    const renderBreadcrumbs = (path) => {
        breadcrumbs.innerHTML = '';
        const rootLink = document.createElement('a');
        rootLink.href = '#';
        rootLink.textContent = 'Raiz';
        rootLink.addEventListener('click', (e) => {
            e.preventDefault();
            fetchDirectory('');
        });
        breadcrumbs.appendChild(rootLink);

        if (path) {
            const parts = path.split('\\');
            let currentPath = '';
            parts.forEach((part, index) => {
                currentPath += (index > 0 ? '\\' : '') + part;
                const partLink = document.createElement('a');
                partLink.href = '#';
                partLink.textContent = part;
                const pathForLink = currentPath; // Captura o caminho atual
                partLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    fetchDirectory(pathForLink);
                });
                breadcrumbs.appendChild(document.createTextNode(' / '));
                breadcrumbs.appendChild(partLink);
            });
        }
    };

    // Carga inicial
    fetchDirectory('');
});

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
function formatFileSize(bytes) {
    if (bytes === 0 || !bytes) {
        return '—'; // Retorna um traço para 0 bytes ou nulo
    }
    if (bytes < 1024) {
        return bytes + ' B';
    }
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    // (bytes / 1024^i).toFixed(1)
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

// (Req 1) NOVO: Helper para formatar data
function formatModDate(isoString) {
    if (!isoString) {
        return '—';
    }
    try {
        // Converte de ISO (ex: 2025-11-10T14:14:52) para o formato local
        const date = new Date(isoString);
        // Retorna DD/MM/AAAA
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return '—';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const fileList = document.getElementById('file-list');
    const breadcrumbs = document.getElementById('breadcrumbs');
    const searchInput = document.getElementById('drive-search-input');

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
        
        // --- INÍCIO DA MODIFICAÇÃO (Req 1) ---
        // Limpa a busca ao carregar um novo diretório
        if (searchInput.value) {
            searchInput.value = '';
        }
        // --- FIM DA MODIFICAÇÃO ---

        // Cria os breadcrumbs (navegação de caminho)
        renderBreadcrumbs(currentPath);

        // Adiciona um item para "voltar" se não estivermos na raiz
        if (currentPath) {
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('\\'));
            const upItem = document.createElement('li');
            upItem.className = 'file-item';
            
            // Adiciona spans vazios para manter o alinhamento com os cabeçalhos
            upItem.innerHTML = `
                <i class="fas fa-arrow-up folder-icon"></i> 
                <span class="file-name">..</span>
                <span class="file-info mod-date"></span>
                <span class="file-info file-size"></span>
            `;

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

                // Formata os novos dados
                const modDateStr = formatModDate(item.mod_date);
                
                // --- INÍCIO DA MODIFICAÇÃO (Req 2) ---
                // Pastas não mostram tamanho (string vazia), arquivos sim
                const sizeStr = item.is_dir ? '' : formatFileSize(item.size); 
                // --- FIM DA MODIFICAÇÃO ---

                const iconClass = item.is_dir ? 'fas fa-folder folder-icon' : 'fas fa-file-alt file-icon';

                // Atualiza o innerHTML com os novos spans
                li.innerHTML = `
                    <i class="${iconClass}"></i>
                    <span class="file-name">${item.name}</span>
                    <span class="file-info mod-date">${modDateStr}</span>
                    <span class="file-info file-size">${sizeStr}</span>
                `;

                if (item.is_dir) {
                    li.addEventListener('click', () => fetchDirectory(itemPath));
                } else {
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

searchInput.addEventListener('keyup', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const allItems = fileList.querySelectorAll('.file-item');
        let itemsFound = 0;

        allItems.forEach(item => {
            const itemNameSpan = item.querySelector('.file-name');
            if (!itemNameSpan) return; 

            const itemName = itemNameSpan.textContent.toLowerCase();
            
            // ".." (Voltar) deve sempre aparecer
            if (itemName === '..') {
                item.style.display = 'flex';
                return;
            }

            if (itemName.includes(searchTerm)) {
                item.style.display = 'flex';
                itemsFound++;
            } else {
                item.style.display = 'none';
            }
        });

        // (Req 1) Gerencia a mensagem de "Nenhum resultado"
        let noResultsMsg = fileList.querySelector('.no-results-message');
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('li');
            noResultsMsg.className = 'file-item no-results-message'; // Reusa a classe
            noResultsMsg.style.display = 'none'; 
            noResultsMsg.style.justifyContent = 'center'; 
            noResultsMsg.style.fontStyle = 'italic';
            noResultsMsg.style.cursor = 'default';
            fileList.appendChild(noResultsMsg);
        }

        if (itemsFound === 0 && searchTerm !== '') {
            noResultsMsg.textContent = 'Nenhum item encontrado.';
            noResultsMsg.style.display = 'flex';
        } else {
            noResultsMsg.style.display = 'none';
        }
    });

    // Carga inicial
    fetchDirectory('');
});

    const pageKey = window.location.pathname.replace('/', '').split('?')[0]; // Extrai "automacao", "dashboards", ou "drive"
    const currentTab = document.querySelector(`.main-nav-tabs .nav-tab[data-page="${pageKey}"]`);
    if (currentTab) {
        currentTab.classList.add('active');
    }
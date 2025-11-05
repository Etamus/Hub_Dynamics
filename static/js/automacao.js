document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis de Estado ---
    let isSapLoggedIn = false;
    let isBwLoggedIn = false;
    let currentTaskInfo = null;
    let statusTimeout;
    
    // --- NOVO: Variáveis do Agendador ---
    let jobQueue = []; 
    let jobHistory = []; // <-- NOVO: Histórico de jobs (máx. 4)
    let schedulerInterval = null; 
    let isSchedulerRunning = false; 

    // --- Seletores dos Elementos ---
    const statusBox = document.getElementById('status');
    const systemRadios = document.querySelectorAll('input[name="login_system"]');
    const sapTasksSection = document.getElementById('sap-tasks-section');
    const bwTasksSection = document.getElementById('bw-tasks-section');
    const allTaskButtons = document.querySelectorAll('.task-button');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Seletores do Modal de Login ---
    const modalOverlay = document.getElementById('login-modal-overlay');
    const modalUser = document.getElementById('modal-user');
    const modalPass = document.getElementById('modal-pass');
    const modalExecuteBtn = document.getElementById('modal-execute-btn');
    const modalLoginCloseBtn = document.getElementById('login-modal-close-btn'); // 'X'
    const modalLogoSap = document.getElementById('modal-logo-sap');
    const modalLogoBw = document.getElementById('modal-logo-bw');

    // --- Seletores do Modal de Confirmação ---
    const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
    const confirmModalCloseBtn = document.getElementById('confirm-modal-close-btn');
    const confirmModalYesBtn = document.getElementById('confirm-modal-yes-btn');
    const confirmModalNoBtn = document.getElementById('confirm-modal-no-btn');

    // --- NOVO: Seletor do Agendador ---
    const schedulerBtn = document.getElementById('scheduler-btn');
    
    // --- Funções de Feedback (Status Box) ---

    function showStatus(message, type = 'processing', sticky = false) {
        clearTimeout(statusTimeout);
        statusBox.className = `status-box ${type} visible`;
        statusBox.textContent = message;

        if (type === 'success' || type === 'error') {
            const delay = sticky ? 15000 : (type === 'success' ? 3000 : 5000);
            statusTimeout = setTimeout(() => {
                statusBox.classList.remove('visible');
            }, delay);
        }
    }

    function setProcessing(message, isSchedulerJob = false) {
        if (!isSchedulerJob) {
            allTaskButtons.forEach(btn => btn.classList.add('disabled'));
            if(modalExecuteBtn) modalExecuteBtn.disabled = true;
            if(modalLoginCloseBtn) modalLoginCloseBtn.disabled = true; 
            if(logoutBtn) logoutBtn.disabled = true;
            if(schedulerBtn) schedulerBtn.disabled = true;
        }
        
        showStatus(message, 'processing');
    }
    
    function enableUI() {
        allTaskButtons.forEach(btn => btn.classList.remove('disabled'));
        if (modalExecuteBtn) modalExecuteBtn.disabled = false;
        if (modalLoginCloseBtn) modalLoginCloseBtn.disabled = false; 
        if (logoutBtn) logoutBtn.disabled = false;
        if(schedulerBtn) schedulerBtn.disabled = false;
    }

    function handleFetchError(error, isSchedulerJob = false) {
        if (!isSchedulerJob) {
            enableUI();
        }
        showStatus('Erro de comunicação com o servidor.', 'error', true);
        console.error('Erro de Fetch:', error);
        
        // --- MODIFICADO: Atualiza a fila do agendador ---
        if (isSchedulerJob) {
            const job = jobQueue.find(j => j.status === 'running');
            if (job) {
                job.status = 'failed';
                // Move para o histórico
                jobHistory.unshift(job);
                jobHistory = jobHistory.slice(0, 4); // Mantém apenas 4
                jobQueue = jobQueue.filter(j => j.id !== job.id); // Remove da fila
                renderJobQueue();
                renderJobHistory();
            }
            isSchedulerRunning = false; // Libera o motor
        }
    }
    
    // Processa o resultado de uma TAREFA
    function handleTaskResult(data, isSchedulerJob = false) {
        if (!isSchedulerJob) {
            enableUI();
        }
        
        if (data.status === 'sucesso') {
            showStatus(data.mensagem, 'success');
            
            if (data.download_file && currentTaskInfo && currentTaskInfo.name === "Base Mãe") {
                const downloadLink = document.querySelector('.task-button-download');
                if (downloadLink) {
                    downloadLink.href = '/download/' + data.download_file;
                    downloadLink.classList.remove('inactive');
                    downloadLink.title = `Baixar ${data.download_file}`;
                    showStatus("Sucesso! O download do relatório iniciará em 3 segundos...", 'success', true);
                    setTimeout(() => {
                        window.location.href = downloadLink.href;
                    }, 3000);
                }
            }
        } else {
            showStatus('ERRO: ' + data.mensagem, 'error', true);
        }
        
        // --- MODIFICADO: Atualiza a fila do agendador ---
        if (isSchedulerJob) {
            const job = jobQueue.find(j => j.status === 'running');
            if (job) {
                job.status = (data.status === 'sucesso') ? 'done' : 'failed';
                // Move para o histórico
                jobHistory.unshift(job);
                jobHistory = jobHistory.slice(0, 4); // Mantém apenas 4
                jobQueue = jobQueue.filter(j => j.id !== job.id); // Remove da fila
                renderJobQueue();
                renderJobHistory();
            }
            isSchedulerRunning = false; // Libera o motor
        }
    }

    // --- Funções do Modal de Login ---

    function openLoginModal(taskInfo) {
        currentTaskInfo = taskInfo; 
        
        if (taskInfo.type === 'sap') {
            modalLogoSap.classList.remove('hidden');
            modalLogoBw.classList.add('hidden');
        } else if (taskInfo.type === 'bw') {
            modalLogoSap.classList.add('hidden');
            modalLogoBw.classList.remove('hidden');
        }
        
        modalUser.value = '';
        modalPass.value = '';
        modalOverlay.classList.add('visible');
        modalUser.focus();
    }

    function closeLoginModal() {
        modalOverlay.classList.remove('visible');
    }

    function handleLogin() {
        const user = modalUser.value;
        const pass = modalPass.value;

        if (!user || !pass) {
            alert('Por favor, preencha o usuário e a senha.');
            return;
        }

        const formData = new URLSearchParams();
        formData.append('usuario', user);
        formData.append('senha', pass);

        let endpoint = '';
        let systemType = currentTaskInfo.type;

        if (systemType === 'sap') {
            endpoint = '/login-sap';
            setProcessing("Realizando login no SAP...");
        } else if (systemType === 'bw') {
            endpoint = '/login-bw-hana';
            setProcessing("Realizando login no BW HANA...");
        }

        fetch(endpoint, { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                enableUI();
                if (data.status === 'sucesso') {
                    showStatus(data.mensagem, 'success');
                    closeLoginModal();
                    
                    if (systemType === 'sap') {
                        isSapLoggedIn = true;
                        isBwLoggedIn = false;
                    } else {
                        isSapLoggedIn = false;
                        isBwLoggedIn = true;
                    }
                    updateUiState();
                    
                } else {
                    showStatus('ERRO: ' + data.mensagem, 'error', true);
                }
            })
            .catch(handleFetchError);
    }

    // --- Funções do Modal de Confirmação ---
            
    function openConfirmModal(onConfirm, onCancel) {
        confirmModalOverlay.classList.add('visible');
        
        confirmModalYesBtn.replaceWith(confirmModalYesBtn.cloneNode(true));
        confirmModalNoBtn.replaceWith(confirmModalNoBtn.cloneNode(true));
        
        const newYesBtn = document.getElementById('confirm-modal-yes-btn');
        const newNoBtn = document.getElementById('confirm-modal-no-btn');
        
        newYesBtn.addEventListener('click', () => {
            onConfirm();
            closeConfirmModal();
        });
        newNoBtn.addEventListener('click', () => {
            onCancel();
            closeConfirmModal();
        });
        
        if (confirmModalCloseBtn) {
            confirmModalCloseBtn.replaceWith(confirmModalCloseBtn.cloneNode(true));
            const newCloseBtn = document.getElementById('confirm-modal-close-btn');
            newCloseBtn.addEventListener('click', () => {
                onCancel();
                closeConfirmModal();
            });
        }
    }

    function closeConfirmModal() {
        confirmModalOverlay.classList.remove('visible');
    }

    // --- Funções de Execução de Tarefa ---
    
    function executeTask(taskInfo, isSchedulerJob = false) {
        currentTaskInfo = taskInfo; 
        
        if (taskInfo.type === 'sap') {
            setProcessing(`Executando '${taskInfo.name}'...`, isSchedulerJob);
            const formData = new URLSearchParams();
            formData.append('macro', taskInfo.name);
            fetch('/executar-macro', { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => handleTaskResult(data, isSchedulerJob))
                .catch(error => handleFetchError(error, isSchedulerJob));

        } else if (taskInfo.type === 'bw') {
            setProcessing('Executando extração BW HANA...', isSchedulerJob);
            fetch('/executar-bw-hana', { method: 'POST' })
                .then(response => response.json())
                .then(data => handleTaskResult(data, isSchedulerJob))
                .catch(error => handleFetchError(error, isSchedulerJob));
        }
    }
    
    // --- Funções de UI (Seleção de Sistema e Logout) ---

    function handleLogout() {
        let endpoint = '';
        if (isSapLoggedIn) {
            endpoint = '/logout-sap';
            setProcessing("Realizando logout do SAP...");
        } else if (isBwLoggedIn) {
            endpoint = '/logout-bw-hana';
            setProcessing("Realizando logout do BW...");
        }

        fetch(endpoint, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                enableUI();
                showStatus(data.mensagem, 'success');
                isSapLoggedIn = false;
                isBwLoggedIn = false;
                updateUiState();
            })
            .catch(handleFetchError);
    }

    function updateUiState() {
        if (isSapLoggedIn || isBwLoggedIn) {
            logoutBtn.classList.remove('hidden');
        } else {
            logoutBtn.classList.add('hidden');
        }
        
        if (isSapLoggedIn) {
            document.querySelector('input[name="login_system"][value="sap"]').checked = true;
        } else if (isBwLoggedIn) {
            document.querySelector('input[name="login_system"][value="bw"]').checked = true;
        }
        
        handleSystemChange(true);
    }

    function handleSystemChange(isUpdate = false) {
        const selectedSystem = document.querySelector('input[name="login_system"]:checked').value;

        const showCorrectTasks = () => {
            const currentSystem = document.querySelector('input[name="login_system"]:checked').value;
            if (currentSystem === 'sap') {
                sapTasksSection.classList.remove('hidden');
                bwTasksSection.classList.add('hidden');
            } else {
                sapTasksSection.classList.add('hidden');
                bwTasksSection.classList.remove('hidden');
            }
        };

        if (!isUpdate) {
            const needsLogout = (selectedSystem === 'sap' && isBwLoggedIn) || (selectedSystem === 'bw' && isSapLoggedIn);
            
            if (needsLogout) {
                openConfirmModal(
                    () => {
                        handleLogout();
                    },
                    () => {
                        const loggedInSystem = isSapLoggedIn ? 'sap' : 'bw';
                        document.querySelector(`input[name="login_system"][value="${loggedInSystem}"]`).checked = true;
                    }
                );
            } else {
                showCorrectTasks();
            }
        } else {
            showCorrectTasks();
        }
    }
    
    // --- NOVO: Funções do Agendador (Redesign) ---

    // 1. Injeta o HTML do modal do agendador
    function injectSchedulerHTML() {
        const schedulerModal = document.createElement('div');
        schedulerModal.id = 'scheduler-modal-overlay';
        schedulerModal.className = 'modal-overlay'; 
        schedulerModal.innerHTML = `
            <div class="modal-content scheduler-modal">
                <button id="scheduler-close-btn" class="modal-close" title="Fechar">&times;</button>
                <div class="scheduler-header">
                    <h2><i class="fas fa-clock"></i> Agendador de Tarefas</h2>
                </div>
                <div class="scheduler-body">
                    <div class="scheduler-form">
                        <div class="modal-input-group">
                            <label for="scheduler-task-select">Tarefa:</label>
                            <select id="scheduler-task-select" aria-label="Selecionar tarefa para agendar">
                                <option value="" disabled selected hidden>Selecione uma tarefa...</option>
                            </select>
                        </div>
                        
                        <div class="scheduler-datetime-group">
                            <div class="modal-input-group">
                                <label for="scheduler-date">Data:</label>
                                <input type="date" id="scheduler-date" aria-label="Data para iniciar a tarefa">
                            </div>
                            <div class="modal-input-group">
                                <label for="scheduler-time">Hora:</label>
                                <input type="time" id="scheduler-time" aria-label="Hora para iniciar a tarefa">
                            </div>
                        </div>
                        
                        <div class="scheduler-button-container">
                            <button id="scheduler-add-btn" class="button btn-execute">Adicionar à Fila</button>
                        </div>
                    </div>
                    <div class="scheduler-queue">
                        <div class="scheduler-queue-tabs">
                            <span id="tab-queue" class="scheduler-tab active" data-tab="queue">Fila</span>
                            <span id="tab-history" class="scheduler-tab" data-tab="history">Histórico</span>
                        </div>
                        
                        <div id="queue-container" class="queue-list-container">
                            <ul id="scheduler-queue-list" aria-live="polite"></ul>
                        </div>
                        <div id="history-container" class="queue-list-container hidden">
                            <ul id="scheduler-history-list" aria-live="polite"></ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(schedulerModal);
    }
    
    // 2. Preenche o <select> com as tarefas (ÍCONES ATUALIZADOS)
    function populateSchedulerTasks() {
        const select = document.getElementById('scheduler-task-select');
        if (!select) return;
        
        select.innerHTML = '<option value="" disabled selected hidden>Selecione uma tarefa...</option>';
        
        const sapTasks = document.querySelectorAll('#sap-tasks-section .task-button');
        sapTasks.forEach(task => {
            const taskName = task.dataset.taskName;
            if (taskName) {
                const option = document.createElement('option');
                option.value = `sap|${taskName}`;
                option.textContent = taskName; // Como explicado, imagens não funcionam aqui
                select.appendChild(option);
            }
        });
        
        const bwTask = document.getElementById('bw-extract-btn');
        if (bwTask) {
            const option = document.createElement('option');
            option.value = 'bw|Relatório Peças';
            option.textContent = 'Relatório Peças'; // Como explicado, imagens não funcionam aqui
            select.appendChild(option);
        }
    }

    // --- FUNÇÃO DE RENDERIZAÇÃO GENÉRICA (para Fila e Histórico) ---
    function renderJobList(listElement, jobs, showRemoveButton) {
        listElement.innerHTML = '';
        
        if (jobs.length === 0) {
            const message = listElement.id.includes('history') ? 'Histórico não encontrado.' : 'A fila está vazia.';
            listElement.innerHTML = `<li class="queue-item empty">${message}</li>`;
            return;
        }
        
        const statusMap = {
            'pending': { icon: 'fa-hourglass-start', text: 'Pendente' },
            'running': { icon: 'fa-circle-notch fa-spin', text: 'Rodando' },
            'done': { icon: 'fa-check-circle', text: 'Concluído' },
            'failed': { icon: 'fa-times-circle', text: 'Falhou' }
        };
        
        jobs.forEach((job) => {
            const li = document.createElement('li');
            li.className = `queue-item ${job.status}`;
            
            const time = new Date(job.startTime).toLocaleString('pt-BR', { 
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
            });
            const statusInfo = statusMap[job.status] || { icon: 'fa-question-circle', text: 'Desconhecido' };
            
            const removeButtonHtml = showRemoveButton
                ? `<button class="queue-item-remove" data-job-id="${job.id}" title="Remover Tarefa" aria-label="Remover ${job.taskInfo.name} da fila">&times;</button>`
                : '';
            
            // --- AJUSTE AQUI: Troca 'bwhana_logo.png' por 'bwhanashort_logo.png' ---
            const iconPath = job.taskInfo.type === 'sap' 
                ? '/static/icones/sap_logo.png' 
                : '/static/icones/bwhanashort_logo.png'; // Caminho do novo ícone
            const taskIconHtml = `<img src="${iconPath}" class="queue-item-task-icon" alt="${job.taskInfo.type} logo">`;

            li.innerHTML = `
                <i class="fas ${statusInfo.icon} queue-item-icon" title="${statusInfo.text}"></i>
                <div class="queue-item-details">
                    <strong>${taskIconHtml}${job.taskInfo.name}</strong>
                    <em>${time}</em>
                </div>
                ${removeButtonHtml}
            `;
            listElement.appendChild(li);
        });
        
        if (showRemoveButton) {
            listElement.querySelectorAll('.queue-item-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    const jobId = btn.dataset.jobId;
                    jobQueue = jobQueue.filter(job => job.id !== jobId);
                    renderJobQueue();
                });
            });
        }
    }

    // 3. Renderiza a fila na UI (Design Moderno com Ícones)
    function renderJobQueue() {
        const list = document.getElementById('scheduler-queue-list');
        if (!list) return;
        renderJobList(list, jobQueue, true); // true = mostrar botão 'X'
    }
    
    // --- NOVA FUNÇÃO: Renderiza o Histórico ---
    function renderJobHistory() {
        const list = document.getElementById('scheduler-history-list');
        if (!list) return;
        renderJobList(list, jobHistory, false); // false = não mostrar botão 'X'
    }

    // 4. Adiciona uma tarefa à fila (LENDO DATA/HORA SEPARADOS)
    function addJobToQueue() {
        const select = document.getElementById('scheduler-task-select');
        const dateInput = document.getElementById('scheduler-date');
        const timeInput = document.getElementById('scheduler-time');
        
        const [type, name] = select.value.split('|');
        const dateValue = dateInput.value;
        const timeValue = timeInput.value;
        
        if (!type || !name) {
            alert('Por favor, selecione uma tarefa.');
            return;
        }

        if (!dateValue || !timeValue) {
            alert('Por favor, selecione data e hora.');
            return;
        }
        
        // Combina data e hora
        const startTime = new Date(`${dateValue}T${timeValue}`).getTime();
        
        const oneMinuteFromNow = Date.now() + 60000;
        
        if (isNaN(startTime) || startTime < oneMinuteFromNow) {
            alert('Por favor, selecione uma data e hora com pelo menos 1 minuto de antecedência.');
            return;
        }
        
        const newJob = {
            id: `job_${Date.now()}`,
            taskInfo: { name: name, type: type },
            startTime: startTime,
            status: 'pending' 
        };
        
        jobQueue.push(newJob);
        jobQueue.sort((a, b) => a.startTime - b.startTime);
        renderJobQueue();
        
        select.value = '';
        dateInput.value = '';
        timeInput.value = '';
        
        if (!schedulerInterval) {
            startSchedulerMotor();
        }
    }

    // 5. O "motor" que verifica a fila
    function startSchedulerMotor() {
        if (schedulerInterval) {
            clearInterval(schedulerInterval);
        }
        
        schedulerInterval = setInterval(() => {
            checkJobQueue();
        }, 5000); 
    }

    // 6. Lógica de verificação da fila
    function checkJobQueue() {
        if (isSchedulerRunning || jobQueue.length === 0) {
            return; 
        }
        
        const now = Date.now();
        const jobToRun = jobQueue.find(job => job.status === 'pending' && job.startTime <= now);
        
        if (jobToRun) {
            const needsSap = jobToRun.taskInfo.type === 'sap';
            const needsBw = jobToRun.taskInfo.type === 'bw';
            
            if ((needsSap && !isSapLoggedIn) || (needsBw && !isBwLoggedIn)) {
                jobToRun.status = 'failed';
                showStatus(`Agendador: '${jobToRun.taskInfo.name}' falhou. Motivo: Login necessário não estava ativo.`, 'error', true);
                
                // Move para o histórico
                jobHistory.unshift(jobToRun);
                jobHistory = jobHistory.slice(0, 4);
                jobQueue = jobQueue.filter(j => j.id !== jobToRun.id);
                
                renderJobQueue();
                renderJobHistory();
                return;
            }
            
            isSchedulerRunning = true;
            jobToRun.status = 'running';
            showStatus(`Agendador: Iniciando tarefa '${jobToRun.taskInfo.name}'...`, 'processing', true);
            renderJobQueue();

            executeTask(jobToRun.taskInfo, true); // 'true' = é um trabalho do agendador
        }
    }
    
    // 7. Abre o modal do agendador
    function openSchedulerModal() {
        const modal = document.getElementById('scheduler-modal-overlay');
        
        // --- NOVO: Lógica das Abas ---
        if (!modal) {
            injectSchedulerHTML();
            
            // Adiciona listeners aos novos elementos DEPOIS de injetar
            document.getElementById('scheduler-close-btn').addEventListener('click', closeSchedulerModal);
            document.getElementById('scheduler-add-btn').addEventListener('click', addJobToQueue);
            
            // Listeners das Abas
            const tabQueue = document.getElementById('tab-queue');
            const tabHistory = document.getElementById('tab-history');
            const queueContainer = document.getElementById('queue-container');
            const historyContainer = document.getElementById('history-container');

            tabQueue.addEventListener('click', () => {
                tabQueue.classList.add('active');
                tabHistory.classList.remove('active');
                queueContainer.classList.remove('hidden');
                historyContainer.classList.add('hidden');
            });
            
            tabHistory.addEventListener('click', () => {
                tabHistory.classList.add('active');
                tabQueue.classList.remove('active');
                historyContainer.classList.remove('hidden');
                queueContainer.classList.add('hidden');
            });
            
            // Define o estado inicial das abas
            tabQueue.click(); 
        }
        
        populateSchedulerTasks();
        renderJobQueue();
        renderJobHistory(); // Renderiza o histórico também
        document.getElementById('scheduler-modal-overlay').classList.add('visible');
        document.getElementById('scheduler-task-select').focus();
    }

    // 8. Fecha o modal do agendador
    function closeSchedulerModal() {
        document.getElementById('scheduler-modal-overlay').classList.remove('visible');
    }
    

    // --- Adiciona Listeners de Eventos ---

    // 1. Seleção de Sistema (Rádios)
    systemRadios.forEach(radio => {
        radio.addEventListener('change', () => handleSystemChange(false));
    });

    // 2. Botões de Tarefa (SAP e BW)
    allTaskButtons.forEach(button => {
        const taskName = button.getAttribute('data-task-name');
        const taskType = button.getAttribute('data-task-type');

        button.addEventListener('click', (e) => {
            if (button.classList.contains('disabled')) return;

            const info = {
                name: taskName || 'Relatório Peças',
                type: taskType
            };

            if ((info.type === 'sap' && isSapLoggedIn) || (info.type === 'bw' && isBwLoggedIn)) {
                executeTask(info, false); 
            } else {
                openLoginModal(info);
            }
        });
    });

    // 3. Botões do Modal de Login
    modalExecuteBtn.addEventListener('click', handleLogin);
    modalLoginCloseBtn.addEventListener('click', closeLoginModal);
    modalPass.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // 4. Botão de Logout
    logoutBtn.addEventListener('click', () => {
        openConfirmModal(
            () => handleLogout(), 
            () => {} 
        );
    });

    // 5. Download Icon Base Mãe
    const baseMaeDownload = document.querySelector('.task-button-download');
    if (baseMaeDownload) {
        baseMaeDownload.addEventListener('click', (e) => {
            e.stopPropagation(); 
            if (baseMaeDownload.classList.contains('inactive')) {
                e.preventDefault();
                alert('Arquivo para download não encontrado. Execute a automação primeiro.');
            }
        });
    }

    // 6. Listener do botão Agendador
    if (schedulerBtn) {
        schedulerBtn.addEventListener('click', openSchedulerModal);
    }

    // --- Estado Inicial ---
    handleSystemChange(true); 
    startSchedulerMotor(); 
});
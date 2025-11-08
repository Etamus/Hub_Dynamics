// --- 1. LÓGICA DE TEMA GLOBAL (DEFINIÇÃO) ---
// Esta função agora está no escopo global, acessível por outros scripts.
function applyGlobalTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('theme-dark');
    } else if (theme === 'light') {
        document.body.classList.remove('theme-dark');
    } else { // 'system'
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('theme-dark');
        } else {
            document.body.classList.remove('theme-dark');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    // Listener para mudança automática de tema do sistema (se o usuário selecionou 'system')
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        const currentTheme = localStorage.getItem('hubTheme') || 'system';
        if (currentTheme === 'system') {
            applyGlobalTheme('system');
        }
    });
    // --- FIM DA LÓGICA DE TEMA ---

    // --- ADICIONAR ESTE BLOCO: LÓGICA DE TELA CHEIA GLOBAL ---
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (fullscreenBtn) {
        const fullscreenIcon = fullscreenBtn.querySelector('i');

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Erro ao tentar entrar em tela cheia: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }

        // Listener para o clique no botão
        fullscreenBtn.addEventListener('click', toggleFullscreen);

        // Listener para atualizar o ícone (quando o usuário usa ESC, por exemplo)
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                // Estamos em tela cheia
                fullscreenIcon.classList.remove('fa-expand');
                fullscreenIcon.classList.add('fa-compress');
                fullscreenBtn.title = "Sair da Tela Cheia";
                fullscreenBtn.setAttribute('aria-label', "Sair da Tela Cheia");
            } else {
                // Não estamos em tela cheia
                fullscreenIcon.classList.remove('fa-compress');
                fullscreenIcon.classList.add('fa-expand');
                fullscreenBtn.title = "Tela Cheia";
                fullscreenBtn.setAttribute('aria-label', "Tela Cheia");
            }
        });
    }
    // --- FIM DA LÓGICA DE TELA CHEIA ---

    // --- 2. INJEÇÃO DINÂMICA DO HTML DO CHATBOT ---
    function injectChatbotHTML() {
        const chatbotContainer = document.createElement('div');
        chatbotContainer.id = 'chatbot-wrapper';
        
        chatbotContainer.innerHTML = `
            <div class="fab" id="feedback-fab" title="Feedback e Demandas">
                <i class="fas fa-comment-dots"></i>
            </div>
            <div class="chat-popup" id="feedback-popup">
                <div class="chat-header">
                    <h2 id="modal-title">Hub Assistant</h2>
                    <button class="close-button" id="modal-close-btn">&times;</button>
                </div>
                <div class="chat-messages" id="chat-messages"></div>
                <div class="iframe-container" id="iframe-container">
                    <iframe src="about:blank" frameborder="0"></iframe>
                </div>
                <div class="chat-input-area" id="chat-input-area">
                    <input type="text" id="chat-input" class="chat-input" placeholder="Digite o que precisa...">
                    <button class="send-button" id="send-btn"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;
        document.body.appendChild(chatbotContainer);
    }
    
    injectChatbotHTML();
    // --- FIM DA INJEÇÃO DO HTML ---


    // --- 3. LÓGICA DO CHATBOT (ATUALIZADA COM GEMINI) ---
    const fab = document.getElementById('feedback-fab');
    const popup = document.getElementById('feedback-popup');
    if (!fab || !popup) return;

    const closeBtn = document.getElementById('modal-close-btn');
    const chatMessages = document.getElementById('chat-messages');
    const iframeContainer = document.getElementById('iframe-container');
    const iframe = iframeContainer.querySelector('iframe');
    const modalTitle = document.getElementById('modal-title');
    const chatInputArea = document.getElementById('chat-input-area');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    const forms = {
        demanda: { title: "Solicitação de Demanda", url: "https://docs.google.com/forms/d/e/1FAIpQLSdBvCg6jU3XjXn-dFLfwRZU-fj80fMbAT1vv6J6hg9yUIH1Jg/viewform?embedded=true" },
        sugestao: { title: "Sugestões de Melhoria", url: "https://docs.google.com/forms/d/e/1FAIpQLScIp_mkk0kMZuJgjchiq5O2fHGTkPSjXYpsi4G5Xw2e297C6w/viewform?embedded=true" }
    };

    // NOVO: Função para converter Markdown básico (negrito) para HTML
    function parseMarkdown(text) {
        // Converte **negrito** para <strong>negrito</strong>
        // Adiciona .replace() para outras formatações se necessário (ex: *itálico*)
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    // (A variável 'keywords' foi removida, pois a IA decide)

    const addMessage = (text, type, containsHtml = false, extraClass = '') => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type} ${extraClass}`;
        if (containsHtml) {
            messageDiv.innerHTML = text;
        } else {
            messageDiv.textContent = text;
        }
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv; // Retorna o elemento criado
    };

    // Mostra o iframe do Google Forms
    const showForm = (formType) => {
        const formData = forms[formType];
        modalTitle.textContent = formData.title;
        iframe.src = formData.url;
        chatMessages.style.display = 'none';
        chatInputArea.style.display = 'none';
        iframeContainer.style.display = 'block';
    };

    // (A função 'presentFormOption' foi removida)
    
    // Reseta o chat ao fechar
    const resetChat = () => {
        popup.classList.remove('visible');
        setTimeout(() => {
            chatMessages.innerHTML = ''; // Limpa mensagens
            chatMessages.style.display = 'flex';
            chatInputArea.style.display = 'flex';
            chatInput.disabled = false;
            sendBtn.disabled = false;
            iframeContainer.style.display = 'none';
            iframe.src = 'about:blank';
            modalTitle.textContent = 'Hub Assistant';
        }, 300);
    };
    
    // Inicia a conversa
    const startConversation = () => {
        addMessage("Olá! Sou o Hub Assistant. Como posso ajudar?", 'bot-message');
    };

    const toggleChat = () => {
        const isVisible = popup.classList.contains('visible');
        if (isVisible) {
            resetChat();
        } else {
            popup.classList.add('visible');
            if (chatMessages.children.length === 0) {
                startConversation();
            }
        }
    };
    
    // Remove o indicador "Digitando..."
    function removeTypingIndicator() {
        const typingIndicator = chatMessages.querySelector('.bot-message.typing');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Processa a resposta do backend
    const processBackendResponse = (data) => {
        removeTypingIndicator();

        if (data.status === 'sucesso') {
            
            // 1. Renderiza a resposta de texto do Gemini
            const formattedText = parseMarkdown(data.text);
            addMessage(formattedText, 'bot-message', true); 
            
            // --- INÍCIO DA MODIFICAÇÃO (Req 1) ---
            
            // 2. Verifica se um formulário foi acionado
            if (data.form_trigger) {
                const formType = data.form_trigger; // "demanda" ou "sugestao"
                
                // 3. Pega o nome do botão (ex: "Solicitação de Demanda")
                const buttonText = forms[formType] ? forms[formType].title : "Abrir Formulário"; 

                // 4. Adiciona o botão no chat após um pequeno delay
                setTimeout(() => {
                    const buttonHtml = `<button class="chat-action-button" data-form-type="${formType}">${buttonText}</button>`;
                    
                    // Adiciona o botão em uma "bolha" separada
                    const buttonBubble = addMessage(buttonHtml, 'bot-message', true, 'button-bubble');
                    
                    // 5. Adiciona o listener de clique ao botão
                    const button = buttonBubble.querySelector('.chat-action-button');
                    if (button) {
                        button.addEventListener('click', () => {
                            // Desabilita o chat e mostra o formulário
                            chatInput.disabled = true;
                            sendBtn.disabled = true;
                            showForm(formType);
                        });
                    }
                }, 800); // 800ms de delay para o botão aparecer
            }
            // --- FIM DA MODIFICAÇÃO ---

        } else {
            addMessage(data.text || "Ocorreu um erro. Tente novamente.", 'bot-message', false, 'error');
        }
    };

    // Manipula o envio do usuário
    const handleUserInput = () => {
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        addMessage(userInput, 'user-reply');
        chatInput.value = '';
        chatInput.disabled = true;
        sendBtn.disabled = true;

        // Adiciona indicador "Digitando..."
        addMessage("Digitando...", 'bot-message', false, 'typing');

        // Envia para o backend (Gemini)
        fetch('/api/chatbot/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userInput })
        })
        .then(response => response.json())
        .then(data => {
            processBackendResponse(data);
        })
        .catch(err => {
            console.error("Erro no fetch do chatbot:", err);
            removeTypingIndicator();
            addMessage("Não foi possível conectar ao assistente. Verifique sua conexão.", 'bot-message', false, 'error');
        })
        .finally(() => {
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();
        });
    };

    // Listeners (sem alteração)
    fab.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', resetChat);
    sendBtn.addEventListener('click', handleUserInput);
    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleUserInput();
        }
    });
});
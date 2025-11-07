import subprocess
import os
import sys
# NOVAS IMPORTAÇÕES
import json
from flask import (
    Flask, render_template, request, jsonify, send_from_directory,
    session, redirect, url_for
)
from werkzeug.utils import secure_filename
import time # Adicionado para evitar cache de imagem
import secrets  # <-- ADICIONE
import datetime # <-- ADICIONE
from datetime import timezone, timedelta # <-- ADICIONE timezone, timedelta

app = Flask(__name__)
# NOVO: Chave secreta para gerenciar sessões de usuário do Hub
app.secret_key = 'sua_chave_secreta_aqui_mude_isso'
BRASILIA_TZ = timezone(timedelta(hours=-3)) # <-- ADICIONE ESTA LINHA

# --- Variáveis de Estado Globais ---
is_sap_logged_in = False
is_bw_hana_logged_in = False
last_bw_creds = {}

# --- Caminhos e Configurações ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DRIVE_ROOT = os.path.join(BASE_DIR, "drive") 
USUARIOS_DB = os.path.join(BASE_DIR, "usuarios.json")
SCHEDULER_DB = os.path.join(BASE_DIR, "scheduler_db.json") # <-- ADICIONE ESTA LINHA
REQUESTS_DB = os.path.join(BASE_DIR, "requests_db.json") # <-- ADICIONE ESTA LINHA

# NOVO: Diretório para cache de imagens
CACHE_DIR = os.path.join(BASE_DIR, "cache")
os.makedirs(CACHE_DIR, exist_ok=True) # Garante que a pasta 'cache' exista

SCRIPT_RUNNER_SIMPLES = os.path.join(BASE_DIR, "runner.ps1")
SCRIPT_RUNNER_SAP_LOGIN = os.path.join(BASE_DIR, "sap_login_runner.ps1")
SCRIPT_CLEANUP = os.path.join(BASE_DIR, "cleanup_process.ps1")
SCRIPT_BW_HANA = os.path.join(BASE_DIR, "bw_hana_extractor.py")
DOWNLOAD_DIR = "C:\\Users\\Robo01\\Desktop\\Automacao_Final\\macros"

macros_disponiveis = {
    "Base Mãe": { "arquivo": "C:\\Users\\Robo01\\Desktop\\Automacao_Final\\macros\\Input diário PÇ's.xlsm", "macro": "Org_relatorio_diario" },
    "Outlook": { "arquivo": "C:\\Users\\Robo01\\Desktop\\Automacao_Final\\macros\\Outlook_Macro.xlsm", "macro": "EnviarEmails" },
    "Cancelamento Aging": { "arquivo": "C:\\Users\\Robo01\\Desktop\\Automacao_Final\\macros\\Criação Aging.xlsm", "macro": "cancelar_fora_prazo" }
}

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'} # REMOVIDO 'gif'

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- NOVAS FUNÇÕES: Gerenciamento de Usuários (Hub) ---

def load_users():
    """Carrega os usuários do arquivo JSON."""
    if not os.path.exists(USUARIOS_DB):
        return {}
    try:
        with open(USUARIOS_DB, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save_users(users_data):
    """Salva os usuários no arquivo JSON."""
    try:
        with open(USUARIOS_DB, 'w', encoding='utf-8') as f:
            json.dump(users_data, f, indent=2)
    except Exception as e:
        print(f"Erro ao salvar usuários: {e}")

def load_schedules():
    """Carrega todos os agendamentos do arquivo JSON."""
    if not os.path.exists(SCHEDULER_DB):
        return {}
    try:
        with open(SCHEDULER_DB, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save_schedules(schedules_data):
    """Salva todos os agendamentos no arquivo JSON."""
    try:
        with open(SCHEDULER_DB, 'w', encoding='utf-8') as f:
            json.dump(schedules_data, f, indent=2)
    except Exception as e:
        print(f"Erro ao salvar agendamentos: {e}")

def load_requests():
    """Carrega todos os pedidos de acesso do arquivo JSON."""
    if not os.path.exists(REQUESTS_DB):
        return {}
    try:
        with open(REQUESTS_DB, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save_requests(requests_data):
    """Salva todos os pedidos de acesso no arquivo JSON."""
    try:
        with open(REQUESTS_DB, 'w', encoding='utf-8') as f:
            json.dump(requests_data, f, indent=2)
    except Exception as e:
        print(f"Erro ao salvar pedidos de acesso: {e}")        

def get_user_profile_data():
    """Retorna dados de perfil necessários para renderização do Hub."""
    username = session.get('username')
    profile_data = {'username': username, 'profile_image': None}
    
    if username:
        users = load_users()
        user_data = users.get(username, {})
        
        # Obtém o nome do arquivo de imagem do usuário (se existir)
        image_filename = user_data.get('profile_image')
        
        if image_filename:
            # Adiciona um timestamp para evitar problemas de cache no navegador
            profile_data['profile_image'] = f'/cache/{image_filename}?t={int(time.time())}'
            
    return profile_data

# --- FIM DAS NOVAS FUNÇÕES ---

def find_file_by_prefix(directory, prefix):
    """Procura por um arquivo baseado no prefixo."""
    try:
        for filename in os.listdir(directory):
            if filename.startswith(prefix): 
                return filename
    except FileNotFoundError: 
        return None
    return None

# --- ROTAS DE PÁGINAS (MODIFICADAS) ---

@app.route('/')
def hub():
    profile_data = get_user_profile_data()
    return render_template('hub.html', **profile_data)

@app.route('/automacao')
def automacao():
    global is_sap_logged_in, is_bw_hana_logged_in, last_bw_creds
    is_sap_logged_in = False
    is_bw_hana_logged_in = False
    last_bw_creds = {}
    
    initial_zv62n_file = find_file_by_prefix(DOWNLOAD_DIR, "ZV62N")
    
    # Passa o status de login do Hub para o template
    return render_template(
        'automacao.html', 
        macros=macros_disponiveis, 
        initial_zv62n_file=initial_zv62n_file,
        is_hub_logged_in=session.get('username')
    )

@app.route('/dashboards')
def dashboards():
    return render_template('dashboards.html', is_hub_logged_in=session.get('username')) 

@app.route('/drive')
def drive():
    return render_template('drive.html', is_hub_logged_in=session.get('username')) 


# --- ROTAS DE API (DRIVE) ---
@app.route('/api/browse')
def api_browse():
    relative_path = request.args.get('path', '')
    safe_relative_path = os.path.normpath(relative_path).lstrip('.\\/')
    current_path = os.path.join(DRIVE_ROOT, safe_relative_path)
    
    if not os.path.abspath(current_path).startswith(os.path.abspath(DRIVE_ROOT)):
        return jsonify({"error": "Acesso negado."}), 403
        
    try:
        items = os.listdir(current_path)
        content = []
        for item in items:
            item_path = os.path.join(current_path, item)
            is_dir = os.path.isdir(item_path)
            content.append({"name": item, "is_dir": is_dir})
    
        content.sort(key=lambda x: (not x['is_dir'], x['name'].lower()))
        
        return jsonify({
            "path": safe_relative_path,
            "content": content
        })
    except FileNotFoundError:
        return jsonify({"error": "Pasta não encontrada."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/download')
def api_download():
    relative_path = request.args.get('path', '')
    safe_relative_path = os.path.normpath(relative_path).lstrip('.\\/')
    full_path = os.path.join(DRIVE_ROOT, safe_relative_path)
    
    if not os.path.abspath(full_path).startswith(os.path.abspath(DRIVE_ROOT)) or os.path.isdir(full_path):
        return "Acesso negado.", 403
        
    try:
        directory = os.path.dirname(full_path)
        filename = os.path.basename(full_path)
        return send_from_directory(directory, filename, as_attachment=True)
    except FileNotFoundError:
        return "Arquivo não encontrado.", 404

# --- NOVAS ROTAS DE API (PERFIL E CACHE) ---

@app.route('/api/profile/upload', methods=['POST'])
def profile_upload():
    username = session.get('username')
    if not username:
        return jsonify({"status": "erro", "mensagem": "Usuário não logado."}), 401
    
    if 'file' not in request.files:
        return jsonify({"status": "erro", "mensagem": "Nenhuma imagem selecionada."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "erro", "mensagem": "Nome de arquivo inválido."}), 400
    
    if file and allowed_file(file.filename):
        # Cria um nome seguro e único baseado no username
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        new_filename = f'{username}.{file_extension}'
        filepath = os.path.join(CACHE_DIR, new_filename)

        # 1. Salva o arquivo no disco
        file.save(filepath)

        # 2. Atualiza o JSON de usuários
        users = load_users()
        if username in users:
            # 3. Opcional: Remove a imagem antiga se a extensão for diferente
            old_filename = users[username].get('profile_image')
            if old_filename and old_filename != new_filename and os.path.exists(os.path.join(CACHE_DIR, old_filename)):
                 os.remove(os.path.join(CACHE_DIR, old_filename))
                 
            users[username]['profile_image'] = new_filename
            save_users(users)
            
            return jsonify({"status": "sucesso", "mensagem": "Imagem de perfil atualizada.", "url": f'/cache/{new_filename}?t={int(time.time())}'})
        
        return jsonify({"status": "erro", "mensagem": "Erro ao salvar perfil do usuário."}), 500
    
    return jsonify({"status": "erro", "mensagem": "Tipo de arquivo não permitido."}), 400

@app.route('/cache/<filename>')
def serve_cache(filename):
    """Serve arquivos da pasta 'cache'."""
    return send_from_directory(CACHE_DIR, filename)

# Em: servidor_unico.py (Adicione junto às rotas de API do Hub)

@app.route('/api/profile/remove-image', methods=['POST'])
def profile_remove_image():
    username = session.get('username')
    if not username:
        return jsonify({"status": "erro", "mensagem": "Usuário não logado."}), 401

    users = load_users()
    if username in users:
        old_filename = users[username].get('profile_image')
        
        # 1. Remove o arquivo do cache se ele existir
        if old_filename:
            filepath = os.path.join(CACHE_DIR, old_filename)
            if os.path.exists(filepath):
                os.remove(filepath)
        
        # 2. Remove a referência do JSON e salva
        users[username]['profile_image'] = None
        save_users(users)
        
        return jsonify({"status": "sucesso", "mensagem": "Imagem removida.", "default_url": "/static/icones/default_profile.png"})
    
    return jsonify({"status": "erro", "mensagem": "Usuário não encontrado."}), 404

# --- ROTAS DE API (HUB LOGIN & CONEXÕES) ---

@app.route('/api/hub/login', methods=['POST'])
def hub_login():
    """Login do usuário principal do Hub."""
    users = load_users()
    username = request.form['username']
    password = request.form['password']
    
    user_data = users.get(username)
    
    if user_data and user_data['password'] == password:
        session['username'] = username
        
        # Puxa a imagem do perfil para retornar na sessão
        image_filename = user_data.get('profile_image')
        
        # --- CORREÇÃO APLICADA AQUI ---
        image_url = f'/cache/{image_filename}?t={int(time.time())}' if image_filename else "/static/icones/default_profile.png"
        
        return jsonify({"status": "sucesso", "username": username, "profile_image": image_url})
    
    return jsonify({"status": "erro", "mensagem": "Usuário ou senha inválidos."}), 401

@app.route('/api/hub/logout', methods=['POST'])
def hub_logout():
    """Logout do usuário principal do Hub."""
    session.pop('username', None)
    return jsonify({"status": "sucesso"})

@app.route('/api/hub/check-session')
def check_session():
    """Verifica se há um usuário logado na sessão do Hub."""
    username = session.get('username')
    if username:
        # Puxa a imagem do perfil para retornar na sessão
        users = load_users()
        user_data = users.get(username, {})
        image_filename = user_data.get('profile_image')
        
        # --- CORREÇÃO APLICADA AQUI ---
        image_url = f'/cache/{image_filename}?t={int(time.time())}' if image_filename else "/static/icones/default_profile.png"
        
        return jsonify({"status": "logado", "username": username, "profile_image": image_url})
    
    # --- CORREÇÃO APLICADA AQUI ---
    return jsonify({"status": "deslogado", "profile_image": "/static/icones/default_profile.png"})

@app.route('/api/scheduler/load')
def scheduler_load():
    """Carrega a fila e o histórico do usuário logado."""
    username = session.get('username')
    if not username:
        # Se o usuário não estiver logado no Hub, retorna uma fila vazia
        return jsonify({"queue": [], "history": []})
        
    all_schedules = load_schedules()
    user_schedule = all_schedules.get(username, {"queue": [], "history": []})
    return jsonify(user_schedule)

@app.route('/api/scheduler/save', methods=['POST'])
def scheduler_save():
    """Salva a fila e o histórico do usuário logado."""
    username = session.get('username')
    if not username:
        return jsonify({"status": "erro", "mensagem": "Usuário não logado."}), 401
    
    data = request.json
    job_queue = data.get('queue', [])
    job_history = data.get('history', [])
    
    all_schedules = load_schedules()
    all_schedules[username] = {
        "queue": job_queue,
        "history": job_history
    }
    save_schedules(all_schedules)
    
    return jsonify({"status": "sucesso", "mensagem": "Agendamento salvo."})

@app.route('/api/hub/get-connections')
def get_connections():
    """Busca as conexões SAP/BW salvas para o usuário logado."""
    username = session.get('username')
    if not username:
        return jsonify({"status": "erro", "mensagem": "Usuário não logado."}), 401
        
    users = load_users()
    connections = users.get(username, {}).get('connections', {})
    return jsonify({"status": "sucesso", "connections": connections})

@app.route('/api/hub/remove-connection/<system>', methods=['POST'])
def remove_connection(system):
    """Remove uma conexão SAP ou BW salva."""
    username = session.get('username')
    if not username:
        return jsonify({"status": "erro", "mensagem": "Usuário não logado."}), 401
    
    if system not in ['sap', 'bw']:
        return jsonify({"status": "erro", "mensagem": "Sistema inválido."}), 400

    users = load_users()
    if username in users and system in users[username]['connections']:
        users[username]['connections'][system] = None
        save_users(users)
        return jsonify({"status": "sucesso", "mensagem": f"Conexão {system.upper()} removida."})
    
    return jsonify({"status": "erro", "mensagem": "Conexão não encontrada."}), 404

# --- NOVAS ROTAS DE API (REGISTRO DE USUÁRIO) ---

@app.route('/api/hub/register', methods=['POST'])
def hub_register():
    data = request.json
    username = data.get('username')
    area = data.get('area')
    role = data.get('role')

    if not username or not area or not role:
        return jsonify({"status": "erro", "mensagem": "Todos os campos são obrigatórios."}), 400

    users = load_users()
    if username in users:
        return jsonify({"status": "erro", "mensagem": "Este número de funcionário já está cadastrado."}), 400

    requests = load_requests()
    # Verifica se já existe um pedido pendente para este usuário
    if any(r['username'] == username and r['status'] == 'Aguardando Aprovação' for r in requests.values()):
        return jsonify({"status": "erro", "mensagem": "Você já possui uma solicitação pendente."}), 400

    token = secrets.token_hex(16)
    requests[token] = {
        "username": username,
        "area": area,
        "role": role,
        "status": "Aguardando Aprovação",
        "request_date": datetime.datetime.now(BRASILIA_TZ).isoformat(), # <-- CORREÇÃO DE FUSO
        "justification": None,
        "expiration_date": None
    }
    save_requests(requests)
    
    return jsonify({"status": "sucesso", "mensagem": "Solicitação enviada. Guarde seu token!", "token": token})

@app.route('/api/hub/consult', methods=['POST'])
def hub_consult():
    data = request.json
    token = data.get('token')
    if not token:
        return jsonify({"status": "erro", "mensagem": "Token é obrigatório."}), 400

    requests = load_requests()
    request_data = requests.get(token)

    if not request_data:
        return jsonify({"status": "erro", "mensagem": "Token inválido ou não encontrado."}), 404
        
    # Verifica se o token aprovado expirou
    if request_data['status'] == 'Aprovado':
        expiration_date = datetime.datetime.fromisoformat(request_data['expiration_date'])
        if datetime.datetime.utcnow() > expiration_date:
            request_data['status'] = 'Expirado'
            request_data['justification'] = 'O prazo de 7 dias para cadastro de senha expirou. Faça uma nova solicitação.'
            requests[token] = request_data
            save_requests(requests)
            
    return jsonify({"status": "sucesso", "request_data": request_data})

@app.route('/api/hub/complete-registration', methods=['POST'])
def hub_complete_registration():
    data = request.json
    token = data.get('token')
    password = data.get('password')

    if not token or not password:
        return jsonify({"status": "erro", "mensagem": "Token e senha são obrigatórios."}), 400

    requests = load_requests()
    request_data = requests.get(token)

    if not request_data or request_data['status'] != 'Aprovado':
        return jsonify({"status": "erro", "mensagem": "Token inválido, expirado ou não aprovado."}), 403
    
    # Verifica a expiração novamente
    expiration_date = datetime.datetime.fromisoformat(request_data['expiration_date'])
    if datetime.datetime.utcnow() > expiration_date:
        return jsonify({"status": "erro", "mensagem": "Este token expirou. Faça uma nova solicitação."}), 403

    # Adiciona o usuário ao DB principal
    users = load_users()
    username = request_data['username']
    
    if username in users:
         return jsonify({"status": "erro", "mensagem": "Este usuário já foi registrado. Tente fazer login."}), 400
         
    users[username] = {
        "password": password,
        "role": request_data['role'], # Adiciona a role
        "profile_image": None,
        "connections": {
            "sap": None,
            "bw": None
        }
    }
    save_users(users)
    
    # Remove o token do DB de solicitações
    del requests[token]
    save_requests(requests)
    
    return jsonify({"status": "sucesso", "mensagem": "Cadastro concluído! Você já pode fazer login."})


# --- ROTAS DE ADMINISTRAÇÃO ---

def is_admin():
    """Verifica se o usuário logado é 'admin'."""
    return session.get('username') == 'admin'

@app.route('/api/admin/get-requests')
def admin_get_requests():
    if not is_admin():
        return jsonify({"status": "erro", "mensagem": "Acesso negado."}), 403
        
    requests = load_requests()
    # Filtra apenas solicitações pendentes
    pending_requests = {token: data for token, data in requests.items() if data['status'] == 'Aguardando Aprovação'}
    return jsonify({"status": "sucesso", "requests": pending_requests})

@app.route('/api/admin/approve', methods=['POST'])
def admin_approve():
    if not is_admin():
        return jsonify({"status": "erro", "mensagem": "Acesso negado."}), 403
    
    token = request.json.get('token')
    requests = load_requests()
    
    if token in requests and requests[token]['status'] == 'Aguardando Aprovação':
        requests[token]['status'] = 'Aprovado'
        # Define a data de expiração para 7 dias a partir de agora
        requests[token]['expiration_date'] = (datetime.datetime.now(BRASILIA_TZ) + timedelta(days=7)).isoformat() # <-- CORREÇÃO DE FUSO
        save_requests(requests)
        return jsonify({"status": "sucesso"})
    
    return jsonify({"status": "erro", "mensagem": "Solicitação não encontrada ou já processada."}), 404

@app.route('/api/admin/reject', methods=['POST'])
def admin_reject():
    if not is_admin():
        return jsonify({"status": "erro", "mensagem": "Acesso negado."}), 403
    
    token = request.json.get('token')
    justification = request.json.get('justification')
    
    if not justification:
        return jsonify({"status": "erro", "mensagem": "A justificativa é obrigatória."}), 400
        
    requests = load_requests()
    
    if token in requests and requests[token]['status'] == 'Aguardando Aprovação':
        requests[token]['status'] = 'Reprovado'
        requests[token]['justification'] = justification
        save_requests(requests)
        return jsonify({"status": "sucesso"})
    
    return jsonify({"status": "erro", "mensagem": "Solicitação não encontrada ou já processada."}), 404

# --- ROTAS DE API (AUTOMAÇÃO) ---
@app.route('/executar-macro', methods=['POST'])
def executar_macro():
    if not is_sap_logged_in: 
        return jsonify({"status": "erro", "mensagem": "Acesso negado. Por favor, faça o login no SAP primeiro."}), 403
        
    nome_macro_selecionada = request.form['macro']
    config = macros_disponiveis.get(nome_macro_selecionada)
    if not config: 
        return jsonify({"status": "erro", "mensagem": "Macro não encontrada!"}), 400
        
    comando = [ "powershell.exe", "-ExecutionPolicy", "Bypass", "-File", SCRIPT_RUNNER_SIMPLES, "-CaminhoArquivo", config['arquivo'], "-NomeMacro", config['macro'] ]
    contexto = f"tarefa '{nome_macro_selecionada}'"
    resultado = executar_comando_externo(comando, contexto_tarefa=contexto)
    
    if resultado['status'] == 'sucesso' and nome_macro_selecionada == "Base Mãe":
        nome_arquivo_download = find_file_by_prefix(DOWNLOAD_DIR, "ZV62N")
        if nome_arquivo_download: 
            resultado['download_file'] = nome_arquivo_download
        else: 
            resultado['mensagem'] += " (Aviso: arquivo de relatório não encontrado para download.)"
            
    return jsonify(resultado)

@app.route('/executar-bw-hana', methods=['POST'])
def executar_bw_hana():
    if not is_bw_hana_logged_in: 
        return jsonify({"status": "erro", "mensagem": "Acesso negado. Por favor, faça o login no BW HANA primeiro."}), 403
    
    if not last_bw_creds:
        return jsonify({"status": "erro", "mensagem": "Credenciais do BW não encontradas no servidor. Faça o login novamente."}), 400

    usuario = last_bw_creds.get('user')
    senha = last_bw_creds.get('pass')
    
    comando = [sys.executable, SCRIPT_BW_HANA, usuario, senha]
    resultado = executar_comando_externo(comando, contexto_tarefa="Extração BW HANA", timeout_seconds=600)
    
    if resultado['status'] == 'sucesso' and "ERRO:" in resultado['mensagem'].upper():
        resultado['status'] = 'erro'
        
    return jsonify(resultado)

@app.route('/download/<filename>')
def download_file(filename):
    try: 
        return send_from_directory(DOWNLOAD_DIR, filename, as_attachment=True)
    except FileNotFoundError: 
        return "Arquivo não encontrado.", 404

# --- ROTAS DE LOGIN / LOGOUT (ESTADO) ---

def save_connection_if_requested(system, user, password):
    """Salva a conexão no JSON se o usuário estiver logado no Hub."""
    save_conn = request.form.get('save_connection') == 'true'
    username = session.get('username')
    
    if save_conn and username:
        users = load_users()
        if username in users:
            if 'connections' not in users[username]:
                users[username]['connections'] = {}
            users[username]['connections'][system] = {'user': user, 'pass': password}
            save_users(users)
            print(f"Conexão {system} salva para {username}")

@app.route('/login-sap', methods=['POST'])
def login_sap():
    global is_sap_logged_in, is_bw_hana_logged_in, last_bw_creds
    usuario = request.form['usuario']
    senha = request.form['senha']
    
    executar_comando_externo([ "powershell.exe", "-ExecutionPolicy", "Bypass", "-File", SCRIPT_CLEANUP ], "Limpeza pré-login")
    
    comando = [ "powershell.exe", "-ExecutionPolicy", "Bypass", "-File", SCRIPT_RUNNER_SAP_LOGIN, "-CaminhoArquivo", "C:\\Users\\Robo01\\Desktop\\Automacao_Final\\macros\\LoginSAP.xlsm", "-NomeMacro", "funcSAPOpen", "-Usuario", usuario, "-Senha", senha ]
    resultado = executar_comando_externo(comando, contexto_tarefa="Login SAP", timeout_seconds=30)
    
    if resultado['status'] == 'erro' and 'excedeu o tempo limite' in resultado['mensagem']:
        resultado['mensagem'] = "Login ou senha incorreto, ou o SAP demorou para responder."
        
    if resultado['status'] == 'sucesso':
        is_sap_logged_in = True
        is_bw_hana_logged_in = False
        last_bw_creds = {}
        resultado['mensagem'] = "Login realizado com sucesso."
        
        save_connection_if_requested('sap', usuario, senha)
    else:
        is_sap_logged_in = False
        executar_comando_externo([ "powershell.exe", "-ExecutionPolicy", "Bypass", "-File", SCRIPT_CLEANUP ], "Cleanup Pós-Falha de Login")
        
    return jsonify(resultado)

@app.route('/logout-sap', methods=['POST'])
def logout_sap():
    global is_sap_logged_in
    is_sap_logged_in = False
    
    comando_cleanup = [ "powershell.exe", "-ExecutionPolicy", "Bypass", "-File", SCRIPT_CLEANUP ]
    resultado_cleanup = executar_comando_externo(comando_cleanup, contexto_tarefa="Logout SAP e Limpeza")
    
    return jsonify(resultado_cleanup)

@app.route('/login-bw-hana', methods=['POST'])
def login_bw_hana():
    global is_sap_logged_in, is_bw_hana_logged_in, last_bw_creds
    
    executar_comando_externo([ "powershell.exe", "-ExecutionPolicy", "Bypass", "-File", SCRIPT_CLEANUP ], "Limpeza pré-login")
    
    usuario = request.form['usuario']
    senha = request.form['senha']
    
    last_bw_creds = {
        'user': usuario,
        'pass': senha
    }
    is_bw_hana_logged_in = True
    is_sap_logged_in = False
    
    save_connection_if_requested('bw', usuario, senha)
    
    return jsonify({"status": "sucesso", "mensagem": "Login realizado com sucesso."})

@app.route('/logout-bw-hana', methods=['POST'])
def logout_bw_hana():
    global is_bw_hana_logged_in, last_bw_creds
    
    is_bw_hana_logged_in = False
    last_bw_creds = {}
    
    executar_comando_externo([ "powershell.exe", "-ExecutionPolicy", "Bypass", "-File", SCRIPT_CLEANUP ], "Cleanup Pós-BW")

    return jsonify({"status": "sucesso", "mensagem": "Estado de login BW HANA reiniciado."})

# --- Função de Execução de Comando ---
def executar_comando_externo(comando, contexto_tarefa="Tarefa genérica", timeout_seconds=600): # 10 min de timeout padrão
    try:
        resultado = subprocess.run(comando, capture_output=True, check=True, text=False, timeout=timeout_seconds)
        output = resultado.stdout.decode('cp1252', errors='ignore').strip()
        
        if "ERRO:" in output.upper():
             return {"status": "erro", "mensagem": output.replace("ERRO:", "").strip()}
             
        return {"status": "sucesso", "mensagem": output}
        
    except subprocess.TimeoutExpired:
        cleanup_command = ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", SCRIPT_CLEANUP]
        subprocess.run(cleanup_command)
        return {"status": "erro", "mensagem": f"A {contexto_tarefa} excedeu o tempo limite e foi finalizada."}
    except subprocess.CalledProcessError as e:
        erro_msg = e.stdout.decode('cp1252', errors='ignore').strip() + "\n" + e.stderr.decode('cp1252', errors='ignore').strip()
        return {"status": "erro", "mensagem": f"Erro crítico durante a {contexto_tarefa}: {erro_msg.strip()}"}
    except Exception as e:
        return {"status": "erro", "mensagem": f"Erro inesperado no Python: {str(e)}"}

# --- Início do Servidor ---

if __name__ == '__main__':
    print("Servidor Iniciado...")
    print(f"Acesse o Hub em http://[SEU_IP]:5000") 
    app.run(host='0.0.0.0', port=5000)
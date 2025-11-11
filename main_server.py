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

import google.generativeai as genai
try:
    genai.configure(api_key="") 
    gemini_model = genai.GenerativeModel('gemini-2.5-flash')
except Exception as e:
    print(f"ERRO: Falha ao configurar a API do Gemini. Verifique sua chave. {e}")
    gemini_model = None

app = Flask(__name__)
# NOVO: Chave secreta para gerenciar sessões de usuário do Hub
app.secret_key = 'sua_chave_secreta_aqui_mude_isso'
BRASILIA_TZ = timezone(timedelta(hours=-3)) # <-- ADICIONE ESTA LINHA
LOGIN_ATTEMPT_LIMIT = 5 # <-- ADICIONE
LOCKOUT_DURATION = 300  # (5 segundos = 300) <-- ADICIONE

# --- Variáveis de Estado Globais ---
is_sap_logged_in = False
is_bw_hana_logged_in = False
last_bw_creds = {}

# --- Caminhos e Configurações ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DRIVE_ROOT = os.path.join(BASE_DIR, "drive") 
USUARIOS_DB = os.path.join(BASE_DIR, "users.json")
SCHEDULER_DB = os.path.join(BASE_DIR, "scheduler_db.json") # <-- ADICIONE ESTA LINHA
REQUESTS_DB = os.path.join(BASE_DIR, "requests_db.json") # <-- ADICIONE ESTA LINHA
GEMINI_CONTEXT_FILE = os.path.join(BASE_DIR, "prompt.json") # <-- ALTERADO

# NOVO: Diretório para cache de imagens
CACHE_DIR = os.path.join(BASE_DIR, "cache")
DASHBOARDS_DB = os.path.join(BASE_DIR, "dashboards_db.json")
AUTOMATIONS_DB = os.path.join(BASE_DIR, "automations_db.json")
os.makedirs(CACHE_DIR, exist_ok=True) # Garante que a pasta 'cache' exista

SCRIPT_RUNNER_SIMPLES = os.path.join(BASE_DIR, "runner.ps1")
SCRIPT_RUNNER_SAP_LOGIN = os.path.join(BASE_DIR, "sap_login_runner.ps1")
SCRIPT_CLEANUP = os.path.join(BASE_DIR, "cleanup_process.ps1")
SCRIPT_BW_HANA = os.path.join(BASE_DIR, "bw_hana_extractor.py")
DOWNLOAD_DIR = os.path.join(BASE_DIR, "macros")

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
        
def load_dashboards():
    """Carrega todos os dashboards do arquivo JSON."""
    if not os.path.exists(DASHBOARDS_DB):
        return {}
    try:
        with open(DASHBOARDS_DB, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def load_automations():
    """Carrega todas as automações do arquivo JSON."""
    if not os.path.exists(AUTOMATIONS_DB):
        return {}
    try:
        with open(AUTOMATIONS_DB, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}                

def get_user_profile_data():
    """Retorna dados de perfil necessários para renderização do Hub."""
    username = session.get('username')
    profile_data = {
        'username': None, 
        'profile_image': "/static/icones/default_profile.png", 
        'role': None
    }
    
    if username:
        users = load_users()
        user_data = users.get(username, {})
        
        # Obtém o nome do arquivo de imagem do usuário (se existir)
        image_filename = user_data.get('profile_image')
        
        if image_filename:
            # Adiciona um timestamp para evitar problemas de cache no navegador
            profile_data['profile_image'] = f'/cache/{image_filename}?t={int(time.time())}'

        # --- LÓGICA DE ROLE (Req 1) ---
        role = user_data.get('role', 'Analista') # Padrão 'Analista'
        # Trata 'admin' como 'Executor'
        if username.lower() == 'admin':
            role = 'Executor'
            
        profile_data['role'] = role
        # -----------------------------    
            
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
    
    # --- ALTERADO: Carrega automações do JSON ---
    automations = load_automations()
    
    return render_template(
        'automacao.html', 
        macros=automations, # Passa o dicionário de automações
        initial_zv62n_file=initial_zv62n_file,
        is_hub_logged_in=session.get('username')
    )

@app.route('/dashboards')
def dashboards():
    # --- ALTERADO: Carrega dashboards do JSON ---
    dashboards_data = load_dashboards()
    
    return render_template(
        'dashboards.html', 
        is_hub_logged_in=session.get('username'),
        dashboards_data=dashboards_data # Passa os dados para o Jinja2
    ) 

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
            
            # --- INÍCIO DA MODIFICAÇÃO (Req 1) ---
            try:
                # Pega as estatísticas do arquivo/pasta
                stats = os.stat(item_path)
                mod_time_stamp = stats.st_mtime
                # Converte o timestamp para formato ISO (JS consegue ler)
                mod_date = datetime.datetime.fromtimestamp(mod_time_stamp).isoformat()
                
                # Pega o tamanho (se não for diretório)
                size = stats.st_size if not is_dir else 0
                
            except (FileNotFoundError, PermissionError):
                # Caso o arquivo seja bloqueado ou excluído durante a leitura
                mod_date = None
                size = 0
            # --- FIM DA MODIFICAÇÃO ---

            content.append({
                "name": item, 
                "is_dir": is_dir,
                "mod_date": mod_date, # Adicionado
                "size": size        # Adicionado
            })
    
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
    
    # --- NOVA LÓGICA DE BLOQUEIO (Req 1) ---
    if user_data:
        # 1. Verifica se o usuário está bloqueado
        lockout_until = user_data.get('lockout_until')
        if lockout_until and datetime.datetime.now(BRASILIA_TZ) < datetime.datetime.fromisoformat(lockout_until):
            remaining_seconds = int((datetime.datetime.fromisoformat(lockout_until) - datetime.datetime.now(BRASILIA_TZ)).total_seconds())
            return jsonify({"status": "erro", "mensagem": f"Usuário bloqueado. Tente novamente em {remaining_seconds} segundos."}), 429
        
        # 2. Se a senha estiver errada
        if user_data['password'] != password:
            attempts = user_data.get('login_attempts', 0) + 1
            user_data['login_attempts'] = attempts
            
            if attempts >= LOGIN_ATTEMPT_LIMIT:
                # Bloqueia o usuário
                user_data['lockout_until'] = (datetime.datetime.now(BRASILIA_TZ) + timedelta(seconds=LOCKOUT_DURATION)).isoformat()
                user_data['login_attempts'] = 0 # Reseta a contagem
                save_users(users)
                return jsonify({"status": "erro", "mensagem": f"Muitas tentativas falhas. Usuário bloqueado por 5 minutos."}), 429
            
            save_users(users)
            return jsonify({"status": "erro", "mensagem": "Usuário ou senha inválidos."}), 401
            
        # 3. Se a senha estiver correta
        # Reseta o bloqueio e tentativas no login bem-sucedido
        user_data['login_attempts'] = 0
        user_data['lockout_until'] = None
        save_users(users)
        
    elif not user_data:
         return jsonify({"status": "erro", "mensagem": "Usuário ou senha inválidos."}), 401
    # --- FIM DA LÓGICA DE BLOQUEIO ---

    # (Código existente para login bem-sucedido)
    session['username'] = username
    
    image_filename = user_data.get('profile_image')
    image_url = f'/cache/{image_filename}?t={int(time.time())}' if image_filename else "/static/icones/default_profile.png"
    area = user_data.get('area', 'N/A')
    role = user_data.get('role', 'Analista')
    if username.lower() == 'admin':
        role = 'Executor'
        
    return jsonify({"status": "sucesso", "username": username, "profile_image": image_url, "area": area, "role": role})

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

        # --- ADICIONADO: Enviar a Área do usuário ---
        area = user_data.get('area', 'N/A') # 'N/A' como fallback

        role = user_data.get('role', 'Analista') # De 'Visualizador' para 'Analista'
        
        return jsonify({"status": "logado", "username": username, "profile_image": image_url, "area": area, "role": role})
    
    # --- CORREÇÃO APLICADA AQUI ---
    return jsonify({"status": "deslogado", "profile_image": "/static/icones/default_profile.png"})

@app.route('/api/scheduler/load')
def scheduler_load():
    """Carrega a fila e o histórico do usuário logado."""
    schedule_key = "global_schedule"
        
    all_schedules = load_schedules()
    user_schedule = all_schedules.get(schedule_key, {"queue": [], "history": []})
    return jsonify(user_schedule)

@app.route('/api/scheduler/save', methods=['POST'])
def scheduler_save():
    """Salva a fila e o histórico do usuário logado."""
    schedule_key = "global_schedule"
    
    data = request.json
    job_queue = data.get('queue', [])
    job_history = data.get('history', [])
    
    all_schedules = load_schedules()
    all_schedules[schedule_key] = {
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
        if request_data.get('expiration_date'): 
            try:
                expiration_date = datetime.datetime.fromisoformat(request_data['expiration_date'])
                if datetime.datetime.now(datetime.timezone.utc) > expiration_date:
                    request_data['status'] = 'Expirado'
                    request_data['justification'] = 'O prazo de 7 dias para cadastro de senha expirou. Faça uma nova solicitação.'
                    requests[token] = request_data
                    save_requests(requests)
            except (ValueError, TypeError):
                # Ignora datas de expiração mal formatadas
                pass 
        else:
            # Caso de segurança: Aprovado mas sem data (não deveria acontecer)
            request_data['status'] = 'Erro: Aprovado sem data de expiração'
            
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
    if datetime.datetime.now(datetime.timezone.utc) > expiration_date:
        return jsonify({"status": "erro", "mensagem": "Este token expirou. Faça uma nova solicitação."}), 403

    # Adiciona o usuário ao DB principal
    users = load_users()
    username = request_data['username']
    
    if username in users:
         return jsonify({"status": "erro", "mensagem": "Este usuário já foi registrado. Tente fazer login."}), 400
         
    users[username] = {
        "password": password,
        "role": request_data['role'], # Adiciona a role
        "area": request_data['area'], # <-- ADICIONE ESTA LINHA
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
    return session.get('username', '').lower() == 'admin'

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

@app.route('/api/admin/get-users')
def admin_get_users():
    """Retorna todos os usuários, exceto o próprio admin."""
    if not is_admin():
        return jsonify({"status": "erro", "mensagem": "Acesso negado."}), 403
    
    users = load_users()
    user_list = []
    
    for username, data in users.items():
        # O admin não pode editar a si mesmo nesta interface
        if username.lower() == 'admin':
            continue
            
        user_list.append({
            "username": username,
            "area": data.get('area', 'N/A'),
            "role": data.get('role', 'Analista'), # Padrão para Analista se não definido
            "password": data.get('password', ''),
            
            # --- INÍCIO DA MODIFICAÇÃO (Req 1) ---
            "lockout_until": data.get('lockout_until', None) # Adiciona este campo
            # --- FIM DA MODIFICAÇÃO ---
        })
        
    return jsonify({"status": "sucesso", "users": user_list})

@app.route('/api/admin/update-user', methods=['POST'])
def admin_update_user():
    """Atualiza a senha (opcional), area ou role de um usuário."""
    if not is_admin():
        return jsonify({"status": "erro", "mensagem": "Acesso negado."}), 403
        
    data = request.json
    username = data.get('username')
    new_password = data.get('password') # Pode ser vazio
    new_area = data.get('area')
    new_role = data.get('role')

    if not username or not new_area or not new_role:
        return jsonify({"status": "erro", "mensagem": "Campos obrigatórios (usuário, área, função) ausentes."}), 400
    
    if username.lower() == 'admin':
        return jsonify({"status": "erro", "mensagem": "Não é permitido editar o usuário 'admin' por esta interface."}), 403

    users = load_users()
    if username not in users:
        return jsonify({"status": "erro", "mensagem": "Usuário não encontrado."}), 404

    # Atualiza os dados
    users[username]['area'] = new_area
    users[username]['role'] = new_role
    if new_password: # Só atualiza a senha se uma nova foi enviada
        users[username]['password'] = new_password
    
    save_users(users)
    return jsonify({"status": "sucesso", "mensagem": f"Usuário {username} atualizado."})

@app.route('/api/admin/delete-user', methods=['POST'])
def admin_delete_user():
    """Exclui um usuário do sistema."""
    if not is_admin():
        return jsonify({"status": "erro", "mensagem": "Acesso negado."}), 403

    username = request.json.get('username')
    
    if not username or username.lower() == 'admin':
        return jsonify({"status": "erro", "mensagem": "Usuário inválido ou não permitido."}), 400
    
    users = load_users()
    if username in users:
        # Remove o usuário do 'usuarios.json'
        del users[username]
        save_users(users)
        
        # Opcional: Remove o agendamento do usuário (se existir)
        schedules = load_schedules()
        if username in schedules:
            del schedules[username]
            save_schedules(schedules)
            
        return jsonify({"status": "sucesso", "mensagem": f"Usuário {username} excluído."})
    
    return jsonify({"status": "erro", "mensagem": "Usuário não encontrado."}), 404

@app.route('/api/admin/unlock-user', methods=['POST'])
def admin_unlock_user():
    """Define 'lockout_until' como None para um usuário."""
    if not is_admin():
        return jsonify({"status": "erro", "mensagem": "Acesso negado."}), 403
        
    username = request.json.get('username')
    if not username:
        return jsonify({"status": "erro", "mensagem": "Nome de usuário ausente."}), 400

    users = load_users()
    if username not in users:
        return jsonify({"status": "erro", "mensagem": "Usuário não encontrado."}), 404
    
    # Define lockout_until como None e reseta as tentativas
    users[username]['lockout_until'] = None
    users[username]['login_attempts'] = 0
    
    save_users(users)
    return jsonify({"status": "sucesso", "mensagem": f"Usuário {username} desbloqueado."})

# --- ROTAS DE API (AUTOMAÇÃO) ---
@app.route('/executar-macro', methods=['POST'])
def executar_macro():
    if not is_sap_logged_in: 
        return jsonify({"status": "erro", "mensagem": "Acesso negado. Por favor, faça o login no SAP primeiro."}), 403
        
    # --- ALTERADO: Carrega automações do JSON ---
    automations = load_automations()
    nome_macro_selecionada = request.form['macro']
    config = automations.get(nome_macro_selecionada)
    # --------------------------------------------
    
    if not config or config.get("type") != "sap": # Garante que é uma macro SAP
        return jsonify({"status": "erro", "mensagem": "Macro não encontrada ou inválida!"}), 400
        
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

    login_xlsm_path = os.path.join(DOWNLOAD_DIR, "LoginSAP.xlsm")
    
    comando = [ "powershell.exe", "-ExecutionPolicy", "Bypass", "-File", SCRIPT_RUNNER_SAP_LOGIN, "-CaminhoArquivo", login_xlsm_path, "-NomeMacro", "funcSAPOpen", "-Usuario", usuario, "-Senha", senha ]
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

# --- NOVA ROTA DE API: CHATBOT GEMINI ---
@app.route('/api/chatbot/query', methods=['POST'])
def chatbot_query():
    if not gemini_model:
        return jsonify({"status": "erro", "text": "A API do Gemini não está configurada no servidor."}), 500

    # --- INÍCIO DA MODIFICAÇÃO (Req 1) ---
    # Pega o histórico enviado pelo frontend
    history = request.json.get('history', [])
    if not history:
        return jsonify({"status": "erro", "text": "Mensagem vazia."}), 400
    # --- FIM DA MODIFICAÇÃO ---

    # --- LÓGICA DE MONTAGEM DE PROMPT ---
    try:
        with open(GEMINI_CONTEXT_FILE, 'r', encoding='utf-8') as f:
            context_data = json.load(f)
        
        # Monta o prompt do sistema a partir do JSON (exatamente como antes)
        system_prompt = context_data.get("system_prompt_introduction", "") + "\n\n"
        system_prompt += "## FERRAMENTAS DO HUB:\n" + "\n".join(context_data.get("tools", [])) + "\n\n"
        system_prompt += "## AUTOMAÇÕES DISPONÍVEIS (RPA):\n" + "\n".join(context_data.get("automations", [])) + "\n\n"
        system_prompt += "## DASHBOARDS DISPONÍVEIS (BI):\n" + "\n".join(context_data.get("dashboards", [])) + "\n\n"
        system_prompt += "## REGRAS DE RESPOSTA:\n" + "\n".join(context_data.get("response_rules", []))
    
    except Exception as e:
        print(f"ERRO: Falha ao ler ou montar o gemini_context.json: {e}")
        return jsonify({"status": "erro", "text": "Desculpe, estou com problemas para acessar meu contexto interno."}), 500
    # --- FIM DA LÓGICA DO PROMPT ---

    try:
        # --- INÍCIO DA MODIFICAÇÃO (Req 1: Construir Contexto) ---
        
        # Converte o histórico do JS para o formato do Gemini
        gemini_history = []
        for msg in history:
            role = msg.get("role", "user") # 'user' ou 'model'
            # Remove o HTML (negrito) que o frontend pode ter enviado
            text = msg.get("text", "").replace("<strong>", "").replace("</strong>", "")
            
            gemini_history.append({
                "role": role,
                "parts": [text]
            })

        # Pega a última mensagem (o prompt atual do usuário)
        last_user_message = gemini_history.pop()
        
        # Constrói o histórico como string (para manter seu método original)
        history_string = ""
        for msg in gemini_history:
            if msg["role"] == "user":
                history_string += "Usuário: " + msg["parts"][0] + "\n"
            else:
                history_string += "Assistente: " + msg["parts"][0] + "\n"

        # Monta o prompt final (Sistema + Histórico + Pergunta Atual)
        full_prompt = (
            system_prompt + "\n\n" + 
            history_string + 
            "Usuário: " + last_user_message["parts"][0] + 
            "\nAssistente: "
        )
        
        response = gemini_model.generate_content(full_prompt)
        # --- FIM DA MODIFICAÇÃO ---

        bot_response_text = response.text
        
        form_trigger = None
        
        # Verifica se a IA acionou um formulário
        if "[FORM:DEMANDA]" in bot_response_text:
            bot_response_text = bot_response_text.replace("[FORM:DEMANDA]", "").strip()
            form_trigger = "demanda"
        elif "[FORM:SUGESTAO]" in bot_response_text:
            bot_response_text = bot_response_text.replace("[FORM:SUGESTAO]", "").strip()
            form_trigger = "sugestao"
            
        return jsonify({
            "status": "sucesso", 
            "text": bot_response_text,
            "form_trigger": form_trigger
        })

    except Exception as e:
        print(f"Erro na API do Gemini: {e}")
        return jsonify({"status": "erro", "text": "Desculpe, não consegui processar sua solicitação no momento."}), 500
    
 # --- NOVAS ROTAS DE API (CMS ADMIN) ---

@app.route('/api/admin/get-cms-data')
def admin_get_cms_data():
    """Retorna os dados completos dos JSONs de automação e dashboards."""
    if not is_admin():
        return jsonify({"status": "erro", "mensagem": "Acesso negado."}), 403
    
    automations = load_automations()
    dashboards = load_dashboards()
    
    return jsonify({
        "status": "sucesso", 
        "automations": automations, 
        "dashboards": dashboards
    })

@app.route('/api/admin/save-automations', methods=['POST'])
def admin_save_automations():
    """Salva o JSON de automações."""
    if not is_admin():
        return jsonify({"status": "erro", "mensagem": "Acesso negado."}), 403
    
    try:
        data = request.json
        # Escreve o JSON exatamente como recebido (assume que o frontend envia o formato correto)
        with open(AUTOMATIONS_DB, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        return jsonify({"status": "sucesso", "mensagem": "Automações atualizadas."})
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": f"Falha ao salvar automações: {str(e)}"}), 500

@app.route('/api/admin/save-dashboards', methods=['POST'])
def admin_save_dashboards():
    """Salva o JSON de dashboards."""
    if not is_admin():
        return jsonify({"status": "erro", "mensagem": "Acesso negado."}), 403
    
    try:
        data = request.json
        # Escreve o JSON exatamente como recebido
        with open(DASHBOARDS_DB, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        return jsonify({"status": "sucesso", "mensagem": "Dashboards atualizados."})
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": f"Falha ao salvar dashboards: {str(e)}"}), 500   

@app.route('/api/admin/add-user', methods=['POST'])
def admin_add_user():
    """Cria um novo usuário (via Admin)."""
    if not is_admin():
        return jsonify({"status": "erro", "mensagem": "Acesso negado."}), 403
        
    data = request.json
    username = data.get('username')
    password = data.get('password')
    area = data.get('area')
    role = data.get('role')

    if not username or not password or not area or not role:
        return jsonify({"status": "erro", "mensagem": "Todos os campos são obrigatórios (usuário, senha, área, função)."}), 400

    users = load_users()
    if username in users:
        return jsonify({"status": "erro", "mensagem": "Este usuário já existe."}), 400
    
    # Cria a nova entrada de usuário
    users[username] = {
        "password": password,
        "role": role,
        "area": area,
        "profile_image": None,
        "connections": {
            "sap": None,
            "bw": None
        },
        "login_attempts": 0,
        "lockout_until": None
    }
    
    save_users(users)
    return jsonify({"status": "sucesso", "mensagem": f"Usuário {username} criado."})

# --- Início do Servidor ---

if __name__ == '__main__':
    print("Servidor Iniciado...")
    print(f"Acesse o Hub em http://[SEU_IP]:5000") 
    app.run(host='0.0.0.0', port=5000)
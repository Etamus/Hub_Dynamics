import subprocess
import os
import sys
# NOVAS IMPORTAÇÕES
import json
from flask import (
    Flask, render_template, request, jsonify, send_from_directory,
    session, redirect, url_for
)

app = Flask(__name__)
# NOVO: Chave secreta para gerenciar sessões de usuário do Hub
app.secret_key = 'sua_chave_secreta_aqui_mude_isso' 

# --- Variáveis de Estado Globais ---
is_sap_logged_in = False
is_bw_hana_logged_in = False
last_bw_creds = {}

# --- Caminhos e Configurações ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DRIVE_ROOT = os.path.join(BASE_DIR, "drive") 
# NOVO: Caminho para o arquivo de usuários
USUARIOS_DB = os.path.join(BASE_DIR, "usuarios.json")

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

# --- FIM DAS NOVAS FUNÇÕES ---

def find_file_by_prefix(directory, prefix):
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
    # Passa o status de login do Hub para o template
    return render_template('hub.html', is_hub_logged_in=session.get('username'))

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
        is_hub_logged_in=session.get('username') # <-- ADICIONADO
    )

@app.route('/dashboards')
def dashboards():
    # Passa o status de login do Hub para o template
    return render_template('dashboards.html', is_hub_logged_in=session.get('username')) # <-- ADICIONADO

@app.route('/drive')
def drive():
    # Passa o status de login do Hub para o template
    return render_template('drive.html', is_hub_logged_in=session.get('username')) # <-- ADICIONADO


# --- ROTAS DE API (DRIVE) ---
# (Sem alterações aqui... o código abaixo permanece o mesmo)
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

# --- NOVAS ROTAS DE API (HUB LOGIN & CONEXÕES) ---

@app.route('/api/hub/login', methods=['POST'])
def hub_login():
    """Login do usuário principal do Hub."""
    users = load_users()
    username = request.form['username']
    password = request.form['password']
    
    user_data = users.get(username)
    
    if user_data and user_data['password'] == password:
        session['username'] = username
        return jsonify({"status": "sucesso", "username": username})
    
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
        return jsonify({"status": "logado", "username": username})
    return jsonify({"status": "deslogado"})

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

# --- FIM DAS NOVAS ROTAS DE API ---

# --- ROTAS DE API (AUTOMAÇÃO) ---
# (A rota /executar-macro não precisa de alterações)
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

# (A rota /executar-bw-hana não precisa de alterações)
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

# --- ROTAS DE LOGIN / LOGOUT (ESTADO) (MODIFICADAS) ---

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
        
        # NOVO: Salva a conexão se solicitado
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
    
    # NOVO: Salva a conexão se solicitado
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
# (Sem alterações aqui)
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
    print(f"Acesse o Hub em http://192.168.15.24:5000") 
    app.run(host='0.0.0.0', port=5000)
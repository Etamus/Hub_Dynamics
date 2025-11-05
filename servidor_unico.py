import subprocess
import os
import sys
from flask import Flask, render_template, request, jsonify, send_from_directory

app = Flask(__name__)

# --- Variáveis de Estado Globais ---
is_sap_logged_in = False
is_bw_hana_logged_in = False
last_bw_creds = {}

# --- Caminhos e Configurações ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DRIVE_ROOT = os.path.join(BASE_DIR, "drive") 

SCRIPT_RUNNER_SIMPLES = os.path.join(BASE_DIR, "runner.ps1")
SCRIPT_RUNNER_SAP_LOGIN = os.path.join(BASE_DIR, "sap_login_runner.ps1")
SCRIPT_CLEANUP = os.path.join(BASE_DIR, "cleanup_process.ps1")
SCRIPT_BW_HANA = os.path.join(BASE_DIR, "bw_hana_extractor.py")
DOWNLOAD_DIR = "C:\\Users\\Robo01\\Desktop\\Automacao_Final\\macros"

# --- NOMES DAS MACROS ATUALIZADOS ---
macros_disponiveis = {
    "Base Mãe": { "arquivo": "C:\\Users\\Robo01\\Desktop\\Automacao_Final\\macros\\Input diário PÇ's.xlsm", "macro": "Org_relatorio_diario" },
    "Outlook": { "arquivo": "C:\\Users\\Robo01\\Desktop\\Automacao_Final\\macros\\Outlook_Macro.xlsm", "macro": "EnviarEmails" },
    "Cancelamento Aging": { "arquivo": "C:\\Users\\Robo01\\Desktop\\Automacao_Final\\macros\\Criação Aging.xlsm", "macro": "cancelar_fora_prazo" }
}

def find_file_by_prefix(directory, prefix):
    try:
        for filename in os.listdir(directory):
            if filename.startswith(prefix): 
                return filename
    except FileNotFoundError: 
        return None
    return None

# --- ROTAS DE PÁGINAS ---

@app.route('/')
def hub():
    return render_template('hub.html')

@app.route('/automacao')
def automacao():
    global is_sap_logged_in, is_bw_hana_logged_in, last_bw_creds
    is_sap_logged_in = False
    is_bw_hana_logged_in = False
    last_bw_creds = {}
    
    initial_zv62n_file = find_file_by_prefix(DOWNLOAD_DIR, "ZV62N")
    return render_template('automacao.html', macros=macros_disponiveis, initial_zv62n_file=initial_zv62n_file)

@app.route('/dashboards')
def dashboards():
    return render_template('dashboards.html')

@app.route('/drive')
def drive():
    return render_template('drive.html')


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
    
    # --- LÓGICA DE DOWNLOAD ATUALIZADA ---
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
        resultado['mensagem'] = "Login realizado com sucesso." # --- MENSAGEM ATUALIZADA ---
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
    
    last_bw_creds = {
        'user': request.form['usuario'],
        'pass': request.form['senha']
    }
    is_bw_hana_logged_in = True
    is_sap_logged_in = False
    
    # --- MENSAGEM ATUALIZADA ---
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
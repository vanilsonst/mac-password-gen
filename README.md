# 🔐 Derivador Determinístico de Senha por Endereço MAC

Ferramenta desenvolvida para gerar senhas únicas, complexas e determinísticas a partir do endereço MAC de uma interface de rede combinada a uma chave mestra secreta (**Chave Mestra** / `MASTER_SECRET`).

Ideal para provisionamento padronizado de CPEs, ONTs, roteadores, switches e servidores sem a necessidade de armazenar bancos de senhas individuais por equipamento.

* 🌐 **Versão Web Online:** [mac-password-gen.vercel.app](https://mac-password-gen.vercel.app)
* 🪟 **Versão Offline Portátil (Windows 10/11):** [Baixar GeradorSenhaMAC.exe (Última Versão)](https://github.com/vanilsonst/mac-password-gen/releases/latest/download/GeradorSenhaMAC.exe)

---

## 🎯 Como Funciona

Diferente de uma criptografia reversível tradicional, esta ferramenta utiliza uma **Função de Derivação de Chave baseada em Hash (HMAC-SHA256)**:

$$\text{Senha} = \text{MapeamentoDeterminístico}\big(\text{HMAC-SHA256}(\text{Chave Mestra},\ \text{MAC\_normalizado})\big)$$

1. **Normalização do MAC:** Qualquer formato de entrada (`AA:BB:CC:11:22:33`, `aa-bb-cc-11-22-33` ou `aabbcc112233`) é higienizado para 12 caracteres hexadecimais em minúsculo (`aabbcc112233`).
2. **Assinatura Criptográfica (HMAC-SHA256):** O MAC normalizado é assinado usando a Chave Mestra, gerando um *digest* de 32 bytes (256 bits).
3. **Garantia de Complexidade:** Os primeiros 4 bytes do *digest* selecionam obrigatoriamente:
   - `1` letra minúscula (`a-z`)
   - `1` letra maiúscula (`A-Z`)
   - `1` dígito numérico (`0-9`)
   - `1` caractere especial seguro (`!@#$%&*_-+=`)
4. **Preenchimento e Embaralhamento (Fisher-Yates):** Os bytes seguintes completam o tamanho desejado (entre 12 e 32 caracteres) e os 16 bytes finais embaralham a posição dos caracteres de forma determinística.

### Propriedades de Segurança
* **Determinismo:** A mesma combinação de `Chave Mestra` + `MAC` + `Tamanho` sempre produzirá exatamente a mesma senha em qualquer dispositivo (Web, Executável Windows ou script Python).
* **Zero-Knowledge / 100% Local:** Todo o cálculo ocorre localmente no navegador (via **Web Crypto API**) ou na máquina local (no executável Windows). Nenhum dado trafega pela rede.
* **Irreversibilidade:** Mesmo que alguém descubra a senha de um equipamento e conheça seu endereço MAC, é matematicamente inviável deduzir a Chave Mestra ou calcular a senha de outro equipamento da rede.
* **Caracteres Seguros para Automação:** O conjunto de símbolos especiais (`!@#$%&*_-+=`) exclui propositalmente aspas (`'`, `"`), barras (`\`, `/`) e crases (`` ` ``) para evitar falhas de *escaping* em sessões SSH, Telnet, scripts RouterOS, payloads JSON/XML e provisionamento TR-069 (ACS).

---

## 📂 Estrutura do Repositório

```text
mac-password-gen/
├── .github/
│   └── workflows/
│       └── build-exe.yml   # Pipeline CI/CD que compila e publica o .exe no GitHub Releases
├── desktop/
│   ├── index.html          # Interface offline autocontida (CSS embutido) para o executável
│   └── main.py             # Lançador nativo Windows usando pywebview (Edge WebView2)
├── index.html              # Interface web responsiva (Tailwind CSS) hospedada na Vercel
├── app.js                  # Lógica criptográfica HMAC-SHA256 e UI compartilhada entre Web e Desktop
├── .gitignore              # Exclusão de artefatos locais de build do PyInstaller
└── README.md               # Documentação do projeto

```

---

## ✨ Funcionalidades

* **Máscara Automática de MAC:** Insere `:` automaticamente durante a digitação ou colagem em qualquer formato (Cisco, traços, sem separadores).
* **Gerador de Chave Mestra:** Cria chaves aleatórias criptograficamente seguras de 192 bits (48 caracteres hexadecimais) via CSPRNG (`crypto.getRandomValues`).
* **Persistência Local Opcional:** Permite salvar a Chave Mestra localmente no navegador ou no executável Windows (`localStorage`), com opção de remoção rápida.
* **Guia Rápido Integrado:** Pop-up interativo (*"Como usar?"*) com instruções passo a passo para operadores e técnicos de campo.
* **Distribuição Automatizada:** A cada atualização no código (`app.js` ou `desktop/`), o GitHub Actions compila automaticamente o `GeradorSenhaMAC.exe` e atualiza o link de download direto exibido na interface web.

---

## 🛠️ Compilação Manual do Executável (Opcional)

Caso deseje gerar o `.exe` portátil localmente em uma máquina Windows:

```powershell
pip install pywebview pyinstaller

cd desktop
pyinstaller --noconfirm --onefile --windowed `
  --name "GeradorSenhaMAC" `
  --add-data "index.html;." `
  --add-data "..\app.js;." `
  main.py

```

O executável portátil será gerado em `desktop/dist/GeradorSenhaMAC.exe`.

---

## 🐍 Equivalência em Python (Automação / Backend / CLI)

Para integrar a mesma geração de senhas em scripts de provisionamento (IXC, GenieACS, Ansible, RouterOS, etc.), utilize o código abaixo, que produz **exatamente os mesmos resultados** das interfaces Web e Desktop:

```python
import hashlib
import hmac
import re
import string

def normalizar_mac(mac: str) -> str:
    limpo = re.sub(r'[^0-9a-fA-F]', '', mac).lower()
    if len(limpo) != 12:
        raise ValueError(f"Endereço MAC inválido: {mac}")
    return limpo

def gerar_senha_por_mac(mac: str, segredo: str, tamanho: int = 14) -> str:
    if not (12 <= tamanho <= 32):
        raise ValueError("O tamanho deve estar entre 12 e 32 caracteres.")

    mac_norm = normalizar_mac(mac)
    digest = hmac.new(
        segredo.encode('utf-8'),
        mac_norm.encode('utf-8'),
        hashlib.sha256
    ).digest()

    minusculas = string.ascii_lowercase
    maiusculas = string.ascii_uppercase
    numeros = string.digits
    especiais = "!@#$%&*_-+="
    todos = minusculas + maiusculas + numeros + especiais

    chars = [
        minusculas[digest[0] % len(minusculas)],
        maiusculas[digest[1] % len(maiusculas)],
        numeros[digest[2] % len(numeros)],
        especiais[digest[3] % len(especiais)],
    ]

    for i in range(4, tamanho):
        chars.append(todos[digest[i] % len(todos)])

    for i in range(tamanho - 1, 0, -1):
        j = digest[16 + (i % 16)] % (i + 1)
        chars[i], chars[j] = chars[j], chars[i]

    return "".join(chars)

# Exemplo de verificação:
# gerar_senha_por_mac("AA:BB:CC:11:22:33", "minha-chave-mestra", 14)

```

---

## 🛡️ Boas Práticas de Operação

* **Proteja a Chave Mestra:** Armazene a chave oficial em um cofre de senhas corporativo e em variáveis de ambiente nos servidores de automação. Nunca faça *commit* da chave real no repositório.
* **Rotação de Chaves:** Caso precise invalidar senhas antigas e gerar um novo padrão, gere uma nova Chave Mestra (ou adicione um sufixo de versão à chave atual, como `chave-atual-v2`).
* **Padronização de Interface:** Em equipamentos com múltiplas interfaces (WAN, LAN, WLAN), padronize qual MAC será utilizado como referência (ex: MAC da interface WAN ou MAC base impresso na etiqueta do chassi).

```
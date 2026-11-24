# 🔐 Derivador Determinístico de Senha por Endereço MAC

Ferramenta web (Client-Side) e CLI desenvolvida para gerar senhas únicas, complexas e determinísticas a partir do endereço MAC de uma interface de rede combinada a uma chave mestra secreta (`MASTER_SECRET`).

Ideal para provisionamento padronizado de CPEs, ONTs, roteadores, switches e servidores sem a necessidade de armazenar bancos de senhas individuais por equipamento.

---

## 🎯 Como Funciona

Diferente de uma criptografia reversível tradicional, esta ferramenta utiliza uma **Função de Derivação de Chave baseada em Hash (HMAC-SHA256)**:

$$\text{Senha} = \text{MapeamentoDeterminístico}\big(\text{HMAC-SHA256}(\text{MASTER\_SECRET},\ \text{MAC\_normalizado})\big)$$

1. **Normalização do MAC:** Qualquer formato de entrada (`AA:BB:CC:11:22:33`, `aa-bb-cc-11-22-33` ou `aabbcc112233`) é higienizado para 12 caracteres hexadecimais em minúsculo (`aabbcc112233`).
2. **Assinatura Criptográfica (HMAC-SHA256):** O MAC normalizado é assinado usando o `MASTER_SECRET`, gerando um *digest* de 32 bytes (256 bits).
3. **Garantia de Complexidade:** Os primeiros 4 bytes do *digest* selecionam obrigatoriamente:
   - `1` letra minúscula (`a-z`)
   - `1` letra maiúscula (`A-Z`)
   - `1` dígito numérico (`0-9`)
   - `1` caractere especial seguro (`!@#$%&*_-+=`)
4. **Preenchimento e Embaralhamento (Fisher-Yates):** Os bytes seguintes completam o tamanho desejado (entre 12 e 32 caracteres) e os 16 bytes finais embaralham a posição dos caracteres de forma determinística.

### Propriedades de Segurança
* **Determinismo:** A mesma combinação de `MASTER_SECRET` + `MAC` sempre produzirá exatamente a mesma senha em qualquer dispositivo, navegador ou script Python compatível.
* **Zero-Knowledge / 100% Client-Side:** Na versão web, todo o cálculo ocorre localmente no navegador do operador via **Web Crypto API** (`window.crypto.subtle`). Nenhum dado trafega pela rede ou é registrado em logs de servidor.
* **Irreversibilidade:** Mesmo que alguém descubra a senha de um equipamento e conheça seu endereço MAC, é matematicamente inviável deduzir o `MASTER_SECRET` ou calcular a senha de outro equipamento da rede.
* **Caracteres Seguros para Automação:** O conjunto de símbolos especiais (`!@#$%&*_-+=`) exclui propositalmente aspas (`'`, `"`), barras (`\`, `/`) e crases (`` ` ``) para evitar falhas de *escaping* em sessões SSH, Telnet, scripts RouterOS, payloads JSON/XML e provisionamento TR-069 (ACS).

---

## 📂 Estrutura do Projeto

```text
mac-password-gen/
├── index.html   # Interface web responsiva (Tailwind CSS)
├── app.js       # Lógica criptográfica HMAC-SHA256 (Web Crypto API) e localStorage
└── README.md    # Documentação do projeto
```
---

## 🚀 Funcionalidades da Interface Web

* **Geração e Recuperação:** Basta inserir o `MASTER_SECRET` e o endereço MAC para visualizar imediatamente a senha correspondente.
* **Gerador de Chave Mestra:** Botão dedicado que utiliza `window.crypto.getRandomValues()` (CSPRNG) para criar chaves aleatórias de 192 bits (48 caracteres hexadecimais).
* **Persistência Local Opcional:** Opção de salvar o `MASTER_SECRET` exclusivamente no `localStorage` do navegador do operador, com botão de limpeza rápida.
* **Cópia Rápida:** Botões dedicados para copiar tanto o `MASTER_SECRET` quanto a senha derivada para a área de transferência com um clique.

---

## 🌐 Deploy na Vercel

Este projeto não possui dependências de *build* ou *backend*, permitindo hospedagem estática gratuita com HTTPS automático:

1. Faça o *push* deste repositório para sua conta no **GitHub**.
2. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório `mac-password-gen`.
3. Em **Framework Preset**, mantenha **Other** (deixe *Build Command* e *Output Directory* vazios).
4. Clique em **Deploy**.

---

## 🐍 Equivalência em Python (Automação / Backend / CLI)

Para integrar a mesma geração de senhas em scripts de provisionamento (IXC, GenieACS, Ansible, RouterOS, etc.), utilize o código abaixo, que produz **exatamente os mesmos resultados** da interface web:

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

* **Proteja o `MASTER_SECRET`:** Armazene a chave mestra em um cofre de senhas corporativo (ex: Bitwarden/Vaultwarden) e em variáveis de ambiente nos servidores de automação. Nunca faça *commit* da chave real no código-fonte.
* **Rotação de Chaves:** Caso precise invalidar senhas antigas e gerar um novo padrão, basta gerar um novo `MASTER_SECRET` (ou adicionar um sufixo de versão à chave atual, como `chave-atual-v2`).
* **Escolha da Interface:** Ao provisionar equipamentos com múltiplas interfaces (WAN, LAN, WLAN), padronize qual MAC será utilizado como referência (ex: MAC da interface WAN ou MAC base impresso na etiqueta do chassi).

```
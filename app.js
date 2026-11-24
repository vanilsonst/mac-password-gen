const STORAGE_KEY = 'mac_derivador_master_secret';

// Carrega o MASTER_SECRET salvo ao abrir a página
window.addEventListener('DOMContentLoaded', () => {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (salvo) {
    document.getElementById('secret').value = salvo;
    document.getElementById('rememberSecret').checked = true;
    document.getElementById('btnClearStorage').classList.remove('hidden');
  }
});

function gerenciarStorage() {
  const checkbox = document.getElementById('rememberSecret');
  const secret = document.getElementById('secret').value;
  const btnClear = document.getElementById('btnClearStorage');

  if (checkbox.checked) {
    if (secret) {
      localStorage.setItem(STORAGE_KEY, secret);
      btnClear.classList.remove('hidden');
    }
  } else {
    localStorage.removeItem(STORAGE_KEY);
    btnClear.classList.add('hidden');
  }
}

function atualizarSecretSalvo() {
  const checkbox = document.getElementById('rememberSecret');
  const secret = document.getElementById('secret').value;
  const btnClear = document.getElementById('btnClearStorage');

  if (checkbox.checked) {
    if (secret) {
      localStorage.setItem(STORAGE_KEY, secret);
      btnClear.classList.remove('hidden');
    } else {
      localStorage.removeItem(STORAGE_KEY);
      btnClear.classList.add('hidden');
    }
  }
}

function limparStorage() {
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById('secret').value = '';
  document.getElementById('rememberSecret').checked = false;
  document.getElementById('btnClearStorage').classList.add('hidden');
}

function normalizarMac(mac) {
  const limpo = mac.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
  if (limpo.length !== 12) {
    throw new Error('Endereço MAC inválido. Informe 12 dígitos hexadecimais.');
  }
  return limpo;
}

function gerarSecret() {
  const array = new Uint8Array(24);
  window.crypto.getRandomValues(array);
  const secretHex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  const input = document.getElementById('secret');
  input.value = secretHex;
  input.type = 'text';
  atualizarSecretSalvo();
}

function toggleSecret() {
  const input = document.getElementById('secret');
  input.type = input.type === 'password' ? 'text' : 'password';
}

async function calcularSenha() {
  const errorEl = document.getElementById('errorMsg');
  const resultBox = document.getElementById('resultBox');
  errorEl.classList.add('hidden');

  try {
    const secret = document.getElementById('secret').value;
    const macRaw = document.getElementById('mac').value;
    const tamanho = parseInt(document.getElementById('length').value, 10);

    if (!secret) throw new Error('Informe ou gere um MASTER_SECRET.');
    if (isNaN(tamanho) || tamanho < 12 || tamanho > 32) {
      throw new Error('O tamanho deve estar entre 12 e 32 caracteres.');
    }

    const macNorm = normalizarMac(macRaw);
    const enc = new TextEncoder();

    const key = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await window.crypto.subtle.sign('HMAC', key, enc.encode(macNorm));
    const digest = new Uint8Array(signature);

    const minusculas = 'abcdefghijklmnopqrstuvwxyz';
    const maiusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeros = '0123456789';
    const especiais = '!@#$%&*_-+=';
    const todos = minusculas + maiusculas + numeros + especiais;

    const chars = [
      minusculas[digest[0] % minusculas.length],
      maiusculas[digest[1] % maiusculas.length],
      numeros[digest[2] % numeros.length],
      especiais[digest[3] % especiais.length],
    ];

    for (let i = 4; i < tamanho; i++) {
      chars.push(todos[digest[i] % todos.length]);
    }

    for (let i = tamanho - 1; i > 0; i--) {
      const j = digest[16 + (i % 16)] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    document.getElementById('macNormalized').textContent = macNorm.match(/.{2}/g).join(':').toUpperCase();
    document.getElementById('passwordOutput').textContent = chars.join('');
    resultBox.classList.remove('hidden');
  } catch (err) {
    resultBox.classList.add('hidden');
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

async function copiarTexto(elementId, btnId, isInput) {
  const el = document.getElementById(elementId);
  const texto = isInput ? el.value : el.textContent;
  if (!texto) return;

  await navigator.clipboard.writeText(texto);

  const btn = document.getElementById(btnId);
  const textoOriginal = btn.textContent;
  btn.textContent = 'Copiado!';
  setTimeout(() => {
    btn.textContent = textoOriginal;
  }, 1800);
}
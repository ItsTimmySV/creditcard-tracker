let cards = [];
let selectedId = null;
let editMode = null;

const themeBtn = document.getElementById('theme-switcher');
const cardList = document.getElementById('card-list');
const details = document.getElementById('card-details');
const welcome = document.getElementById('welcome');
const modal = document.getElementById('card-modal');
const form = document.getElementById('card-form');
const importInput = document.getElementById('import-input');

function save() {
  localStorage.setItem('cards', JSON.stringify(cards));
}
function load() {
  const data = localStorage.getItem('cards');
  if (data) cards = JSON.parse(data);
}
function exportData() {
  const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cards.json';
  a.click();
}
importInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        cards = data;
        selectedId = null;
        save();
        render();
      }
    } catch {}
  };
  reader.readAsText(file);
});
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-theme');
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
});
function openModal(card = null) {
  editMode = card?.id || null;
  document.getElementById('modal-title').textContent = card ? 'Editar Tarjeta' : 'Añadir Tarjeta';
  form.nickname.value = card?.nickname || '';
  form.bank.value = card?.bank || '';
  form.last4.value = card?.last4 || '';
  form.limit.value = card?.limit || '';
  form.cutoff.value = card?.cutoff || '';
  form.payment.value = card?.payment || '';
  modal.classList.remove('hidden');
}
function closeModal() {
  modal.classList.add('hidden');
  form.reset();
  editMode = null;
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    id: editMode || Date.now().toString(),
    nickname: form.nickname.value,
    bank: form.bank.value,
    last4: form.last4.value,
    limit: parseFloat(form.limit.value),
    cutoff: parseInt(form.cutoff.value),
    payment: parseInt(form.payment.value),
    transactions: []
  };
  if (editMode) {
    cards = cards.map(c => (c.id === editMode ? data : c));
  } else {
    cards.push(data);
  }
  save();
  closeModal();
  selectedId = data.id;
  render();
});
document.getElementById('add-card-btn').addEventListener('click', () => openModal());

function render() {
  cardList.innerHTML = '';
  cards.forEach(card => {
    const div = document.createElement('div');
    div.className = 'card-item';
    div.innerHTML = `<strong>${card.nickname}</strong><br><small>${card.bank} - **** ${card.last4}</small>`;
    div.onclick = () => {
      selectedId = card.id;
      render();
    };
    cardList.appendChild(div);
  });

  const card = cards.find(c => c.id === selectedId);
  if (!card) {
    details.classList.add('hidden');
    welcome.classList.remove('hidden');
    return;
  }
  welcome.classList.add('hidden');
  details.classList.remove('hidden');

  const today = new Date();
  const cutoff = getNextDate(card.cutoff);
  const payment = getNextDate(card.payment);

  details.innerHTML = `
    <h2>${card.nickname} <small>${card.bank} - ****${card.last4}</small></h2>
    <p><strong>Crédito disponible:</strong> $${card.limit.toFixed(2)}</p>
    <p><strong>Próximo corte:</strong> ${cutoff.toLocaleDateString()} (en ${daysBetween(today, cutoff)} días)</p>
    <p><strong>Fecha de pago:</strong> ${payment.toLocaleDateString()} (en ${daysBetween(today, payment)} días)</p>
    <div class="buttons">
      <button onclick="openModal(cards.find(c => c.id === '${card.id}'))">Editar</button>
      <button onclick="deleteCard('${card.id}')">Eliminar</button>
    </div>
  `;
}
function getNextDate(day) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), day);
  if (d < now) d.setMonth(d.getMonth() + 1);
  return d;
}
function daysBetween(a, b) {
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}
function deleteCard(id) {
  if (confirm('¿Eliminar tarjeta?')) {
    cards = cards.filter(c => c.id !== id);
    selectedId = null;
    save();
    render();
  }
}

(function init() {
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.add('dark-theme');
  }
  load();
  render();
})();

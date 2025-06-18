// script.js

// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  let cards = [];
  let selectedCardId = null;

  const themeSwitcher = document.getElementById('theme-switcher');
  const cardListEl = document.getElementById('card-list');
  const addCardBtn = document.getElementById('add-card-btn');
  const addCardModal = document.getElementById('add-card-modal');
  const addCardForm = document.getElementById('add-card-form');
  const closeBtns = document.querySelectorAll('.close-btn');
  const welcomeMessageEl = document.getElementById('welcome-message');
  const detailsContentEl = document.getElementById('details-content');
  const summaryContainerEl = document.getElementById('summary-container');

  function saveData() {
    localStorage.setItem('creditCardData', JSON.stringify(cards));
  }

  function loadData() {
    const data = localStorage.getItem('creditCardData');
    if (data) cards = JSON.parse(data);
  }

  function exportarJSON() {
    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'creditcardtracker_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.exportarJSON = exportarJSON;

  document.getElementById('importar-json').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const importedData = JSON.parse(e.target.result);
        if (Array.isArray(importedData)) {
          cards = importedData;
          selectedCardId = cards.length > 0 ? cards[0].id : null;
          saveData();
          render();
          Swal.fire('¡Importado!', 'Los datos fueron importados correctamente.', 'success');
        } else throw new Error();
      } catch {
        Swal.fire('Error', 'El archivo JSON no es válido.', 'error');
      }
    };
    reader.readAsText(file);
  });

  themeSwitcher.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.className);
  });

  function renderCardList() {
    cardListEl.innerHTML = '';
    cards.forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className = 'credit-card-item';
      cardEl.dataset.id = card.id;
      cardEl.innerHTML = `<h3>${card.nickname}</h3><p>${card.bank} - **** ${card.last4}</p>`;
      cardEl.addEventListener('click', () => {
        selectedCardId = card.id;
        render();
      });
      cardListEl.appendChild(cardEl);
    });
  }

  function renderCardDetails() {
    if (!selectedCardId) {
      welcomeMessageEl.classList.remove('hidden');
      detailsContentEl.classList.add('hidden');
      summaryContainerEl.classList.add('hidden');
      return;
    }

    const card = cards.find(c => c.id === selectedCardId);
    if (!card) return;

    welcomeMessageEl.classList.add('hidden');
    detailsContentEl.classList.remove('hidden');
    summaryContainerEl.classList.remove('hidden');

    const balance = card.transactions.reduce((acc, tx) => acc + tx.amount, 0);
    const availableCredit = card.creditLimit - balance;

    detailsContentEl.innerHTML = `
      <div class="details-header">
        <h2>${card.nickname} <small>${card.bank} - **** ${card.last4}</small></h2>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <h4>Balance actual</h4>
          <p>$${balance.toFixed(2)}</p>
        </div>
        <div class="stat-card">
          <h4>Crédito disponible</h4>
          <p>$${availableCredit.toFixed(2)}</p>
        </div>
      </div>
    `;
  }

  function render() {
    renderCardList();
    renderCardDetails();
    saveData();
  }

  closeBtns.forEach(btn => btn.addEventListener('click', () => {
    addCardModal.style.display = 'none';
  }));

  addCardBtn.addEventListener('click', () => {
    addCardModal.style.display = 'block';
  });

  addCardForm.addEventListener('submit', e => {
    e.preventDefault();
    const nickname = document.getElementById('card-nickname').value;
    const bank = document.getElementById('card-bank').value;
    const last4 = document.getElementById('card-last4').value;
    const creditLimit = parseFloat(document.getElementById('credit-limit').value);
    const newCard = {
      id: `card_${Date.now()}`,
      nickname,
      bank,
      last4,
      creditLimit,
      transactions: []
    };
    cards.push(newCard);
    selectedCardId = newCard.id;
    addCardModal.style.display = 'none';
    addCardForm.reset();
    render();
  });

  const savedTheme = localStorage.getItem('theme');
  document.body.className = savedTheme || 'dark-theme';
  loadData();
  if (cards.length > 0) selectedCardId = cards[0].id;
  render();
});

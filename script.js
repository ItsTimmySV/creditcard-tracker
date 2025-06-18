document.addEventListener('DOMContentLoaded', () => {
  let cards = [];
  let selectedCardId = null;

  const themeSwitcher = document.getElementById('theme-switcher');
  const cardList = document.getElementById('card-list');
  const addCardBtn = document.getElementById('add-card-btn');
  const addCardModal = document.getElementById('add-card-modal');
  const addCardForm = document.getElementById('add-card-form');
  const transactionModal = document.getElementById('transaction-modal');
  const transactionForm = document.getElementById('add-transaction-form');
  const detailsContent = document.getElementById('details-content');
  const welcomeMessage = document.getElementById('welcome-message');
  const fileInput = document.getElementById('importar-json');
  const closeBtns = document.querySelectorAll('.close-btn');

  function save() {
    localStorage.setItem('creditCardData', JSON.stringify(cards));
  }

  function load() {
    const data = localStorage.getItem('creditCardData');
    if (data) cards = JSON.parse(data);
  }

  function exportarJSON() {
    const data = JSON.stringify(cards, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'creditcardtracker_backup.json';
    a.click();
  }

  window.exportarJSON = exportarJSON;

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const data = JSON.parse(evt.target.result);
        cards = data;
        selectedCardId = cards[0]?.id || null;
        save();
        render();
      } catch {
        alert('Archivo inválido');
      }
    };
    reader.readAsText(file);
  });

  themeSwitcher.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');
  });

  addCardBtn.addEventListener('click', () => {
    addCardForm.reset();
    addCardModal.style.display = 'flex';
  });

  addCardForm.addEventListener('submit', e => {
    e.preventDefault();
    const card = {
      id: document.getElementById('card-id').value || `card_${Date.now()}`,
      nickname: document.getElementById('card-nickname').value,
      bank: document.getElementById('card-bank').value,
      last4: document.getElementById('card-last4').value,
      creditLimit: parseFloat(document.getElementById('credit-limit').value),
      cutoffDay: parseInt(document.getElementById('cutoff-day').value),
      paymentDay: parseInt(document.getElementById('payment-day').value),
      transactions: []
    };
    const existingIndex = cards.findIndex(c => c.id === card.id);
    if (existingIndex >= 0) {
      cards[existingIndex] = card;
    } else {
      cards.push(card);
    }
    selectedCardId = card.id;
    addCardModal.style.display = 'none';
    save();
    render();
  });

  transactionForm.addEventListener('submit', e => {
    e.preventDefault();
    const card = cards.find(c => c.id === selectedCardId);
    if (!card) return;
    const description = document.getElementById('transaction-description').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const type = document.getElementById('transaction-type').value;
    const signedAmount = type === 'expense' ? amount : -amount;
    card.transactions.push({ description, amount: signedAmount, date: new Date().toISOString() });
    transactionModal.style.display = 'none';
    save();
    render();
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').style.display = 'none';
    });
  });

  function renderCardList() {
    cardList.innerHTML = '';
    cards.forEach(card => {
      const div = document.createElement('div');
      div.className = 'credit-card-item';
      div.innerHTML = `<h3>${card.nickname}</h3><p>${card.bank} - **** ${card.last4}</p>`;
      div.onclick = () => {
        selectedCardId = card.id;
        render();
      };
      cardList.appendChild(div);
    });
  }

  function renderCardDetails() {
    const card = cards.find(c => c.id === selectedCardId);
    if (!card) {
      welcomeMessage.classList.remove('hidden');
      detailsContent.classList.add('hidden');
      return;
    }

    welcomeMessage.classList.add('hidden');
    detailsContent.classList.remove('hidden');

    const balance = card.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const available = card.creditLimit - balance;

    const today = new Date();
    const cutoffDate = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > card.cutoffDay ? 1 : 0), card.cutoffDay);
    const paymentDate = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > card.paymentDay ? 1 : 0), card.paymentDay);
    const daysToPayment = Math.ceil((paymentDate - today) / (1000 * 60 * 60 * 24));

    detailsContent.innerHTML = `
      <div class="details-header">
        <h2>${card.nickname} <small>${card.bank} - ****${card.last4}</small></h2>
        <div class="details-header-buttons">
          <button class="btn" onclick="editCard('${card.id}')">Editar</button>
          <button class="btn btn-danger" onclick="deleteCard('${card.id}')">Eliminar</button>
          <button class="btn btn-success" onclick="transactionModal.style.display='flex'">Añadir Gasto/Pago</button>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><h4>Balance</h4><p>$${balance.toFixed(2)}</p></div>
        <div class="stat-card"><h4>Disponible</h4><p>$${available.toFixed(2)}</p></div>
        <div class="stat-card"><h4>Fecha de Corte</h4><p>${cutoffDate.toLocaleDateString()}</p></div>
        <div class="stat-card"><h4>Pago en</h4><p>${daysToPayment} días (${paymentDate.toLocaleDateString()})</p></div>
      </div>
    `;
  }

  window.editCard = function (id) {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    document.getElementById('card-id').value = card.id;
    document.getElementById('card-nickname').value = card.nickname;
    document.getElementById('card-bank').value = card.bank;
    document.getElementById('card-last4').value = card.last4;
    document.getElementById('credit-limit').value = card.creditLimit;
    document.getElementById('cutoff-day').value = card.cutoffDay;
    document.getElementById('payment-day').value = card.paymentDay;
    addCardModal.style.display = 'flex';
  };

  window.deleteCard = function (id) {
    Swal.fire({
      title: '¿Eliminar tarjeta?',
      text: 'Esto eliminará todos sus movimientos',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        cards = cards.filter(c => c.id !== id);
        selectedCardId = cards[0]?.id || null;
        save();
        render();
      }
    });
  };

  load();
  render();

  function render() {
    renderCardList();
    renderCardDetails();
  }
});

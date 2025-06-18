document.addEventListener('DOMContentLoaded', () => { let cards = []; let selectedCardId = null;

const themeSwitcher = document.getElementById('theme-switcher');
const cardListEl = document.getElementById('card-list');
const addCardBtn = document.getElementById('add-card-btn');
const addCardModal = document.getElementById('add-card-modal');
const addCardForm = document.getElementById('add-card-form');
const closeBtns = document.querySelectorAll('.close-btn');
const welcomeMessageEl = document.getElementById('welcome-message');
const detailsContentEl = document.getElementById('details-content');
const summaryContainerEl = document.getElementById('summary-container');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const addTransactionModal = document.getElementById('add-transaction-modal');
const addTransactionForm = document.getElementById('add-transaction-form');

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

function getCardDates(cutoffDay, paymentDay) {
    const today = new Date();
    let nextCutoff = new Date(today.getFullYear(), today.getMonth(), cutoffDay);
    if (today.getDate() > cutoffDay) nextCutoff.setMonth(nextCutoff.getMonth() + 1);
    let nextPayment = new Date(nextCutoff);
    nextPayment.setMonth(nextPayment.getMonth() + (paymentDay < cutoffDay ? 1 : 0));
    nextPayment.setDate(paymentDay);
    const daysUntilPayment = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));
    return { nextCutoff, nextPayment, daysUntilPayment };
}

function handleEditCard(e) {
    const cardId = e.currentTarget.dataset.id;
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    document.getElementById('card-nickname').value = card.nickname;
    document.getElementById('card-bank').value = card.bank;
    document.getElementById('card-last4').value = card.last4;
    document.getElementById('credit-limit').value = card.creditLimit;
    document.getElementById('cutoff-day').value = card.cutoffDay;
    document.getElementById('payment-day').value = card.paymentDay;
    addCardForm.setAttribute('data-edit-id', cardId);
    addCardModal.style.display = 'block';
}

function handleDeleteCard(cardId) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(result => {
        if (result.isConfirmed) {
            cards = cards.filter(card => card.id !== cardId);
            selectedCardId = null;
            saveData();
            render();
        }
    });
}

function handleAddCard(e) {
    e.preventDefault();
    const editId = addCardForm.getAttribute('data-edit-id');
    const cardData = {
        nickname: document.getElementById('card-nickname').value,
        bank: document.getElementById('card-bank').value,
        last4: document.getElementById('card-last4').value,
        creditLimit: parseFloat(document.getElementById('credit-limit').value),
        cutoffDay: parseInt(document.getElementById('cutoff-day').value),
        paymentDay: parseInt(document.getElementById('payment-day').value)
    };
    if (editId) {
        const index = cards.findIndex(c => c.id === editId);
        if (index !== -1) {
            cards[index] = { ...cards[index], ...cardData };
            selectedCardId = editId;
            Swal.fire('Actualizada', 'Tarjeta actualizada correctamente.', 'success');
        }
        addCardForm.removeAttribute('data-edit-id');
    } else {
        const newCard = {
            id: `card_${Date.now()}`,
            ...cardData,
            transactions: []
        };
        cards.push(newCard);
        selectedCardId = newCard.id;
        Swal.fire('Añadida', 'Tarjeta nueva añadida correctamente.', 'success');
    }
    addCardForm.reset();
    addCardModal.style.display = 'none';
    render();
}

function handleAddTransaction(e) {
    e.preventDefault();
    const description = document.getElementById('transaction-description').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const type = document.getElementById('transaction-type').value;
    const card = cards.find(c => c.id === selectedCardId);
    if (!card) return;
    const signedAmount = type === 'expense' ? amount : -amount;
    card.transactions.push({ description, amount: signedAmount, date: new Date().toISOString() });
    addTransactionForm.reset();
    addTransactionModal.style.display = 'none';
    render();
}

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
    const { nextCutoff, nextPayment, daysUntilPayment } = getCardDates(card.cutoffDay, card.paymentDay);
    const balance = card.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const availableCredit = card.creditLimit - balance;
    const usage = (balance / card.creditLimit) * 100;

    detailsContentEl.innerHTML = `
        <div class="details-header">
            <h2>${card.nickname} <small>${card.bank} - **** ${card.last4}</small></h2>
            <div class="details-header-buttons">
                <button class="btn" id="edit-card-btn" data-id="${card.id}">Editar</button>
                <button class="btn btn-danger" id="delete-card-btn" data-id="${card.id}">Eliminar</button>
                <button class="btn btn-success" id="add-transaction-btn">Añadir Gasto</button>
            </div>
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
            <div class="stat-card">
                <h4>Próximo corte</h4>
                <p>${nextCutoff.toLocaleDateString()}</p>
            </div>
            <div class="stat-card">
                <h4>Próximo pago</h4>
                <p>${nextPayment.toLocaleDateString()} <small>(${daysUntilPayment} días restantes)</small></p>
            </div>
        </div>
        <div class="transactions-section">
            <div class="transactions-header">
                <h3>Movimientos</h3>
            </div>
            <ul class="transaction-list">
                ${card.transactions.length === 0 ? '<li>No hay movimientos.</li>' : card.transactions.map(tx => `
                    <li class="transaction-item ${tx.amount >= 0 ? 'expense' : 'payment'}">
                        <div>
                            <span class="description">${tx.description}</span>
                            <span class="date">${new Date(tx.date).toLocaleDateString()}</span>
                        </div>
                        <div class="amount">$${Math.abs(tx.amount).toFixed(2)}</div>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;

    welcomeMessageEl.classList.add('hidden');
    detailsContentEl.classList.remove('hidden');
    summaryContainerEl.classList.remove('hidden');

    document.getElementById('edit-card-btn').addEventListener('click', handleEditCard);
    document.getElementById('delete-card-btn').addEventListener('click', () => handleDeleteCard(card.id));
    document.getElementById('add-transaction-btn').addEventListener('click', () => addTransactionModal.style.display = 'block');
}

function render() {
    renderCardList();
    renderCardDetails();
    saveData();
}

closeBtns.forEach(btn => btn.addEventListener('click', () => {
    addCardModal.style.display = 'none';
    addTransactionModal.style.display = 'none';
}));
addCardForm.addEventListener('submit', handleAddCard);
addTransactionForm.addEventListener('submit', handleAddTransaction);
addCardBtn.addEventListener('click', () => {
    addCardForm.reset();
    addCardForm.removeAttribute('data-edit-id');
    addCardModal.style.display = 'block';
});

const savedTheme = localStorage.getItem('theme');
document.body.className = savedTheme || 'dark-theme';
loadData();
if (cards.length > 0) selectedCardId = cards[0].id;
render();

});


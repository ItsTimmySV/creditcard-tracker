document.addEventListener('DOMContentLoaded', () => {
    // State management
    let cards = [];
    let selectedCardId = null;

    // DOM Elements
    const themeSwitcher = document.getElementById('theme-switcher');
    const cardListEl = document.getElementById('card-list');
    const addCardBtn = document.getElementById('add-card-btn');
    const addCardModal = document.getElementById('add-card-modal');
    const addCardForm = document.getElementById('add-card-form');
    const addExpenseModal = document.getElementById('add-expense-modal');
    const addExpenseForm = document.getElementById('add-expense-form');
    const addPaymentModal = document.getElementById('add-payment-modal');
    const addPaymentForm = document.getElementById('add-payment-form');
    const closeBtns = document.querySelectorAll('.close-btn');
    const welcomeMessageEl = document.getElementById('welcome-message');
    const detailsContentEl = document.getElementById('details-content');
    const expenseCardIdInput = document.getElementById('expense-card-id');
    const paymentCardIdInput = document.getElementById('payment-card-id');
    const summaryContainerEl = document.getElementById('summary-container');
    
    // --- Data Functions ---
    const saveData = () => {
        localStorage.setItem('creditCardData', JSON.stringify(cards));
    };

    const loadData = () => {
        const data = localStorage.getItem('creditCardData');
        if (data) {
            cards = JSON.parse(data);
        }
    };

    // --- Render Functions ---
    const renderSummary = () => {
        if (cards.length === 0) {
            summaryContainerEl.classList.add('hidden');
            return;
        }
        summaryContainerEl.classList.remove('hidden');

        const totalBalance = cards.reduce((total, card) => {
            const cardBalance = card.transactions.reduce((sum, tx) => sum + tx.amount, 0);
            return total + cardBalance;
        }, 0);

        const totalLimit = cards.reduce((total, card) => total + card.creditLimit, 0);
        const totalAvailable = totalLimit - totalBalance;
        const totalUsagePercentage = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
        
        let usageBarClass = '';
        if (totalUsagePercentage > 90) usageBarClass = 'over-limit';
        else if (totalUsagePercentage > 75) usageBarClass = 'high-usage';
        
        summaryContainerEl.innerHTML = `
            <h3>Resumen General</h3>
            <div class="summary-item">
                <span>Deuda Total</span>
                <strong>$${totalBalance.toFixed(2)}</strong>
            </div>
            <div class="summary-item">
                <span>Disponible Total</span>
                <strong>$${totalAvailable.toFixed(2)}</strong>
            </div>
             <div class="summary-item">
                <span>Límite de Crédito Total</span>
                <strong>$${totalLimit.toFixed(2)}</strong>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar ${usageBarClass}" style="width: ${Math.min(totalUsagePercentage, 100)}%;"></div>
            </div>
            <small>Uso general: ${totalUsagePercentage.toFixed(2)}%</small>
        `;
    };

    const renderCardList = () => {
        cardListEl.innerHTML = '';
        if (cards.length === 0) {
            cardListEl.innerHTML = '<p class="empty-list-msg">No hay tarjetas. ¡Añade una!</p>';
        } else {
            cards.forEach(card => {
                const cardEl = document.createElement('div');
                cardEl.className = 'credit-card-item';
                cardEl.dataset.id = card.id;
                if (card.id === selectedCardId) {
                    cardEl.classList.add('selected');
                }
                cardEl.innerHTML = `
                    <h3>${card.nickname}</h3>
                    <p>${card.bank} - **** ${card.last4}</p>
                `;
                cardEl.addEventListener('click', () => {
                    selectedCardId = card.id;
                    render();
                });
                cardListEl.appendChild(cardEl);
            });
        }
    };

    const renderCardDetails = () => {
        if (!selectedCardId) {
            welcomeMessageEl.classList.remove('hidden');
            detailsContentEl.classList.add('hidden');
            return;
        }

        const card = cards.find(c => c.id === selectedCardId);
        if (!card) {
            selectedCardId = null;
            renderCardDetails(); // Rerender welcome message
            return;
        }

        welcomeMessageEl.classList.add('hidden');
        detailsContentEl.classList.remove('hidden');

        const balance = card.transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const availableCredit = card.creditLimit - balance;
        const usagePercentage = (balance / card.creditLimit) * 100;
        
        const { nextCutoff, nextPayment, daysUntilPayment } = getCardDates(card.cutoffDay, card.paymentDay);
        
        let paymentAlertClass = '';
        if (daysUntilPayment <= 3) paymentAlertClass = 'alert';
        else if (daysUntilPayment <= 7) paymentAlertClass = 'alert-soon';

        let usageBarClass = '';
        if (usagePercentage > 90) usageBarClass = 'over-limit';
        else if (usagePercentage > 75) usageBarClass = 'high-usage';
        
        detailsContentEl.innerHTML = `
            <div class="details-header">
                <div>
                    <h2>${card.nickname} <small>${card.bank} - **** ${card.last4}</small></h2>
                </div>
                <div class="details-header-buttons">
                    <button class="btn btn-success" id="add-payment-detail-btn" data-id="${card.id}">Realizar Pago</button>
                    <button class="btn btn-danger" id="delete-card-btn" data-id="${card.id}">Eliminar</button>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Balance Actual</h4>
                    <p>$${balance.toFixed(2)}</p>
                    <div class="progress-bar-container">
                       <div class="progress-bar ${usageBarClass}" style="width: ${Math.min(usagePercentage, 100)}%;"></div>
                    </div>
                </div>
                <div class="stat-card">
                    <h4>Crédito Disponible</h4>
                    <p>$${availableCredit.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h4>Próximo Corte</h4>
                    <p>${nextCutoff.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                </div>
                <div class="stat-card">
                    <h4>Fecha de Pago</h4>
                    <p class="${paymentAlertClass}">${nextPayment.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                    <small>Quedan ${daysUntilPayment} días</small>
                </div>
            </div>

            <div class="transactions-section">
                <div class="transactions-header">
                    <h3>Movimientos</h3>
                    <button class="btn" id="add-expense-detail-btn" data-id="${card.id}"><i class="fas fa-plus"></i> Añadir Gasto</button>
                </div>
                <ul class="transaction-list" id="transaction-list-ul">
                    ${card.transactions.length === 0 ? '<li>No hay movimientos.</li>' : ''}
                    ${[...card.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => {
                        const isPayment = tx.amount < 0;
                        return `
                        <li class="transaction-item ${isPayment ? 'payment' : 'expense'}">
                            <div>
                                <div class="description">${tx.description}</div>
                                <div class="date">${new Date(tx.date).toLocaleDateString('es-ES')}</div>
                            </div>
                            <div class="amount">${isPayment ? '-$' + Math.abs(tx.amount).toFixed(2) : '$' + tx.amount.toFixed(2)}</div>
                        </li>`
                    }).join('')}
                </ul>
            </div>
        `;

        document.getElementById('add-expense-detail-btn').addEventListener('click', handleOpenExpenseModal);
        document.getElementById('add-payment-detail-btn').addEventListener('click', handleOpenPaymentModal);
        document.getElementById('delete-card-btn').addEventListener('click', handleDeleteCard);
    };
    
    const render = () => {
        saveData();
        renderSummary();
        renderCardList();
        renderCardDetails();
    };

    // --- Event Handlers ---
    const handleThemeSwitch = () => {
        document.body.classList.toggle('dark-theme');
        document.body.classList.toggle('light-theme');
        localStorage.setItem('theme', document.body.className);
    };

    const handleOpenModal = (modal) => {
        modal.style.display = 'block';
    };

    const handleCloseModals = () => {
        addCardModal.style.display = 'none';
        addExpenseModal.style.display = 'none';
        addPaymentModal.style.display = 'none';
    };

    const handleAddCard = (e) => {
        e.preventDefault();
        const newCard = {
            id: `card_${Date.now()}`,
            nickname: document.getElementById('card-nickname').value,
            bank: document.getElementById('card-bank').value,
            last4: document.getElementById('card-last4').value,
            creditLimit: parseFloat(document.getElementById('credit-limit').value),
            cutoffDay: parseInt(document.getElementById('cutoff-day').value),
            paymentDay: parseInt(document.getElementById('payment-day').value),
            transactions: []
        };
        cards.push(newCard);
        addCardForm.reset();
        handleCloseModals();
        selectedCardId = newCard.id;
        render();
        Swal.fire('¡Éxito!', 'Tarjeta añadida correctamente.', 'success');
    };

    const handleOpenExpenseModal = (e) => {
        const cardId = e.currentTarget.dataset.id;
        expenseCardIdInput.value = cardId;
        document.getElementById('expense-date').valueAsDate = new Date();
        handleOpenModal(addExpenseModal);
    };
    
    const handleOpenPaymentModal = (e) => {
        const cardId = e.currentTarget.dataset.id;
        paymentCardIdInput.value = cardId;
        document.getElementById('payment-date').valueAsDate = new Date();
        handleOpenModal(addPaymentModal);
    };

    const handleAddExpense = (e) => {
        e.preventDefault();
        const cardId = expenseCardIdInput.value;
        const card = cards.find(c => c.id === cardId);
        if(card) {
            const newExpense = {
                id: `tx_${Date.now()}`,
                description: document.getElementById('expense-description').value,
                amount: parseFloat(document.getElementById('expense-amount').value),
                date: document.getElementById('expense-date').value,
                category: document.getElementById('expense-category').value
            };
            card.transactions.push(newExpense);
            addExpenseForm.reset();
            handleCloseModals();
            render();
        }
    };
    
    const handleAddPayment = (e) => {
        e.preventDefault();
        const cardId = paymentCardIdInput.value;
        const card = cards.find(c => c.id === cardId);
        if (card) {
            const paymentAmount = parseFloat(document.getElementById('payment-amount').value);
            const newPayment = {
                id: `tx_${Date.now()}`,
                description: 'Pago a la tarjeta',
                amount: -paymentAmount, // Store payments as negative values
                date: document.getElementById('payment-date').value,
            };
            card.transactions.push(newPayment);
            addPaymentForm.reset();
            handleCloseModals();
            render();
            Swal.fire('¡Éxito!', 'Pago registrado correctamente.', 'success');
        }
    };
    
    const handleDeleteCard = (e) => {
        const cardId = e.currentTarget.dataset.id;
        Swal.fire({
            title: '¿Estás seguro?',
            text: "¡No podrás revertir esto!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, ¡bórrala!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                cards = cards.filter(c => c.id !== cardId);
                selectedCardId = null;
                render();
                Swal.fire('¡Borrada!', 'Tu tarjeta ha sido eliminada.', 'success');
            }
        });
    };

    // --- Utility Functions ---
    function getCardDates(cutoffDay, paymentDay) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();

        let cutoffMonth = currentMonth;
        if (currentDate > cutoffDay) {
            cutoffMonth += 1;
        }
        let nextCutoff = new Date(currentYear, cutoffMonth, cutoffDay);

        let paymentMonth = currentMonth;
        // If payment day is in the next month relative to cutoff day (e.g., cut on 25th, pay on 10th)
        if (paymentDay < cutoffDay) {
            // if we are past the cutoff day this month, payment is next month
            if (currentDate > cutoffDay) {
                 paymentMonth += 1;
            }
        }
        // if we are already past this month's payment day
        if (currentDate > paymentDay) {
            paymentMonth += 1;
        }

        let nextPayment = new Date(currentYear, paymentMonth, paymentDay);

        const diffTime = nextPayment - today;
        const daysUntilPayment = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        
        return { nextCutoff, nextPayment, daysUntilPayment };
    }


    // --- Initial Setup ---
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.className = savedTheme;
    } else {
        document.body.className = 'dark-theme';
    }

    loadData();
    
    if (cards.length > 0) {
        selectedCardId = cards[0].id;
    }

    render();

    // Event Listeners
    themeSwitcher.addEventListener('click', handleThemeSwitch);
    addCardBtn.addEventListener('click', () => handleOpenModal(addCardModal));
    closeBtns.forEach(btn => btn.addEventListener('click', handleCloseModals));
    window.addEventListener('click', (e) => {
        if (e.target === addCardModal || e.target === addExpenseModal || e.target === addPaymentModal) {
            handleCloseModals();
        }
    });
    addCardForm.addEventListener('submit', handleAddCard);
    addExpenseForm.addEventListener('submit', handleAddExpense);
    addPaymentForm.addEventListener('submit', handleAddPayment);

    // Exportar datos como archivo JSON
function exportarJSON() {
    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });

    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, 'creditcardtracker_backup.json');
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "creditcardtracker_backup.json";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
}



// Importar datos desde archivo JSON
document.getElementById('importar-json').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                cards = importedData;
                selectedCardId = cards.length > 0 ? cards[0].id : null;
                saveData();
                render();
                Swal.fire('¡Importado!', 'Los datos fueron importados correctamente.', 'success');
            } else {
                throw new Error("El archivo no contiene un arreglo válido.");
            }
        } catch (err) {
            Swal.fire('Error', 'El archivo JSON no es válido.', 'error');
        }
    };
    reader.readAsText(file);
});
});

window.exportarJSON = exportarJSON;

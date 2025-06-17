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

    const saveData = () => {
        localStorage.setItem('creditCardData', JSON.stringify(cards));
    };
    const loadData = () => {
        const data = localStorage.getItem('creditCardData');
        if (data) cards = JSON.parse(data);
    };

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

    const handleEditCard = (e) => {
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
    };

    const handleDeleteCard = (e) => {
        const cardId = e.currentTarget.dataset.id;
        Swal.fire({
            title: '¿Eliminar tarjeta?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                cards = cards.filter(c => c.id !== cardId);
                selectedCardId = null;
                saveData();
                render();
            }
        });
    };

    const handleAddCard = (e) => {
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
    };

    const renderSummary = () => {
        if (!summaryContainerEl) return;
        if (cards.length === 0) {
            summaryContainerEl.classList.add('hidden');
            return;
        }
        const totalBalance = cards.reduce((total, card) => {
            return total + card.transactions.reduce((sum, tx) => sum + tx.amount, 0);
        }, 0);
        const totalLimit = cards.reduce((total, card) => total + card.creditLimit, 0);
        const totalAvailable = totalLimit - totalBalance;
        const usage = totalLimit ? (totalBalance / totalLimit) * 100 : 0;
        summaryContainerEl.classList.remove('hidden');
        summaryContainerEl.innerHTML = `
            <h3>Resumen General</h3>
            <div class="summary-item">
                <span>Deuda Total</span><strong>$${totalBalance.toFixed(2)}</strong>
            </div>
            <div class="summary-item">
                <span>Disponible Total</span><strong>$${totalAvailable.toFixed(2)}</strong>
            </div>
            <div class="summary-item">
                <span>Límite Total</span><strong>$${totalLimit.toFixed(2)}</strong>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${Math.min(usage, 100)}%"></div>
            </div>
            <small>Uso general: ${usage.toFixed(1)}%</small>
        `;
    };

    const renderCardList = () => {
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
    };

    const renderCardDetails = () => {
        if (!selectedCardId) {
            welcomeMessageEl.classList.remove('hidden');
            detailsContentEl.classList.add('hidden');
            return;
        }
        const card = cards.find(c => c.id === selectedCardId);
        if (!card) return;
        const { nextCutoff, nextPayment, daysUntilPayment } = getCardDates(card.cutoffDay, card.paymentDay);
        const balance = card.transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const availableCredit = card.creditLimit - balance;

        detailsContentEl.innerHTML = `
            <div class="details-header">
                <h2>${card.nickname} <small>${card.bank} - **** ${card.last4}</small></h2>
                <div class="details-header-buttons">
                    <button class="btn btn-success" id="add-expense-btn" data-id="${card.id}">+ Añadir Gasto</button>
                    <button class="btn" id="edit-card-btn" data-id="${card.id}">Editar</button>
                    <button class="btn btn-danger" id="delete-card-btn" data-id="${card.id}">Eliminar</button>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Balance Actual</h4>
                    <p>$${balance.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h4>Crédito Disponible</h4>
                    <p>$${availableCredit.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h4>Próximo Corte</h4>
                    <p>${nextCutoff.toLocaleDateString()}</p>
                </div>
                <div class="stat-card">
                    <h4>Próximo Pago</h4>
                    <p>${nextPayment.toLocaleDateString()} (${daysUntilPayment} días restantes)</p>
                </div>
            </div>
        `;

        document.getElementById('edit-card-btn').addEventListener('click', handleEditCard);
        document.getElementById('delete-card-btn').addEventListener('click', handleDeleteCard);
        // Aquí puedes enganchar el botón de añadir gasto si quieres modal
    };

    function render() {
        renderSummary();
        renderCardList();
        renderCardDetails();
        saveData();
    }

    closeBtns.forEach(btn => btn.addEventListener('click', () => {
        addCardModal.style.display = 'none';
    }));

    addCardForm.addEventListener('submit', handleAddCard);

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
document.addEventListener('DOMContentLoaded', () => {
    let cards = [];
    let selectedCardId = null;

    const themeSwitcher = document.getElementById('theme-switcher');
    const cardListEl = document.getElementById('card-list');
    const addCardBtn = document.getElementById('add-card-btn');
    const addCardModal = document.getElementById('add-card-modal');
    const addCardForm = document.getElementById('add-card-form');
    const closeBtns = document.querySelectorAll('.close-btn');

    const summaryContainerEl = document.getElementById('summary-container');
    const welcomeMessageEl = document.getElementById('welcome-message');
    const detailsContentEl = document.getElementById('details-content');

    // --- Exportar e Importar JSON ---
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
                    Swal.fire('Importado', 'Los datos fueron importados correctamente.', 'success');
                } else {
                    throw new Error('El archivo no contiene un arreglo válido.');
                }
            } catch (err) {
                Swal.fire('Error', 'El archivo JSON no es válido.', 'error');
            }
        };
        reader.readAsText(file);
    });

    // --- Guardar/Cargar ---
    const saveData = () => {
        localStorage.setItem('creditCardData', JSON.stringify(cards));
    };

    const loadData = () => {
        const data = localStorage.getItem('creditCardData');
        if (data) cards = JSON.parse(data);
    };

    // --- Tema claro/oscuro ---
    themeSwitcher.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        document.body.classList.toggle('light-theme');
        localStorage.setItem('theme', document.body.className);
    });

    // --- Fecha de corte y pago ---
    const getCardDates = (cutoffDay, paymentDay) => {
        const today = new Date();
        let nextCutoff = new Date(today.getFullYear(), today.getMonth(), cutoffDay);
        if (today.getDate() > cutoffDay) nextCutoff.setMonth(nextCutoff.getMonth() + 1);

        let nextPayment = new Date(nextCutoff);
        nextPayment.setMonth(nextPayment.getMonth() + (paymentDay < cutoffDay ? 1 : 0));
        nextPayment.setDate(paymentDay);

        const daysUntilPayment = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));
        return { nextCutoff, nextPayment, daysUntilPayment };
    };

    // --- Modal edición ---
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

    // --- Guardar/Editar tarjeta ---
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
            const cardIndex = cards.findIndex(c => c.id === editId);
            if (cardIndex !== -1) {
                cards[cardIndex] = { ...cards[cardIndex], ...cardData };
                selectedCardId = editId;
            }
            addCardForm.removeAttribute('data-edit-id');
            Swal.fire('Actualizada', 'Tarjeta actualizada correctamente.', 'success');
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

    // --- Cierre de modales ---
    closeBtns.forEach(btn => btn.addEventListener('click', () => {
        addCardModal.style.display = 'none';
        // Añadir cierre de otros modales si existen
    }));

    // --- Click dinámico para botón editar ---
    document.addEventListener('click', e => {
        if (e.target.id === 'edit-card-btn') handleEditCard(e);
    });

    // --- Eventos iniciales ---
    addCardForm.addEventListener('submit', handleAddCard);
    addCardBtn.addEventListener('click', () => {
        addCardForm.reset();
        addCardForm.removeAttribute('data-edit-id');
        addCardModal.style.display = 'block';
    });

    // --- Tema persistente ---
    const savedTheme = localStorage.getItem('theme');
    document.body.className = savedTheme ? savedTheme : 'dark-theme';

    loadData();
    if (cards.length > 0) selectedCardId = cards[0].id;
    render();

    // --- Render vacío de momento ---
    function render() {
        renderCardList();
        renderCardDetails();
        saveData();
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
            return;
        }
        const card = cards.find(c => c.id === selectedCardId);
        if (!card) return;

        const { nextCutoff, nextPayment, daysUntilPayment } = getCardDates(card.cutoffDay, card.paymentDay);

        detailsContentEl.innerHTML = `
            <div class="details-header">
                <h2>${card.nickname} <small>${card.bank} - **** ${card.last4}</small></h2>
                <button class="btn" id="edit-card-btn" data-id="${card.id}">Editar</button>
            </div>
            <div class="stat-card">
                <p>Próximo corte: ${nextCutoff.toLocaleDateString()}</p>
                <p>Próximo pago: ${nextPayment.toLocaleDateString()} (${daysUntilPayment} días restantes)</p>
            </div>
        `;
        welcomeMessageEl.classList.add('hidden');
        detailsContentEl.classList.remove('hidden');
    }
});
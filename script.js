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
    const addInstallmentModal = document.getElementById('add-installment-modal');
    const addInstallmentForm = document.getElementById('add-installment-form');
    const addPaymentModal = document.getElementById('add-payment-modal');
    const addPaymentForm = document.getElementById('add-payment-form');
    const closeBtns = document.querySelectorAll('.close-btn');
    const welcomeMessageEl = document.getElementById('welcome-message');
    const detailsContentEl = document.getElementById('details-content');
    const expenseCardIdInput = document.getElementById('expense-card-id');
    const installmentCardIdInput = document.getElementById('installment-card-id');
    const paymentCardIdInput = document.getElementById('payment-card-id');
    const summaryContainerEl = document.getElementById('summary-container');
    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const importFileInput = document.getElementById('import-file-input');
    
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
        const usagePercentage = card.creditLimit > 0 ? (balance / card.creditLimit) * 100 : 0;
        
        const { cutoffDate, paymentDate, daysUntilPayment, cycleStartDate } = getCardDates(card.cutoffDay, card.paymentDay);
        
        const periodPayment = calculatePeriodPayment(card, cycleStartDate, cutoffDate);

        let paymentAlertClass = '';
        if (daysUntilPayment <= 3 && daysUntilPayment >= 0) paymentAlertClass = 'alert';
        else if (daysUntilPayment <= 7 && daysUntilPayment >= 0) paymentAlertClass = 'alert-soon';

        let usageBarClass = '';
        if (usagePercentage > 90) usageBarClass = 'over-limit';
        else if (usagePercentage > 75) usageBarClass = 'high-usage';
        
        const activeInstallments = card.transactions.filter(tx => tx.isInstallment && areInstallmentsActive(tx));

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
                    <h4>Pago del Periodo</h4>
                    <p>$${periodPayment.toFixed(2)}</p>
                    <small>Sugerido para no generar intereses</small>
                </div>
                <div class="stat-card">
                    <h4>Próximo Corte</h4>
                    <p>${cutoffDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                </div>
                <div class="stat-card">
                    <h4>Fecha Límite de Pago</h4>
                    <p class="${paymentAlertClass}">${paymentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                    <small>${daysUntilPayment >= 0 ? `Quedan ${daysUntilPayment} días` : 'Pago vencido'}</small>
                </div>
            </div>

            ${activeInstallments.length > 0 ? `
            <div class="installments-section">
                <h3>Planes de Meses Activos</h3>
                <div id="installment-plan-list">
                    ${activeInstallments.map(tx => {
                        const monthlyPayment = tx.amount / tx.installments;
                        const { currentInstallment } = getInstallmentProgress(tx);
                        const progress = (currentInstallment / tx.installments) * 100;
                        return `
                        <div class="installment-plan-item">
                            <div class="installment-plan-item-header">
                                <span class="description">${tx.description}</span>
                                <span class="progress-text">${currentInstallment} / ${tx.installments} meses</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${progress}%"></div>
                            </div>
                            <div class="installment-plan-details">
                                <span>Mensualidad: $${monthlyPayment.toFixed(2)}</span>
                                <span>Restante: $${(tx.amount - (currentInstallment * monthlyPayment)).toFixed(2)}</span>
                            </div>
                        </div>
                        `
                    }).join('')}
                </div>
            </div>
            ` : ''}


            <div class="transactions-section">
                <div class="transactions-header">
                    <h3>Movimientos</h3>
                    <div class="btn-group">
                        <button class="btn" id="add-expense-detail-btn" data-id="${card.id}"><i class="fas fa-plus"></i> Añadir Gasto</button>
                        <button class="btn" id="add-installment-detail-btn" data-id="${card.id}"><i class="fas fa-calendar-plus"></i> A Meses</button>
                    </div>
                </div>
                <ul class="transaction-list" id="transaction-list-ul">
                    ${card.transactions.length === 0 ? '<li>No hay movimientos.</li>' : ''}
                    ${[...card.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => {
                        const isPayment = tx.amount < 0;
                        const isInstallment = tx.isInstallment;
                        let installmentInfo = '';
                        if(isInstallment) {
                             const monthlyPayment = tx.amount / tx.installments;
                             const { currentInstallment } = getInstallmentProgress(tx);
                             installmentInfo = `<div class="installment-info">${currentInstallment} de ${tx.installments} meses - $${monthlyPayment.toFixed(2)}/mes</div>`;
                        }

                        return `
                        <li class="transaction-item ${isPayment ? 'payment' : 'expense'}">
                            <div>
                                <div class="description">${tx.description}</div>
                                ${installmentInfo}
                                <div class="date">${new Date(tx.date).toLocaleDateString('es-ES')}</div>
                            </div>
                            <div class="amount">${isPayment ? '-$' + Math.abs(tx.amount).toFixed(2) : '$' + tx.amount.toFixed(2)}</div>
                        </li>`
                    }).join('')}
                </ul>
            </div>
        `;

        document.getElementById('add-expense-detail-btn').addEventListener('click', handleOpenExpenseModal);
        document.getElementById('add-installment-detail-btn').addEventListener('click', handleOpenInstallmentModal);
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
        addInstallmentModal.style.display = 'none';
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
    
    const handleOpenInstallmentModal = (e) => {
        const cardId = e.currentTarget.dataset.id;
        installmentCardIdInput.value = cardId;
        document.getElementById('installment-date').valueAsDate = new Date();
        handleOpenModal(addInstallmentModal);
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
    
    const handleAddInstallment = (e) => {
        e.preventDefault();
        const cardId = installmentCardIdInput.value;
        const card = cards.find(c => c.id === cardId);
        if (card) {
            const newInstallmentPurchase = {
                id: `tx_${Date.now()}`,
                description: document.getElementById('installment-description').value,
                amount: parseFloat(document.getElementById('installment-total-amount').value),
                date: document.getElementById('installment-date').value,
                category: document.getElementById('installment-category').value,
                isInstallment: true,
                installments: parseInt(document.getElementById('installment-months').value)
            };
            card.transactions.push(newInstallmentPurchase);
            addInstallmentForm.reset();
            handleCloseModals();
            render();
            Swal.fire('¡Éxito!', 'Compra a meses registrada.', 'success');
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

    const handleExportData = () => {
        if (cards.length === 0) {
            Swal.fire('Nada que exportar', 'No tienes ninguna tarjeta para exportar.', 'info');
            return;
        }
        const dataStr = JSON.stringify(cards, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().slice(0, 10);
        link.download = `creditcard-tracker-backup-${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        importFileInput.click();
    };

    const handleImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!Array.isArray(importedData)) {
                    throw new Error('El archivo JSON no es un array válido.');
                }
                
                // Simple validation
                const isValid = importedData.every(item => item.id && item.nickname && item.creditLimit);
                if (!isValid) {
                     throw new Error('El formato de los datos en el JSON no es correcto.');
                }
                
                Swal.fire({
                    title: 'Importar Datos',
                    text: `Encontradas ${importedData.length} tarjetas. ¿Quieres reemplazar tus datos actuales? Esta acción no se puede deshacer.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sí, ¡reemplazar!',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        cards = importedData;
                        selectedCardId = cards.length > 0 ? cards[0].id : null;
                        render();
                        Swal.fire('¡Importado!', 'Tus datos han sido importados correctamente.', 'success');
                    }
                });

            } catch (error) {
                Swal.fire('Error de Importación', `No se pudo leer el archivo. Asegúrate de que es un archivo JSON válido. \nError: ${error.message}`, 'error');
            } finally {
                // Reset file input to allow importing the same file again if needed
                importFileInput.value = '';
            }
        };
        reader.onerror = () => {
             Swal.fire('Error de Lectura', 'Hubo un error al leer el archivo.', 'error');
             importFileInput.value = '';
        };
        reader.readAsText(file);
    };


    // --- Utility Functions ---
    const getInstallmentProgress = (transaction) => {
        if (!transaction.isInstallment) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const purchaseDate = new Date(transaction.date);
        purchaseDate.setHours(0, 0, 0, 0);
        
        // Calculate the number of full months passed since the purchase.
        let monthsPassed = (today.getFullYear() - purchaseDate.getFullYear()) * 12;
        monthsPassed -= purchaseDate.getMonth();
        monthsPassed += today.getMonth();

        // The first installment is due in the billing cycle following the purchase.
        // A simple approximation is to count months passed.
        // If purchase is made on June 15, first payment is in July.
        // If today is July 10, monthsPassed is 1. We consider this the 1st installment.
        // If today is August 10, monthsPassed is 2. 2nd installment.
        // But what if it's june 28th, months passed is 0. 
        // A better logic might be needed based on cutoff dates, but this is a good start.
        
        let currentInstallment = monthsPassed + 1;
        
        if (today.getDate() <= purchaseDate.getDate()) {
             currentInstallment = monthsPassed;
        }

        return {
            currentInstallment: Math.max(1, Math.min(currentInstallment, transaction.installments)),
        };
    }

    const areInstallmentsActive = (transaction) => {
        const { currentInstallment } = getInstallmentProgress(transaction);
        return currentInstallment < transaction.installments;
    };
    
    const calculatePeriodPayment = (card, cycleStartDate, cycleEndDate) => {
        let total = 0;
        
        // Add one-time purchases for the current cycle
        card.transactions.forEach(tx => {
            if (!tx.isInstallment && tx.amount > 0) {
                const txDate = new Date(tx.date);
                if (txDate >= cycleStartDate && txDate <= cycleEndDate) {
                    total += tx.amount;
                }
            }
        });

        // Add monthly payments for active installment plans
        card.transactions.forEach(tx => {
            if (tx.isInstallment) {
                 const purchaseDate = new Date(tx.date);
                 // Only consider installments for payment after the first cutoff has passed
                 if(cycleEndDate > purchaseDate && areInstallmentsActive(tx)) {
                    total += tx.amount / tx.installments;
                 }
            }
        });

        // Subtract payments made in the current cycle
         card.transactions.forEach(tx => {
            if (tx.amount < 0) {
                 const paymentDate = new Date(tx.date);
                 if (paymentDate >= cycleStartDate && paymentDate <= cycleEndDate) {
                    total += tx.amount; // amount is negative, so it subtracts
                }
            }
        });

        return Math.max(0, total);
    };

    function getCardDates(cutoffDay, paymentDay) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();

        // Calculate cutoff date for the current period.
        let cutoffDate;
        if (currentDate > cutoffDay) {
            // We are past this month's cutoff day, so the current period's cutoff is next month.
            cutoffDate = new Date(currentYear, currentMonth + 1, cutoffDay);
        } else {
            // We are before this month's cutoff day, so the cutoff is this month.
            cutoffDate = new Date(currentYear, currentMonth, cutoffDay);
        }
        
        const cycleStartDate = new Date(cutoffDate.getFullYear(), cutoffDate.getMonth() - 1, cutoffDate.getDate() + 1);

        // Calculate the corresponding payment date for that cutoff.
        let paymentMonth;
        
        if (paymentDay > cutoffDay) {
            // Payment is in the same month as cutoff.
            // e.g., Cutoff: 15th, Payment: 30th.
            // cutoffDate is June 15th, paymentDate is June 30th.
            paymentMonth = cutoffDate.getMonth();
        } else {
            // Payment is in the month AFTER cutoff.
            // e.g., Cutoff: 25th, Payment: 10th.
            // cutoffDate is June 25th, paymentDate is July 10th.
            paymentMonth = cutoffDate.getMonth() + 1;
        }

        const paymentDate = new Date(cutoffDate.getFullYear(), paymentMonth, paymentDay);
        
        // Now, we need to find the NEXT upcoming payment date to calculate days remaining.
        let nextPaymentDate;
        
        const thisPeriodPayment = new Date(today.getFullYear(), today.getMonth(), paymentDay);

        if (paymentDay > cutoffDay) {
            // Payment is same month as cutoff (e.g., cut 15, pay 30)
            if (today > thisPeriodPayment) { // We passed this month's payment date
                 nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
            } else {
                 nextPaymentDate = thisPeriodPayment;
            }
        } else {
            // Payment is month after cutoff (e.g., cut 25, pay 10)
            const lastMonthCutoffPayment = new Date(today.getFullYear(), today.getMonth(), paymentDay);
            if(today > lastMonthCutoffPayment) { // We passed this month's payment date (for last month's cutoff)
                nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
            } else {
                nextPaymentDate = lastMonthCutoffPayment;
            }
        }
        
        const diffTime = nextPaymentDate - today;
        const daysUntilPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return { cutoffDate, paymentDate, daysUntilPayment, cycleStartDate };
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
        if (e.target === addCardModal || e.target === addExpenseModal || e.target === addInstallmentModal || e.target === addPaymentModal) {
            handleCloseModals();
        }
    });
    addCardForm.addEventListener('submit', handleAddCard);
    addExpenseForm.addEventListener('submit', handleAddExpense);
    addInstallmentForm.addEventListener('submit', handleAddInstallment);
    addPaymentForm.addEventListener('submit', handleAddPayment);
    exportDataBtn.addEventListener('click', handleExportData);
    importDataBtn.addEventListener('click', handleImportClick);
    importFileInput.addEventListener('change', handleImportFile);
});
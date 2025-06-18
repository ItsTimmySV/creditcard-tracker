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
    const paymentTypeSelect = document.getElementById('payment-type');
    const installmentSelectGroup = document.getElementById('installment-select-group');
    const paymentTargetInstallmentSelect = document.getElementById('payment-target-installment');
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
            // Data migration: Ensure 'type' property is set for all transactions
            cards.forEach(card => {
                card.transactions.forEach(tx => {
                    if (!tx.type) {
                        if (tx.amount < 0) {
                            tx.type = 'general_payment';
                        } else if (tx.isInstallment) {
                            tx.type = 'installment_purchase';
                            // Optionally remove old 'isInstallment' property if no longer needed
                            // delete tx.isInstallment;
                        } else {
                            tx.type = 'expense';
                        }
                    }
                });
            });
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
            const cardBalance = card.transactions.reduce((sum, tx) => {
                // For installment purchases, only the remaining amount contributes to current balance
                if (tx.type === 'installment_purchase') {
                    const totalPaidOnInstallment = card.transactions
                        .filter(t => t.type === 'installment_payment' && t.targetInstallmentId === tx.id)
                        .reduce((acc, payTx) => acc + Math.abs(payTx.amount), 0);
                    return sum + (tx.amount - totalPaidOnInstallment);
                }
                return sum + tx.amount;
            }, 0);
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

        // Calculate card balance considering installment payments
        const balance = card.transactions.reduce((sum, tx) => {
            if (tx.type === 'installment_purchase') {
                const totalPaidOnInstallment = card.transactions
                    .filter(t => t.type === 'installment_payment' && t.targetInstallmentId === tx.id)
                    .reduce((acc, payTx) => acc + Math.abs(payTx.amount), 0);
                return sum + (tx.amount - totalPaidOnInstallment);
            }
            return sum + tx.amount;
        }, 0);

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
        
        const allInstallmentPurchases = card.transactions.filter(tx => tx.type === 'installment_purchase');
        const activeInstallments = allInstallmentPurchases.filter(tx => {
             const totalPaidOnInstallment = card.transactions
                .filter(t => t.type === 'installment_payment' && t.targetInstallmentId === tx.id)
                .reduce((acc, payTx) => acc + Math.abs(payTx.amount), 0);
            return totalPaidOnInstallment < tx.amount; // Still has remaining balance
        });

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
                        const totalPaidOnInstallment = card.transactions
                            .filter(t => t.type === 'installment_payment' && t.targetInstallmentId === tx.id)
                            .reduce((acc, payTx) => acc + Math.abs(payTx.amount), 0);
                        const remainingAmount = tx.amount - totalPaidOnInstallment;

                        // Calculate current installment based on actual payments made
                        const actualInstallmentPaymentsCount = card.transactions.filter(t => 
                            t.type === 'installment_payment' && t.targetInstallmentId === tx.id
                        ).length;

                        const progress = ( (tx.amount - remainingAmount) / tx.amount) * 100; // Progress based on actual amount paid

                        return `
                        <div class="installment-plan-item">
                            <div class="installment-plan-item-header">
                                <span class="description">${tx.description}</span>
                                <span class="progress-text">${(tx.amount - remainingAmount).toFixed(2)} / ${tx.amount.toFixed(2)} (${actualInstallmentPaymentsCount} de ${tx.installments} meses)</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${progress}%"></div>
                            </div>
                            <div class="installment-plan-details">
                                <span>Mensualidad teórica: $${monthlyPayment.toFixed(2)}</span>
                                <span>Restante: $${remainingAmount.toFixed(2)}</span>
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
                        const isInstallmentPurchase = tx.type === 'installment_purchase';
                        const isInstallmentPayment = tx.type === 'installment_payment';
                        let installmentInfo = '';
                        if(isInstallmentPurchase) {
                             const monthlyPayment = tx.amount / tx.installments;
                             const totalPaidOnInstallment = card.transactions
                                .filter(t => t.type === 'installment_payment' && t.targetInstallmentId === tx.id)
                                .reduce((acc, payTx) => acc + Math.abs(payTx.amount), 0);
                             const remainingAmount = tx.amount - totalPaidOnInstallment;
                             installmentInfo = `<div class="installment-info">Total: $${tx.amount.toFixed(2)} | Pagado: $${totalPaidOnInstallment.toFixed(2)} | Restante: $${remainingAmount.toFixed(2)}</div>`;
                        } else if (isInstallmentPayment) {
                            const targetInstallment = card.transactions.find(t => t.id === tx.targetInstallmentId);
                            if (targetInstallment) {
                                installmentInfo = `<div class="installment-info">Abono a: ${targetInstallment.description}</div>`;
                            }
                        }

                        // Determine class for amount color
                        let amountClass = '';
                        if (tx.type === 'general_payment' || tx.type === 'installment_payment') {
                            amountClass = 'payment';
                        } else if (tx.type === 'expense' || tx.type === 'installment_purchase') {
                            amountClass = 'expense';
                        }

                        return `
                        <li class="transaction-item ${amountClass}">
                            <div>
                                <div class="description">${tx.description}</div>
                                ${installmentInfo}
                                <div class="date">${new Date(tx.date).toLocaleDateString('es-ES')}</div>
                            </div>
                            <div class="transaction-right-side">
                                <div class="amount">${isPayment ? '-$' + Math.abs(tx.amount).toFixed(2) : '$' + tx.amount.toFixed(2)}</div>
                                <button class="delete-transaction-btn" data-card-id="${card.id}" data-tx-id="${tx.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </li>`
                    }).join('')}
                </ul>
            </div>
        `;

        document.getElementById('add-expense-detail-btn').addEventListener('click', handleOpenExpenseModal);
        document.getElementById('add-installment-detail-btn').addEventListener('click', handleOpenInstallmentModal);
        document.getElementById('add-payment-detail-btn').addEventListener('click', handleOpenPaymentModal);
        document.getElementById('delete-card-btn').addEventListener('click', handleDeleteCard);
        
        // Add event listeners for new delete transaction buttons
        document.querySelectorAll('.delete-transaction-btn').forEach(button => {
            button.addEventListener('click', handleDeleteTransaction);
        });
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
        document.getElementById('expense-category').value = "";
        handleOpenModal(addExpenseModal);
    };
    
    const handleOpenInstallmentModal = (e) => {
        const cardId = e.currentTarget.dataset.id;
        installmentCardIdInput.value = cardId;
        document.getElementById('installment-date').valueAsDate = new Date();
        document.getElementById('installment-category').value = "";
        handleOpenModal(addInstallmentModal);
    };

    const handleOpenPaymentModal = (e) => {
        const cardId = e.currentTarget.dataset.id;
        paymentCardIdInput.value = cardId;
        document.getElementById('payment-date').valueAsDate = new Date();

        // Populate installment options
        const card = cards.find(c => c.id === cardId);
        if (card) {
            const activeInstallments = card.transactions.filter(tx => 
                tx.type === 'installment_purchase' && (tx.amount - card.transactions
                    .filter(t => t.type === 'installment_payment' && t.targetInstallmentId === tx.id)
                    .reduce((acc, payTx) => acc + Math.abs(payTx.amount), 0)) > 0
            );
            
            paymentTargetInstallmentSelect.innerHTML = ''; // Clear previous options
            if (activeInstallments.length > 0) {
                activeInstallments.forEach(tx => {
                    const option = document.createElement('option');
                    option.value = tx.id;
                    option.textContent = `${tx.description} ($${tx.amount.toFixed(2)})`;
                    paymentTargetInstallmentSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay compras a meses activas';
                option.disabled = true;
                paymentTargetInstallmentSelect.appendChild(option);
            }
        }

        // Reset payment type and toggle visibility
        paymentTypeSelect.value = 'general';
        installmentSelectGroup.classList.add('hidden');
        paymentTargetInstallmentSelect.required = false;

        handleOpenModal(addPaymentModal);
    };

    // Event listener for payment type change
    paymentTypeSelect.addEventListener('change', () => {
        if (paymentTypeSelect.value === 'installment') {
            installmentSelectGroup.classList.remove('hidden');
            paymentTargetInstallmentSelect.required = true;
        } else {
            installmentSelectGroup.classList.add('hidden');
            paymentTargetInstallmentSelect.required = false;
        }
    });


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
                category: document.getElementById('expense-category').value,
                type: 'expense' // Set type
            };
            card.transactions.push(newExpense);
            addExpenseForm.reset();
            handleCloseModals();
            render();
            Swal.fire('¡Éxito!', 'Gasto registrado.', 'success');
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
                type: 'installment_purchase', // Set type
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
            const paymentDate = document.getElementById('payment-date').value;
            const paymentType = paymentTypeSelect.value;
            let newPayment;

            if (paymentType === 'general') {
                newPayment = {
                    id: `tx_${Date.now()}`,
                    description: 'Pago a la tarjeta',
                    amount: -paymentAmount, // Store payments as negative values
                    date: paymentDate,
                    type: 'general_payment'
                };
            } else if (paymentType === 'installment') {
                const targetInstallmentId = paymentTargetInstallmentSelect.value;
                const targetInstallment = card.transactions.find(tx => tx.id === targetInstallmentId);
                if (!targetInstallment) {
                    Swal.fire('Error', 'Compra a meses seleccionada no encontrada.', 'error');
                    return;
                }
                newPayment = {
                    id: `tx_${Date.now()}`,
                    description: `Abono a "${targetInstallment.description}"`,
                    amount: -paymentAmount,
                    date: paymentDate,
                    type: 'installment_payment',
                    targetInstallmentId: targetInstallmentId
                };
            } else {
                Swal.fire('Error', 'Tipo de pago no válido.', 'error');
                return;
            }
            
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

    const handleDeleteTransaction = (e) => {
        const cardId = e.currentTarget.dataset.cardId;
        const txId = e.currentTarget.dataset.txId;

        Swal.fire({
            title: '¿Eliminar movimiento?',
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33', // Make confirm button red for delete
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                const card = cards.find(c => c.id === cardId);
                if (card) {
                    // Filter out the transaction to be deleted
                    card.transactions = card.transactions.filter(tx => tx.id !== txId);
                    render();
                    Swal.fire('¡Eliminado!', 'El movimiento ha sido eliminado.', 'success');
                } else {
                    Swal.fire('Error', 'No se encontró la tarjeta.', 'error');
                }
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
                
                // Simple validation (can be more robust)
                const isValid = importedData.every(item => item.id && item.nickname && item.creditLimit && Array.isArray(item.transactions));
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
                        // Apply migration logic to imported data too
                        cards.forEach(card => {
                            card.transactions.forEach(tx => {
                                if (!tx.type) {
                                    if (tx.amount < 0) {
                                        tx.type = 'general_payment';
                                    } else if (tx.isInstallment) {
                                        tx.type = 'installment_purchase';
                                        // delete tx.isInstallment; // Clean up old property on import if desired
                                    } else {
                                        tx.type = 'expense';
                                    }
                                }
                            });
                        });
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
    // getInstallmentProgress is no longer used for 'currentInstallment' display
    // in renderCardDetails, as that is now calculated based on actual payments.
    // Keeping it here if it's used elsewhere or for potential future use.
    const getInstallmentProgress = (transaction) => {
        if (transaction.type !== 'installment_purchase') return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day
        const purchaseDate = new Date(transaction.date);
        purchaseDate.setHours(0, 0, 0, 0);
        
        let monthsPassed = (today.getFullYear() - purchaseDate.getFullYear()) * 12;
        monthsPassed -= purchaseDate.getMonth();
        monthsPassed += today.getMonth();

        let currentInstallment = monthsPassed + 1;
        
        // Adjust if current day is before or on the purchase day of the month (for previous cycle payment)
        if (today.getDate() <= purchaseDate.getDate() && monthsPassed > 0) {
             currentInstallment = monthsPassed;
        }

        return {
            currentInstallment: Math.max(1, Math.min(currentInstallment, transaction.installments)),
        };
    }

    // `areInstallmentsActive` is now determined by whether remaining amount > 0,
    // not just based on time. This is handled within renderCardDetails filter.
    
    const calculatePeriodPayment = (card, cycleStartDate, cycleEndDate) => {
        let total = 0;
        
        // Add one-time purchases for the current cycle
        card.transactions.forEach(tx => {
            if (tx.type === 'expense' || tx.type === 'installment_purchase') { // Both add to the period's balance
                const txDate = new Date(tx.date);
                if (txDate >= cycleStartDate && txDate <= cycleEndDate) {
                    total += tx.amount;
                }
            }
        });

        // Add monthly portions for active installment plans regardless of their purchase date
        card.transactions.forEach(tx => {
            if (tx.type === 'installment_purchase') {
                const totalPaidOnInstallment = card.transactions
                    .filter(t => t.type === 'installment_payment' && t.targetInstallmentId === tx.id)
                    .reduce((acc, payTx) => acc + Math.abs(payTx.amount), 0);

                if (totalPaidOnInstallment < tx.amount) { // Only if still active
                    // This is a simplified approach. In reality, the monthly payment is part of the statement.
                    // For now, let's assume monthly installment portion contributes to period payment if not fully paid off.
                    // A more precise calculation would involve checking which monthly installments are due in the current cycle.
                    total += (tx.amount / tx.installments);
                }
            }
        });

        // Subtract general payments made in the current cycle.
        // Specific installment payments (type: 'installment_payment') are considered extra principal payments
        // and do not reduce the *minimum period payment* required to avoid interest.
         card.transactions.forEach(tx => {
            if (tx.type === 'general_payment') { // Only general payments reduce the period payment
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
        const currentMonth = today.getMonth(); // 0-indexed
        const currentDate = today.getDate();

        // Determine the relevant cutoff month based on today's date
        // If today's date is on or before the cutoff day, the current cycle's cutoff is in the current month.
        // If today's date is after the cutoff day, the current cycle's cutoff was in the current month, and the next cycle has started.
        // We want to display the *upcoming* cutoff date and payment date if today is before cutoff,
        // or the *current cycle's* payment date if today is after cutoff.
        
        let cutoffMonth = currentMonth;
        if (currentDate > cutoffDay) {
            // If today is past the cutoff day of the current month, the *next* cutoff is in the next month.
            cutoffMonth = currentMonth + 1;
        }

        const displayCutoffDate = new Date(currentYear, cutoffMonth, cutoffDay);
        
        // The payment date is in the same month as the cutoff, or the next month, depending on the paymentDay.
        // If paymentDay is <= cutoffDay, it's typically for the *previous* cutoff.
        // If paymentDay > cutoffDay, it's typically for the *current* cutoff.
        // This logic is tricky because banks vary. Let's simplify: Payment is always after cutoff.
        // So, if the payment day is *earlier* than the cutoff day, it must refer to the *next* month's payment for the *current* cutoff.
        // If the payment day is *later* than the cutoff day, it refers to the *current* month's payment for the *previous* cutoff.

        // Simpler approach for payment date: It's always in the month of the cutoff or the month after.
        // If paymentDay is after cutoffDay, it likely relates to the statement that *just* ended (or will end this month).
        // If paymentDay is before cutoffDay, it likely relates to the statement that *will end next month*.
        // This is simplified to just check month of cutoff date:
        let displayPaymentDate = new Date(displayCutoffDate.getFullYear(), displayCutoffDate.getMonth(), paymentDay);

        // If payment day is before cutoff day, it implies the payment is for the *next* month's cycle.
        // Example: Cutoff 15, Payment 5. If cutoff is Oct 15, payment is Nov 5.
        // Example: Cutoff 5, Payment 15. If cutoff is Oct 5, payment is Oct 15.
        // The displayPaymentDate is for the cycle ending on displayCutoffDate.

        // Correctly determine displayPaymentDate based on displayCutoffDate:
        if (paymentDay <= displayCutoffDate.getDate() && paymentDay <= cutoffDay) {
            // If paymentDay is numerically less than or equal to cutoffDay, and also less than or equal to actual cutoff day,
            // then payment is due in the *next* month relative to the displayCutoffDate.
            displayPaymentDate.setMonth(displayPaymentDate.getMonth() + 1);
        }
        // else, payment is in the same month as displayCutoffDate (already set).

        // Calculate 'cycleStartDate': This determines which transactions belong to the *current* statement.
        // It's the day after the *previous* cutoff date relative to the *display* cutoff date.
        let cycleStartDate;
        const prevCutoffMonth = displayCutoffDate.getMonth() - 1;
        cycleStartDate = new Date(displayCutoffDate.getFullYear(), prevCutoffMonth, cutoffDay + 1);
        
        // Edge case: If previous month leads to year change (Jan -> Dec)
        if (prevCutoffMonth < 0) {
            cycleStartDate = new Date(displayCutoffDate.getFullYear() - 1, 11, cutoffDay + 1);
        }

        // Adjust cycleStartDate if it's somehow in the future compared to displayCutoffDate
        if (cycleStartDate >= displayCutoffDate) {
             // This happens if cutoffDay is 31 and next month has fewer days,
             // or if payment day logic pushed cutoff date forward.
             // Re-evaluate cycle start for current active statement.
             // The start of the current cycle is always the day after the last month's cutoff.
             const actualCurrentMonthCutoff = new Date(currentYear, currentMonth, cutoffDay);
             if (currentDate <= cutoffDay) {
                 // Current cycle started last month
                 cycleStartDate = new Date(currentYear, currentMonth - 1, cutoffDay + 1);
                 if (currentMonth - 1 < 0) cycleStartDate = new Date(currentYear - 1, 11, cutoffDay + 1);
             } else {
                 // Current cycle started this month (after this month's cutoff)
                 cycleStartDate = new Date(currentYear, currentMonth, cutoffDay + 1);
             }
        }

        // Calculate days until payment
        const diffTime = displayPaymentDate.getTime() - today.getTime();
        const daysUntilPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return { cutoffDate: displayCutoffDate, paymentDate: displayPaymentDate, daysUntilPayment, cycleStartDate };
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

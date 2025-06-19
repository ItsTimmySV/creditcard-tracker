import { cards, selectedCardId, cardFilters } from '../data.js';
import { getCardDates, calculatePeriodPayment, calculateNextPeriodPayment } from '../utils.js';
import { 
    handleOpenExpenseModal, 
    handleOpenInstallmentModal, 
    handleOpenPaymentModal, 
    handleDeleteCard, 
    handleDeleteTransaction 
} from '../handlers.js';

// DOM Elements used for rendering
const summaryContainerEl = document.getElementById('summary-container');
const cardListEl = document.getElementById('card-list');
const welcomeMessageEl = document.getElementById('welcome-message');
const detailsContentEl = document.getElementById('details-content');

export const renderSummary = () => {
    if (cards.length === 0) {
        summaryContainerEl.classList.remove('visible'); // Use visible class
        return;
    }
    summaryContainerEl.classList.add('visible'); // Use visible class

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

export const renderCardList = () => {
    cardListEl.innerHTML = '';
    if (cards.length === 0) {
        cardListEl.innerHTML = '<p class="empty-list-msg">No hay tarjetas. ¡Añade una!</p>';
    } else {
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'credit-card-item';
            cardEl.dataset.id = card.id;
            if (card.id === selectedCardId.value) { // Access value property
                cardEl.classList.add('selected');
            }
            cardEl.innerHTML = `
                <h3>${card.nickname}</h3>
                <p>${card.bank} - **** ${card.last4}</p>
            `;
            cardEl.addEventListener('click', () => {
                selectedCardId.value = card.id; // Update value property
                render();
                // Close the menu if a card is selected on mobile
                if (window.innerWidth <= 900) {
                    document.body.classList.remove('menu-open');
                }
            });
            cardListEl.appendChild(cardEl);
        });
    }
};

export const renderCardDetails = () => {
    if (!selectedCardId.value) { // Access value property
        welcomeMessageEl.classList.remove('hidden');
        detailsContentEl.classList.add('hidden');
        return;
    }

    const card = cards.find(c => c.id === selectedCardId.value); // Access value property
    if (!card) {
        selectedCardId.value = null; // Update value property
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
    
    const { cutoffDate, paymentDate, daysUntilPayment, cycleStartDate, cycleEndDate, cutoffLabel, nextCycleStartDate, nextCycleEndDate } = getCardDates(card.cutoffDay, card.paymentDay);
    
    const periodPayment = calculatePeriodPayment(card, cycleStartDate, cycleEndDate);
    const nextPeriodPaymentProjected = calculateNextPeriodPayment(card, nextCycleStartDate, nextCycleEndDate);

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

    // Retrieve current filter dates for this card, or set defaults
    const currentFilters = cardFilters.get(card.id) || { startDate: '', endDate: '' };

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
                <h4>Próximo Pago del Periodo (Estimado)</h4>
                <p>$${nextPeriodPaymentProjected.toFixed(2)}</p>
                <small>Proyección para el siguiente estado de cuenta</small>
            </div>
            <div class="stat-card">
                <h4>${cutoffLabel}</h4>
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
            <div class="transactions-filters">
                <div class="form-group">
                    <label for="filter-start-date">Desde:</label>
                    <input type="date" id="filter-start-date" value="${currentFilters.startDate}">
                </div>
                <div class="form-group">
                    <label for="filter-end-date">Hasta:</label>
                    <input type="date" id="filter-end-date" value="${currentFilters.endDate}">
                </div>
                <button class="btn btn-secondary" id="reset-filters-btn">Reset</button>
            </div>
            <ul class="transaction-list" id="transaction-list-ul">
                ${(() => {
                    let displayedTransactions = [...card.transactions]; // Make a copy for filtering
                    
                    // Apply date filters
                    if (currentFilters.startDate) {
                        const start = new Date(`${currentFilters.startDate}T00:00:00`);
                        displayedTransactions = displayedTransactions.filter(tx => new Date(`${tx.date}T00:00:00`) >= start);
                    }
                    if (currentFilters.endDate) {
                        const end = new Date(`${currentFilters.endDate}T00:00:00`);
                        end.setHours(23, 59, 59, 999); // Set to end of the day
                        displayedTransactions = displayedTransactions.filter(tx => new Date(`${tx.date}T00:00:00`) <= end);
                    }

                    // Sort filtered transactions
                    displayedTransactions.sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`));

                    if (displayedTransactions.length === 0) {
                        return '<li>No hay movimientos para el rango de fechas seleccionado.</li>';
                    }

                    return displayedTransactions.map(tx => {
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
                                <div class="date">${new Date(`${tx.date}T00:00:00`).toLocaleDateString('es-ES')}</div>
                            </div>
                            <div class="transaction-right-side">
                                <div class="amount">${isPayment ? '-$' + Math.abs(tx.amount).toFixed(2) : '$' + tx.amount.toFixed(2)}</div>
                                <button class="delete-transaction-btn" data-card-id="${card.id}" data-tx-id="${tx.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </li>`;
                    }).join('');
                })()}
            </ul>
        </div>
    `;

    // Get filter elements AFTER they are rendered
    const filterStartDateInput = document.getElementById('filter-start-date');
    const filterEndDateInput = document.getElementById('filter-end-date');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    // Add event listeners to filter inputs
    filterStartDateInput.addEventListener('change', () => {
        cardFilters.set(card.id, {
            startDate: filterStartDateInput.value,
            endDate: filterEndDateInput.value
        });
        renderCardDetails(); // Re-render to apply filter
    });
    filterEndDateInput.addEventListener('change', () => {
        cardFilters.set(card.id, {
            startDate: filterStartDateInput.value,
            endDate: filterEndDateInput.value
        });
        renderCardDetails(); // Re-render to apply filter
    });
    resetFiltersBtn.addEventListener('click', () => {
        cardFilters.delete(card.id); // Remove filters for this card
        renderCardDetails(); // Re-render to show all transactions
    });

    document.getElementById('add-expense-detail-btn').addEventListener('click', handleOpenExpenseModal);
    document.getElementById('add-installment-detail-btn').addEventListener('click', handleOpenInstallmentModal);
    document.getElementById('add-payment-detail-btn').addEventListener('click', handleOpenPaymentModal);
    document.getElementById('delete-card-btn').addEventListener('click', handleDeleteCard);
    
    // Add event listeners for new delete transaction buttons
    document.querySelectorAll('.delete-transaction-btn').forEach(button => {
        button.addEventListener('click', handleDeleteTransaction);
    });
};

export const render = () => {
    renderSummary();
    renderCardList();
    renderCardDetails();
};
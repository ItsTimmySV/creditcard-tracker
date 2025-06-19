import { cards, selectedCardId, cardFilters, saveData, loadData } from '../data.js';
import { render } from '../render.js';
import { handleOpenModal, handleCloseModals, modals } from '../modals.js';

// DOM Elements
export const themeSwitcher = document.getElementById('theme-switcher');
export const menuToggleBtn = document.getElementById('menu-toggle-btn');
export const menuOverlay = document.getElementById('menu-overlay');
export const addCardBtn = document.getElementById('add-card-btn');

export const addCardForm = document.getElementById('add-card-form');
export const addExpenseForm = document.getElementById('add-expense-form');
export const addInstallmentForm = document.getElementById('add-installment-form');
export const addPaymentForm = document.getElementById('add-payment-form');

export const expenseCardIdInput = document.getElementById('expense-card-id');
export const installmentCardIdInput = document.getElementById('installment-card-id');
export const paymentCardIdInput = document.getElementById('payment-card-id');

export const paymentTypeSelect = document.getElementById('payment-type');
export const installmentSelectGroup = document.getElementById('installment-select-group');
export const paymentTargetInstallmentSelect = document.getElementById('payment-target-installment');

export const exportDataBtn = document.getElementById('export-data-btn');
export const importDataBtn = document.getElementById('import-data-btn');
export const importFileInput = document.getElementById('import-file-input');

// Define available themes
const THEMES = ['dark-theme', 'light-theme', 'blue-theme', 'green-theme'];

// --- Event Handlers ---
export const handleThemeSwitch = () => {
    let currentTheme = localStorage.getItem('theme') || THEMES[0]; // Get current theme or default to first
    let currentIndex = THEMES.indexOf(currentTheme);
    let nextIndex = (currentIndex + 1) % THEMES.length;
    let nextTheme = THEMES[nextIndex];

    // Remove all theme classes and add the new one
    document.body.classList.remove(...THEMES);
    document.body.classList.add(nextTheme);
    localStorage.setItem('theme', nextTheme);
};

export const toggleMenu = () => {
    document.body.classList.toggle('menu-open');
};

export const handleAddCard = (e) => {
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
    cards.push(newCard); // Directly modify the imported cards array
    saveData();
    addCardForm.reset();
    handleCloseModals();
    selectedCardId.value = newCard.id; // Update the mutable object's value
    render();
    Swal.fire('¡Éxito!', 'Tarjeta añadida correctamente.', 'success');
};

export const handleOpenExpenseModal = (e) => {
    const cardId = e.currentTarget.dataset.id;
    expenseCardIdInput.value = cardId;
    document.getElementById('expense-date').valueAsDate = new Date();
    document.getElementById('expense-category').value = "";
    handleOpenModal(modals.addExpenseModal);
};

export const handleOpenInstallmentModal = (e) => {
    const cardId = e.currentTarget.dataset.id;
    installmentCardIdInput.value = cardId;
    document.getElementById('installment-date').valueAsDate = new Date();
    document.getElementById('installment-category').value = "";
    handleOpenModal(modals.addInstallmentModal);
};

export const handleOpenPaymentModal = (e) => {
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

    // Attach listener for payment type change, specific to this modal opening
    paymentTypeSelect.onchange = () => { // Use onchange property to avoid multiple listeners
        if (paymentTypeSelect.value === 'installment') {
            installmentSelectGroup.classList.remove('hidden');
            paymentTargetInstallmentSelect.required = true;
        } else {
            installmentSelectGroup.classList.add('hidden');
            paymentTargetInstallmentSelect.required = false;
        }
    };

    handleOpenModal(modals.addPaymentModal);
};

export const handleAddExpense = (e) => {
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
        saveData();
        addExpenseForm.reset();
        handleCloseModals();
        render();
        Swal.fire('¡Éxito!', 'Gasto registrado.', 'success');
    }
};

export const handleAddInstallment = (e) => {
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
        saveData();
        addInstallmentForm.reset();
        handleCloseModals();
        render();
        Swal.fire('¡Éxito!', 'Compra a meses registrada.', 'success');
    }
};

export const handleAddPayment = (e) => {
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
        saveData();
        addPaymentForm.reset();
        handleCloseModals();
        render();
        Swal.fire('¡Éxito!', 'Pago registrado correctamente.', 'success');
    }
};

export const handleDeleteCard = (e) => {
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
            cards = cards.filter(c => c.id !== cardId); // Reassigning cards array
            saveData();
            selectedCardId.value = null; // Update the mutable object's value
            render();
            Swal.fire('¡Borrada!', 'Tu tarjeta ha sido eliminada.', 'success');
        }
    });
};

export const handleDeleteTransaction = (e) => {
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
                saveData();
                render();
                Swal.fire('¡Eliminado!', 'El movimiento ha sido eliminado.', 'success');
            } else {
                Swal.fire('Error', 'No se encontró la tarjeta.', 'error');
            }
        }
    });
};

export const handleExportData = () => {
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

export const handleImportClick = () => {
    importFileInput.click();
};

export const handleImportFile = (e) => {
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
                    // Directly reassign the imported cards data.
                    // This relies on `cards` being exported as `let` from `data.js`.
                    cards.splice(0, cards.length, ...importedData); // Clear and re-populate the existing array reference
                    
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
                    saveData();
                    selectedCardId.value = cards.length > 0 ? cards[0].id : null; // Update the mutable object's value
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
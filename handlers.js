import { cards, selectedCardId, cardFilters, saveData, loadData } from '../data.js';
import { render } from '../render.js';
import { handleOpenModal, handleCloseModals } from '../modals.js';

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

// Define available themes and their display names/colors, ordered by user request
const THEMES = [
    { name: 'Oscuro', class: 'dark-theme', primaryColor: '#60a5fa', bgColor: '#121212' },
    { name: 'Azul Oscuro', class: 'blue-dark-theme', primaryColor: '#0077b6', bgColor: '#121212' },
    { name: 'Verde Oscuro', class: 'green-dark-theme', primaryColor: '#4caf50', bgColor: '#121212' },
    { name: 'Morado Oscuro', class: 'purple-dark-theme', primaryColor: '#8e24aa', bgColor: '#121212' },
    { name: 'Naranja Oscuro', class: 'orange-dark-theme', primaryColor: '#ff9800', bgColor: '#121212' },
    { name: 'Rojo Oscuro', class: 'red-dark-theme', primaryColor: '#e53935', bgColor: '#121212' },
    { name: 'Claro', class: 'light-theme', primaryColor: '#3b82f6', bgColor: '#f4f7fc' },
    { name: 'Azul', class: 'blue-theme', primaryColor: '#0077b6', bgColor: '#e0f2f7' },
    { name: 'Verde', class: 'green-theme', primaryColor: '#4caf50', bgColor: '#e6ffe6' },
    { name: 'Morado', class: 'purple-theme', primaryColor: '#8e24aa', bgColor: '#f2e7f7' },
    { name: 'Naranja', class: 'orange-theme', primaryColor: '#ff9800', bgColor: '#fff4e6' },
    { name: 'Rojo', class: 'red-theme', primaryColor: '#e53935', bgColor: '#fbe9e7' }
];

// --- Event Handlers ---
export const handleThemeSwitch = () => {
    // Get current active theme class
    let currentThemeClass = localStorage.getItem('theme') || THEMES[0].class; // Default to the first theme class

    // Generate HTML content for the themes list
    const themesHtml = THEMES.map(theme => `
        <button class="theme-option-btn ${theme.class === currentThemeClass ? 'selected' : ''}" data-theme-class="${theme.class}" style="background-color: ${theme.bgColor}; color: ${theme.primaryColor}; border: 1px solid ${theme.primaryColor};">
            <span class="theme-name">${theme.name}</span>
        </button>
    `).join('');

    Swal.fire({
        title: 'Selecciona un Tema',
        html: `<div class="theme-options-container">${themesHtml}</div>`,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        showConfirmButton: false, // No default confirm button
        focusConfirm: false,
        didOpen: () => {
            // Add event listeners to the dynamically created buttons
            document.querySelectorAll('.theme-option-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const selectedThemeClass = this.dataset.themeClass;
                    // Apply the selected theme
                    document.body.classList.remove(...THEMES.map(t => t.class));
                    document.body.classList.add(selectedThemeClass);
                    localStorage.setItem('theme', selectedThemeClass);
                    Swal.close(); // Close the modal
                });
            });
        }
    });
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
    handleOpenModal(document.getElementById('add-expense-modal')); // Fix: Use correct modal ID
};

export const handleOpenInstallmentModal = (e) => {
    const cardId = e.currentTarget.dataset.id;
    installmentCardIdInput.value = cardId;
    document.getElementById('installment-date').valueAsDate = new Date();
    document.getElementById('installment-category').value = "";
    handleOpenModal(document.getElementById('add-installment-modal')); // Fix: Use correct modal ID
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
            // Enable the installment option in the select if there are active installments
            paymentTypeSelect.querySelector('option[value="installment"]').disabled = false;
        } else {
             // Disable the installment option if no active installments
            paymentTypeSelect.querySelector('option[value="installment"]').disabled = true;
             // If installment was selected, reset to general
             if(paymentTypeSelect.value === 'installment') {
                 paymentTypeSelect.value = 'general';
             }
        }
    }

    // Reset payment type and toggle visibility based on the default/initial value
    paymentTypeSelect.value = 'general'; // Always start with general payment selected
    installmentSelectGroup.classList.add('hidden');
    paymentTargetInstallmentSelect.required = false;

    // Attach listener for payment type change, specific to this modal opening
    // Use removeEventListener first to prevent adding multiple listeners if the modal is opened multiple times
    paymentTypeSelect.removeEventListener('change', handlePaymentTypeChange); // Remove existing listener
    paymentTypeSelect.addEventListener('change', handlePaymentTypeChange); // Add new listener

    handleOpenModal(document.getElementById('add-payment-modal')); // Fix: Use correct modal ID
};

// Helper function for payment type change
const handlePaymentTypeChange = () => {
    if (paymentTypeSelect.value === 'installment') {
        installmentSelectGroup.classList.remove('hidden');
        paymentTargetInstallmentSelect.required = true;
    } else {
        installmentSelectGroup.classList.add('hidden');
        paymentTargetInstallmentSelect.required = false;
    }
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
            // Ensure a target installment was actually selected
             if (!targetInstallmentId) {
                 Swal.fire('Error', 'Debes seleccionar una compra a meses.', 'error');
                 return;
             }
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
            // Remove card filter data if it exists
            cardFilters.delete(cardId);
            saveData();
            // If the deleted card was the selected one, clear selection
            if (selectedCardId.value === cardId) {
                selectedCardId.value = null; // Update the mutable object's value
            }
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

                // If the deleted transaction was an installment purchase, also remove any payments linked to it
                 card.transactions = card.transactions.filter(tx => 
                    !(tx.type === 'installment_payment' && tx.targetInstallmentId === txId)
                 );

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

                    // Apply migration logic to imported data too (ensure 'type' exists)
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
                            // Ensure date is stored as string if not already
                            if (tx.date instanceof Date) {
                                tx.date = tx.date.toISOString().slice(0, 10);
                            }
                        });
                    });
                    saveData();
                    // Clear existing filters as they might reference old card IDs
                    cardFilters.clear();
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
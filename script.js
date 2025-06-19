import { cards, selectedCardId, cardFilters, loadData } from '../data.js'; // Ensure cards, selectedCardId, cardFilters are correctly imported as mutable state
import { render } from '../render.js';
import { handleOpenModal, handleCloseModals, modals, closeBtns } from '../modals.js';
import { 
    themeSwitcher, menuToggleBtn, menuOverlay, addCardBtn,
    addCardForm, addExpenseForm, addInstallmentForm, addPaymentForm,
    exportDataBtn, importDataBtn, importFileInput,
    paymentTypeSelect,
    handleAddCard, handleOpenExpenseModal, handleOpenInstallmentModal, handleOpenPaymentModal,
    handleAddExpense, handleAddInstallment, handleAddPayment,
    handleExportData, handleImportClick, handleImportFile,
    handleThemeSwitch, toggleMenu, applyTheme // Import applyTheme
} from '../handlers.js';

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Apply saved theme or default using the new applyTheme function
    const savedTheme = localStorage.getItem('theme');
    applyTheme(savedTheme || 'dark-theme'); // Use applyTheme

    // Set initial selectedCardId if cards exist
    if (cards.length > 0) {
        selectedCardId.value = cards[0].id; // Assign to the mutable object's value property
    }

    render(); // Initial render

    // --- Global Event Listeners ---
    themeSwitcher.addEventListener('click', handleThemeSwitch);
    addCardBtn.addEventListener('click', () => handleOpenModal(modals.addCardModal));
    
    closeBtns.forEach(btn => btn.addEventListener('click', handleCloseModals));
    window.addEventListener('click', (e) => {
        // Only close modals if clicking outside of them
        if (Object.values(modals).some(modal => e.target === modal)) {
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

    // Mobile menu toggle event listeners
    menuToggleBtn.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', toggleMenu); // Close menu when clicking overlay

    // Event listener for payment type change, specific to this entry point or handlers
    paymentTypeSelect.addEventListener('change', () => {
        // This DOM element is only needed here or in a more specific handler,
        // it's accessed via `modals` in handlers.js now.
        // The handler function `handleOpenPaymentModal` in handlers.js already sets up this logic.
        // It's probably better handled within handlers.js directly.
    });
});
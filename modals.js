// DOM Elements for Modals
export const modals = {
    addCardModal: document.getElementById('add-card-modal'),
    addExpenseModal: document.getElementById('add-expense-modal'),
    addInstallmentModal: document.getElementById('add-installment-modal'),
    addPaymentModal: document.getElementById('add-payment-modal'),
};

export const closeBtns = document.querySelectorAll('.close-btn');

export const handleOpenModal = (modal) => {
    modal.style.display = 'block';
    // Close mobile menu if open when a modal appears
    if (document.body.classList.contains('menu-open')) {
        document.body.classList.remove('menu-open');
    }
};

export const handleCloseModals = () => {
    Object.values(modals).forEach(modal => {
        modal.style.display = 'none';
    });
};


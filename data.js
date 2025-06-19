export let cards = [];
// selectedCardId needs to be a mutable object to be imported and updated across modules
export const selectedCardId = { value: null };
export const cardFilters = new Map(); // Map to store filter dates for each card: Map<cardId, {startDate: string, endDate: string}>

export const saveData = () => {
    localStorage.setItem('creditCardData', JSON.stringify(cards));
};

export const loadData = () => {
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
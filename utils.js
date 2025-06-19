export const calculatePeriodPayment = (card, cycleStartDate, cycleEndDate) => {
    let total = 0;
    
    // 1. Add one-time purchases (expenses) for the current cycle
    card.transactions.forEach(tx => {
        if (tx.type === 'expense') { 
            const txDate = new Date(`${tx.date}T00:00:00`); // Use local timezone
            // Ensure txDate comparison includes cycleStartDate and cycleEndDate
            const normalizedTxDate = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
            if (normalizedTxDate >= cycleStartDate && normalizedTxDate <= cycleEndDate) {
                total += tx.amount;
            }
        }
    });

    // 2. Add monthly portions for ALL active installment plans whose first payment is due by this cycle's end
    card.transactions.forEach(tx => {
        if (tx.type === 'installment_purchase') {
            const totalPaidOnInstallment = card.transactions
                .filter(t => t.type === 'installment_payment' && t.targetInstallmentId === tx.id)
                .reduce((acc, payTx) => acc + Math.abs(payTx.amount), 0);

            if (totalPaidOnInstallment < tx.amount) { // Only if still active
                const purchaseDate = new Date(`${tx.date}T00:00:00`); // Use local timezone
                // Normalized purchase date for comparison
                const normalizedPurchaseDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), purchaseDate.getDate());
                // Installment contributes if the purchase was made on or before the current cycle ends
                if (normalizedPurchaseDate <= cycleEndDate) {
                     total += (tx.amount / tx.installments);
                }
            }
        }
    });

    // 3. Subtract general payments made in the current cycle.
     card.transactions.forEach(tx => {
        if (tx.type === 'general_payment') { 
             const paymentDate = new Date(`${tx.date}T00:00:00`); // Use local timezone
             const normalizedPaymentDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
             if (normalizedPaymentDate >= cycleStartDate && normalizedPaymentDate <= cycleEndDate) {
                total += tx.amount; // amount is negative, so it subtracts
            }
        }
    });

    return Math.max(0, total); // Ensure it's not negative
};

export const calculateNextPeriodPayment = (card, nextCycleStartDate, nextCycleEndDate) => {
    let totalNextPeriod = 0;

    // 1. One-time expenses (type 'expense') that will fall into the next cycle
    card.transactions.forEach(tx => {
        if (tx.type === 'expense') {
            const txDate = new Date(`${tx.date}T00:00:00`); // Use local timezone
            const normalizedTxDate = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
            if (normalizedTxDate >= nextCycleStartDate && normalizedTxDate <= nextCycleEndDate) {
                totalNextPeriod += tx.amount;
            }
        }
    });

    // 2. Monthly portions for ALL active installment plans that will be due in the next statement
    card.transactions.forEach(tx => {
        if (tx.type === 'installment_purchase') {
            const totalPaidOnInstallment = card.transactions
                .filter(t => t.type === 'installment_payment' && t.targetInstallmentId === tx.id)
                .reduce((acc, payTx) => acc + Math.abs(payTx.amount), 0);

            if (totalPaidOnInstallment < tx.amount) { // Only if still active
                const purchaseDate = new Date(`${tx.date}T00:00:00`); // Use local timezone
                const normalizedPurchaseDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), purchaseDate.getDate());
                // Installment contributes if the purchase was made on or before the next cycle ends
                if (normalizedPurchaseDate <= nextCycleEndDate) {
                     totalNextPeriod += (tx.amount / tx.installments);
                }
            }
        }
    });
    
    return Math.max(0, totalNextPeriod);
};

export function getCardDates(cutoffDay, paymentDay) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for comparisons

    // --- Determine the statement period that is currently pending payment ---
    
    // Find the most recent cutoff date that has already passed.
    // This defines the end of the statement period we need to calculate payment for.
    let lastCutoffYear = today.getFullYear();
    let lastCutoffMonth = today.getMonth();

    if (today.getDate() <= cutoffDay) {
        // If today is on or before the cutoff day of this month, the last cutoff was last month.
        lastCutoffMonth--;
        if (lastCutoffMonth < 0) {
            lastCutoffMonth = 11;
            lastCutoffYear--;
        }
    }
    
    // This is the end date of the statement that is pending payment.
    const lastCutoffDate = new Date(lastCutoffYear, lastCutoffMonth, cutoffDay);
    // Adjust for months with fewer days than the cutoffDay
    const lastDayOfCutoffMonth = new Date(lastCutoffYear, lastCutoffMonth + 1, 0).getDate();
    if (cutoffDay > lastDayOfCutoffMonth) {
        lastCutoffDate.setDate(lastDayOfCutoffMonth);
    }
    lastCutoffDate.setHours(0,0,0,0);

    // The start date for this statement period is the day after the previous month's cutoff.
    let cycleStartYear = lastCutoffYear;
    let cycleStartMonth = lastCutoffMonth - 1;
    if (cycleStartMonth < 0) {
        cycleStartMonth = 11;
        cycleStartYear--;
    }
    const cycleStartDate = new Date(cycleStartYear, cycleStartMonth, cutoffDay + 1);
    cycleStartDate.setHours(0,0,0,0);

    // --- Determine Payment Due Date for the `lastCutoffDate` statement ---
    
    // The payment is due on `paymentDay` of the month *following* the cutoff.
    let paymentDueYear = lastCutoffDate.getFullYear();
    let paymentDueMonth = lastCutoffDate.getMonth() + 1;
    if(paymentDueMonth > 11){
        paymentDueMonth = 0;
        paymentDueYear++;
    }
    const paymentDate = new Date(paymentDueYear, paymentDueMonth, paymentDay);
    paymentDate.setHours(0,0,0,0);


    // --- Determine the NEXT statement period (the one currently active) ---
    
    // The next cutoff is the end of the current, active cycle.
    const nextCutoffDate = new Date(lastCutoffDate.getFullYear(), lastCutoffDate.getMonth() + 1, cutoffDay);
    // Adjust for months with fewer days
    const lastDayOfNextCutoffMonth = new Date(nextCutoffDate.getFullYear(), nextCutoffDate.getMonth() + 1, 0).getDate();
    if(cutoffDay > lastDayOfNextCutoffMonth){
        nextCutoffDate.setDate(lastDayOfNextCutoffMonth);
    }
    nextCutoffDate.setHours(0,0,0,0);

    // The start of the next cycle is the day after the last cutoff.
    const nextCycleStartDate = new Date(lastCutoffDate.getFullYear(), lastCutoffDate.getMonth(), lastCutoffDate.getDate() + 1);
    nextCycleStartDate.setHours(0,0,0,0);


    // --- Final Values for Rendering ---
    const diffTime = paymentDate.getTime() - today.getTime();
    const daysUntilPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return { 
        cutoffDate: nextCutoffDate, // Display the upcoming cutoff date
        paymentDate: paymentDate, // Display the upcoming payment due date
        daysUntilPayment, 
        cycleStartDate: cycleStartDate, // The start date for the "Payment for Period" calculation
        cycleEndDate: lastCutoffDate, // The end date for the "Payment for Period" calculation
        cutoffLabel: "Próximo Corte", // Label for the upcoming cutoff date
        nextCycleStartDate: nextCycleStartDate, // The start date for the "Next Period Payment" calculation
        nextCycleEndDate: nextCutoffDate // The end date for the "Next Period Payment" calculation
    };
}
export const calculatePeriodPayment = (card, cycleStartDate, cycleEndDate) => {
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
    // This is a simplified approach. In reality, the monthly payment is part of the statement.
    // For now, let's assume a portion of monthly installment contributes to period payment if not fully paid off.
    card.transactions.forEach(tx => {
        if (tx.type === 'installment_purchase') {
            const totalPaidOnInstallment = card.transactions
                .filter(t => t.type === 'installment_payment' && t.targetInstallmentId === tx.id)
                .reduce((acc, payTx) => acc + Math.abs(payTx.amount), 0);

            if (totalPaidOnInstallment < tx.amount) { // Only if still active
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

export function getCardDates(cutoffDay, paymentDay) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    // Calculate current calendar month's cutoff date
    let currentMonthCutoff = new Date(today.getFullYear(), today.getMonth(), cutoffDay);
    const lastDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (cutoffDay > lastDayOfCurrentMonth) {
        currentMonthCutoff.setDate(lastDayOfCurrentMonth);
    }

    let cutoffDateToDisplay; // The actual Date object for the cutoff being displayed
    let cycleStartDateForCalculations; // The start of the cycle for balance calculation
    let cutoffLabel;

    // Determine which cutoff date to display based on whether current month's cutoff has passed
    if (today <= currentMonthCutoff) {
        // The current month's cutoff has not yet passed (or it's today)
        cutoffLabel = "Fecha de corte";
        cutoffDateToDisplay = currentMonthCutoff;

        // Cycle start date: Day after previous month's cutoff
        let prevMonth = today.getMonth() - 1;
        let prevYear = today.getFullYear();
        if (prevMonth < 0) { // If current month is Jan, previous is Dec of previous year
            prevMonth = 11;
            prevYear--;
        }
        let prevCutoffDate = new Date(prevYear, prevMonth, cutoffDay);
        // Adjust prevCutoffDate for end of month in previous month
        const lastDayOfPrevCutoffMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
        if (cutoffDay > lastDayOfPrevCutoffMonth) {
            prevCutoffDate.setDate(lastDayOfPrevCutoffMonth);
        }
        cycleStartDateForCalculations = new Date(prevCutoffDate.getFullYear(), prevCutoffDate.getMonth(), prevCutoffDate.getDate() + 1);

    } else {
        // The current month's cutoff has already passed. Show next month's cutoff.
        cutoffLabel = "Próximo Corte";
        let nextMonth = today.getMonth() + 1;
        let nextYear = today.getFullYear();
        if (nextMonth > 11) { // If current month is Dec, next is Jan of next year
            nextMonth = 0;
            nextYear++;
        }
        cutoffDateToDisplay = new Date(nextYear, nextMonth, cutoffDay);
        // Adjust nextMonthCutoff for end of month
        const lastDayOfNextCutoffMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
        if (cutoffDay > lastDayOfNextCutoffMonth) {
            cutoffDateToDisplay.setDate(lastDayOfNextCutoffMonth);
        }

        // Cycle start date: Day after current month's cutoff (which just passed)
        cycleStartDateForCalculations = new Date(currentMonthCutoff.getFullYear(), currentMonthCutoff.getMonth(), currentMonthCutoff.getDate() + 1);
    }

    // --- Logic for paymentDateToDisplay ---
    // Determine the cutoff date that corresponds to the payment currently due or next due.
    let cutoffForCurrentPaymentCycle;
    if (today.getDate() <= cutoffDay) {
        // If today is on or before the cutoff day of the current month,
        // the payment due would be for the cycle that ended last month.
        let prevMonth = today.getMonth() - 1;
        let prevYear = today.getFullYear();
        if (prevMonth < 0) {
            prevMonth = 11;
            prevYear--;
        }
        cutoffForCurrentPaymentCycle = new Date(prevYear, prevMonth, cutoffDay);
        const lastDayOfPrevCutoffMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
        if (cutoffDay > lastDayOfPrevCutoffMonth) {
            cutoffForCurrentPaymentCycle.setDate(lastDayOfPrevCutoffMonth);
        }
    } else {
        // If today is after the cutoff day of the current month,
        // the payment due would be for the cycle that ended this month.
        cutoffForCurrentPaymentCycle = currentMonthCutoff;
    }

    // Calculate the initial payment date based on `cutoffForCurrentPaymentCycle`
    let paymentDateToDisplay = new Date(cutoffForCurrentPaymentCycle.getFullYear(), cutoffForCurrentPaymentCycle.getMonth() + 1, paymentDay);
    
    // Adjust if paymentDay exceeds month's max days
    const lastDayOfPaymentTargetMonth = new Date(paymentDateToDisplay.getFullYear(), paymentDateToDisplay.getMonth() + 1, 0).getDate();
    if (paymentDay > lastDayOfPaymentTargetMonth) {
        paymentDateToDisplay.setDate(lastDayOfPaymentTargetMonth);
    }

    // If this calculated paymentDateToDisplay has already passed 'today',
    // then the next payment date should be shown.
    // This ensures the displayed payment date is always in the future (or today) relative to 'today'.
    if (paymentDateToDisplay < today) {
        paymentDateToDisplay = new Date(paymentDateToDisplay.getFullYear(), paymentDateToDisplay.getMonth() + 1, paymentDay);
        const lastDayOfNextPaymentTargetMonth = new Date(paymentDateToDisplay.getFullYear(), paymentDateToDisplay.getMonth() + 1, 0).getDate();
        if (paymentDay > lastDayOfNextPaymentTargetMonth) {
            paymentDateToDisplay.setDate(lastDayOfNextPaymentTargetMonth);
        }
    }
    
    // Calculate days until payment for the final paymentDateToDisplay
    const diffTime = paymentDateToDisplay.getTime() - today.getTime();
    const daysUntilPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return { 
        cutoffDate: cutoffDateToDisplay, 
        paymentDate: paymentDateToDisplay, 
        daysUntilPayment, 
        cycleStartDate: cycleStartDateForCalculations,
        cutoffLabel: cutoffLabel
    };
}
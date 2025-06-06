class PaymentService {
    async charge(user, amount, paymentMethodId) {
        // In a real application, you'd integrate with Stripe/PayPal API here.
        // This is a mock implementation.
        console.log(`Charging user ${user._id} for ${amount} using payment method ${paymentMethodId}`); // Use user._id
        // Simulate success or failure
        const success = Math.random() > 0.1; // 90% success rate for demo

        if (success) {
            return { success: true, message: 'Payment processed successfully.', transactionId: 'mock_txn_' + Date.now() };
        } else {
            return { success: false, message: 'Payment failed due to mock error.' };
        }
    }
}

module.exports = new PaymentService();
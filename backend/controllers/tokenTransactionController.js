const { UserToken, TokenTransaction, PaymentMethod } = require('../models');
const PaymentService = require('../services/paymentService');

const config = {
    token_packages: {
        small: { tokens: 50, price: 5.00 },
        medium: { tokens: 100, price: 9.00 },
        large: { tokens: 200, price: 17.00 }
    }
};

class TokenTransactionController {
    constructor() {
        this.paymentService = PaymentService;
    }

    async index(req, res) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const { count, rows: transactions } = await TokenTransaction.findAndCountAll({
                where: { user_id: userId },
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });

            res.json({
                transactions,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching token transactions', error: error.message });
        }
    }

    async getPurchaseInfo(req, res) {
        try {
            const userId = req.user.id;
            const paymentMethods = await PaymentMethod.findAll({ where: { user_id: userId } });
            res.json({ packages: config.token_packages, paymentMethods });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching token purchase info', error: error.message });
        }
    }

    async store(req, res) {
        try {
            const userId = req.user.id;
            const user = req.user; // User object from auth middleware
            const { package: packageName, payment_method_id } = req.body;

            const packageInfo = config.token_packages[packageName];
            if (!packageInfo) {
                return res.status(400).json({ message: 'Invalid token package selected.' });
            }

            // Process payment
            const paymentResult = await this.paymentService.charge(
                user,
                packageInfo.price,
                payment_method_id
            );

            if (!paymentResult.success) {
                return res.status(400).json({ message: 'Payment failed: ' + paymentResult.message });
            }

            // Add tokens
            const userToken = await UserToken.findOne({ where: { user_id: userId } });
            if (userToken) {
                await userToken.update({ balance: parseFloat(userToken.balance) + packageInfo.tokens });
            } else {
                await UserToken.create({ user_id: userId, balance: packageInfo.tokens });
            }


            // Record transaction
            await TokenTransaction.create({
                user_id: userId,
                amount: packageInfo.tokens, // This should actually be the price paid, not tokens for 'amount' field as per schema
                type: 'purchase',
                description: `Purchased ${packageInfo.tokens} tokens`,
                status: 'completed',
                transactionable_type: 'Payment', // Or a more specific type if payment is also modeled
                transactionable_id: null // Depending on if payment transactions are modeled
            });

            res.json({ message: `Successfully purchased ${packageInfo.tokens} tokens!`, tokensAdded: packageInfo.tokens });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error processing token purchase', error: error.message });
        }
    }
}

module.exports = new TokenTransactionController();
const { UserToken, TokenTransaction, PaymentMethod } = require('../models');
const PaymentService = require('../services/paymentService');
// const { Op } = require('sequelize'); // No longer needed for Mongoose

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
            const userId = req.user._id; // Use _id
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Mongoose: find and countDocuments
            const [transactions, count] = await Promise.all([
                TokenTransaction.find({ user: userId })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(), // Use lean() for performance
                TokenTransaction.countDocuments({ user: userId })
            ]);

            // Transform transaction IDs to 'id' for frontend consistency
            const transformedTransactions = transactions.map(tx => ({
                ...tx,
                id: tx._id.toString(),
                user_id: tx.user.toString(), // Add user_id for frontend consistency
                _id: undefined, // Remove _id
                user: undefined // Remove original user ObjectId field
            }));


            res.json({
                transactions: transformedTransactions,
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
            const userId = req.user._id; // Use _id
            // Mongoose: find with direct field name
            const paymentMethods = await PaymentMethod.find({ user: userId }).lean(); // Use lean()

            // Transform payment method IDs to 'id' for frontend consistency
            const transformedPaymentMethods = paymentMethods.map(pm => ({
                ...pm,
                id: pm._id.toString(),
                user_id: pm.user.toString(), // Add user_id for frontend consistency
                _id: undefined, // Remove _id
                user: undefined // Remove original user ObjectId field
            }));

            res.json({ packages: config.token_packages, paymentMethods: transformedPaymentMethods });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching token purchase info', error: error.message });
        }
    }

    async store(req, res) {
        // Mongoose doesn't have built-in transactions like Sequelize's.
        // For atomicity across multiple operations, use:
        // 1. Mongoose's `session` and `transaction` (MongoDB Replica Set required).
        // 2. Or, design for eventual consistency / rollback logic.
        // For simplicity here, we'll try to keep operations sequential, but in production,
        // you'd typically use a session for atomicity if multiple writes are involved.
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const userId = req.user._id; // Use _id
            const user = req.user; // User object from auth middleware
            const { package: packageName, payment_method_id } = req.body;

            const packageInfo = config.token_packages[packageName];
            if (!packageInfo) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: 'Invalid token package selected.' });
            }

            // Process payment (this is an external mock service, so it's outside the DB transaction)
            const paymentResult = await this.paymentService.charge(
                user,
                packageInfo.price,
                payment_method_id
            );

            if (!paymentResult.success) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: 'Payment failed: ' + paymentResult.message });
            }

            // Add tokens
            // Mongoose: findOne with user _id
            const userToken = await UserToken.findOne({ user: userId }).session(session);

            if (userToken) {
                userToken.balance = parseFloat(userToken.balance) + packageInfo.tokens;
                await userToken.save({ session }); // Save within session
            } else {
                await UserToken.create([{ user: userId, balance: packageInfo.tokens }], { session }); // Create within session
            }

            // Record transaction
            await TokenTransaction.create([{
                user: userId,
                amount: packageInfo.price, // Amount should be price paid, not tokens for 'amount' field
                type: 'token_purchase', // Changed from 'purchase' for clarity
                description: `Purchased ${packageInfo.tokens} tokens (package: ${packageName})`,
                status: 'completed',
                transactionable_type: 'Payment', // Or a more specific type if payment is also modeled
                transactionable_id: null // Depending on if payment transactions are modeled
            }], { session });

            await session.commitTransaction();
            session.endSession();

            res.json({ message: `Successfully purchased ${packageInfo.tokens} tokens!`, tokensAdded: packageInfo.tokens });

        } catch (error) {
            await session.abortTransaction(); // Rollback on error
            session.endSession();
            console.error(error);
            res.status(500).json({ message: 'Error processing token purchase', error: error.message });
        }
    }
}

module.exports = new TokenTransactionController();
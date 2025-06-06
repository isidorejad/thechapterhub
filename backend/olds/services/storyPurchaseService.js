const mongoose = require('mongoose'); // Import mongoose for sessions
const { User, Story, UserToken, TokenTransaction, StoryPurchase } = require('../models');

class StoryPurchaseService {
    async purchaseStory(userId, storyId) {
        // Start a session for atomicity, requires MongoDB Replica Set
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Mongoose: findById with populate for UserToken
            const user = await User.findById(userId).populate('tokens').session(session);
            const story = await Story.findById(storyId).session(session);

            if (!user || !story) {
                throw new Error('User or Story not found.');
            }

            // Mongoose: findOne with direct field names
            const hasPurchased = await StoryPurchase.findOne({
                user: user._id,
                story: story._id
            }).session(session);

            if (hasPurchased) {
                await session.abortTransaction();
                session.endSession();
                return { success: true, message: 'Story already purchased.' };
            }

            // user.tokens would be the UserToken document if populated
            if (!user.tokens || user.tokens.balance < story.price) {
                await session.abortTransaction();
                session.endSession();
                return { success: false, message: 'Not enough tokens to purchase this story.' };
            }

            // Deduct tokens
            user.tokens.balance -= story.price;
            await user.tokens.save({ session });

            // Record token transaction
            const tokenTransaction = await TokenTransaction.create([{
                user: user._id,
                amount: story.price,
                type: 'story_purchase',
                transactionable_type: 'Story', // Store model name as string
                transactionable_id: story._id, // Reference story _id
                description: `Purchased story: ${story.title}`,
                status: 'completed'
            }], { session });

            // Record story purchase
            await StoryPurchase.create([{
                user: user._id,
                story: story._id,
                token_transaction: tokenTransaction[0]._id, // Reference the created transaction's _id
                price_paid: story.price
            }], { session });

            await session.commitTransaction();
            session.endSession();
            return { success: true, message: 'Story purchased successfully!' };
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error('Error during story purchase:', error);
            throw new Error('Failed to purchase story due to an internal error.');
        }
    }
}

module.exports = new StoryPurchaseService();
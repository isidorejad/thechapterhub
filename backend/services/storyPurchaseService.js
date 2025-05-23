const { sequelize, User, Story, UserToken, TokenTransaction, StoryPurchase } = require('../models');

class StoryPurchaseService {
    async purchaseStory(userId, storyId) {
        const user = await User.findByPk(userId, { include: [{ model: UserToken, as: 'tokens' }] });
        const story = await Story.findByPk(storyId);

        if (!user || !story) {
            throw new Error('User or Story not found.');
        }

        const hasPurchased = await StoryPurchase.findOne({
            where: { user_id: user.id, story_id: story.id }
        });

        if (hasPurchased) {
            return { success: true, message: 'Story already purchased.' };
        }

        if (user.tokens.balance < story.price) {
            return { success: false, message: 'Not enough tokens to purchase this story.' };
        }

        const transaction = await sequelize.transaction();

        try {
            // Deduct tokens
            await user.tokens.update(
                { balance: user.tokens.balance - story.price },
                { transaction }
            );

            // Record token transaction
            const tokenTransaction = await TokenTransaction.create({
                user_id: user.id,
                amount: story.price,
                type: 'story_purchase',
                transactionable_type: 'Story', // Store model name as string
                transactionable_id: story.id,
                description: `Purchased story: ${story.title}`,
                status: 'completed'
            }, { transaction });

            // Record story purchase
            await StoryPurchase.create({
                user_id: user.id,
                story_id: story.id,
                transaction_id: tokenTransaction.id,
                price_paid: story.price
            }, { transaction });

            await transaction.commit();
            return { success: true, message: 'Story purchased successfully!' };
        } catch (error) {
            await transaction.rollback();
            console.error('Error during story purchase:', error);
            throw new Error('Failed to purchase story due to an internal error.');
        }
    }
}

module.exports = new StoryPurchaseService();
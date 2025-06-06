const StoryPurchaseService = require('../services/storyPurchaseService');

class StoryPurchaseController {
    constructor() {
        this.storyPurchaseService = StoryPurchaseService;
    }

    async purchase(req, res) {
        try {
            const storyId = req.params.storyId;
            const userId = req.user._id; // From auth middleware, use _id

            const result = await this.storyPurchaseService.purchaseStory(userId, storyId);

            if (result.success) {
                return res.json({ message: result.message, success: true });
            } else {
                return res.status(400).json({ message: result.message, success: false });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error purchasing story', error: error.message });
        }
    }
}

module.exports = new StoryPurchaseController();
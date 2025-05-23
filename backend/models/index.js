const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Define Models
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('user', 'admin', 'writer'), defaultValue: 'user' },
    dob: { type: DataTypes.DATEONLY },
    contact_number: { type: DataTypes.STRING },
    address: { type: DataTypes.TEXT },
    profile_picture: { type: DataTypes.STRING },
    language: { type: DataTypes.STRING, defaultValue: 'en' },
    timezone: { type: DataTypes.STRING, defaultValue: 'UTC' },
    // rememberToken: { type: DataTypes.STRING }, // Laravel specific, can be omitted or handled differently for MERN
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'users',
    timestamps: true,
});

const Genre = sequelize.define('Genre', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.STRING },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'genres',
    timestamps: true,
});

const Story = sequelize.define('Story', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    writer_id: { type: DataTypes.INTEGER, allowNull: false },
    genre_id: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    thumbnail: { type: DataTypes.STRING },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    content_file: { type: DataTypes.STRING },
    is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_premium: { type: DataTypes.BOOLEAN, defaultValue: false },
    age_restriction: { type: DataTypes.INTEGER },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'stories',
    timestamps: true,
});

const Episode = sequelize.define('Episode', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    story_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    content_file: { type: DataTypes.STRING, allowNull: false },
    thumbnail: { type: DataTypes.STRING },
    order: { type: DataTypes.INTEGER, defaultValue: 1 },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'episodes',
    timestamps: true,
});

const UserToken = sequelize.define('UserToken', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    balance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 15.00 },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'user_tokens',
    timestamps: true,
});

const TokenTransaction = sequelize.define('TokenTransaction', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
user_id: { type: DataTypes.INTEGER, allowNull: false },
amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
type: { type: DataTypes.STRING, allowNull: false },
transactionable_type: { type: DataTypes.STRING },
transactionable_id: { type: DataTypes.INTEGER },
description: { type: DataTypes.TEXT },
status: { type: DataTypes.STRING, defaultValue: 'completed' },
createdAt: { type: DataTypes.DATE, field: 'created_at' },
updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
tableName: 'token_transactions',
timestamps: true,
});

const StoryView = sequelize.define('StoryView', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    story_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER },
    viewed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'viewed_at' },
    ip_address: { type: DataTypes.STRING },
}, {
    tableName: 'story_views',
    timestamps: false, // No createdAt/updatedAt for this table based on your schema
});

const ReadingProgress = sequelize.define('ReadingProgress', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    episode_id: { type: DataTypes.INTEGER, allowNull: false },
    completed: { type: DataTypes.BOOLEAN, defaultValue: false },
    last_read_at: { type: DataTypes.DATE, field: 'last_read_at' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'reading_progress',
    timestamps: true,
});

const Like = sequelize.define('Like', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    story_id: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'likes',
    timestamps: true,
});

const Comment = sequelize.define('Comment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    story_id: { type: DataTypes.INTEGER, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: false },
    parent_id: { type: DataTypes.INTEGER },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'comments',
    timestamps: true,
});

const Share = sequelize.define('Share', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    story_id: { type: DataTypes.INTEGER, allowNull: false },
    episode_id: { type: DataTypes.INTEGER, allowNull: false },
    platform: { type: DataTypes.STRING },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'shares',
    timestamps: true,
});

const Bookmark = sequelize.define('Bookmark', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    story_id: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'bookmarks',
    timestamps: true,
    });

const Follow = sequelize.define('Follow', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    follower_id: { type: DataTypes.INTEGER, allowNull: false },
    followed_id: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'follows',
    timestamps: true,
});

const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    notifiable_type: { type: DataTypes.STRING },
    notifiable_id: { type: DataTypes.INTEGER },
    data: { type: DataTypes.TEXT, allowNull: false },
    read_at: { type: DataTypes.DATE },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'notifications',
    timestamps: true,
});

const ContentWarning = sequelize.define('ContentWarning', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'content_warnings',
    timestamps: true,
});

const StoryWarning = sequelize.define('StoryWarning', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    story_id: { type: DataTypes.INTEGER, allowNull: false },
    warning_id: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'story_warnings',
    timestamps: true,
});

const PaymentMethod = sequelize.define('PaymentMethod', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    payment_token: { type: DataTypes.STRING, allowNull: false },
    card_last_four: { type: DataTypes.STRING, allowNull: false },
    card_brand: { type: DataTypes.STRING, allowNull: false },
    is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'payment_methods',
    timestamps: true,
});

const StoryPurchase = sequelize.define('StoryPurchase', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    story_id: { type: DataTypes.INTEGER, allowNull: false },
    transaction_id: { type: DataTypes.INTEGER, allowNull: false },
    price_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
    tableName: 'story_purchases',
    timestamps: true,
});


// Define Associations
User.hasMany(Story, { foreignKey: 'writer_id', as: 'writtenStories' });
Story.belongsTo(User, { foreignKey: 'writer_id', as: 'writer' });

User.hasOne(UserToken, { foreignKey: 'user_id', as: 'tokens' });
UserToken.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(TokenTransaction, { foreignKey: 'user_id', as: 'tokenTransactions' });
TokenTransaction.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(StoryView, { foreignKey: 'user_id' });
StoryView.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(ReadingProgress, { foreignKey: 'user_id' });
ReadingProgress.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Like, { foreignKey: 'user_id' });
Like.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Share, { foreignKey: 'user_id' });
Share.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Bookmark, { foreignKey: 'user_id' });
Bookmark.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(PaymentMethod, { foreignKey: 'user_id' });
PaymentMethod.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(StoryPurchase, { foreignKey: 'user_id' });
StoryPurchase.belongsTo(User, { foreignKey: 'user_id' });

// Follows
User.belongsToMany(User, { as: 'Followers', through: Follow, foreignKey: 'followed_id' });
User.belongsToMany(User, { as: 'Following', through: Follow, foreignKey: 'follower_id' });


Story.belongsTo(Genre, { foreignKey: 'genre_id' });
Genre.hasMany(Story, { foreignKey: 'genre_id' });

Story.hasMany(Episode, { foreignKey: 'story_id', as: 'episodes' });
Episode.belongsTo(Story, { foreignKey: 'story_id' });

Story.hasMany(StoryView, { foreignKey: 'story_id' });
StoryView.belongsTo(Story, { foreignKey: 'story_id' });

Story.hasMany(Like, { foreignKey: 'story_id', as: 'likes' });
Like.belongsTo(Story, { foreignKey: 'story_id' });

Story.hasMany(Comment, { foreignKey: 'story_id', as: 'comments' });
Comment.belongsTo(Story, { foreignKey: 'story_id' });

Story.hasMany(Share, { foreignKey: 'story_id' });
Share.belongsTo(Story, { foreignKey: 'story_id' });

Story.hasMany(Bookmark, { foreignKey: 'story_id', as: 'bookmarks' });
Bookmark.belongsTo(Story, { foreignKey: 'story_id' });

Story.belongsToMany(ContentWarning, { through: StoryWarning, foreignKey: 'story_id', otherKey: 'warning_id', as: 'warnings' });
ContentWarning.belongsToMany(Story, { through: StoryWarning, foreignKey: 'warning_id', otherKey: 'story_id', as: 'stories' });

Story.hasMany(StoryPurchase, { foreignKey: 'story_id', as: 'purchases' });
StoryPurchase.belongsTo(Story, { foreignKey: 'story_id' });

Episode.hasMany(ReadingProgress, { foreignKey: 'episode_id' });
ReadingProgress.belongsTo(Episode, { foreignKey: 'episode_id' });

Episode.hasMany(Share, { foreignKey: 'episode_id' });
Share.belongsTo(Episode, { foreignKey: 'episode_id' });

// Polymorphic associations for token_transactions and notifications
// Sequelize handles this differently than Laravel's morphs.
// You'll typically define these relationships in your service logic or directly when querying.
// For example, when you fetch a TokenTransaction, you'd then conditionally fetch the related Story or other model based on `transactionable_type` and `transactionable_id`.


module.exports = {
    sequelize,
    User,
    Genre,
    Story,
    Episode,
    UserToken,
    TokenTransaction,
    StoryView,
    ReadingProgress,
    Like,
    Comment,
    Share,
    Bookmark,
    Follow,
    Notification,
    ContentWarning,
    StoryWarning,
    PaymentMethod,
    StoryPurchase
};
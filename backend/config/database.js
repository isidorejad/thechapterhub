// config/database.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
        });
        console.log('MongoDB Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the MongoDB database:', error);
        process.exit(1);
    }
};

module.exports = { connectDB };


// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://isidorejad:RtKOGQvIkmXgTRbF@thechapterhubdb.d40bqgr.mongodb.net/?retryWrites=true&w=majority&appName=thechapterhubdb";

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);


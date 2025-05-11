const mongoose = require('mongoose');
const uri = "mongodb+srv://fowlstar1:DtcGkysHjBM7bsZY@study.mcq95hq.mongodb.net/?retryWrites=true&w=majority&appName=study";
const clientOptions = { 
  serverApi: { version: '1', strict: true, deprecationErrors: true },
  dbName: 'lifeos_db'  // Explicitly setting the database name
};

async function run() {
  try {
    console.log("Attempting to connect to MongoDB...");
    // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
    await mongoose.connect(uri, clientOptions);
    console.log("Connected to MongoDB successfully!");
    
    // Check database connection with ping
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    
    // List all collections to verify database content
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Available collections in database:", collections.map(c => c.name));
    
    // Check if users collection exists and has documents
    if (collections.some(c => c.name === 'users')) {
      const usersCount = await mongoose.connection.db.collection('users').countDocuments();
      console.log(`Found ${usersCount} documents in users collection`);
    } else {
      console.log("No 'users' collection found in the database");
    }
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  } finally {
    // Ensures that the client will close when you finish/error
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

run().catch(console.dir);
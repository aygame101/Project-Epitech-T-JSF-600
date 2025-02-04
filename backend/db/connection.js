const mongoose = require('mongoose');

const uri = "mongodb+srv://Admin:admin@irc-epitech.ro0to.mongodb.net/?retryWrites=true&w=majority&appName=IRC-Epitech";
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

const connectDB = async () => {
  try {
    await mongoose.connect(uri, clientOptions);
    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};


module.exports = connectDB;
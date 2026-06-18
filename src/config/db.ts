import mongoose from 'mongoose';
const mongoUri : string = Bun.env.MONGO_URI || "";
mongoose.connect(mongoUri)
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));
import mongoose from 'mongoose';
const mongoUri : string = Bun.env.MONGO_URI ||`mongodb://localhost:27017/logDb`;
mongoose.connect(mongoUri)
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));
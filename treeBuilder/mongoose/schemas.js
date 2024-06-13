import mongoose from 'mongoose';

const Schema = mongoose.Schema;

// Define the schema
const transactionSchema = new Schema({
    proof: {
        type: [Buffer], // Use Buffer for binary data (equivalent to Uint8Array in JavaScript)
        required: true
    },
    timestamp: {
        type: String,
        required: true
    },
    address: {
        type: String, // Use 'Mixed' for any data type
        required: true
    },
    amount: {
        type: String,
        required: true
    },
    encoded: {
        type: String,
        required: true
    }
});

// Create a model from the schema
export const Transaction = mongoose.model('merkleTreeRevShare', transactionSchema);
//module.exports = Transaction;
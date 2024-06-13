import { mongoose } from "./database.js";
import { Transaction } from "./schemas.js";

export const saveMerkleTree = async (merkleTreeData) => {
    const conn = await mongoose.run();
    await Transaction.bulkWrite(
        merkleTreeData.map(mtd => ({
            insertOne: {
                document: mtd          
            }
        }))
    );
    conn.disconnect();
}
import { connect } from "mongoose";
import { dappConfig } from '../exampleConfig.js';

export const mongoose = {
	run: async () => {
		try {
			const uri = dappConfig.MONGODB_URI;
			if (!uri) throw new Error("MONGO_URI not found");
			const connection = await connect(uri);
			console.log("Mongoose connection success");

			return connection;
		} catch (error) {
			console.error(error);
			return error;
		}
	}
};
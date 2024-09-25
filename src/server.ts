import express from "express";

const app = express();
app.use(express.json());

interface Transaction {
	id: string;
	type: "deposit" | "withdraw_request" | "withdraw";
	amount: number;
	accountId: string;
	timestamp: string;
}

interface AccountBalance {
	accountId: string;
	balance: number;
}

const transactions: {
	[Key in string]: Transaction[];
} = {};

app.post("/transaction", (req, res) => {
	const transaction: Transaction = req.body;

	switch (transaction.type) {
		case "deposit":
			transactions[transaction.accountId] =
				transactions[transaction.accountId] || [];
			transactions[transaction.accountId].push(transaction);
			res.status(200).end();
			break;

		case "withdraw_request": {
			const total =
				transactions[transaction.accountId]?.reduce(
					(acc, curr) => acc + curr.amount,
					0,
				) || 0;
			if (total >= transaction.amount) {
				res.status(201).end();
			} else {
				res.status(402).end();
			}
			break;
		}
		case "withdraw": {
			transactions[transaction.accountId] =
				transactions[transaction.accountId] || [];
			transactions[transaction.accountId].push(transaction);
			res.status(200).end();
			break;
		}
		default:
			res
				.status(400)
				.json({ message: "Invalid transaction type", transaction });
	}
});

app.get("/account/:accountId", (req, res) => {
	const { accountId } = req.params;
	const balance =
		transactions[accountId]?.reduce(
			(acc, curr) =>
				curr.type === "deposit" ? acc + curr.amount : acc - curr.amount,
			0,
		) || 0;
	res.status(200).json({ accountId, balance });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

export default app;

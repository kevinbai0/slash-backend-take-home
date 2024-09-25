import { createTransaction, makeRequests, outputStats } from "./utils.js";
import crypto from "node:crypto";

/**
 * Runs 100 deposits and withdrawals at 10 RPS on a single account
 */
export default async function runBasicDepositsAndWithdrawals() {
	const accountId = crypto.randomUUID();

	// Deposit to reach $10,000.00
	const depositRequests = [100000, 200000, 300000, 400000].map((amount) =>
		createTransaction("deposit", amount, accountId),
	);
	const transactionRequests = Array.from({ length: 100 }, (_, i) => {
		const isWithdraw = i % 2 === 0;
		const amount = 1; // $1 for each transaction
		const txType = isWithdraw ? "withdraw" : "deposit";
		return createTransaction(txType, amount, accountId);
	});

	const startTime = Date.now();
	const res = await makeRequests({ maxRps: 10 }, [
		...depositRequests,
		...transactionRequests,
	]);

	// Latency statistics
	outputStats({
		startTime,
		endTime: Date.now(),
		latencies: res.latencies,
		successfulRequests: res.successfulRequests,
		timeouts: res.timeouts,
	});
	return res;
}

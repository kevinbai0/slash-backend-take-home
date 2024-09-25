import { createTransaction, makeRequests, outputStats } from "./utils.js";
import crypto from "node:crypto";

/**
 * On the test server, this test is failing. This test checks for overspending.
 */
export default async function runRealtimeAuthTest() {
	const accountId = crypto.randomUUID();

	// Deposit to reach $10,000.00

	const startTime = Date.now();
	await makeRequests({ maxRps: 10 }, [
		createTransaction("deposit", 100, accountId),
	]);

	const res = await makeRequests({ maxRps: 10 }, [
		createTransaction("withdraw_request", 100, accountId),
		createTransaction("withdraw_request", 100, accountId),
		createTransaction("withdraw_request", 100, accountId),
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

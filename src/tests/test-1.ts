import { createTransaction, makeRequests, outputStats } from "./utils.js";
import crypto from "node:crypto";

/**
 * In the sample server implementation provided, this test fails by default.
 * In your implementation, the final balance should not be less than 0. If it is,
 * it means your implementation allowed the user to withdraw more than they had.
 */
export default async function runRealtimeAuthTest() {
	const accountId = crypto.randomUUID();

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

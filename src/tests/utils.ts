import crypto from "node:crypto";

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function min(values: number[]): number {
	return values.reduce((min, value) => (value < min ? value : min), values[0]);
}

function max(values: number[]): number {
	return values.reduce((max, value) => (value > max ? value : max), values[0]);
}

export function outputStats(params: {
	startTime: number;
	endTime: number;
	latencies: number[];
	successfulRequests: number;
	timeouts: number;
}) {
	const duration = (params.endTime - params.startTime) / 1000;
	const { latencies } = params;
	const avgLatency =
		params.latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
	const minLatency = min(latencies);
	const maxLatency = max(latencies);

	console.log(`Test completed in ${duration} seconds`);
	console.log(`Successful requests: ${params.successfulRequests}`);
	console.log(`Timeouts: ${params.timeouts}`);
	console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
	console.log(`Minimum latency: ${minLatency}ms`);
	console.log(`Maximum latency: ${maxLatency}ms`);
	console.log(`Avg RPS: ${(latencies.length / duration).toFixed(2)}`);
}

export async function makeRequests(
	options: {
		maxRps: number;
		handleWithdrawalRequest?: "instant" | "end" | "lazy";
		expectedBalances?: Map<string, number>;
	},
	_requests: Transaction[],
): Promise<{
	withdrawalsNeeded: Transaction[];
	latencies: number[];
	successfulRequests: number;
	timeouts: number;
	expectedBalances: Map<string, number>;
}> {
	const { handleWithdrawalRequest = "instant" } = options;
	let requests = [..._requests];
	const withdrawalsNeeded: Transaction[] = [];
	const latencies: number[] = [];
	let successfulRequests = 0;
	let timeouts = 0;

	const expectedBalances =
		options.expectedBalances ?? new Map<string, number>();

	let index = 0;
	const inFlight = new Set<Promise<void>>();
	const recentRequestTimes: number[] = [];

	async function processRequest(request: Transaction) {
		if (index % (options.maxRps ?? 100) === 0) {
			console.log(`Sent ${index} requests`);
		}
		if (!request) {
			return;
		}
		switch (request.type) {
			case "deposit":
				expectedBalances.set(
					request.accountId,
					(expectedBalances.get(request.accountId) ?? 0) + request.amount,
				);
				break;
			case "withdraw_request":
				break;
			case "withdraw":
				expectedBalances.set(
					request.accountId,
					(expectedBalances.get(request.accountId) ?? 0) - request.amount,
				);
				break;
		}
		const res = await Promise.race([
			sendTransaction(request).then((item) => {
				latencies.push(item.latency);
				return item;
			}),
			new Promise<undefined>((resolve) => setTimeout(resolve, 3000)),
		]);

		if (res) {
			successfulRequests++;
		} else {
			timeouts++;
		}

		if (request.type === "withdraw_request" && res && res.status === 201) {
			switch (handleWithdrawalRequest) {
				case "instant":
					requests = [
						...requests.slice(0, index),
						{
							type: "withdraw",
							accountId: request.accountId,
							id: crypto.randomUUID(),
							timestamp: new Date().toISOString(),
							amount: request.amount,
						},
						...requests.slice(index),
					];
					break;
				case "end":
				case "lazy":
					withdrawalsNeeded.push({
						type: "withdraw",
						amount: request.amount,
						accountId: request.accountId,
						id: crypto.randomUUID(),
						timestamp: new Date().toISOString(),
					});
					break;
			}
		}
	}

	function scheduleNext() {
		if (index < requests.length) {
			const promise = scheduleNextWithRpsLimit().then(() => {
				inFlight.delete(promise);
				if (inFlight.size && index < requests.length) {
					scheduleNext();
				}
			});
			inFlight.add(promise);
		}
	}
	async function scheduleNextWithRpsLimit() {
		if (options.maxRps) {
			const now = Date.now();
			recentRequestTimes.push(now);
			if (recentRequestTimes.length > options.maxRps) {
				recentRequestTimes.shift();
			}

			if (recentRequestTimes.length === options.maxRps) {
				const oldestRequest = recentRequestTimes[0];
				const timeSinceOldest = now - oldestRequest;
				if (timeSinceOldest < 1000) {
					await sleep(1000 - timeSinceOldest);
				}
			}
		}

		return processRequest(requests[index++]);
	}

	// Continue processing until all requests are completed
	while (index < requests.length || inFlight.size > 0) {
		if (inFlight.size === 0 && index < requests.length) {
			scheduleNext();
		}
		await Promise.race([...inFlight, sleep(100)]);
	}

	switch (handleWithdrawalRequest) {
		case "instant":
			break;
		case "end": {
			const nextRun = await makeRequests(
				{ ...options, expectedBalances },
				withdrawalsNeeded,
			);
			return {
				withdrawalsNeeded: nextRun.withdrawalsNeeded,
				latencies: [...latencies, ...nextRun.latencies],
				successfulRequests: successfulRequests + nextRun.successfulRequests,
				expectedBalances: nextRun.expectedBalances,
				timeouts: timeouts + nextRun.timeouts,
			};
		}
		case "lazy":
			break;
	}

	return {
		withdrawalsNeeded,
		latencies,
		successfulRequests,
		expectedBalances,
		timeouts,
	};
}

interface Transaction {
	id: string;
	type: "deposit" | "withdraw_request" | "withdraw";
	amount: number;
	accountId: string;
	timestamp: string;
}

export async function getBalance(accountId: string): Promise<number> {
	const response = await fetch(`http:/localhost:80/account/${accountId}`);
	const data = await response.json();
	return data.balance;
}

export function createTransaction(
	type: Transaction["type"],
	amount: number,
	accountId: string,
): Transaction {
	return {
		id: crypto.randomUUID(),
		type,
		amount,
		accountId,
		timestamp: new Date().toISOString(),
	};
}

async function sendTransaction(
	transaction: Transaction,
): Promise<{ status: number; latency: number }> {
	const startTime = Date.now();
	try {
		const response = await fetch("http://localhost:80/transaction", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(transaction),
		});
		const endTime = Date.now();
		return { status: response.status, latency: endTime - startTime };
	} catch (error) {
		console.error("Error sending transaction:", error);
		throw error;
	}
}

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { getBalance } from "./utils.js";

async function main() {
	const params = process.argv.slice(2);

	if (!params.length) {
		throw new Error("No file provided");
	}

	const filename = params[0];

	if (!existsSync(filename)) {
		throw new Error("Check file does not exist");
	}

	const balances = await readFile(filename, "utf-8");

	const balancesObj = new Map(Object.entries(JSON.parse(balances)));

	for (const [accountId, balance] of balancesObj) {
		const actualBalance = await getBalance(accountId);
		if (actualBalance < 0) {
			console.log(
				`ERROR: Balance is less than 0 for account ${accountId}. Received ${actualBalance}`,
			);
		} else if (actualBalance !== balance) {
			console.log(
				`ERROR: Balances do not match. Expected "${balance}" but got "${actualBalance}" for account ${accountId}`,
			);
		} else {
			console.log(
				`SUCCESS: Account ${accountId} correctly has a balance of ${balance}`,
			);
		}
	}
}
main();

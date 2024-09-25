import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import crypto from "node:crypto";

const params = process.argv.slice(2);

if (!params.length) {
	console.error(
		"No test specified. Call this with `npm test test-0` (name of the file)",
	);
	process.exit(1);
}

async function main() {
	if (params[0] !== "verify") {
		const file = await import(`./${params[0]}`);
		const res = await file.default();

		if (
			!("expectedBalances" in res) ||
			!(res.expectedBalances instanceof Map)
		) {
			throw new Error("Test did not return a Map of expected balances");
		}

		if ("timeouts" in res && typeof res.timeouts === "number") {
			console.log(`Test resulted in ${res.timeouts} timeouts`);
		}

		if (!existsSync("tmp")) {
			await mkdir("tmp");
		}
		const outfile = `tmp/${crypto.randomUUID()}.json`;
		await writeFile(
			outfile,
			JSON.stringify(Object.fromEntries(res.expectedBalances.entries())),
		);

		console.log(
			`When the server has finished processing, check the state of your application by running \`npm run check ${outfile}\``,
		);
	}
}

main();

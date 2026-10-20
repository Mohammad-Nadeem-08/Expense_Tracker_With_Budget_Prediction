const fs = require("fs");
const { spawnSync } = require("child_process");

fs.mkdirSync("coverage", { recursive: true });
const result = spawnSync(process.execPath, [
    "--test",
    "--experimental-test-coverage",
    "--test-reporter=spec",
    "--test-reporter-destination=stdout",
    "--test-reporter=lcov",
    "--test-reporter-destination=coverage/lcov.info",
], { stdio: "inherit" });

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
if (process.exitCode === 0) {
    const reportPath = "coverage/lcov.info";
    const lcov = fs.readFileSync(reportPath, "utf8").replace(/^SF:(.*)$/gm, (_, filePath) => (
        `SF:server/${filePath.replaceAll("\\", "/")}`
    ));
    fs.writeFileSync(reportPath, lcov);
}

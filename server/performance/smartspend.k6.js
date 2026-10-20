import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.API_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");
const token = __ENV.DEMO_TOKEN || "";

export const options = {
    stages: [
        { duration: "10s", target: 5 },
        { duration: "30s", target: 10 },
        { duration: "10s", target: 0 },
    ],
    thresholds: {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<250"],
    },
};

export default function () {
    const health = http.get(`${baseUrl}/health`);
    check(health, { "health endpoint returns 200": (response) => response.status === 200 });

    if (token) {
        const prediction = http.get(`${baseUrl}/prediction`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        check(prediction, {
            "authenticated forecast returns 200": (response) => response.status === 200,
            "forecast response has a status": (response) => Boolean(response.json("status")),
        });
    }

    sleep(1);
}

import { spawnSync } from "node:child_process";

const secrets = {
    "DATABASE_URL": "REDACTED_DATABASE_URL"
};

const workers = [
    "infra/cloudflare/wrangler.api-gateway.toml",
    "infra/cloudflare/wrangler.workflows.toml"
];

for (const worker of workers) {
    for (const [key, value] of Object.entries(secrets)) {
        console.log(`Setting ${key} secret for ${worker}...`);
        spawnSync("npx", ["wrangler", "secret", "put", key, "--env", "production", "-c", worker], {
            input: value,
            stdio: ["pipe", "inherit", "inherit"],
            shell: true
        });
    }
}

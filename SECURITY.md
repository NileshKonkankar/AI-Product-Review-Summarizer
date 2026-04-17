# Security Policy

## Reporting a Vulnerability

Please report suspected vulnerabilities privately when possible. Use GitHub's private vulnerability reporting or security advisory flow for this repository if it is available to you.

If private reporting is unavailable, open a GitHub issue with a brief description of the affected area, but do not include working exploit code, credentials, tokens, or sensitive user data.

## Supported Versions

Security fixes are handled for the current `main` branch.

## Secret Handling

Do not commit real `.env` files, API keys, database credentials, tokens, private keys, or production URLs with embedded credentials. Use the tracked `.env.example` files only as templates.

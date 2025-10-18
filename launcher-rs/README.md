# iRefined Launcher (Rust)

## Building

```bash
cargo build --release
```

## Deployment

Deployments are automated via GitHub Actions when a git tag is pushed:

```bash
git tag 1.5.5
git push origin 1.5.5
```

This triggers `.github/workflows/launcher-rs.yml` which:
1. Builds the Rust launcher for Windows
2. Packages with Velopack for auto-updates
3. Publishes release to GitHub
4. Sends notification to Discord

## Development

Run locally:
```bash
cargo run --release
```

Note: Updates only work in packaged builds (not during `cargo run`).

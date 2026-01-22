# 🔏 OpenSeal Code Integrity Guide

To register a service on the HighStation ecosystem, proving code integrity via **OpenSeal** is **mandatory**. This is a core platform policy to ensure AI agents only interact with trustworthy, verified services.

## 🏗️ 3-Step Integration Process

### 1. Wrapping as an API Server
Wrap your core logic into a HighStation-compatible API server to prepare for gateway communication.

- **Port Config**: Your internal server typically listens on port `3000` or a custom port.
- **Standard Response**: Implement endpoints that process agent requests and return JSON results.
- **Security**: Refer to the [Provider Guide](./PROVIDER_GUIDE_EN.md) to implement IP Whitelisting and HMAC Signature Verification.

### 2. OpenSeal SDK Integration (Opensealing)
Integrate OpenSeal into your codebase and generate an integrity hash (Merkle Root).

- **CLI Install**: OpenSeal CLI is written in Rust. Install it using `cargo`.
  ```bash
  # Option 1: Direct install from GitHub
  curl -L https://github.com/Gnomone/openseal/releases/latest/download/install.sh | bash

  # Option 2: Install from local clone
  cd openseal
  cargo install --path ./crates/openseal-cli
  ```
- **Build Hash**: Run the build command in your project root, specifying your execution command.
  ```bash
  openseal build --source . --output ./dist --exec "your-run-command"
  ```
- **Output**: An `openseal.json` file will be generated in your project root, containing cryptographic fingerprints (Merkle Root) of all source files.

### 3. Tagging & Push
Commit your code along with the generated integrity proof to GitHub.

- **Add Tag**: Insert the OpenSeal Verification Badge at the top of your `README.md` to demonstrate transparency.
  - **Markdown Example**:
    ```markdown
    [![OpenSeal Verified](https://img.shields.io/badge/OpenSeal-Verified-success?style=for-the-badge&logo=security)](https://highstation.io/verify/your-repo-address)
    ```
- **Push & Tagging**: Include the `openseal.json` file in your repository and create a Git tag **starting with `openseal`**. (The HighStation verification engine looks for this specific prefix to confirm integrity.)
  ```bash
  git add openseal.json README.md
  git commit -m "chore: implement OpenSeal code integrity proof"
  git push origin main

  # Create GitHub Tag (Must start with 'openseal')
  git tag -a openseal-v1.0.0 -m "Release v1.0.0 with OpenSeal Integrity Proof"
  git push origin openseal-v1.0.0
  ```
- **Registration**: Link your GitHub repo's specific tag URL (e.g., `.../releases/tag/openseal-v1.0.0`) in the HighStation Dashboard.

---

## 🏆 Benefits of Verification
- **L1 Integrity Guarantee**: Mathematically proves the running code matches the public source 100%.
- **Trust Score Boost**: Gain the `openseal_verified: true` flag.
- **Increased Agent Adoption**: Security-conscious enterprise agents are configured to prioritize OpenSeal-verified services.

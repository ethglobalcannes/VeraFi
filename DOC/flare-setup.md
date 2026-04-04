# FLARE AI SKILLS — Setup Guide for ETHGlobal Cannes
# Project directory: E:\ETHGLOBAL-CANNES
## Context
This project is built on **Flare Network**, an EVM-compatible L1 blockchain with
enshrined protocols for decentralized data: FTSO (price feeds), FDC (cross-chain
data), FAssets (wrapped tokens), and Smart Accounts (XRPL abstraction).
All development happens in: `E:\ETHGLOBAL-CANNES`
---
## Step 1 — Install Flare AI Skills (Claude Code Plugin)
Run these commands inside Claude Code from the project directory:
```
/plugin marketplace add flare-foundation/flare-ai-skills
/plugin install flare-general@flare-ai-skills
/plugin install flare-ftso@flare-ai-skills
/plugin install flare-fassets@flare-ai-skills
/plugin install flare-fdc@flare-ai-skills
/plugin install flare-smart-accounts@flare-ai-skills
```
To manage plugins at any time, run:
```
/plugin
```
---
## Step 2 — Alternative: Install via skills.sh (terminal)
Open PowerShell or CMD and run from the project folder:
```powershell
cd E:\ETHGLOBAL-CANNES
npx skills add https://github.com/flare-foundation/flare-ai-skills --skill flare-general
npx skills add https://github.com/flare-foundation/flare-ai-skills --skill flare-ftso
npx skills add https://github.com/flare-foundation/flare-ai-skills --skill flare-fassets
npx skills add https://github.com/flare-foundation/flare-ai-skills --skill flare-fdc
npx skills add https://github.com/flare-foundation/flare-ai-skills --skill flare-smart-accounts
```
---
## Step 3 — Project Configuration (.claude/settings.json)
To enable skills automatically for everyone working in this repo, create the file
`E:\ETHGLOBAL-CANNES\.claude\settings.json` with this content:
```json
{
  "enabledPlugins": {
    "flare-general@flare-ai-skills": true,
    "flare-ftso@flare-ai-skills": true,
    "flare-fassets@flare-ai-skills": true,
    "flare-fdc@flare-ai-skills": true,
    "flare-smart-accounts@flare-ai-skills": true
  },
  "extraKnownMarketplaces": {
    "flare-ai-skills": {
      "source": {
        "source": "github",
        "repo": "flare-foundation/flare-ai-skills"
      }
    }
  }
}
```
---
## Available Skills — Reference
### `flare-general`
General Flare knowledge: what Flare is, core protocols, networks, chain IDs,
RPC endpoints, explorers, faucets, EVM setup, and developer tooling.
- Flare Mainnet: Chain ID `14`
- Coston2 (testnet): Chain ID `114`
- Songbird: Chain ID `19`
- Coston (testnet): Chain ID `16`
- EVM version: `cancun`
- Key packages: `@flarenetwork/flare-wagmi-periphery-package`
- Contract resolution pattern: `ContractRegistry`
### `flare-ftso`
FTSO decentralized price feeds (~1.8s block latency), ~100 data providers,
stake-weighted VRF selection.
- Interface: `FtsoV2Interface` — methods: `getFeedById`, `getFeedsById`, wei variants
- Scaling: commit-reveal anchor feeds every ~90s, weighted median, Merkle finalization
- Offchain reads: Web3.js/ethers via RPC
- ABI package: `@flarenetwork/flare-periphery-contract-artifacts`
### `flare-fassets`
Trustless bridge for wrapping non-EVM assets: FXRP, FBTC, FDOGE.
- Participants: Agents, users, collateral providers, liquidators, challengers
- Minting flow: reserve → pay → FDC proof → execute
- Contract resolution: `FlareContractsRegistry`
### `flare-fdc`
Flare Data Connector — brings external data (Web2, cross-chain) on-chain via
attestations and Merkle proofs.
- Attestation types: `AddressValidity`, `EVMTransaction`, `Web2Json`, `Payment`
- Workflow: prepare request (verifier) → submit to `FdcHub` → round finalization
  → fetch proof from DA Layer → verify in contract
- Contract pattern: `FdcVerification` + `ContractRegistry`
- Starter examples: `fdcExample`, `weatherInsurance`, `proofOfReserves`
### `flare-smart-accounts`
Account abstraction for XRPL users to interact with Flare without owning FLR.
- Instruction types: FXRP, Firelight, Upshift, custom
- CLI: Python CLI for encoding and sending XRPL transactions
- TypeScript: viem-based examples for state lookup and custom instructions
---
## Example Prompts for Claude Code
Use these prompts to activate each skill:
```
Use the flare-general skill and explain how to set up a Hardhat project for Flare development.
Use the flare-ftso skill and show how to consume FTSO price feeds in a Solidity contract.
Use the flare-fassets skill and explain how to mint FXRP step by step.
Use the flare-fdc skill and show how to request an EVMTransaction attestation and verify it in a contract.
Use the flare-smart-accounts skill and show how to send a custom instruction from XRPL to Flare.
```
---
## Repository Structure (flare-ai-skills)
```
flare-ai-skills/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace catalog
└── skills/
    ├── flare-general-skill/
    │   ├── SKILL.md
    │   └── reference.md
    ├── flare-ftso-skill/
    │   ├── SKILL.md
    │   ├── reference.md
    │   └── scripts/
    │       ├── consume-feeds.sol
    │       ├── verify-anchor-feed.sol
    │       ├── read-feeds-offchain.ts
    │       └── make-volatility-incentive.ts
    ├── flare-fassets-skill/
    │   ├── SKILL.md
    │   ├── reference.md
    │   └── scripts/
    │       └── get-fxrp-address.ts
    ├── flare-fdc-skill/
    │   ├── SKILL.md
    │   └── reference.md
    └── flare-smart-accounts-skill/
        ├── SKILL.md
        └── reference.md
```
---
## Update Skills
To update all installed skills:
```powershell
npx skills update
```
To reinstall a single skill:
```powershell
npx skills add https://github.com/flare-foundation/flare-ai-skills --skill flare-ftso
```
---
## Requirements
- Node.js 18+
- npm install -g @anthropic-ai/claude-code
- Run `claude` from inside `E:\ETHGLOBAL-CANNES`
---
## Useful Links
- GitHub repo: https://github.com/flare-foundation/flare-ai-skills
- Flare Developer Hub: https://dev.flare.network
- FTSO docs: https://dev.flare.network/ftso/overview
- FDC docs: https://dev.flare.network/fdc/overview
- FAssets docs: https://dev.flare.network/fassets/overview
- Smart Accounts docs: https://dev.flare.network/smart-accounts/overview
- skills.sh: https://skills.sh

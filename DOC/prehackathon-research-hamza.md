# prehackathon-research-hamza

# Pre-Hackathon Research — Hamza

*EthGlobal Cannes — April 3rd, 2026Assumes you’ve read the architecture doc (v4.1). This is the drill-down on your perimeter.*

---

## 0. Your Role in 60 Seconds

You are the **TEE maker bot**. Your enclave holds the maker’s private key, receives RFQ parameters on-chain, runs the Monte Carlo pricer, signs an EIP-712 Quote with the attested key, and publishes the attestation on-chain. The rest of the team depends on your TEE public key (Daniel’s verifier needs it), your signed Quote (Marcos’ Smart Account checks it), and your attestation deeplink (Dex displays it). Without your component, there is no proof.

---

## Contents

```
0. Your Role in 60 Seconds
1. What You Own ................... FCE Python extension (fce-sign template)
                                    ryskV12_py maker loop
                                    MC + BS pricer
                                    InstructionSender.sol (coordinate with Daniel)
2. What You Receive ............... From Daniel: deployed addresses + OPType/OPCommand
                                    From Flare team: indexer DB credentials (CRITICAL)
                                    From chain: RFQ params via InstructionSender.sol -> FCE
3. What You Produce ............... TEE public key -> Daniel (for attestation verifier)
                                    OPType/OPCommand constants -> Daniel (before deploy)
                                    Signed EIP-712 Quote -> on-chain -> Marcos reads
                                    Attestation deeplink -> Dex displays
4. Interface Contracts ............ OPType/OPCommand constants
                                    EIP-712 Quote struct
                                    FCE handler routing pattern
                                    Event: QuoteSigned
5. Tasks by Risk .................. HIGH: FCE registration, DB credentials
                                    MEDIUM: ryskV12_py maker loop, QUOTE handler
                                    LOW: MC + BS, greeks
6. Fallback ....................... LOCAL_MODE=true, skip Rysk -> mock contract
```

---

## 1. What You Own

| Component | Language | Template |
| --- | --- | --- |
| FCE Python extension | Python 3.11 | `fce-sign` repo (clone this) |
| `app/pricing_handler.py` | Python | Custom — receives `QUOTE` instruction, calls MC, signs EIP-712 |
| `app/mc_pricer.py` | Python / NumPy | GBM MC, 10k paths, vectorised |
| `app/bs_pricer.py` | Python / SciPy | Black-Scholes closed form, convergence check |
| `app/eip712_signer.py` | Python / eth_account | Signs Quote struct from TEE-held key |
| `maker_loop.py` | Python | ryskV12_py: WebSocket -> MC -> Quote |
| `InstructionSender.sol` | Solidity | From `fce-sign` template — coordinate OPType/OPCommand with Daniel |

**What you do NOT own:** relay contract (Daniel), mock options contract (Daniel), attestation verifier (Daniel), Smart Account trigger (Marcos), frontend (Dex).

---

## 2. What You Receive

### From Daniel — before you can deploy

| Item | Format | Why you need it |
| --- | --- | --- |
| `INSTRUCTION_SENDER` address | `0x...` (Coston2) | Populated in your `.env` by `deploy-contract` tool |
| `EXTENSION_ID` | bytes32 | Set in your `.env` after `register-extension` |
| `OPType` constant | `bytes32("PRICING")` | Must match your Python handler routing |
| `OPCommand` constant | `bytes32("QUOTE")` | Must match your Python handler routing |

**Agree on OPType/OPCommand with Daniel before either of you deploys anything.**

### From Flare team — at the venue, first thing on arrival

| Item | Where it goes |
| --- | --- |
| Coston2 C-chain indexer DB host | `config/proxy/extension_proxy.toml` -> `[db] host=` |
| Coston2 C-chain indexer DB port | same file |
| Coston2 C-chain indexer DB name | same file |
| Coston2 C-chain indexer DB user/password | same file |

**Without these, `docker compose up` fails on the ext-proxy container.** This is your #1 blocker. Walk up to the Flare booth immediately on arrival and ask for them.

### From chain — at runtime via InstructionSender.sol -> FCE

RFQ payload decoded in your Python handler:

```python
# Fields delivered by InstructionSender.sol -> ext-proxy -> your FCE handler
{
    "assetAddress": "0x...",   # fXRP token address on Flare
    "strike":       int,       # 18 decimals
    "expiry":       int,       # Unix timestamp
    "isPut":        bool,
    "quantity":     int,       # 18 decimals
    "rfqId":        str        # bytes32 — links Quote back to RFQ
}
```

---

## 3. What You Produce

### To Daniel — TEE public key

After `go run ./cmd/register-tee -l` succeeds, your extension’s key is registered in `TeeExtensionRegistry`. Daniel’s `AttestationVerifier.sol` will call:

```solidity
TeeExtensionRegistry(REGISTRY).getKeyForExtension(EXTENSION_ID)
```

Give Daniel your `EXTENSION_ID` immediately after registration completes.

### To Daniel — OPType/OPCommand constants (before deploy)

```python
# In your Python app config — must match InstructionSender.sol exactly
OP_TYPE_PRICING  = "PRICING"   # bytes32("PRICING")
OP_COMMAND_QUOTE = "QUOTE"     # bytes32("QUOTE")
```

Agree these with Daniel first. He embeds them in `InstructionSender.sol`. You embed them in your Python router. If they differ by a single character, the FCE extension never receives the instruction.

### To Smart Account / Marcos — signed EIP-712 Quote (via on-chain event)

Stored on-chain via Daniel’s relay contract `QuoteSigned` event. Marcos’ Smart Account reads it through Daniel’s `AttestationVerifier.sol`. You produce this inside the TEE — it is the attestation proof.

### To Dex — attestation deeplink

Your cloudflared HTTPS tunnel URL, specifically the `/info` endpoint:

```
https://<random>.trycloudflare.com/info
```

This is the “verify this computation” link Dex displays in the fairness panel. Share it after `cloudflared tunnel --url http://localhost:6676` prints the HTTPS URL.

---

## 4. Interface Contracts

### OPType/OPCommand — coordinate with Daniel before deploy

```solidity
// In InstructionSender.sol (Daniel writes this — must match your Python)
bytes32 constant OP_TYPE_PRICING  = bytes32("PRICING");
bytes32 constant OP_COMMAND_QUOTE = bytes32("QUOTE");
```

```python
# In your Python FCE handler router (must match InstructionSender.sol)
EXTENSION_CONFIG = {
    "op_type":    "PRICING",
    "op_command": "QUOTE",
}

def handle_instruction(op_type: str, op_command: str, payload: bytes):
    if op_type == "PRICING" and op_command == "QUOTE":
        return handle_quote(payload)
    raise ValueError(f"Unknown op:{op_type}/{op_command}")
```

### EIP-712 Quote struct — shared with all teammates

```python
QUOTE_TYPE = {
    "Quote": [
        {"name": "assetAddress",    "type": "address"},
        {"name": "chainId",         "type": "uint256"},
        {"name": "isPut",           "type": "bool"},
        {"name": "strike",          "type": "uint256"},
        {"name": "expiry",          "type": "uint256"},
        {"name": "maker",           "type": "address"},
        {"name": "nonce",           "type": "uint256"},
        {"name": "price",           "type": "uint256"},
        {"name": "quantity",        "type": "uint256"},
        {"name": "isTakerBuy",      "type": "bool"},
        {"name": "validUntil",      "type": "uint256"},
        {"name": "usd",             "type": "uint256"},
        {"name": "collateralAsset", "type": "address"},
    ]
}

EIP712_DOMAIN = {
    "name":              "rysk",
    "version":           "0.0.0",
    "chainId":           114,              # Coston2; 14 for Flare mainnet
    "verifyingContract": MOCK_CONTRACT_ADDR,  # Daniel's mock contract address
}
```

**chainId and verifyingContract must match Daniel’s Solidity exactly. Agree before writing signing code.**

### QuoteSigned event — Daniel emits, Dex + Marcos read

```solidity
event QuoteSigned(
    bytes32 indexed rfqId,
    address indexed maker,
    uint256 price,            // call_price_mc, 18 dec
    uint256 strike,           // 18 dec
    uint256 expiry,           // unix ts
    bool    isPut,
    bytes   signature,        // EIP-712 sig from TEE key
    bytes   attestationToken  // FCE attestation token
);
```

---

## 5. Tasks by Risk

### HIGH — unblock first

**[H1] Get Coston2 C-chain indexer DB credentials from Flare team**

Walk up to the Flare booth on arrival. Say: “I’m running an FCE extension on Coston2 and need the C-chain indexer DB credentials for `extension_proxy.toml`.” Without this, `docker compose up` hangs on ext-proxy. Timebox: 15 minutes on arrival.

**[H2] 7-step Coston2 FCE registration**

```bash
# Prerequisites: Go installed, Docker running, cloudflared installed
git clone https://github.com/flare-foundation/fce-sign
cd fce-sign
cp .env.example .env
# Fill .env: PRIVATE_KEY, INITIAL_OWNER, LANGUAGE=python
# CHAIN_URL=https://coston2-api.flare.network/ext/bc/C/rpc
# Fill config/proxy/extension_proxy.toml with DB creds from Flare team

cd go/tools
go run ./cmd/deploy-contract          # -> saves INSTRUCTION_SENDER to .env
go run ./cmd/register-extension       # -> saves EXTENSION_ID to .env

cd ../..
docker compose build
docker compose up -d
# Wait for: curl http://localhost:6676/info -> healthy

cloudflared tunnel --url http://localhost:6676   # -> note HTTPS URL, set TUNNEL_URL in .env

go run ./cmd/allow-tee-version -p http://localhost:6676
go run ./cmd/register-tee -p http://localhost:6676 -l    # -l = local test mode
go run ./cmd/run-test -p http://localhost:6676            # confirms end-to-end
```

Timebox: 2h max. If blocked by DB creds, proceed with `LOCAL_MODE=true` fallback.

### MEDIUM — core logic

**[M1] Implement `app/pricing_handler.py` (QUOTE handler)**

Replace the `sign_message` logic from `fce-sign/python/app/` with your pricer:

```python
async def handle_quote(payload: dict) -> dict:
    # 1. Parse RFQ fields
    strike   = payload["strike"]
    expiry   = payload["expiry"]
    is_put   = payload["isPut"]
    quantity = payload["quantity"]
    T_years  = (expiry - time.time()) / (365 * 24 * 3600)

    # 2. Fetch market inputs
    S0    = await get_ftso_spot()           # FTSO XRP/USD via getFeedByIdInWei
    sigma = await get_deribit_iv()          # Deribit mark_iv median / 100
    seed  = await get_secure_random_seed()  # on-chain SecureRandom bytes32

    # 3. Price
    call_price_mc, _ = mc_pricer(S0, sigma, r=0.05, T=T_years, K=strike, seed=seed)
    call_price_bs    = bs_pricer(S0, sigma, r=0.05, T=T_years, K=strike)
    delta, vega      = greeks(S0, sigma, r=0.05, T=T_years, K=strike)

    # 4. Build and sign EIP-712 Quote
    quote = build_quote(price=call_price_mc, maker=TEE_ADDRESS, ...)
    sig   = sign_eip712(quote, TEE_PRIVATE_KEY, EIP712_DOMAIN)

    return {
        "quote":         quote,
        "signature":     sig.hex(),
        "call_price_bs": str(int(call_price_bs * 1e18)),
        "delta":         str(int(delta * 1e18)),
        "vega":          str(int(vega * 1e18)),
        "seed":          seed,
    }
```

**[M2] ryskV12_py maker loop**

If Rysk whitelists your TEE key as a maker:

```python
# maker_loop.py
import ryskV12

client = ryskV12.MakerClient(key=TEE_PRIVATE_KEY, chain_id=14)
client.connect()
for rfq in client.rfqs(asset=FXRP_ADDRESS):
    result = asyncio.run(handle_quote(rfq.__dict__))
    client.send_quote(rfq.id, result["quote"])
```

Otherwise, route through Daniel’s mock contract — same Quote logic, different `verifyingContract` in EIP-712 domain.

### LOW — straightforward

**[L1] MC + BS pricer**

```python
import numpy as np
from scipy.stats import norm

def mc_pricer(S0, sigma, r, T, K, seed, N=10_000):
    rng     = np.random.default_rng(int(seed, 16) if isinstance(seed, str) else seed)
    Z       = rng.standard_normal(N)
    ST      = S0 * np.exp((r - 0.5 * sigma**2) * T + sigma * np.sqrt(T) * Z)
    payoffs = np.maximum(ST - K, 0)          # call payoff
    price   = np.exp(-r * T) * payoffs.mean()
    stderr  = payoffs.std() / np.sqrt(N)
    return price, stderr

def bs_pricer(S0, sigma, r, T, K):
    d1 = (np.log(S0 / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return S0 * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)

def greeks(S0, sigma, r, T, K):
    d1    = (np.log(S0 / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    delta = norm.cdf(d1)
    vega  = S0 * norm.pdf(d1) * np.sqrt(T) / 100   # per 1% vol move
    return delta, vega
```

---

## 6. Fallback

| Blocker | Degraded path |
| --- | --- |
| DB credentials not available | Set `LOCAL_MODE=true` in `.env` — skip ext-proxy DB. Docker runs fully local. Label output `[LOCAL RUN — attestation simulated]` |
| cloudflared blocked on venue network | Expose `http://localhost:6676` directly over local network for demo. Production would use tunnel. |
| Rysk maker registration refused | Route all RFQs through Daniel’s mock contract — identical Quote signing flow, just different `verifyingContract` in EIP-712 domain |
| TEE registration fully blocked | Demo with `LOCAL_MODE=true` + MC output only — pricing story is intact, attestation is simulated. Label clearly. |

**The attestation story does not collapse if registration is blocked.** You can always demonstrate the MC pricer, EIP-712 Quote struct, and signing flow with `LOCAL_MODE=true`. Label it and note that production Coston2 registration adds the hardware proof.
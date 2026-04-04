# prehackathon-research-marcos

# Pre-Hackathon Research — Marcos

*EthGlobal Cannes — April 3rd, 2026Assumes you’ve read the architecture doc (v4.1). This is the drill-down on your perimeter.*

---

## 0. Your Role in 60 Seconds

You own the **XRPL-to-Flare bridge and the taker execution layer**. A user sends XRP from Xaman, your FDC Payment attestation cycle verifies it on-chain (~90-180s), your Smart Account decodes the intent, calls Daniel’s relay contract to broadcast the RFQ, receives Hamza’s signed EIP-712 Quote through Daniel’s attestation verifier, and if it passes — settles via Daniel’s mock contract. Without your component, there is no XRPL user access and no conditional settlement gate.

---

## Contents

```
0. Your Role in 60 Seconds
1. What You Own ................... Smart Account RFQ trigger
                                    FDC Payment attestation cycle
                                    Conditional gate (attestation + slippage check)
2. What You Receive ............... From Daniel: relay ABI + mock contract ABI + addresses
                                    From Hamza: signed EIP-712 Quote (on-chain event)
3. What You Produce ............... Smart Account address -> Daniel (access control)
                                    submitRFQ call shape -> Daniel (before relay deploy)
                                    Memo encoding spec -> confirmed with Dex
4. Interface Contracts ............ submitRFQ function signature
                                    EIP-712 Quote struct (read-only)
                                    Memo encoding (32 bytes)
                                    FDC Payment attestation cycle (5 steps)
5. Tasks by Risk .................. HIGH: Smart Account RFQ trigger
                                    MEDIUM: FDC cycle, conditional gate
                                    LOW: XRPL payment + memo encoding
6. Fallback ....................... direct EVM call (no Smart Account)
```

---

## 1. What You Own

| Component | Stack | Notes |
| --- | --- | --- |
| Smart Account setup | Solidity + TypeScript operator | `MasterAccountController` — Flare Smart Accounts primitive |
| FDC Payment attestation handler | TypeScript | 5-step async cycle with job queue |
| `submitRFQ` caller | Solidity (Smart Account) | Calls Daniel’s `RelayContract.submitRFQ` after FDC verifies payment |
| Conditional gate | Solidity | Calls `AttestationVerifier.verifyQuote`; executes settlement if valid |
| Settlement execution | Solidity | `MockOptionsContract.fillRFQ(quote, sig)` — Daniel’s contract |

**What you do NOT own:** relay contract internals (Daniel), mock options contract (Daniel), TEE pricing (Hamza), frontend (Dex).

---

## 2. What You Receive

### From Daniel — as soon as he deploys

| Item | Format | Why you need it |
| --- | --- | --- |
| Relay contract address | `0x...` | Smart Account calls `submitRFQ` here |
| Relay contract ABI | JSON | Encode `submitRFQ` calldata |
| `AttestationVerifier` address | `0x...` | Your conditional gate calls `verifyQuote` here |
| Mock contract address | `0x...` | Settlement target in your conditional gate |
| Mock contract ABI | JSON | `fillRFQ(Quote, bytes sig)` call |

### From Hamza — via on-chain QuoteSigned event (you poll for this)

```solidity
// You poll for this event after submitting RFQ
event QuoteSigned(
    bytes32 indexed rfqId,
    address indexed maker,
    uint256 price,
    uint256 strike,
    uint256 expiry,
    bool    isPut,
    bytes   signature,
    bytes   attestationToken
);
```

Your conditional gate passes `(quote, signature)` to `AttestationVerifier.verifyQuote()`. Returns `true` -> execute settlement.

---

## 3. What You Produce

### Smart Account address -> Daniel

Give Daniel your Smart Account address (or deployer address) immediately after deployment. He adds it to `RelayContract.sol`’s `onlySmartAccount` modifier. Without this, `submitRFQ` reverts.

### submitRFQ call shape -> Daniel (agree before he deploys)

```solidity
// This is the function signature Daniel writes in RelayContract.sol.
// You call it from your Smart Account after FDC attestation.
// Agree the parameter types before Daniel deploys — can't change after.
function submitRFQ(
    address assetAddress,   // fXRP token address on Flare
    uint256 strike,         // 18 decimals
    uint256 expiry,         // Unix timestamp
    bool    isPut,
    uint256 quantity        // 18 decimals (number of option contracts)
) external returns (bytes32 rfqId);
```

### Memo encoding spec -> confirmed with Dex

```
XRPL Payment memo — exactly 32 bytes, big-endian:
  Byte 0:      0xff          — instruction code (custom TEE instruction)
  Byte 1:      0x00          — wallet identifier
  Bytes 2-5:   uint32        — XRP amount in drops
  Bytes 6-9:   uint32        — strike price (agree scale with Dex: e.g. USD cents * 100)
  Bytes 10-13: uint32        — expiry (Unix timestamp, lower 32 bits)
  Byte 14:     uint8         — isPut (0x00 = call, 0x01 = put)
  Bytes 15-31: 0x00 padding
```

Dex builds the XRPL Payment with this memo. Your operator backend decodes it. **Confirm the byte layout with Dex BEFORE April 3 — one DM and a 20-minute test.**

---

## 4. Interface Contracts

### FDC Payment attestation cycle — read this fully

This is the one thing with no analogy in your existing work.

```
Step 1 (off-chain):
  POST https://cjdpa-coston2.flare.rocks/verifier/xrp/Payment/prepareRequest
  Body: { "transactionId": "<XRPL tx hash>", "inUtxo": 0, "utxo": 0 }
  Returns: { "abiEncodedRequest": "0x..." }

Step 2 (on-chain, ~15s):
  FdcHub.requestAttestation(abiEncodedRequest)  // + fee ~0.1 FLR
  Record: votingRoundId = current round number

Step 3 (wait ~90-180s):
  Data providers fetch XRPL tx, build Merkle tree, submit root to FdcHub
  (mandatory wait — cannot be skipped or shortened)

Step 4 (off-chain):
  GET https://cjdpa-coston2.flare.rocks/proof-by-request-round-raw
      ?votingRoundId=<id>&requestId=<hash>
  Returns: { "response": {...}, "proof": ["0x...", ...] }

Step 5 (on-chain):
  MasterAccountController.executeTransaction(proof, xrplSenderAddress)
  -> Smart Account decodes 0xff memo -> calls submitRFQ on relay contract
```

**Key constraint:** steps 1-2 are one block of work, then mandatory ~2-minute wait, then steps 4-5. Build your TypeScript operator with an async job queue. Use `setTimeout` or Bull queue — never synchronous. Do not attempt to poll aggressively; the round just needs to finalize.

**Docs:** https://dev.flare.network/fdc/attestation-types/payment — has a working TypeScript example.

### Conditional gate logic

```solidity
function executeGate(bytes32 rfqId, Quote memory quote, bytes memory sig) external {
    // 1. Verify TEE attestation
    require(
        IAttestationVerifier(VERIFIER).verifyQuote(quote, sig),
        "TEE attestation invalid"
    );

    // 2. Optional price slippage check — agree bound with Hamza
    // uint256 spot = IFtsoV2(FTSO).getFeedByIdInWei(XRP_USD_FEED_ID);
    // require(quote.price <= computedFairValue * 110 / 100, "price out of band");

    // 3. Execute settlement
    IMockOptionsContract(MOCK).fillRFQ(quote, sig);
    emit SettlementExecuted(rfqId, quote.price);
}
```

### EIP-712 Quote struct — you READ this, Hamza WRITES it

```solidity
struct Quote {
    address assetAddress;    // fXRP token
    uint256 chainId;         // 114 for Coston2, 14 for Flare mainnet
    bool    isPut;
    uint256 strike;          // 18 dec
    uint256 expiry;          // unix ts
    address maker;           // TEE attested key address
    uint256 nonce;
    uint256 price;           // call_price_mc, 18 dec
    uint256 quantity;        // 18 dec
    bool    isTakerBuy;      // true (you are the taker)
    uint256 validUntil;      // now + 30s
    uint256 usd;
    address collateralAsset;
}
// EIP-712 domain: name="rysk", version="0.0.0", verifyingContract=MOCK_CONTRACT_ADDR
// chainId must match exactly — agree with Daniel and Hamza before any signing
```

---

## 5. Tasks by Risk

### HIGH — prototype from hour 1, timebox to 3h

**[H1] Smart Account RFQ trigger**

This is the newest primitive with the thinnest docs. Goal for hour 1: get ANY transaction through `MasterAccountController` on Coston2. Do not try to connect the full flow immediately.

Steps for the minimal prototype:
1. Deploy a stub relay contract (1 function, 1 event)
2. Get testXRP wallet + Coston2 wallet funded
3. Send a test XRPL Payment from Xaman
4. Run the FDC cycle (steps 1-5 above)
5. Call `MasterAccountController.executeTransaction(proof, xrplAddress)`
6. Confirm your stub relay event fires

If this works by hour 3, the rest is wiring, not unknowns.

**Docs:** https://dev.flare.network/smart-accounts/overview

### MEDIUM — integrate once H1 works

**[M1] Full FDC Payment attestation cycle with real relay**

Once H1 works with a stub, swap in Daniel’s `RelayContract.submitRFQ`. The FDC cycle itself is documented and deterministic — the risk is async handling, not unknowns.

**[M2] Conditional gate with AttestationVerifier**

Stub first: skip `verifyQuote` check, just call `fillRFQ` directly. Add the real attestation check once Daniel’s verifier is deployed. Don’t block on this.

### LOW — well-understood, build last

**[L1] XRPL payment + memo encoding**

Standard XRPL Payment. Xaman handles signing natively — it shows “You’re sending X XRP to this address.” Coordinate the exact byte layout with Dex: 20 minutes over DM, do it before April 3.

**[L2] Xaman integration**

```tsx
import { Xumm } from "xumm";
const xumm = new Xumm(XUMM_API_KEY, XUMM_API_SECRET);

const { created } = await xumm.payload.createAndSubscribe({
    txjson: {
        TransactionType: "Payment",
        Destination: OPERATOR_ADDRESS,   // your operator XRPL address
        Amount: amountDrops.toString(),  // drops as string
        Memos: [{
            Memo: {
                MemoData: encodedMemo    // 64 hex chars, uppercase, no MemoType/MemoFormat
            }
        }]
    }
}, event => {
    if (event.data.signed === true) return event.resolve();
});
```

---

## 6. Fallback

| Blocker | Degraded path |
| --- | --- |
| Smart Account primitive blocked | Direct EVM call to `RelayContract.submitRFQ` from a regular wallet. Loses XRPL UX, preserves full TEE + attestation story. Frame as roadmap item in pitch. |
| FDC attestation too slow for demo | Pre-attest a test XRPL payment before the presentation; replay the proof live. The TEE attestation story is unaffected. |
| Conditional gate not ready | Skip slippage check; call `fillRFQ` immediately after `verifyQuote`. Attestation check is the important part. |
| Daniel’s AttestationVerifier not ready | Skip `verifyQuote` in gate; show the Quote and signature on Dex’s frontend and let judges verify via the attestation deeplink. |
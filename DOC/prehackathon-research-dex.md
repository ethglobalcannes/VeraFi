# prehackathon-research-dex

# Pre-Hackathon Research — Dex

*EthGlobal Cannes — April 3rd, 2026Assumes you’ve read the architecture doc (v4.1). This is the drill-down on your perimeter.*

---

## 0. Your Role in 60 Seconds

You own the **data layer and the user’s experience** from first click to final receipt. Your job: (1) give users a clean RFQ intent form, (2) show them the fairness panel proving the TEE priced honestly, (3) display the attestation deeplink so anyone can verify the computation. No backend, no attestation flow — you read from public APIs and on-chain event logs. Your FTSO spot and Deribit IV display are also the sanity check the judge sees first against Hamza’s TEE output.

---

## Contents

```
0. Your Role in 60 Seconds
1. What You Own ................... RFQ intent form
                                    Fairness panel (MC vs BS, delta, vega)
                                    Attestation deeplink + quote timeline
                                    Historical execution feed
2. What You Receive ............... From Hamza (on-chain): Quote payload
                                    From Daniel: relay ABI + event signatures
3. What You Produce ............... Confirmed Deribit mark_iv format -> teammates
                                    FTSO spot format + feed ID -> Hamza sanity check
4. Interface Contracts ............ FTSO getFeedByIdInWei
                                    Deribit endpoint + mark_iv field
                                    QuoteSigned event shape (from Daniel)
                                    Attestation deeplink format (from Hamza)
5. Tasks by Risk .................. MEDIUM: Web2Json FDC attestation (optional)
                                    LOW: all frontend components
6. Fallback ....................... hardcoded demo Quote, unattested vol
```

---

## 1. What You Own

| Component | Stack | Notes |
| --- | --- | --- |
| RFQ intent form | React / Next.js | Inputs: underlying, amount, strike, expiry, isPut |
| Fairness panel | React + Recharts | call_price_mc vs call_price_bs, delta, vega, seed — from QuoteSigned event |
| MC vs BS convergence chart | Recharts | Side-by-side bar — proves MC converges to closed-form |
| Greeks gauges | React | Delta (directional exposure), vega (vol sensitivity per 1% IV move) |
| Attestation deeplink | React | Hamza’s cloudflared `/info` URL — “verify this computation” button |
| Quote timeline | React | RFQ broadcast -> TEE latency -> settlement confirmation timestamps |
| Historical execution feed | React | On-chain event log: all past QuoteSigned events, newest first |

**What you do NOT own:** pricing computation (Hamza), on-chain contracts (Daniel), XRPL Smart Account (Marcos). You read from their outputs; you write nothing on-chain.

---

## 2. What You Receive

### From Hamza — on-chain via QuoteSigned event (Daniel’s relay emits it)

```tsx
interface QuoteSignedEvent {
    rfqId:            string;    // bytes32 hex — links to RFQ
    maker:            string;    // TEE address (Hamza's attested key)
    price:            bigint;    // 18 decimals — call_price_mc
    strike:           bigint;    // 18 decimals
    expiry:           bigint;    // Unix timestamp
    isPut:            boolean;
    signature:        string;    // hex — EIP-712 signature from TEE key
    attestationToken: string;    // hex — FCE attestation token
    // Additional payload fields (agree with Hamza what extras are included):
    callPriceBs:      bigint;    // 18 decimals — Black-Scholes convergence check
    delta:            bigint;    // 18 decimals — N(d1), directional exposure
    vega:             bigint;    // 18 decimals — sensitivity per 1% IV move
    seed:             string;    // bytes32 — on-chain SecureRandom seed (reproducible)
}
```

### From Daniel — at venue, first hour

| Item | Why you need it |
| --- | --- |
| Relay contract address | Subscribe to `QuoteSigned` and `TeeInstructionsSent` events |
| Relay contract ABI | Decode event log data |
| Mock contract address | Display settlement target in the timeline UI |

### From Hamza — cloudflared URL (after tunnel starts)

```
https://<random>.trycloudflare.com/info
```

Display as the “Verify computation →” deeplink button. Hamza gives you this URL after his `cloudflared tunnel` command runs.

### From chain — you read directly

| Feed | How |
| --- | --- |
| FTSO XRP/USD spot | `getFeedByIdInWei(XRP_USD_FEED_ID)` — ethers.js view call on Coston2 |
| Deribit mark_iv | `GET .../get_book_summary_by_currency?currency=XRP&kind=option` |

---

## 3. What You Produce

### Confirmed Deribit mark_iv format — share with Hamza on arrival

```tsx
const resp = await fetch(
    "https://www.deribit.com/api/v2/public/get_book_summary_by_currency" +
    "?currency=XRP&kind=option"
);
const data = await resp.json();

// result[i].mark_iv is annualised implied vol as a percentage
// e.g. 85.2 means 85.2% IV. Hamza uses: sigma = mark_iv / 100
const markIvs = data.result.map((r: any) => r.mark_iv).filter(Boolean);
const medianIv = markIvs.sort((a: number, b: number) => a - b)[Math.floor(markIvs.length / 2)];
```

Confirm with Hamza: median, ATM strike only, or shortest expiry? Agree on one method before the hackathon starts.

### FTSO spot format — sanity check for Hamza

```tsx
// FTSO V2 on Coston2 (confirm contract address from Flare docs at venue)
const [value, decimals] = await ftso.getFeedByIdInWei(XRP_USD_FEED_ID);
// e.g. value=230000000, decimals=8 → spot = 2.30 USD
const spotUsd = Number(value) / 10 ** Number(decimals);
```

Share the exact `value` and `decimals` you get — Hamza reads the same feed inside the TEE. If yours shows 2.30 and his shows something else, there’s a feed ID mismatch.

---

## 4. Interface Contracts

### FTSO `getFeedByIdInWei`

```solidity
// Read-only interface — ethers.js view call, no gas
function getFeedByIdInWei(bytes21 feedId)
    external view
    returns (uint256 value, int8 decimals, uint64 timestamp);
```

Feed ID for XRP/USD: confirm the exact `bytes21` encoding from Flare docs at the venue. The `"XRP/USD"` string padded to 21 bytes with a category prefix.

### Deribit endpoint

```
GET https://www.deribit.com/api/v2/public/get_book_summary_by_currency
    ?currency=XRP
    &kind=option
```

Response field: `result[].mark_iv` — annualised vol percentage, no auth required, no CORS issues.

### QuoteSigned event — agree with Daniel on the full shape

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

Also subscribe to:

```solidity
event TeeInstructionsSent(bytes32 indexed rfqId, ...);  // shows "computing" state
event OptionFilled(bytes32 indexed rfqId, ...);          // settlement confirmation
```

---

## 5. Tasks by Risk

### MEDIUM — one external dependency

**[M1] Web2Json FDC attestation for Deribit IV (decide with team)**

If the team decides the Deribit IV must be FDC-attested for maximum integrity, you own this. The FDC Web2Json cycle:

1. `POST /verifier/web2json/Web2Json/prepareRequest` — URL + JQ filter for `.result[0].mark_iv`
2. `FdcHub.requestAttestation(abiEncodedRequest)` + fee
3. Wait ~90–180s for voting round
4. Fetch proof from DA Layer
5. Submit proof on-chain

**V1 recommendation: skip FDC attestation for IV.** Use the direct browser API call and label it “unattested vol input.” The TEE computation attestation (Hamza’s FCE) is the headline story. IV attestation is a strong V2 upgrade to highlight in the pitch.

### LOW — build in order, all straightforward

**[L1] RFQ intent form**

Inputs the user fills. These get encoded as an XRPL Payment memo by Marcos’ Smart Account layer:

```tsx
interface RFQIntent {
    asset:    "fXRP";
    amount:   number;    // XRP
    strike:   number;    // USD, converted to 18 dec
    expiry:   Date;      // converted to Unix timestamp
    isPut:    boolean;
}
```

Show current FTSO spot and Deribit IV alongside the form so users see market context when choosing strike/expiry.

**[L2] Fairness panel**

```tsx
// Rendered after QuoteSigned event received
<FairnessPanel
    callPriceMC={formatUnits(event.price, 18)}
    callPriceBS={formatUnits(event.callPriceBs, 18)}
    delta={formatUnits(event.delta, 18)}
    vega={formatUnits(event.vega, 18)}
    seed={event.seed}
    spotUsed="[fetch from FTSO at quote block timestamp]"
    ivUsed="[median mark_iv at quote time]"
/>
```

**[L3] Quote timeline**

Three timestamps from on-chain:
1. `TeeInstructionsSent` block time — RFQ broadcast
2. `QuoteSigned` block time — TEE quote returned
3. `OptionFilled` block time — settlement confirmed

The delta between 1 and 2 is the TEE compute time. Highlight this in the demo — it’s the proof that the computation ran asynchronously in the enclave.

**[L4] Historical feed**

```tsx
const logs = await provider.getLogs({
    address: RELAY_CONTRACT_ADDRESS,
    topics:  [ethers.id("QuoteSigned(bytes32,address,uint256,uint256,uint256,bool,bytes,bytes)")],
    fromBlock: 0,
});
// Decode each log with the relay ABI, display newest first
```

**[L5] Attestation deeplink button**

```tsx
<a href={`${hamzaTunnelUrl}/info`} target="_blank" rel="noopener">
    Verify this computation →
</a>
```

---

## 6. Fallback

| Blocker | Degraded path |
| --- | --- |
| No QuoteSigned events (Hamza’s TEE not ready) | Hardcode a demo Quote payload — display fairness panel statically. Label `[DEMO MODE]` |
| Deribit API rate-limited | Cache the last successful IV call; display “IV as of HH:MM” |
| Web2Json FDC attestation not ready | Skip IV attestation entirely; direct browser call only; label “unattested vol input” |
| Hamza’s cloudflared URL not available | Replace attestation deeplink with raw attestation token hash display |
| FTSO feed ID wrong on Coston2 | Check Flare docs at venue for exact `bytes21` encoding; fallback to Flare testnet explorer |
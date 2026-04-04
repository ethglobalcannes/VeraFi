# IDEA BREAKDOWN

# **0. The core idea, in plain English**

What you are building is this:

**an options market maker whose pricing computation runs inside a TEE**, and every quote comes with **on-chain verifiable proof**.

In practical terms:

- a user wants to buy an option on XRP/fXRP,
- your system computes the premium,
- that computation does not happen in a normal backend,
- it happens inside a tamper-resistant trusted execution environment,
- that TEE signs the quote,
- and then an on-chain verifier checks that the quote really came from the registered attested TEE and was not manipulated.

The whole point is:

“Do not trust the market maker. Verify the computation.”

That is the heart of the system.

# **1. The actual problem you are solving**

In an RFQ-based options market, the taker asks for a quote and the market maker replies with a price.

The problem is that today the taker has to trust that the maker:

- priced fairly,
- used honest inputs,
- did not manipulate the model,
- and did not return an arbitrary quote.

Your architecture adds a new trust model:

- pricing runs inside a TEE,
- the signing key lives inside the enclave,
- attestation proves what code ran and on what hardware,
- and the result is linked on-chain.

Important nuance:

This does **not** prove that the pricing model is universally “correct.”

It proves that **the declared model** ran, with **the declared inputs**, inside **the declared attested environment**. The notes explicitly make that distinction.

---

# **2. The system actors**

Before the workflow, you need the map.

## **A. XRPL user**

This is the end user.

They use **Xaman** and send an XRP payment with a memo that encodes their option intent.

## **B. Flare Smart Account**

This is the intelligent execution layer between XRPL user intent and EVM/Flare logic.

It receives the decoded intent, turns it into an RFQ or contract call, and later decides whether to accept or reject the quote.

## **C. FDC / Attestations**

This is used to verify:

- that the XRPL payment happened,
- that the memo data is valid,
- and also to attest certain external inputs like Deribit implied volatility via Web2Json.

## **D. TEE / FCE**

This is where your “honest market maker” lives.

Inside the TEE:

- market data is collected,
- Monte Carlo pricing runs,
- Black-Scholes sanity check runs,
- premium is computed,
- and the quote is signed with the attested key.

## **E. Rysk or mock options contract**

Here is the blunt truth:

You should **not** architect as if live Rysk on Flare is guaranteed.

The notes make it clear that the **mock Opyn Gamma-compatible contract on Flare chainId 14 is likely the primary practical execution path**.

That matters a lot. If you treat the mock path like an afterthought, you are setting yourselves up for pain.

## **F. On-chain verifier**

A contract that checks:

- the quote was signed by the registered TEE key,
- the EIP-712 signature is valid,
- the quoted price is within an acceptable fairness/slippage bound.

## **G. Frontend**

This is not just demo UI. It has a critical role:

- showing the timeline,
- showing fairness evidence,
- showing the attestation proof path,
- showing historical on-chain execution records.

---

# **3. The complete end-to-end workflow, step by step**

Now the full happy path.

---

## **Step 1. The user expresses intent from XRPL**

The user opens **Xaman** and sends an XRP payment to the Smart Account operator address.

That payment includes a **hex memo** containing a 0xff-type instruction encoding fields like:

- action = RFQ,
- underlying = fXRP,
- amount,
- strike,
- expiry,
- isPut.

### **What this means conceptually**

The user is not executing the option trade yet.

They are saying:

“I want a quote for this options trade.”

So this is an **intent trigger**, not final settlement.

### **What needs to be built**

- exact memo schema,
- memo encoder,
- memo decoder,
- field validation rules.

### **Real risk**

If the memo format is not tightly defined, the entire flow becomes fragile immediately.

This is not something to “clean up later.”

---

## **Step 2. The XRPL payment is attested**

The system uses **FDC Payment attestation** to verify that the payment actually occurred and to decode the memo on-chain.

The notes mention roughly **90–180 seconds** for this step.

### **What this means**

The Smart Account should not act because someone merely *claims* an XRPL payment happened.

It acts because there is a verifiable attestation that the payment took place.

### **What this adds**

- trustable cross-chain trigger,
- verifiability,
- auditable linkage between XRPL action and Flare execution.

### **What needs to be built**

- attestation consumption pipeline,
- mapping from payment proof to internal instruction,
- state management for the delay,
- frontend UX for pending verification.

### **Real risk**

This is not instant.

If you do not design the UX around delayed attestation, users will think the system is broken.

---

## **Step 3. The Smart Account converts intent into an RFQ**

Once the payment is verified, the Smart Account submits an RFQ to Rysk or to the mock execution path.

Parameters include:

- asset = fXRP,
- strike,
- expiry,
- quantity,
- isPut.

### **What this means conceptually**

The Smart Account acts as the **taker-side execution proxy**.

The XRPL user never needs a traditional EVM wallet.

### **Why this matters**

This is why the Smart Account is not cosmetic.

It is a structural part of the architecture. The notes explicitly position Smart Account as the taker access layer.

### **What needs to be implemented**

This is very likely your main responsibility area:

- trigger after XRPL payment attestation,
- RFQ payload construction,
- call into protocol or mock contract,
- state machine around request lifecycle,
- integration into verifier and settlement path.

### **Real risk**

The notes explicitly rate this as **high complexity / high risk**, with thin documentation, and recommend prototyping fast and timeboxing it.

So do not overengineer this.

Get the smallest reliable version working first.

---

## **Step 4. The TEE receives the RFQ and gathers inputs**

The maker bot inside the TEE listens for RFQs and, when it gets one, gathers the pricing inputs.

Main inputs:

### **A. Spot price S0**

Fetched from **FTSO XRP/USD**.

### **B. Volatility sigma**

Fetched from **Deribit mark_iv** through Web2Json attestation.

### **C. Random seed**

Fetched from **on-chain SecureRandom** so the Monte Carlo computation is reproducible.

### **What this means**

To price an option you need:

- current spot,
- implied volatility,
- strike,
- expiry / time to maturity,
- option type,
- and here, also a reproducible randomness seed.

### **What needs to be built**

- robust feed reads,
- decimal normalization,
- timestamp consistency,
- unit conversion discipline.

### **Real risk**

Most pricing systems fail less from the formula and more from bad data handling:

- decimal mismatches,
- wrong volatility interpretation,
- stale timestamps,
- inconsistent units.

That part must be treated seriously.

---

## **Step 5. The TEE runs the pricing model**

Inside the enclave, you run a **GBM Monte Carlo** with 10k paths.

You also compute **Black-Scholes** as a convergence / sanity check.

### **What Monte Carlo is doing here**

It simulates many possible terminal prices of the underlying at expiry.

For each path it computes the option payoff.

Then it:

- averages them,
- discounts back to present value,
- and produces the fair premium.

### **Conceptual formula**

For a call:

- terminal payoff = max(ST - K, 0)
- premium today = discounted mean of those payoffs.

### **Why Black-Scholes is included**

It acts as a sanity benchmark.

It does not replace Monte Carlo, but it lets you show:

“The Monte Carlo output is converging to a well-known closed-form benchmark.”

That is excellent for credibility in the demo.

### **Additional outputs**

The TEE also computes:

- delta
- vega

### **Why this is powerful**

You are not just returning a number.

You are returning a number plus transparent model diagnostics.

### **What needs to be built**

- vectorized NumPy implementation,
- reproducible seeded simulation,
- structured output payload,
- benchmark tests on known examples.

### **Real risk**

The notes treat this part as relatively low risk and fast to execute.

The hard part is not the math. The hard part is integration around it.

---

## **Step 6. The TEE signs the quote**

Once the premium is computed, the TEE builds an **EIP-712 Quote** and signs it with the attested key living inside the enclave.

### **Why this is crucial**

This is not “backend signed data.”

This is data signed by a key whose provenance is tied to the attested TEE.

That makes the quote cryptographically meaningful.

### **Relevant quote fields**

The notes mention fields like:

- assetAddress,
- chainId,
- isPut,
- strike,
- expiry,
- maker,
- nonce,
- price,
- quantity,
- isTakerBuy,
- validUntil,
- usd,
- collateralAsset.

### **Critical warning**

**The EIP-712 domain parameters must match exactly.**

The notes explicitly state:

- name = "rysk"
- version = "0.0.0"
- verifyingContract = exact Rysk contract address where applicable.

If this is even slightly off, signature verification will fail.

This is one of those places where “close enough” is total failure.

---

## **Step 7. The quote is returned to the execution system**

The maker bot sends the quote back through the RFQ path.

At the same time, pricing inputs and the FCE attestation token are stored on-chain through the relay contract.

### **What this means**

You are not just answering the RFQ.

You are also leaving an auditable trail of:

- the computation inputs,
- the attestation artifact,
- the resulting premium.

### **Why this matters**

It turns the system into a public proof system, not just a hidden backend service.

---

## **Step 8. The on-chain verifier checks whether the quote is acceptable**

Daniel’s verifier contract checks three critical things:

### **A. The quote came from the registered TEE key**

Checked against TeeExtensionRegistry.

### **B. The EIP-712 signature is valid**

Meaning the structured quote data was really signed by that key.

### **C. The price is within an acceptable bound**

Compared against a fair-value expectation derived from FTSO + IV inputs.

### **What this means conceptually**

You do not blindly trust the TEE.

You still add an on-chain policy layer saying:

“Even if this quote came from a valid attested key, it must still remain inside acceptable pricing bounds.”

### **What needs to be implemented**

- retrieve and compare TEE key registration,
- reconstruct EIP-712 digest,
- verify signature,
- implement slippage/fairness guard,
- write rejection/acceptance tests.

### **Real risk**

This is high complexity and high risk in the notes for good reason.

There is a lot that can go wrong here.

---

## **Step 9. Settlement or rejection happens**

If the quote passes verification:

- the Smart Account accepts it,
- collateral is locked,
- the option token is minted to the taker,
- and settlement proceeds through protocol or mock contract flow.

If the quote fails:

- it is rejected,
- the Smart Account safely holds the fXRP,
- a rejection event is emitted with the reason.

### **What this means**

You have a very clean binary outcome:

- verified → execute
- not verified → reject safely

That is ideal for demo clarity.

---

## **Step 10. The frontend proves the story visually**

The frontend should expose several layers:

### **A. RFQ timeline**

- request broadcast,
- TEE quote latency,
- settlement confirmation.

### **B. Fairness panel**

- call_price_mc
- call_price_bs
- delta
- vega
- seed
- inputs used.

### **C. Attestation deeplink**

A path to inspect the attestation token and extension hash.

### **D. Historical execution feed**

Past quotes and settlements from on-chain events.

### **What this means**

The frontend is not just a nice wrapper.

It is the layer that makes trust visible.

---

# **4. Key concepts, explained simply**

Now the main concepts one by one.

---

## **RFQ**

Request For Quote.

The user is not immediately trading.

They first ask:

“What price would you give me for this option trade?”

---

## **Market maker**

The entity providing price and liquidity.

In your architecture, the market maker is not just a trading bot.

It is a **TEE-attested pricing engine**.

---

## **TEE**

Trusted Execution Environment.

A hardware-isolated execution environment where:

- code runs securely,
- keys are protected,
- and the runtime can be attested.

---

## **Attestation**

Cryptographic proof that a specific computation happened inside a valid TEE with a specific software identity.

---

## **FCE**

Flare Compute Extension.

This is the deployment model for your TEE-based compute service within the Flare ecosystem.

In your current architecture, it is deployed locally with Docker + cloudflared and registered on Coston2.

---

## **EIP-712**

A standard for signing structured typed data.

Here it is used to sign Quotes in a way that can be reliably verified on-chain.

---

## **FTSO**

Flare Time Series Oracle.

You use it for decentralized XRP/USD spot price input.

---

## **Deribit mark_iv**

An off-chain implied volatility source.

Not decentralized, but fetched and attested through Web2Json.

---

## **Monte Carlo**

A simulation-based numerical method.

It is useful now for vanilla option pricing, and later for more complex path-dependent products.

---

## **Black-Scholes**

A closed-form pricing model for European options.

Here it serves as a reference benchmark and sanity check.

---

## **Delta and Vega**

- **Delta** = sensitivity of option value to changes in spot price.
- **Vega** = sensitivity of option value to changes in implied volatility.

---

## **Smart Account**

The execution/access layer that lets XRPL users enter the system without a traditional EVM wallet.

In your design, it is architecturally necessary, not cosmetic.

---

## **Mock Opyn Gamma-compatible contract**

The fallback, and realistically likely primary hackathon execution path on Flare chainId 14 if direct Rysk integration is unavailable.

---

# **5. What actually needs to be built**

Now the architecture translated into real workstreams.

---

## **Block 1. Intent entry**

You need:

- user input form,
- XRPL memo encoding,
- Xaman payment initiation,
- payment state tracking.

---

## **Block 2. Payment attestation handling**

You need:

- payment proof verification,
- memo decoding,
- translation into a normalized internal trade request.

---

## **Block 3. Smart Account RFQ trigger**

You need:

- post-attestation trigger,
- RFQ construction,
- protocol or mock-contract call,
- lifecycle state tracking.

This is probably your most important technical workstream.

---

## **Block 4. TEE pricing engine**

You need:

- spot input,
- volatility input,
- seed input,
- Monte Carlo pricing,
- Black-Scholes check,
- Greeks output,
- quote signing.

---

## **Block 5. Relay + verifier**

You need:

- relay contract,
- attestation/input recording,
- TEE key verification,
- EIP-712 validation,
- fairness/slippage guard.

---

## **Block 6. Settlement**

You need:

- quote acceptance path,
- collateral lock path,
- mint / settlement path through mock or protocol flow.

---

## **Block 7. Frontend demo layer**

You need:

- intent form,
- timeline,
- fairness panel,
- attestation viewer / linkout,
- historical execution feed.

---

# **6. What the real risks are**

## **Top risks**

The notes identify these as highest risk:

- FCE registration on Coston2,
- Smart Account RFQ trigger,
- mock options contract,
- on-chain attestation verifier.

That means the main challenge is **not** frontend work and **not** the raw Monte Carlo model.

The real challenge is infrastructure and cross-layer integration.

## **Medium risks**

- maker bot loop with ryskV12_py,
- secure relay contract implementation.

## **Lower risks**

- FTSO fetch,
- Monte Carlo implementation itself,
- Black-Scholes check,
- basic frontend visual components.

---

# **7. What you should not lie to yourselves about**

Here are the important reality checks.

## **1. “Live Rysk on Flare will probably be our main path”**

No.

Your own notes already show that the mock Opyn-compatible contract is the realistic primary path.

## **2. “The hard part is the options math”**

No.

The math is the clean part. The hard part is XRPL → attestation → Smart Account → verifier → settlement integration.

## **3. “Attestation proves the quote is objectively correct”**

Not exactly.

It proves computational integrity, not absolute truth of model choice or input quality. The notes explicitly say this.

## **4. “Smart Account is just a nice UX extra”**

Also no.

It is a core part of the architecture because it is what makes XRPL taker access possible.

---

# **8. Your part, concretely**

According to the notes, your ownership is around:

- **Smart Account RFQ trigger**
- **XRPL ↔ Flare bridge**
- **XRPL payment + memo encoding**.

Translated into actual engineering tasks:

1. define the user intent payload,
2. encode it into XRPL memo format,
3. make sure the Smart Account can reconstruct that intent after attestation,
4. transform that into a valid RFQ / contract call,
5. manage lifecycle states: pending, quoted, verified, rejected, settled.

That is the correct professional framing.

Your job is not “just an integration.”

It is a **cross-chain state machine**.

---

# **9. The simple mental model**

If I compress the whole architecture into one clean chain, it is this:

**XRPL user**

→ sends XRP payment with memo

→ **FDC attests the payment**

→ **Smart Account interprets intent**

→ creates RFQ

→ **TEE receives RFQ**

→ reads spot + IV + seed

→ runs Monte Carlo + Black-Scholes + Greeks

→ signs quote with attested key

→ **on-chain verifier validates quote**

→ if valid, settlement executes

→ **frontend displays proof, inputs, and result**.

---

# **10. The correct reading of the project**

This is not just “an options app.”

It is the combination of four stories:

- **cross-chain UX**: XRPL users can participate without an EVM wallet,
- **verifiable compute**: pricing runs inside a TEE,
- **on-chain verification**: quotes are checked cryptographically and policy-gated,
- **options execution**: the trade settles through a protocol-compatible path.

That is why the project is strong.

---

# **11. What I would prioritize immediately**

The real priorities should be:

1. freeze the memo / intent schema,
2. define the Smart Account state machine clearly,
3. treat the mock contract as the primary execution path,
4. treat EIP-712 verification as critical from day one,
5. use frontend to expose trust evidence, not just pretty screens.

![image.png](IDEA%20BREAKDOWN/image.png)

[sequence-diagram-detailed](IDEA%20BREAKDOWN/sequence-diagram-detailed%2033756ab694238020b449e126f94fc373.md)

[sequence-diagram-overview](IDEA%20BREAKDOWN/sequence-diagram-overview%2033756ab6942380ed8f36e2bf04bf8cb7.md)
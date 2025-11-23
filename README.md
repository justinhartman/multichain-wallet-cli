# **Multi-Chain HD Wallet Generator (Solana / EVM / Aptos / Tron / TON / Sui)**

This tool generates deterministic HD wallet addresses and private keys for multiple blockchains from a **single BIP-39 mnemonic** and optional **BIP-39 passphrase**.   
It supports interactive prompts, CLI flags, and environment variables.

Built for:

* **Solana (ed25519)**
* **EVM networks**: Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, Avalanche, etc. (secp256k1)
* **Aptos (ed25519)**
* **Tron (secp256k1)**
* **TON (ed25519)**
* **Sui (ed25519)**

This script makes it easy to generate, audit or migrate wallets across ecosystems.

---

# **Features**

* Generate or import your own mnemonic (recovery phrase)
* Optional BIP-39 passphrase
* Deterministic HD wallet generation from BIP-44 paths
* Multi-chain support (Sol, EVM, Apt, TRX, TON, Sui)
* Filters using `--chains`
* Compatible with **Bun**, **Node**, **tsx**
* Prints derivation path, private key, public key & address for each network
* Fully interactive mode when no flags are provided

---

# **Supported Chains & BIP-44 Paths**

| Chain                    | Coin Type | Curve     | Path Format                |
| ------------------------ | --------- | --------- | -------------------------- |
| **Solana**               | `501`     | ed25519   | `m/44'/501'/{i}'`          |
| **EVM** (ETH, BSC, etc.) | `60`      | secp256k1 | `m/44'/60'/{i}'/0/0`       |
| **Aptos**                | `637`     | ed25519   | `m/44'/637'/{i}'/0'/0'`    |
| **Tron**                 | `195`     | secp256k1 | `m/44'/195'/{i}'/0/0`      |
| **TON**                  | `607`     | ed25519   | `m/44'/607'/0'/0'/{i}'/0'` |
| **Sui**                  | `784`     | ed25519   | `m/44'/784'/{i}'/0'/0'`    |

---

# **SECURITY WARNING**

* Never share your mnemonic, passphrase, or private keys.
* Use this script offline for maximum security.
* Generated keys are deterministic: anyone with your mnemonic can regenerate all accounts.

---

# **Installation**

Install dependencies:

```bash
bun install
```

---

# **Usage**

Run production using `ts-node`:

```bash
bun start
```

Or development using `tsx`:

```bash
bun dev
```

---

# **Options**



| Flag                   | Alias | Description                                |
| ---------------------- | ----- | ------------------------------------------ |
| `--chains sol,evm,sui` | `-c`  | Select only these networks                 |
|                        |       | options: `sol, evm, apt, trx, ton, sui`    |
|                        |       | default: `all`                             |
| `--count N`            | `-t`  | Number of accounts to derive (default: `3`)|
| `--mnemonic "..."`     | `-m`  | Provide your own recovery phrase           |
| `--passphrase "..."`   | `-p`  | Provide BIP-39 passphrase                  |
| `--out FILENAME.json`  | `-o`  | Save output to a JSON file                 |
| `MNEMONIC=...`         | —     | Provide recovery phrase via env var        |
| `PASSPHRASE=...`       | —     | Provide passphrase via env var             |
| `COUNT=5`              | —     | Provide total derivation count via env var |

---

# **Examples**

## **1. Generate 1 account for all networks**

```bash
bun dev --count 1
```

## **2. Single chain (Solana only)**

```bash
bun dev --chains sol --count 1
```

## **3. Solana + EVM + Sui for first 5 accounts**

```bash
bun dev --chains sol,evm,sui --count 5
```

## **4. Aptos + TON only**

```bash
bun dev --chains apt,ton --count 1
```

## **5. Provide your own recovery phrase**

```bash
bun dev --mnemonic "abandon abandon abandon ..." --count 1
```

## **6. Use BIP-39 passphrase**

```bash
bun dev --passphrase "mySecret" --count 2
```

or via env:

```bash
PASSPHRASE="xyz" bun dev --chains sol,evm
```

## **7. Provide your own recovery phrase and pasphrase**

```bash
bun dev --mnemonic "abandon abandon abandon ..." --passphrase "mySecret" --count 1
```

or in shortened format:

```bash
bun dev -m "abandon abandon abandon ..." -p "mySecret" -t 1
```

## **8. Save results to a JSON file**

```bash
bun dev --count 1 --out results.json
```

---

# **Prompts**

If no recovery phrase is supplied, you will be asked:

```
Do you want to enter your own recovery phrase? (y/N)
```

If no passphrase is supplied:

```
Use a passphrase? (y/N)
```

---

# **Output Example**

```
================================================================================

Account index: 0

Solana path: m/44'/501'/0'
Solana relative seed: ...
Solana private key (bs58): ...
Solana address: ...

EVM path: m/44'/60'/0'/0/0
EVM private key: ...
EVM address: ...

Aptos path: m/44'/637'/0'/0'/0'
Aptos private key (hex): ...
Aptos public key (hex): ...
Aptos address: ...

Tron path: m/44'/195'/0'/0/0
Tron private key (hex): ...
Tron address (base58): ...
Tron address (hex): ...

Ton path: m/44'/607'/0'/0'/0'/0'
Ton private key 32-byte (hex): ...
Ton combined secret (64-byte, seed+pub) hex: ...
Ton public key (hex): ...
Ton address (friendly): ...

Sui path: m/44'/784'/0'/0'/0'
Sui private key (base64 32-byte secret): ...
Sui public key (base64): ...
Sui address: ...
Sui wallet import key (suiprivkey): ...

================================================================================
```

---

# **Environment Variables**

These override CLI behaviour:

### **Mnemonic**

```bash
MNEMONIC="your twelve or twenty-four words"
```

### **Passphrase**

```bash
PASSPHRASE="your passphrase"
```

### **Total accounts**

```bash
COUNT=10
```

## Environment file

If you are generating new wallets and you want the script to create a recovery phrase for you then ignore this.   
If you want to work with an existing recovery phrase then follow on.

There is a default `.env.example` that contains the following environment variables.

```env
MNEMONIC="your twelve or twenty-four words"
PASSPHRASE="your passphrase"
COUNT=10
```

Rename this file from `.env.example` to `.env` and edit the `.env` file changing the details to your mnemonic and optional passphrase.
The count will determine how many accounts are generated.

---

# License

[MIT License](LICENSE)

> Copyright (c) 2025 Justin Hartman <code@justhart.com>

---

# Authors

- [Justin Hartman](https://justhart.com) (@justinhartman)
- [Abhijay Rajvansh](https://abhijayrajvansh.com) (@abhijayrajvansh) - for his original work on the [Solana Wallet Generator](https://github.com/abhijayrajvansh/solana-wallet-generator)

---

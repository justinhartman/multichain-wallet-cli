import fs from "fs";
import path from "path";
import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import { derivePath as deriveEd25519 } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { ethers } from 'ethers';
import { AptosAccount } from 'aptos';
import TronWebDefault, { TronWeb as TronWebNamed } from 'tronweb';
import TonWeb from 'tonweb';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { toB64 } from '@mysten/sui.js/utils';
import { bech32 } from "@scure/base";
import readline from 'readline';
import { green, reset, red } from './ansi-colorcodes.ts';

const argv = process.argv.slice(2);
const argValue = (flag: string) => {
  const idx = argv.indexOf(flag);
  if (idx === -1) return null;
  return argv[idx + 1] ?? null;
};

// JSON output file and Network selection wrapper arguments
const outFile = argValue("--out") || argValue("-o") || null;
const networksArg = argValue("--chains") || argValue("-c");

type NetworkName = "sol" | "evm" | "apt" | "trx" | "ton" | "sui";

const selectedNetworks: Set<NetworkName> | null = networksArg
  ? new Set(
      networksArg
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean) as NetworkName[],
    )
  : null;

const include = (name: NetworkName) =>
  !selectedNetworks || selectedNetworks.has(name);

/** 
 * Mnemonic (env, CLI or generated) 
 */
const mnemonicFromEnv = process.env.MNEMONIC || argValue("--mnemonic") || argValue("-m");
async function promptMnemonic(): Promise<string> {
  if (mnemonicFromEnv) return mnemonicFromEnv;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((res) => rl.question(q, (a) => res(a)));

  const use = (await ask("Do you want to enter your own recovery mnemonic? (y/N): ")).trim().toLowerCase();
  if (use !== "y" && use !== "yes") {
    const mnemonic = generateMnemonic();
    rl.close();
    return mnemonic;
  }

  const mnemonic = await ask("Enter your recovery mnemonic (visible): ");
  rl.close();
  return mnemonic;
}

/** 
 * BIP-39 passphrase (env, CLI, or prompt) 
 */
const passphraseFromEnv = process.env.PASSPHRASE || argValue("--passphrase") || argValue("-p");
async function promptPassphraseIfNeeded(): Promise<string> {
  if (passphraseFromEnv) return passphraseFromEnv;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((res) => rl.question(q, (a) => res(a)));

  const use = (await ask("Use a passphrase? (y/N): ")).trim().toLowerCase();
  if (use !== "y" && use !== "yes") {
    rl.close();
    return "";
  }
  const pass = await ask("Enter passphrase (visible): ");
  rl.close();
  return pass;
}

(async () => {
  const mnemonic = await promptMnemonic();
  const passphrase = await promptPassphraseIfNeeded();
  console.log(`\nSecret phrase: ${green}${mnemonic}${reset}`);
  console.log(`${red}Warning: back up your secret phrase.${reset}`);

  /** 
   * Master seed from mnemonic + passphrase (BIP-39) 
   */
  const seed = mnemonicToSeedSync(mnemonic, passphrase || "");
  console.log("\nMaster seed:", seed.toString("hex"), "\n");

  /** 
   * Derivation paths 
   */
  // Solana (Ledger Live style): m/44'/501'/{i}'
  const solanaPath = (i: number) => `m/44'/501'/${i}'`;
  // EVM (Ledger / Metamask style): m/44'/60'/{i}'/0/0
  const evmPath = (i: number) => `m/44'/60'/${i}'/0/0`;
  // Aptos (BIP-44 coin 637): m/44'/637'/{i}'/0'/0'
  const aptosPath = (i: number) => `m/44'/637'/${i}'/0'/0'`;
  // Tron (coin 195): m/44'/195'/{i}'/0/0 (secp256k1)
  const tronPath = (i: number) => `m/44'/195'/${i}'/0/0`;
  // TON (Toncoin, coin type 607): m/44'/607'/0'/0'/{i}'/0'
  const tonPath = (i: number) => `m/44'/607'/0'/0'/${i}'/0'`;
  // Sui (BIP-44 coin 784): m/44'/784'/{i}'/0'/0' (ed25519)
  const suiPath = (i: number) => `m/44'/784'/${i}'/0'/0'`;

  /** 
   * Arguments
   */
  const totalArg = parseInt(process.env.COUNT || argValue("--count") || argValue("-t") || "3", 10);
  const count = Number.isFinite(totalArg) ? totalArg : 3;

  // Shared HD root for EVM + Tron (secp256k1)
  const hdRoot = ethers.HDNodeWallet.fromSeed(seed);

  // Single TonWeb instance
  const tonweb = new TonWeb();
  const TonWalletClass = tonweb.wallet.all.v4R2; // standard v4R2 wallet type

  // Container for JSON output
  const results: any[] = [];

  // Normalise to a single TronWeb reference regardless of export style
  const TronWeb: any = TronWebNamed ?? TronWebDefault;

  for (let i = 0; i < count; i++) {
    const entry: any = { index: i, chains: {} };
    if (!outFile) {
      console.log("================================================================================\n");
      console.log("Account index: ", i, "\n");
    }

    // --- Solana (ed25519) ---
    if (include("sol")) {
      const solPath = solanaPath(i);
      const solDerived = deriveEd25519(solPath, seed.toString("hex")).key;
      const solSecretKey = nacl.sign.keyPair.fromSeed(solDerived).secretKey;
      const solPub = Keypair.fromSecretKey(solSecretKey).publicKey.toBase58();
      entry.chains.sol = {
        path: solPath,
        privateKey: bs58.encode(solSecretKey),
        address: solPub,
      };

      if (!outFile) {
        console.log("Solana path:", solPath);
        console.log("Solana relative seed:", solDerived.toString("hex"));
        console.log(
          `Solana private key (bs58): ${green}${bs58.encode(solSecretKey)}${reset}`,
        );
        console.log(`Solana address: ${green}${solPub}${reset}\n`);
      }
    }

    // --- EVM (secp256k1) ---
    if (include("evm")) {
      const evmDerived = hdRoot.derivePath(evmPath(i));
      const evmPriv = evmDerived.privateKey; // 0x-prefixed
      const evmAddr = evmDerived.address;
      entry.chains.evm = {
        path: evmPath(i),
        privateKey: evmPriv,
        address: evmAddr,
      };

      if (!outFile) {
        console.log("EVM path:", evmPath(i));
        console.log(`EVM private key: ${green}${evmPriv}${reset}`);
        console.log(`EVM address: ${green}${evmAddr}${reset}\n`);
      }
    }

    // --- Aptos (ed25519, coin 637) ---
    if (include("apt")) {
      const aptPath = aptosPath(i);
      const aptDerived = deriveEd25519(aptPath, seed.toString("hex")).key;
      const aptosAccount = new AptosAccount(new Uint8Array(aptDerived));
      const aptosInfo = aptosAccount.toPrivateKeyObject();
      entry.chains.apt = {
        path: aptPath,
        privateKey: aptosInfo.privateKeyHex,
        publicKey: aptosInfo.publicKeyHex,
        address: aptosInfo.address,
      };

      if (!outFile) {
        console.log("Aptos path:", aptPath);
        console.log(
          `Aptos private key (hex): ${green}${aptosInfo.privateKeyHex}${reset}`,
        );
        console.log(
          `Aptos public key (hex): ${green}${aptosInfo.publicKeyHex}${reset}`,
        );
        console.log(`Aptos address: ${green}${aptosInfo.address}${reset}\n`);
      }
    }

    // --- Tron (secp256k1, coin 195) ---
    if (include("trx")) {
      const tronDer = hdRoot.derivePath(tronPath(i));
      const tronPrivHex = tronDer.privateKey.replace(/^0x/, ""); // TronWeb expects no 0x
      // Use static helpers on TronWeb (no instance required)
      const tronBase58 = TronWeb.address.fromPrivateKey(tronPrivHex);
      const tronHexAddr = TronWeb.address.toHex(tronBase58);
      entry.chains.trx = {
        path: tronPath(i),
        privateKey: tronPrivHex,
        addressBase58: tronBase58,
        addressHex: tronHexAddr,
      };

      if (!outFile) {
        console.log("Tron path:", tronPath(i));
        console.log(`Tron private key (hex): ${green}${tronPrivHex}${reset}`);
        console.log(`Tron address (base58): ${green}${tronBase58}${reset}`);
        console.log(`Tron address (hex): ${green}${tronHexAddr}${reset}\n`);
      }
    }

    // --- TON (ed25519, coin 607) ---
    if (include("ton")) {
      const tonDer = deriveEd25519(tonPath(i), seed.toString("hex")).key;
      const tonKeyPair = nacl.sign.keyPair.fromSeed(tonDer);
      const tonCombinedSecret = tonKeyPair.secretKey; // 64-byte combined key
      const tonSeedPriv = tonCombinedSecret.slice(0, 32); // 32-byte seed portion
      const tonPubKey = tonKeyPair.publicKey;
      const tonWallet = new TonWalletClass(tonweb.provider, {
        publicKey: tonPubKey,
      });
      const tonAddress = await tonWallet.getAddress();
      entry.chains.ton = {
        path: tonPath(i),
        privateKey32Hex: Buffer.from(tonSeedPriv).toString("hex"),
        publicKeyHex: Buffer.from(tonPubKey).toString("hex"),
        addressFriendly: tonAddress.toString(true, true, false),
      };

      if (!outFile) {
        console.log("Ton path:", tonPath(i));
        console.log(
          `Ton private key 32-byte (hex): ${green}${Buffer.from(tonSeedPriv).toString(
            "hex",
          )}${reset}`,
        );
        console.log(
          `Ton combined secret (64-byte, seed+pub) hex: ${green}${Buffer.from(
            tonCombinedSecret,
          ).toString("hex")}${reset}`,
        );
        console.log(
          `Ton public key (hex): ${green}${Buffer.from(tonPubKey).toString("hex")}${reset}`,
        );
        console.log(
          `Ton address (friendly): ${green}${tonAddress.toString(
            true,
            true,
            false,
          )}${reset}\n`,
        );
      }
    }

    // --- Sui (ed25519, coin 784) ---
    if (include("sui")) {
      const suiPathStr = suiPath(i);
      const suiDerived = deriveEd25519(suiPathStr, seed.toString("hex")).key; // Buffer(32)
      // Ed25519Keypair.fromSecretKey expects a 32-byte secret key
      const suiSecret32 = new Uint8Array(suiDerived); // 32 bytes
      const suiKeypair = Ed25519Keypair.fromSecretKey(suiSecret32);
      const suiPubRaw = suiKeypair.getPublicKey().toRawBytes();
      const suiSeedBase64 = toB64(suiSecret32);
      const suiPubBase64 = toB64(suiPubRaw);
      const suiAddress = suiKeypair.getPublicKey().toSuiAddress();

      // Most Sui wallets require a compatible suiprivkey (bech32) string.
      // This builds that out so you can import into Sui wallets.
      const flagged = new Uint8Array(33);
      flagged[0] = 0x00; // ed25519 key scheme flag
      flagged.set(suiSecret32, 1); // append actual 32-byte private key
      const words = bech32.toWords(flagged);
      const suiPrivBech32 = bech32.encode("suiprivkey", words);  // Suiet-compatible

      entry.chains.sui = {
        path: suiPathStr,
        privateKeyBase64: suiSeedBase64,
        publicKeyBase64: suiPubBase64,
        privateKeyBech32: suiPrivBech32,
        address: suiAddress,
      };

      if (!outFile) {
        console.log("Sui path:", suiPathStr);
        console.log(
          `Sui private key (base64 32-byte secret): ${green}${suiSeedBase64}${reset}`,
        );
        console.log(`Sui public key (base64): ${green}${suiPubBase64}${reset}`);
        console.log(`Sui address: ${green}${suiAddress}${reset}`);
        console.log(
          `Sui wallet import key (suiprivkey): ${green}${suiPrivBech32}${reset}\n`,
        );
      }
    }

    // Push the results to the JSON output array
    results.push(entry);
  }

  /** 
   * Write JSON output (optionally)
   */
  if (outFile) {
    const filePath = path.resolve(outFile);
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2), "utf8");
    console.log(`\n${green}✓ Wallet data written to:${reset} ${filePath}\n`);
  }
})();

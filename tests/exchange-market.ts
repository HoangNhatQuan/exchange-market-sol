import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ExchangeMarket } from "../target/types/exchange_market";
import { initAccountToken, initializeMint, mintTo } from "./helper";
import { Spl } from "@project-serum/anchor";
import ExchangeProgram from "../app";
import { expect } from "chai";

describe("exchange-market", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  provider.opts.skipPreflight = true;
  const program = anchor.workspace.ExchangeMarket as Program<ExchangeMarket>;
  const exchangeProgram = new ExchangeProgram(
    provider,
    program.programId.toBase58()
  );

  let RETAILER = anchor.web3.Keypair.generate();
  let ORDER = anchor.web3.Keypair.generate();

  let BID_MINT = anchor.web3.Keypair.generate();
  let BID_TOTAL = new anchor.BN(100000000);
  let BID_POINT = new anchor.BN(1000);
  let ASK_AMOUNT = new anchor.BN(100000000);
  let ASK_POINT = new anchor.BN(1000);
  const spl = Spl.token();

  before("Is generate data!", async () => {
    await initializeMint(9, BID_MINT, spl);
    await initAccountToken(BID_MINT.publicKey, provider);
    await mintTo(new anchor.BN(2000000000), BID_MINT.publicKey, provider, spl);
  });

  it("Is initialized offer!", async () => {
    // Add your test here.
    const tx = await exchangeProgram.initializeOffer({
      bidTotal: BID_TOTAL,
      bidPoint: BID_POINT,
      retailer: RETAILER,
      sendAndConfirm: true,
      bidMint: BID_MINT.publicKey,
    });

    console.log("Your transaction signature", tx);

    const retailerData = await program.account.retailer.fetch(
      RETAILER.publicKey
    );
    console.log("RETAILER.publicKey", RETAILER.publicKey);
    expect(retailerData.bidTotal.eq(BID_TOTAL)).true;
    // Validate retailer reserve
    console.log("retailerData", retailerData);
  });

  it("Is initialize order!", async () => {
    const { txId } = await exchangeProgram.initializeOrder({
      retailer: RETAILER.publicKey,
      askAmount: ASK_AMOUNT,
      askPoint: ASK_POINT,
      order: ORDER,
    });
    console.log("txId order", txId);
    // Validate retailer
    const retailerData = await program.account.retailer.fetch(
      RETAILER.publicKey
    );
    console.log("retailerData", retailerData.authority);
    // Validate order
    const orderData = await program.account.order.fetch(ORDER.publicKey);
    console.log("orderData amount", orderData.askAmount.toNumber());
    console.log("orderData", orderData);
  });

  it("Is buy point - trans token!", async () => {
    const txId = await exchangeProgram.buy({ order: ORDER.publicKey });
    // Validate retailer data
    const retailerData = await program.account.retailer.fetch(
      RETAILER.publicKey
    );
    // Validate order
    const orderData = await program.account.order.fetch(ORDER.publicKey);
    console.log("txId", txId);
  });

  it("Is sell point - receive token!", async () => {
    const txId = await exchangeProgram.sell({ order: ORDER.publicKey });
    // Validate retailer data
    const retailerData = await program.account.retailer.fetch(
      RETAILER.publicKey
    );
    // Validate order
    const orderData = await program.account.order.fetch(ORDER.publicKey);
    console.log("txId", txId);
  });
});

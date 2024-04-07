import {
  web3,
  Program,
  utils,
  BN,
  Address,
  AnchorProvider,
  Spl,
  ProgramAccount,
} from "@project-serum/anchor";

import { IDL, ExchangeMarket } from "./../target/types/exchange_market";
import {
  InitializeOffer,
  InitializeOrder,
  OrderAction,
  OrderData,
  RetailerData,
} from "./types";

const PROGRAM_ACCOUNTS = {
  rent: web3.SYSVAR_RENT_PUBKEY,
  systemProgram: web3.SystemProgram.programId,
  associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
  tokenProgram: utils.token.TOKEN_PROGRAM_ID,
};

const METADATA_SIZE = 32;

export class ExchangeProgram {
  readonly program: Program<ExchangeMarket>;
  constructor(readonly provider: AnchorProvider, readonly programId: string) {
    this.program = new Program<ExchangeMarket>(
      IDL,
      this.programId,
      this.provider
    );
  }

  get walletPubkey() {
    return this.provider.wallet.publicKey;
  }

  get account() {
    const accProgram = this.program.account;
    return {
      retailer: {
        fetch: (address: Address): Promise<RetailerData> =>
          accProgram.retailer.fetch(address) as any,
        all: (
          params?: Parameters<typeof accProgram.retailer.all>[0]
        ): Promise<ProgramAccount<RetailerData[]>> =>
          accProgram.retailer.all(params) as any,
      },
      order: {
        fetch: (address: Address): Promise<OrderData> =>
          accProgram.order.fetch(address) as any,
      },
    };
  }

  get splProgram() {
    return Spl.token(this.provider);
  }

  deriveTreasurerAddress = async (ownerAddress: Address) => {
    if (typeof ownerAddress !== "string")
      ownerAddress = ownerAddress.toBase58();
    const ownerPubkey = new web3.PublicKey(ownerAddress);
    const [treasurer] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("treasurer"), ownerPubkey.toBuffer()],
      this.program.programId
    );
    return treasurer;
  };

  private generateWalletPDAs = async (params: { bidMint: Address }) => {
    const authority = this.walletPubkey;
    const bidMintPubkey = new web3.PublicKey(params.bidMint);

    const bidTokenAccount = await utils.token.associatedAddress({
      mint: bidMintPubkey,
      owner: authority,
    });
    return {
      authority,
      signer: this.walletPubkey,
      bidTokenAccount,
    };
  };

  private generateRetailerPDAs = async (params: {
    retailer: Address;
    bidMint: Address;
  }) => {
    const retailer = new web3.PublicKey(params.retailer);
    const bidMint = new web3.PublicKey(params.bidMint);

    const treasurer = await this.deriveTreasurerAddress(retailer);
    const bidTreasury = await utils.token.associatedAddress({
      mint: bidMint,
      owner: treasurer,
    });
    return {
      retailer,
      treasurer,
      bidMint,
      bidTreasury,
    };
  };

  private generateAccounts = async (order: Address) => {
    return {
      order: new web3.PublicKey(order),
      ...PROGRAM_ACCOUNTS,
    };
  };

  /**
   * @param retailer: Retailer keypair if needed
   * @returns
   */
  initializeOffer = async ({
    bidMint,
    bidTotal,
    bidPoint,
    sendAndConfirm = true,
    retailer = web3.Keypair.generate(),
  }: InitializeOffer) => {
    const {
      bidMint: _bidMint,
      bidTreasury,
      retailer: _retailer,
      treasurer,
    } = await this.generateRetailerPDAs({
      retailer: retailer.publicKey,
      bidMint,
    });
    const { bidTokenAccount, authority } = await this.generateWalletPDAs({
      bidMint,
    });
    const tx = await this.program.methods
      .initializeOffer(bidTotal, bidPoint)
      .accounts({
        bidMint: _bidMint,
        bidTokenAccount,
        authority: authority,
        retailer: _retailer,
        treasurer,
        bidTreasury,
        ...PROGRAM_ACCOUNTS,
      })
      .transaction();

    let txId = "";
    if (sendAndConfirm) {
      txId = await this.provider.sendAndConfirm(tx, [retailer]);
    }
    return { txId, tx };
  };

  /**
   * @param retailer: Retailer address
   * @returns
   */
  initializeOrder = async ({
    retailer,
    askAmount,
    askPoint,
    sendAndConfirm = true,
    order = web3.Keypair.generate(),
  }: InitializeOrder) => {
    // Build transaction
    const accounts = await this.generateAccounts(order.publicKey);
    const { bidMint } = await this.account.retailer.fetch(retailer);
    const retailerPDAs = await this.generateRetailerPDAs({
      bidMint,
      retailer,
    });

    const walletPDAs = await this.generateWalletPDAs({
      bidMint,
    });

    const tx = await this.program.methods
      .initializeOrder(askAmount, askPoint)
      .accounts({
        ...accounts,
        askMint: retailerPDAs.bidMint,
        treasurer: retailerPDAs.treasurer,
        retailer: retailerPDAs.retailer,
        askTreasury: retailerPDAs.bidTreasury,
        askTokenAccount: walletPDAs.bidTokenAccount,
        authority: walletPDAs.authority,
      })
      .transaction();
    // Send transaction if needed
    let txId = "";
    if (sendAndConfirm) {
      txId = await this.provider.sendAndConfirm(tx, [order]);
    }
    return { txId, tx };
  };

  /**
   * @param order: Order Address
   * @returns
   */
  buy = async ({ order, sendAndConfirm = true }: OrderAction) => {
    // Build transaction
    const accounts = await this.generateAccounts(order);
    const orderData = await this.account.order.fetch(order);
    const retailer = orderData.retailer;
    const { bidMint } = await this.account.retailer.fetch(retailer);
    const retailerPDAs = await this.generateRetailerPDAs({
      bidMint,
      retailer,
    });

    const walletPDAs = await this.generateWalletPDAs({
      bidMint,
    });
    const tx = await this.program.methods
      .buy()
      .accounts({
        ...accounts,
        askMint: retailerPDAs.bidMint,
        treasurer: retailerPDAs.treasurer,
        retailer: retailerPDAs.retailer,
        askTreasury: retailerPDAs.bidTreasury,
        askTokenAccount: walletPDAs.bidTokenAccount,
        authority: walletPDAs.authority,
      })
      .transaction();
    // Send transaction if needed
    let txId = "";
    if (sendAndConfirm) {
      txId = await this.provider.sendAndConfirm(tx, []);
    }
    return { txId, tx };
  };

  /**
   * @param order: order Address
   * @returns
   */
  sell = async ({ order, sendAndConfirm = true }: OrderAction) => {
    // Build transaction
    const accounts = await this.generateAccounts(order);
    const orderData = await this.account.order.fetch(order);
    const retailer = orderData.retailer;
    const { bidMint } = await this.account.retailer.fetch(retailer);
    const retailerPDAs = await this.generateRetailerPDAs({
      bidMint,
      retailer,
    });

    const walletPDAs = await this.generateWalletPDAs({
      bidMint,
    });
    const tx = await this.program.methods
      .sell()
      .accounts({
        ...accounts,
        bidMint: retailerPDAs.bidMint,
        treasurer: retailerPDAs.treasurer,
        retailer: retailerPDAs.retailer,
        bidTreasury: retailerPDAs.bidTreasury,
        sellerTokenAccount: walletPDAs.bidTokenAccount,
        authority: walletPDAs.authority,
      })
      .transaction();
    // Send transaction if needed
    let txId = "";
    if (sendAndConfirm) {
      txId = await this.provider.sendAndConfirm(tx, []);
    }
    return { txId, tx };
  };
}

export default ExchangeProgram;
export * from "./types";

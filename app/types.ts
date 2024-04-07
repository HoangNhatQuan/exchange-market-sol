import { web3, BN, Address, IdlAccounts } from "@project-serum/anchor";
import { ExchangeMarket } from "../target/types/exchange_market";

export type InitializeOffer = {
  retailer?: web3.Keypair;
  bidMint: Address;
  bidTotal: BN;
  bidPoint: BN;
  sendAndConfirm?: boolean;
};

type RawRetailerData = IdlAccounts<ExchangeMarket>["retailer"];
export type RetailerState = Partial<{ active: {}; frozen: {} }>;
export type RetailerData = {
  [K in keyof RawRetailerData]: RawRetailerData[K] extends never
    ? RetailerState
    : RawRetailerData[K];
};

export type InitializeOrder = {
  retailer: Address;
  askAmount: BN;
  askPoint: BN;
  sendAndConfirm?: boolean;
  order?: web3.Keypair;
};

export type OrderData = IdlAccounts<ExchangeMarket>["order"];
export type OrderAction = {
  order: Address;
  sendAndConfirm?: boolean;
};

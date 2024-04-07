import {
  web3,
  AnchorProvider,
  Program,
  SplToken,
  BN,
  utils,
} from "@project-serum/anchor";

export const asyncWait = (s: number) =>
  new Promise((resolve) => setTimeout(resolve, s * 1000));

export const getCurrentTimestamp = () => Math.floor(Number(new Date()) / 1000);

export const initializeMint = async (
  decimals: number,
  token: web3.Keypair,
  splProgram: Program<SplToken>
) => {
  const ix = await (splProgram.account as any).mint.createInstruction(token);
  const tx = new web3.Transaction().add(ix);
  const provider = splProgram.provider as AnchorProvider;
  await provider.sendAndConfirm(tx, [token]);
  return await splProgram.rpc.initializeMint(
    decimals,
    provider.wallet.publicKey,
    provider.wallet.publicKey,
    {
      accounts: {
        mint: token.publicKey,
        rent: web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [],
    }
  );
};

export const transferLamports = async (
  lamports: number,
  dstAddress: string,
  provider: AnchorProvider
) => {
  const ix = web3.SystemProgram.transfer({
    fromPubkey: provider.wallet.publicKey,
    toPubkey: new web3.PublicKey(dstAddress),
    lamports: Number(lamports),
  });
  const tx = new web3.Transaction().add(ix);
  return await provider.sendAndConfirm(tx);
};

export const mintTo = async (
  amount: BN,
  mintPublicKey: web3.PublicKey,
  provider: AnchorProvider,
  spl: Program<SplToken>
) => {
  const associatedAddress = await utils.token.associatedAddress({
    mint: mintPublicKey,
    owner: provider.wallet.publicKey,
  });
  const txId = await spl.rpc.mintTo(amount, {
    accounts: {
      mint: mintPublicKey,
      to: associatedAddress,
      authority: provider.wallet.publicKey,
    },
    signers: [],
  });
  return { txId };
};

export const initAccountToken = async (
  token: web3.PublicKey,
  provider: AnchorProvider
) => {
  const associatedTokenAccount = await utils.token.associatedAddress({
    mint: token,
    owner: provider.wallet.publicKey,
  });
  const ix = new web3.TransactionInstruction({
    keys: [
      {
        pubkey: provider.wallet.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: associatedTokenAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: provider.wallet.publicKey,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: token,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: web3.SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: utils.token.TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: web3.SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: utils.token.ASSOCIATED_PROGRAM_ID,
    data: Buffer.from([]),
  });
  const tx = new web3.Transaction().add(ix);
  return await provider.sendAndConfirm(tx);
};

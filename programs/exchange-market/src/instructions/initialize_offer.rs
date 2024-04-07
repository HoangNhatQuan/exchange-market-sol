use crate::schema::*;
use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

#[derive(Accounts)]
pub struct InitializeOffer<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = Retailer::LEN)]
    pub retailer: Account<'info, Retailer>,
    /// CHECK: Just a pure account
    #[account(seeds = [b"treasurer", &retailer.key().to_bytes()], bump)]
    pub treasurer: AccountInfo<'info>,

    // token muon buy/sell
    pub bid_mint: Account<'info, token::Mint>,

    #[account(
    init_if_needed,
    payer = authority,
    associated_token::mint = bid_mint,
    associated_token::authority = treasurer
  )]
    pub bid_treasury: Account<'info, token::TokenAccount>,

    #[account(
    init_if_needed,
    payer = authority,
    associated_token::mint = bid_mint,
    associated_token::authority = authority
  )]
    pub bid_token_account: Account<'info, token::TokenAccount>,

    // Programs
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}
pub fn exec(ctx: Context<InitializeOffer>, bid_total: u64, bid_point: u64) -> Result<()> {
    let retailer = &mut ctx.accounts.retailer;
    retailer.authority = ctx.accounts.authority.key();
    retailer.bid_mint = ctx.accounts.bid_mint.key();

    // Initialize retailer's info
    retailer.bid_total = bid_total;
    retailer.bid_point = bid_point;

    retailer.deposit(
        bid_total,
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.bid_token_account.to_account_info(),
            to: ctx.accounts.bid_treasury.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        },
    )?;

    Ok(())
}

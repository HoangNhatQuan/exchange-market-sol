use crate::schema::*;
use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"treasurer", &retailer.key().to_bytes()], bump)]
    /// CHECK: Just a pure account
    pub treasurer: AccountInfo<'info>,

    // Validate security
    #[account(mut, has_one = authority)]
    pub retailer: Account<'info, Retailer>,
    #[account(mut,  has_one = retailer )]
    pub order: Account<'info, Order>,

    // Order info
    #[account(mut)]
    pub ask_mint: Box<Account<'info, token::Mint>>,
    #[account(
    mut,
    associated_token::mint = ask_mint,
    associated_token::authority = treasurer
  )]
    pub ask_treasury: Box<Account<'info, token::TokenAccount>>,
    #[account(
    init_if_needed,
    payer = authority,
    associated_token::mint = ask_mint,
    associated_token::authority = authority
  )]
    pub ask_token_account: Box<Account<'info, token::TokenAccount>>,

    // Programs
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn exec(ctx: Context<Buy>) -> Result<()> {
    let retailer = &mut ctx.accounts.retailer;
    let order = &mut ctx.accounts.order;

    let seeds: &[&[&[u8]]] = &[&[
        "treasurer".as_ref(),
        &retailer.key().to_bytes(),
        &[*ctx.bumps.get("treasurer").unwrap()],
    ]];

    retailer.pay_seller(
        order,
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.ask_treasury.to_account_info(),
            to: ctx.accounts.ask_token_account.to_account_info(),
            authority: ctx.accounts.treasurer.to_account_info(),
        },
        seeds,
    )?;
    Ok(())
}

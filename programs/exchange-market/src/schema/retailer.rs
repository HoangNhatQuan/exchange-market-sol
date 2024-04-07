use crate::constants::*;
use crate::schema::*;
use anchor_lang::prelude::*;
use anchor_spl::token;

#[account]
pub struct Retailer {
    pub authority: Pubkey,
    pub retailer: Pubkey,
    pub bid_mint: Pubkey,
    pub bid_total: u64,
    pub bid_point: u64,
}

impl Retailer {
    pub const LEN: usize = DISCRIMINATOR_SIZE + PUBKEY_SIZE * 3 + U64_SIZE * 2;

    pub fn deposit<'a, 'b, 'c, 'info>(
        &mut self,
        bid_total: u64,
        program: AccountInfo<'info>,
        context: token::Transfer<'info>,
    ) -> Result<()> {
        // Transfer
        let transfer_ctx = CpiContext::new(program, context);
        token::transfer(transfer_ctx, bid_total)?;
        // Update Retailer Info
        Ok(())
    }

    pub fn pay_buyer<'a, 'b, 'c, 'info>(
        &mut self,
        order: &mut Account<'info, Order>,
        program: AccountInfo<'info>,
        context: token::Transfer<'info>,
        signer_seeds: &'a [&'b [&'c [u8]]],
    ) -> Result<()> {
        // Transfer
        let reverse_amount = order.ask_amount * 2;
        let transfer_ctx = CpiContext::new_with_signer(program, context, signer_seeds);
        token::transfer(transfer_ctx, reverse_amount)?;
        Ok(())
    }

    pub fn pay_seller<'a, 'b, 'c, 'info>(
        &mut self,
        order: &mut Account<'info, Order>,
        program: AccountInfo<'info>,
        context: token::Transfer<'info>,
        signer_seeds: &'a [&'b [&'c [u8]]],
    ) -> Result<()> {
        // Transfer
        let transfer_ctx = CpiContext::new_with_signer(program, context, signer_seeds);
        token::transfer(transfer_ctx, order.ask_amount)?;
        Ok(())
    }
}

use anchor_lang::prelude::*;
pub mod constants;
pub mod errors;
pub mod instructions;
pub mod schema;

pub use constants::*;
pub use instructions::*;
pub use schema::*;

declare_id!("Gx9Vab1RKnqq9vTBYy5rhEnfCqRwJtj1dgxseeJvmWu7");

#[program]
pub mod exchange_market {
    use super::*;

    pub fn initialize_offer(
        ctx: Context<InitializeOffer>,
        bid_total: u64,
        bid_point: u64,
    ) -> Result<()> {
        initialize_offer::exec(ctx, bid_total, bid_point)
    }

    pub fn initialize_order(
        ctx: Context<InitializeOrder>,
        ask_amount: u64,
        ask_point: u64,
    ) -> Result<()> {
        initialize_order::exec(ctx, ask_amount, ask_point)
    }

    pub fn buy(ctx: Context<Buy>) -> Result<()> {
        buy::exec(ctx)
    }

    pub fn sell(ctx: Context<Sell>) -> Result<()> {
        sell::exec(ctx)
    }
}

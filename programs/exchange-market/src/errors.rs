use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // System error
    #[msg("Operation overflowed")]
    Overflow,
    #[msg("Not have permission!")]
    InvalidPermission,
    #[msg("Invalid treasury address!")]
    AccountTreasury,
    #[msg("Invalid mint address!")]
    AccountMint,
    #[msg("Cannot get current date")]
    InvalidCurrentDate,
    #[msg("Not enough balance")]
    NotEnoughBalance,
    // Order error
    #[msg("Order isn't not approved yet!")]
    NotApproved,
    #[msg("Invalid Order state!")]
    InvalidOrderState,
    #[msg("State is not active!")]
    NotActive,
    #[msg("Invalid Retailer state!")]
    InvalidRetailerState,
}

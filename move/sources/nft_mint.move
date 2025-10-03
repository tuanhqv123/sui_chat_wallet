module sui_chat_wallet::nft_mint {
    use std::string::{Self, String};
    use sui::url::{Self, Url};
    use sui::event;

    /// NFT object representing a minted NFT
    public struct NFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: Url,
        creator: address,
        minted_at: u64,
    }

    /// Event emitted when NFT is minted
    public struct NFTCreated has copy, drop {
        nft_id: ID,
        creator: address,
        name: String,
    }

    /// Initialize the module
    fun init(_ctx: &TxContext) {
        // No initialization needed
    }

    /// Mint a new NFT with provided metadata - following Sui standards
    #[allow(lint(self_transfer))]
    public fun mint_to_sender(
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);

        // Create NFT object
        let nft = NFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(image_url),
            creator: sender,
            minted_at: tx_context::epoch_timestamp_ms(ctx),
        };

        // Prepare event data before transferring NFT
        let nft_id = object::uid_to_inner(&nft.id);
        let nft_name = string::utf8(name);

        // Emit event
        event::emit(NFTCreated {
            nft_id,
            creator: sender,
            name: nft_name,
        });

        // Transfer NFT to sender
        transfer::public_transfer(nft, sender);
    }

    /// Get NFT name
    public fun name(nft: &NFT): &String {
        &nft.name
    }

    /// Get NFT description
    public fun description(nft: &NFT): &String {
        &nft.description
    }

    /// Get NFT image URL
    public fun image_url(nft: &NFT): &Url {
        &nft.image_url
    }

    /// Get NFT creator
    public fun creator(nft: &NFT): address {
        nft.creator
    }

    /// Get NFT minted timestamp
    public fun minted_at(nft: &NFT): u64 {
        nft.minted_at
    }

    /// Get NFT metadata
    public fun get_nft_info(nft: &NFT): (String, String, Url, address, u64) {
        (
            nft.name,
            nft.description,
            nft.image_url,
            nft.creator,
            nft.minted_at
        )
    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WorldNFTExchange is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;
    Counters.Counter private _itemsListed;

    receive() external payable {}

    uint256 private listingPrice = 0 ether;
    uint256 private successFeePercent = 0;
    uint256 private royaltyFeePercent = 1;

    struct Item {
        uint256 id;
        string tokenURI;
        uint256 price;
        address payable seller;
        address payable owner;
        address payable creator;
        bool currentlyListed;
    }

    event ItemCreated(
        uint256 id,
        string tokenURI,
        uint256 price,
        address payable seller,
        address payable owner,
        address payable creator,
        bool currentlyListed
    );

    mapping(uint256 => Item) private Items;

    constructor() ERC721("WorldNFTExchange", "") {}

    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }

    function updateListingPrice(uint256 _listingPrice) public onlyOwner {
        listingPrice = _listingPrice;
    }

    function getSuccessFeePercent() public view returns (uint256) {
        return successFeePercent;
    }

    function updateSuccessFeePercent(
        uint256 _successFeePercent
    ) public onlyOwner {
        successFeePercent = _successFeePercent;
    }

    function getRoyaltyFeePercent() public view returns (uint256) {
        return royaltyFeePercent;
    }

    function updateRoyaltyFeePercent(
        uint256 _royaltyFeePercent
    ) public onlyOwner {
        royaltyFeePercent = _royaltyFeePercent;
    }

    function getLatestItem() public view returns (Item memory) {
        return Items[_tokenIds.current()];
    }

    function getItem(uint256 ItemId) public view returns (Item memory) {
        return Items[ItemId];
    }

    function getItemsListed() public view returns (uint256) {
        return _itemsListed.current();
    }

    function getSuccessFeeForItem(
        uint256 ItemId
    ) public view returns (uint256) {
        return (Items[ItemId].price * successFeePercent) / 100;
    }

    function getRoyaltyFeeForItem(
        uint256 ItemId
    ) public view returns (uint256) {
        return (Items[ItemId].price * royaltyFeePercent) / 100;
    }

    function getItemPrice(uint256 ItemId) public view returns (uint256) {
        return
            Items[ItemId].price +
            getSuccessFeeForItem(ItemId) +
            getRoyaltyFeeForItem(ItemId);
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    function getAllItems() public view returns (Item[] memory) {
        Item[] memory items = new Item[](_tokenIds.current());
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            items[i] = Items[i + 1];
        }
        return items;
    }

    function getAllItemsForSale() public view returns (Item[] memory) {
        Item[] memory items = new Item[](_itemsListed.current());
        uint256 counter = 0;
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            if (Items[i + 1].currentlyListed) {
                items[counter] = Items[i + 1];
                counter++;
            }
        }
        return items;
    }

    function getAllItemsForSaleByOwner(
        address owner
    ) public view returns (Item[] memory) {
        Item[] memory items = new Item[](_itemsListed.current());
        uint256 counter = 0;
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            if (Items[i + 1].currentlyListed && Items[i + 1].owner == owner) {
                items[counter] = Items[i + 1];
                counter++;
            }
        }
        return items;
    }

    function getAllItemsForSaleBySeller(
        address seller
    ) public view returns (Item[] memory) {
        Item[] memory items = new Item[](_itemsListed.current());
        uint256 counter = 0;
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            if (Items[i + 1].currentlyListed && Items[i + 1].seller == seller) {
                items[counter] = Items[i + 1];
                counter++;
            }
        }
        return items;
    }

    function getAllItemsForSaleByCreator(
        address creator
    ) public view returns (Item[] memory) {
        Item[] memory items = new Item[](_itemsListed.current());
        uint256 counter = 0;
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            if (
                Items[i + 1].currentlyListed && Items[i + 1].creator == creator
            ) {
                items[counter] = Items[i + 1];
                counter++;
            }
        }
        return items;
    }

    function createItem(
        string memory tokenURI,
        uint256 price
    ) public payable nonReentrant returns (uint256) {
        require(
            msg.value == listingPrice,
            "Price must be equal to listing price"
        );
        require(price > 0, "Price must be greater than 0");
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);
        _itemsListed.increment();

        Items[newItemId] = Item(
            newItemId,
            tokenURI,
            price,
            payable(msg.sender),
            payable(address(this)),
            payable(msg.sender),
            true
        );

        _transfer(msg.sender, address(this), newItemId);

        emit ItemCreated(
            newItemId,
            tokenURI,
            price,
            payable(msg.sender),
            payable(address(this)),
            payable(msg.sender),
            true
        );

        return newItemId;
    }

    function buyItem(uint256 ItemId) public payable nonReentrant {
        uint256 price = Items[ItemId].price;
        uint256 sucessFee = (price * successFeePercent) / 100;
        uint256 royaltyFee = (price * royaltyFeePercent) / 100;
        uint256 totalPrice = price + sucessFee + royaltyFee;

        require(
            msg.value == totalPrice,
            "Please submit the asking price in order to complete the purchase"
        );
        require(
            Items[ItemId].currentlyListed == true,
            "This item is not currently for sale"
        );
        require(
            Items[ItemId].owner == address(this),
            "This item is not currently for sale"
        );
        require(
            Items[ItemId].seller != msg.sender,
            "You cannot buy your own item"
        );

        Items[ItemId].currentlyListed = false;
        Items[ItemId].owner = payable(msg.sender);

        _transfer(address(this), msg.sender, ItemId);
        approve(address(this), ItemId);

        uint256 priceToBePaid = msg.value - sucessFee - royaltyFee;

        // if (Items[ItemId].creator != Items[ItemId].seller) {
        //     uint256 creatorFee = (msg.value * royaltyFeePercent) / 100;
        //     priceToBePaid = priceToBePaid - creatorFee;
        //     Items[ItemId].creator.transfer(creatorFee);
        // }

        Items[ItemId].creator.transfer(royaltyFee);
        Items[ItemId].seller.transfer(priceToBePaid);

        payable(owner()).transfer(listingPrice);
        payable(owner()).transfer(sucessFee);

        _itemsSold.increment();
        _itemsListed.decrement();
    }

    function resellItem(
        uint256 ItemId,
        uint256 price
    ) public payable nonReentrant {
        require(
            msg.value == listingPrice,
            "Price must be equal to listing price"
        );

        require(
            Items[ItemId].owner == msg.sender,
            "You must own this item in order to list it for sale"
        );
        require(
            Items[ItemId].currentlyListed == false,
            "This item is already for sale"
        );
        require(price > 0, "Price must be greater than 0");

        Items[ItemId].price = price;
        Items[ItemId].currentlyListed = true;
        Items[ItemId].seller = payable(msg.sender);
        Items[ItemId].owner = payable(address(this));

        _itemsSold.decrement();
        _itemsListed.increment();

        _transfer(msg.sender, address(this), ItemId);
    }
}

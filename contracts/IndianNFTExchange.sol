// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IndianNFTExchange is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;
    Counters.Counter private _itemsListed;

    receive() external payable {}

    uint256 private listingPrice = 0.025 ether;
    uint256 private successFeePercent = 5;
    uint256 private royaltyFeePercent = 3;

    struct INEItem {
        uint256 id;
        string tokenURI;
        uint256 price;
        address payable seller;
        address payable owner;
        address payable creator;
        bool currentlyListed;
    }

    event INEItemCreated(
        uint256 id,
        string tokenURI,
        uint256 price,
        address payable seller,
        address payable owner,
        address payable creator,
        bool currentlyListed
    );

    mapping(uint256 => INEItem) private INEItems;

    constructor() ERC721("IndianNFTExchange", "INE") {}

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

    function getLatestINEItem() public view returns (INEItem memory) {
        return INEItems[_tokenIds.current()];
    }

    function getINEItem(
        uint256 INEItemId
    ) public view returns (INEItem memory) {
        return INEItems[INEItemId];
    }

    function getINEItemsListed() public view returns (uint256) {
        return _itemsListed.current();
    }

    function getSuccessFeeForINEItem(
        uint256 INEItemId
    ) public view returns (uint256) {
        return (INEItems[INEItemId].price * successFeePercent) / 100;
    }

    function getRoyaltyFeeForINEItem(
        uint256 INEItemId
    ) public view returns (uint256) {
        return (INEItems[INEItemId].price * royaltyFeePercent) / 100;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    function getAllINEItems() public view returns (INEItem[] memory) {
        INEItem[] memory items = new INEItem[](_tokenIds.current());
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            items[i] = INEItems[i + 1];
        }
        return items;
    }

    function getAllINEItemsForSale() public view returns (INEItem[] memory) {
        INEItem[] memory items = new INEItem[](_itemsListed.current());
        uint256 counter = 0;
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            if (INEItems[i + 1].currentlyListed) {
                items[counter] = INEItems[i + 1];
                counter++;
            }
        }
        return items;
    }

    function getAllINEItemsForSaleByOwner(
        address owner
    ) public view returns (INEItem[] memory) {
        INEItem[] memory items = new INEItem[](_itemsListed.current());
        uint256 counter = 0;
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            if (
                INEItems[i + 1].currentlyListed &&
                INEItems[i + 1].owner == owner
            ) {
                items[counter] = INEItems[i + 1];
                counter++;
            }
        }
        return items;
    }

    function getAllINEItemsForSaleBySeller(
        address seller
    ) public view returns (INEItem[] memory) {
        INEItem[] memory items = new INEItem[](_itemsListed.current());
        uint256 counter = 0;
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            if (
                INEItems[i + 1].currentlyListed &&
                INEItems[i + 1].seller == seller
            ) {
                items[counter] = INEItems[i + 1];
                counter++;
            }
        }
        return items;
    }

    function getAllINEItemsForSaleByCreator(
        address creator
    ) public view returns (INEItem[] memory) {
        INEItem[] memory items = new INEItem[](_itemsListed.current());
        uint256 counter = 0;
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            if (
                INEItems[i + 1].currentlyListed &&
                INEItems[i + 1].creator == creator
            ) {
                items[counter] = INEItems[i + 1];
                counter++;
            }
        }
        return items;
    }

    function createINEItem(
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

        INEItems[newItemId] = INEItem(
            newItemId,
            tokenURI,
            price,
            payable(msg.sender),
            payable(address(this)),
            payable(msg.sender),
            true
        );

        _transfer(msg.sender, address(this), newItemId);

        emit INEItemCreated(
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

    function buyINEItem(uint256 INEItemId) public payable nonReentrant {
        uint256 price = INEItems[INEItemId].price;
        uint256 sucessFee = (price * successFeePercent) / 100;
        uint256 royaltyFee = (price * royaltyFeePercent) / 100;
        uint256 totalPrice = price + sucessFee + royaltyFee;

        require(
            msg.value == totalPrice,
            "Please submit the asking price in order to complete the purchase"
        );
        require(
            INEItems[INEItemId].currentlyListed == true,
            "This item is not currently for sale"
        );
        require(
            INEItems[INEItemId].owner == address(this),
            "This item is not currently for sale"
        );
        require(
            INEItems[INEItemId].seller != msg.sender,
            "You cannot buy your own item"
        );

        INEItems[INEItemId].currentlyListed = false;
        INEItems[INEItemId].owner = payable(msg.sender);

        _transfer(address(this), msg.sender, INEItemId);
        approve(address(this), INEItemId);

        uint256 priceToBePaid = msg.value - sucessFee - royaltyFee;

        // if (INEItems[INEItemId].creator != INEItems[INEItemId].seller) {
        //     uint256 creatorFee = (msg.value * royaltyFeePercent) / 100;
        //     priceToBePaid = priceToBePaid - creatorFee;
        //     INEItems[INEItemId].creator.transfer(creatorFee);
        // }

        INEItems[INEItemId].creator.transfer(royaltyFee);
        INEItems[INEItemId].seller.transfer(priceToBePaid);

        payable(owner()).transfer(listingPrice);
        payable(owner()).transfer(sucessFee);

        _itemsSold.increment();
        _itemsListed.decrement();
    }

    function resellINEItem(
        uint256 INEItemId,
        uint256 price
    ) public payable nonReentrant {
        require(
            msg.value == listingPrice,
            "Price must be equal to listing price"
        );

        require(
            INEItems[INEItemId].owner == msg.sender,
            "You must own this item in order to list it for sale"
        );
        require(
            INEItems[INEItemId].currentlyListed == false,
            "This item is already for sale"
        );
        require(price > 0, "Price must be greater than 0");

        INEItems[INEItemId].price = price;
        INEItems[INEItemId].currentlyListed = true;
        INEItems[INEItemId].seller = payable(msg.sender);
        INEItems[INEItemId].owner = payable(address(this));

        _itemsSold.decrement();
        _itemsListed.increment();

        _transfer(msg.sender, address(this), INEItemId);
    }
}

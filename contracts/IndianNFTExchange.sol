// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IndianNFTExchange is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;
    Counters.Counter private _itemsListed;

    receive() external payable {}

    uint256 private listingPrice = 0.025 ether;
    uint256 private successFeePercent = 10;

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

    function getLatestINEItem() public view returns (INEItem memory) {
        return INEItems[_tokenIds.current()];
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    function createINEItem(
        string memory tokenURI,
        uint256 price
    ) public payable returns (uint256) {
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

    function buyINEItem(uint256 INEItemId) public payable {
        require(
            msg.value == INEItems[INEItemId].price,
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

        uint256 sucessFee = (msg.value * successFeePercent) / 100;
        INEItems[INEItemId].seller.transfer(msg.value - sucessFee);
        payable(owner()).transfer(listingPrice);
        payable(owner()).transfer(sucessFee);

        _itemsSold.increment();
    }
}

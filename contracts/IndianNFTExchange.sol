// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IndianNFTExchange is ERC721URIStorage, Ownable, PullPayment {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;
    Counters.Counter private _itemsListed;

    receive() external payable {}

    uint256 listingPrice = 0.025 ether;

    struct INEItem {
        uint256 id;
        string tokenURI;
        uint256 price;
        address payable seller;
        address payable owner;
        address payable originalOwner;
        bool currentlyListed;
    }

    event INEItemCreated(
        uint256 id,
        string tokenURI,
        uint256 price,
        address payable seller,
        address payable owner,
        address payable originalOwner,
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

    function withdrawPayments(
        address payable payee
    ) public virtual override onlyOwner {
        super.withdrawPayments(payee);
        payable(owner()).transfer(address(this).balance);
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
            payable(address(0)),
            payable(msg.sender),
            true
        );

        _transfer(msg.sender, address(this), newItemId);

        emit INEItemCreated(
            newItemId,
            tokenURI,
            price,
            payable(msg.sender),
            payable(address(0)),
            payable(msg.sender),
            true
        );

        return newItemId;
    }
}

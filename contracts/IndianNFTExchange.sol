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

    // address public owner;
    receive() external payable {}

    uint256 listingPrice = 0.025 ether;

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
        payee.transfer(address(this).balance);
    }
}

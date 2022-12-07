import { ethers } from "hardhat";
import { expect } from "chai";

describe("IndianNFTExchange", function () {
  const deployIndianNFTExchange = async () => {
    const [owner, otherAccount] = await ethers.getSigners();

    const IndianNFTExchange = await ethers.getContractFactory(
      "IndianNFTExchange"
    );
    const indianNFTExchange = await IndianNFTExchange.deploy();

    console.log(indianNFTExchange.address);

    return { indianNFTExchange, owner, otherAccount };
  };

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { indianNFTExchange, owner } = await deployIndianNFTExchange();
      expect(await indianNFTExchange.owner()).to.equal(owner.address);
    });
  });

  describe("Checking Listing Price", () => {
    it("Should return the listing price", async () => {
      const { indianNFTExchange } = await deployIndianNFTExchange();
      const listingPrice = await indianNFTExchange.getListingPrice();
      expect(listingPrice).to.equal(ethers.utils.parseEther("0.025"));
    });

    it("Should only be updated by owner", async () => {
      const { indianNFTExchange, otherAccount } =
        await deployIndianNFTExchange();
      expect(
        indianNFTExchange
          .connect(otherAccount)
          .updateListingPrice(ethers.utils.parseEther("0.05"))
      ).to.be.revertedWith("Only owner can update listing price");
    });

    it("Successful Updation of listing price", async () => {
      const { indianNFTExchange, otherAccount } =
        await deployIndianNFTExchange();
      indianNFTExchange.updateListingPrice(ethers.utils.parseEther("0.05"));
      const listingPrice = await indianNFTExchange.getListingPrice();
      expect(listingPrice).to.equal(ethers.utils.parseEther("0.05"));
    });
  });
});

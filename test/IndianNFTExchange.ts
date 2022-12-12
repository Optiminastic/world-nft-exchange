import { ethers } from "hardhat";
import { expect } from "chai";
import { exitCode } from "process";

const delay = (delayInms: number) => {
  return new Promise((resolve) => setTimeout(resolve, delayInms));
};

const ListingPrice = ethers.utils.parseEther("0.025");

describe("IndianNFTExchange", function () {
  const deployIndianNFTExchange = async () => {
    const [owner, otherAccount] = await ethers.getSigners();

    const IndianNFTExchange = await ethers.getContractFactory(
      "IndianNFTExchange"
    );
    const indianNFTExchange = await IndianNFTExchange.deploy();

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
      expect(listingPrice).to.equal(ListingPrice);
    });

    it("Should only be updated by owner", async () => {
      const { indianNFTExchange, otherAccount } =
        await deployIndianNFTExchange();
      await expect(
        indianNFTExchange
          .connect(otherAccount)
          .updateListingPrice(ethers.utils.parseEther("0.05"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Successful Updation of listing price", async () => {
      const { indianNFTExchange } = await deployIndianNFTExchange();
      indianNFTExchange.updateListingPrice(ethers.utils.parseEther("0.05"));
      const listingPrice = await indianNFTExchange.getListingPrice();
      expect(listingPrice).to.equal(ethers.utils.parseEther("0.05"));
    });
  });

  describe("Sending and withdrawing funds", () => {
    it("Should send funds to the contract", async () => {
      const { indianNFTExchange, owner, otherAccount } =
        await deployIndianNFTExchange();
      const listingPrice = await indianNFTExchange.getListingPrice();
      await otherAccount.sendTransaction({
        to: indianNFTExchange.address,
        value: listingPrice,
      });

      expect(
        await ethers.provider.getBalance(indianNFTExchange.address)
      ).to.equal(listingPrice);
    });

    it("Should withdraw funds from the contract", async () => {
      const { indianNFTExchange, owner, otherAccount } =
        await deployIndianNFTExchange();

      const listingPrice = await indianNFTExchange.getListingPrice();
      await otherAccount.sendTransaction({
        to: indianNFTExchange.address,
        value: listingPrice,
      });

      const initialBalance = await ethers.provider.getBalance(owner.address);

      const tx = await indianNFTExchange.withdrawPayments(owner.address);
      const reciept = await tx.wait();

      expect(
        await ethers.provider.getBalance(indianNFTExchange.address)
      ).to.equal(ethers.utils.parseEther("0"));

      const finalBalance = await ethers.provider.getBalance(owner.address);
      const gasUsed = reciept.cumulativeGasUsed.mul(reciept.effectiveGasPrice);

      expect(finalBalance).to.equal(
        initialBalance.sub(gasUsed).add(listingPrice)
      );
    });

    it("Only Owner should be able to withdraw", async () => {
      const { indianNFTExchange, owner, otherAccount } =
        await deployIndianNFTExchange();

      const listingPrice = await indianNFTExchange.getListingPrice();
      await otherAccount.sendTransaction({
        to: indianNFTExchange.address,
        value: listingPrice,
      });

      await expect(
        indianNFTExchange.connect(otherAccount).withdrawPayments(owner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Create NFT", () => {
    it("Should create a new NFT", async () => {
      const { indianNFTExchange, owner, otherAccount } =
        await deployIndianNFTExchange();

      const listingPrice = await indianNFTExchange.getListingPrice();
      const id = await indianNFTExchange
        .connect(otherAccount)
        .createINEItem(
          "https://www.google.com",
          ethers.utils.parseEther("0.05"),
          {
            value: listingPrice,
          }
        );

      const item = await indianNFTExchange.getLatestINEItem();

      expect(item.id).to.equal(1);
      expect(item.creator).to.equal(otherAccount.address);
      expect(item.owner).to.equal(indianNFTExchange.address);
      expect(item.price).to.equal(ethers.utils.parseEther("0.05"));
      expect(item.tokenURI).to.equal("https://www.google.com");

      const contractBalance = await ethers.provider.getBalance(
        indianNFTExchange.address
      );
      expect(contractBalance).to.equal(listingPrice);
    });
  });

  describe("Buy NFT", () => {
    it("Should buy a NFT", async () => {
      const { indianNFTExchange, owner, otherAccount } =
        await deployIndianNFTExchange();

      const listingPrice = await indianNFTExchange.getListingPrice();
      const id = await indianNFTExchange
        .connect(otherAccount)
        .createINEItem(
          "https://www.google.com",
          ethers.utils.parseEther("0.05"),
          {
            value: listingPrice,
          }
        );

      const item = await indianNFTExchange.getLatestINEItem();

      expect(item.id).to.equal(1);
      expect(item.creator).to.equal(otherAccount.address);
      expect(item.owner).to.equal(indianNFTExchange.address);
      expect(item.price).to.equal(ethers.utils.parseEther("0.05"));
      expect(item.tokenURI).to.equal("https://www.google.com");

      const contractBalance = await ethers.provider.getBalance(
        indianNFTExchange.address
      );
      expect(contractBalance).to.equal(listingPrice);

      const tx = await indianNFTExchange
        .connect(owner)
        .buyINEItem(1, { value: ethers.utils.parseEther("0.05") });

      const reciept = await tx.wait();

      const itemAfterBuy = await indianNFTExchange.getLatestINEItem();

      expect(itemAfterBuy.id).to.equal(1);
      expect(itemAfterBuy.creator).to.equal(otherAccount.address);
      expect(itemAfterBuy.owner).to.equal(owner.address);
      expect(itemAfterBuy.price).to.equal(ethers.utils.parseEther("0.05"));
      expect(itemAfterBuy.tokenURI).to.equal("https://www.google.com");
      expect(itemAfterBuy.currentlyListed).to.equal(false);

      const contractBalanceAfterBuy = await ethers.provider.getBalance(
        indianNFTExchange.address
      );
      expect(contractBalanceAfterBuy).to.equal(ethers.utils.parseEther("0"));
    });
  });
});

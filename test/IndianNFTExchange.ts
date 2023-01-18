import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const delay = (delayInms: number) => {
  return new Promise((resolve) => setTimeout(resolve, delayInms));
};

const LISTING_PRICE = ethers.utils.parseEther("0");

describe("IndianNFTExchange", function () {
  const deployIndianNFTExchange = async () => {
    const [owner, acc1, acc2, acc3] = await ethers.getSigners();

    const IndianNFTExchange = await ethers.getContractFactory(
      "IndianNFTExchange"
    );
    const indianNFTExchange = await IndianNFTExchange.deploy();

    return { indianNFTExchange, owner, acc1, acc2, acc3 };
  };

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { indianNFTExchange, owner } = await loadFixture(
        deployIndianNFTExchange
      );
      expect(await indianNFTExchange.owner()).to.equal(owner.address);
    });
  });

  describe("Checking Listing Price", () => {
    it("Should return the listing price", async () => {
      const { indianNFTExchange } = await loadFixture(deployIndianNFTExchange);
      const listingPrice = await indianNFTExchange.getListingPrice();
      expect(listingPrice).to.equal(LISTING_PRICE);
    });

    it("Should only be updated by owner", async () => {
      const { indianNFTExchange, acc1 } = await loadFixture(
        deployIndianNFTExchange
      );
      await expect(
        indianNFTExchange
          .connect(acc1)
          .updateListingPrice(ethers.utils.parseEther("0.05"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Successful Updation of listing price", async () => {
      const { indianNFTExchange } = await loadFixture(deployIndianNFTExchange);
      indianNFTExchange.updateListingPrice(ethers.utils.parseEther("0.05"));
      const listingPrice = await indianNFTExchange.getListingPrice();
      expect(listingPrice).to.equal(ethers.utils.parseEther("0.05"));
    });
  });

  describe("Sending funds", () => {
    it("Should send funds to the contract", async () => {
      const { indianNFTExchange, owner, acc1 } = await loadFixture(
        deployIndianNFTExchange
      );
      const listingPrice = await indianNFTExchange.getListingPrice();
      await acc1.sendTransaction({
        to: indianNFTExchange.address,
        value: listingPrice,
      });

      expect(
        await ethers.provider.getBalance(indianNFTExchange.address)
      ).to.equal(listingPrice);
    });
  });
  describe("Withdrawing Funds", () => {
    it("Should withdraw funds from the contract", async () => {
      const { indianNFTExchange, owner, acc1 } = await loadFixture(
        deployIndianNFTExchange
      );

      const listingPrice = await indianNFTExchange.getListingPrice();
      await acc1.sendTransaction({
        to: indianNFTExchange.address,
        value: listingPrice,
      });

      const initialBalance = await ethers.provider.getBalance(owner.address);

      const tx = await indianNFTExchange.withdraw();
      const reciept = await tx.wait();

      expect(
        await ethers.provider.getBalance(indianNFTExchange.address)
      ).to.equal(ethers.utils.parseEther("0"));

      // Balance checking
      const finalBalance = await ethers.provider.getBalance(owner.address);
      const gasUsed = reciept.cumulativeGasUsed.mul(reciept.effectiveGasPrice);

      expect(finalBalance).to.equal(
        initialBalance.sub(gasUsed).add(listingPrice)
      );
    });

    it("Should only be able to withdraw funds by owner", async () => {
      const { indianNFTExchange, acc1 } = await loadFixture(
        deployIndianNFTExchange
      );

      await expect(
        indianNFTExchange.connect(acc1).withdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Create NFT", () => {
    it("Should create a new NFT", async () => {
      const { indianNFTExchange, owner, acc1 } = await loadFixture(
        deployIndianNFTExchange
      );

      const listingPrice = await indianNFTExchange.getListingPrice();
      const id = await indianNFTExchange
        .connect(acc1)
        .createINEItem(
          "https://www.google.com",
          ethers.utils.parseEther("0.05"),
          {
            value: listingPrice,
          }
        );

      const item = await indianNFTExchange.getLatestINEItem();

      expect(item.id).to.equal(1);
      expect(item.creator).to.equal(acc1.address);
      expect(item.owner).to.equal(indianNFTExchange.address);
      expect(item.price).to.equal(ethers.utils.parseEther("0.05"));
      expect(item.tokenURI).to.equal("https://www.google.com");

      const contractBalance = await ethers.provider.getBalance(
        indianNFTExchange.address
      );
      expect(contractBalance).to.equal(listingPrice);
    });

    it("Should not create a new NFT if price is not equal to listing price", async () => {
      const { indianNFTExchange, owner, acc1 } = await loadFixture(
        deployIndianNFTExchange
      );

      const listingPrice = await indianNFTExchange.getListingPrice();
      await expect(
        indianNFTExchange
          .connect(acc1)
          .createINEItem(
            "https://www.google.com",
            ethers.utils.parseEther("0.05"),
            {
              value: ethers.utils.parseEther("0.01"),
            }
          )
      ).to.be.revertedWith("Price must be equal to listing price");
    });
  });

  describe("Buy NFT", () => {
    it("Should buy a NFT", async () => {
      const { indianNFTExchange, owner, acc1, acc2 } = await loadFixture(
        deployIndianNFTExchange
      );

      const itemPrice = ethers.utils.parseEther("0.05");
      const listingPrice = await indianNFTExchange.getListingPrice();
      const id = await indianNFTExchange
        .connect(acc1)
        .createINEItem("https://www.google.com", itemPrice, {
          value: listingPrice,
        });

      const item = await indianNFTExchange.getLatestINEItem();

      expect(item.id).to.equal(1);
      expect(item.creator).to.equal(acc1.address);
      expect(item.owner).to.equal(indianNFTExchange.address);
      expect(item.price).to.equal(itemPrice);
      expect(item.tokenURI).to.equal("https://www.google.com");

      const contractBalance = await ethers.provider.getBalance(
        indianNFTExchange.address
      );

      expect(contractBalance).to.equal(listingPrice);

      const royaltyFee = await indianNFTExchange.getRoyaltyFeeForINEItem(1);
      const successFee = await indianNFTExchange.getSuccessFeeForINEItem(1);

      const priceToPay = itemPrice.add(royaltyFee).add(successFee);

      await indianNFTExchange.connect(acc2).buyINEItem(1, {
        value: priceToPay,
      });

      const item2 = await indianNFTExchange.getLatestINEItem();

      expect(item2.id).to.equal(1);
      expect(item2.creator).to.equal(acc1.address);
      expect(item2.owner).to.equal(acc2.address);
    });

    it("Should check royalty fees and sucess fees", async () => {
      const { indianNFTExchange, owner, acc1, acc2 } = await loadFixture(
        deployIndianNFTExchange
      );

      const listingPrice = await indianNFTExchange.getListingPrice();
      const id = await indianNFTExchange
        .connect(acc1)
        .createINEItem(
          "https://www.google.com",
          ethers.utils.parseEther("0.05"),
          {
            value: listingPrice,
          }
        );

      const item = await indianNFTExchange.getLatestINEItem();

      expect(item.id).to.equal(1);
      expect(item.creator).to.equal(acc1.address);
      expect(item.owner).to.equal(indianNFTExchange.address);
      expect(item.price).to.equal(ethers.utils.parseEther("0.05"));
      expect(item.tokenURI).to.equal("https://www.google.com");

      const contractBalance = await ethers.provider.getBalance(
        indianNFTExchange.address
      );

      expect(contractBalance).to.equal(listingPrice);

      const ownersInitialBalance = await ethers.provider.getBalance(
        owner.address
      );

      const price = ethers.utils.parseEther("0.05");
      const royaltyFee = await indianNFTExchange.getRoyaltyFeeForINEItem(1);
      const successFee = await indianNFTExchange.getSuccessFeeForINEItem(1);

      const priceToPay = price.add(royaltyFee).add(successFee);

      const tx = await indianNFTExchange.connect(acc2).buyINEItem(1, {
        value: priceToPay,
      });

      const reciept = await tx.wait();

      const item2 = await indianNFTExchange.getLatestINEItem();

      expect(item2.id).to.equal(1);
      expect(item2.creator).to.equal(acc1.address);
      expect(item2.owner).to.equal(acc2.address);

      const contractBalance2 = await ethers.provider.getBalance(
        indianNFTExchange.address
      );

      expect(contractBalance2).to.equal(0);
      const ownerBalance = await ethers.provider.getBalance(owner.address);

      expect(ownerBalance).to.equal(
        ownersInitialBalance.add(successFee).add(LISTING_PRICE)
      );
    });

    it("Should not buy a NFT if price is not equal to listing price", async () => {
      const { indianNFTExchange, owner, acc1, acc2 } = await loadFixture(
        deployIndianNFTExchange
      );

      const listingPrice = await indianNFTExchange.getListingPrice();
      const id = await indianNFTExchange
        .connect(acc1)
        .createINEItem(
          "https://www.google.com",
          ethers.utils.parseEther("0.05"),
          {
            value: listingPrice,
          }
        );

      await expect(
        indianNFTExchange.connect(acc2).buyINEItem(1, {
          value: ethers.utils.parseEther("0.01"),
        })
      ).to.be.revertedWith(
        "Please submit the asking price in order to complete the purchase"
      );
    });
  });

  describe("Resell NFT", () => {
    it("Should resell a NFT", async () => {
      const { indianNFTExchange, owner, acc1, acc2 } = await loadFixture(
        deployIndianNFTExchange
      );

      const listingPrice = await indianNFTExchange.getListingPrice();
      const id = await indianNFTExchange
        .connect(acc1)
        .createINEItem(
          "https://www.google.com",
          ethers.utils.parseEther("0.05"),
          {
            value: listingPrice,
          }
        );

      const item = await indianNFTExchange.getLatestINEItem();

      const contractBalance = await ethers.provider.getBalance(
        indianNFTExchange.address
      );

      expect(contractBalance).to.equal(listingPrice);

      const price = ethers.utils.parseEther("0.05");
      const royaltyFee = await indianNFTExchange.getRoyaltyFeeForINEItem(1);
      const successFee = await indianNFTExchange.getSuccessFeeForINEItem(1);

      const priceToPay = price.add(royaltyFee).add(successFee);

      await indianNFTExchange.connect(acc2).buyINEItem(1, {
        value: priceToPay,
      });

      const item2 = await indianNFTExchange.getLatestINEItem();

      expect(item2.id).to.equal(1);
      expect(item2.creator).to.equal(acc1.address);
      expect(item2.owner).to.equal(acc2.address);

      await indianNFTExchange
        .connect(acc2)
        .resellINEItem(1, ethers.utils.parseEther("0.1"), {
          value: listingPrice,
        });

      const item3 = await indianNFTExchange.getLatestINEItem();

      expect(item3.id).to.equal(1);
      expect(item3.creator).to.equal(acc1.address);
      expect(item3.owner).to.equal(indianNFTExchange.address);
      expect(item3.price).to.equal(ethers.utils.parseEther("0.1"));
      expect(item3.tokenURI).to.equal("https://www.google.com");

      const contractBalance2 = await ethers.provider.getBalance(
        indianNFTExchange.address
      );
    });

    it("Should not resell a NFT if price is not equal to listing price", async () => {
      const { indianNFTExchange, owner, acc1 } = await loadFixture(
        deployIndianNFTExchange
      );

      const listingPrice = await indianNFTExchange.getListingPrice();
      const id = await indianNFTExchange
        .connect(acc1)
        .createINEItem(
          "https://www.google.com",
          ethers.utils.parseEther("0.05"),
          {
            value: listingPrice,
          }
        );

      await expect(
        indianNFTExchange
          .connect(acc1)
          .resellINEItem(1, ethers.utils.parseEther("0.1"), {
            value: ethers.utils.parseEther("0.01"),
          })
      ).to.be.revertedWith("Price must be equal to listing price");
    });

    it("Should not resell a NFT if not owner", async () => {
      const { indianNFTExchange, owner, acc1, acc2 } = await loadFixture(
        deployIndianNFTExchange
      );

      const listingPrice = await indianNFTExchange.getListingPrice();
      const id = await indianNFTExchange
        .connect(acc1)
        .createINEItem(
          "https://www.google.com",
          ethers.utils.parseEther("0.05"),
          {
            value: listingPrice,
          }
        );

      await expect(
        indianNFTExchange
          .connect(acc2)
          .resellINEItem(1, ethers.utils.parseEther("0.1"), {
            value: listingPrice,
          })
      ).to.be.revertedWith(
        "You must own this item in order to list it for sale"
      );
    });

    it("Resell price Calculations", async () => {
      const { indianNFTExchange, owner, acc1, acc2 } = await loadFixture(
        deployIndianNFTExchange
      );

      const listingPrice = await indianNFTExchange.getListingPrice();

      await indianNFTExchange
        .connect(acc1)
        .createINEItem(
          "https://www.google.com",
          ethers.utils.parseEther("0.05"),
          {
            value: listingPrice,
          }
        );

      const acc1Balance = await ethers.provider.getBalance(acc1.address);

      const price = ethers.utils.parseEther("0.05");
      const sucessFee = await indianNFTExchange.getSuccessFeeForINEItem(1);
      const royaltyFee = await indianNFTExchange.getRoyaltyFeeForINEItem(1);

      const priceToPay = price.add(sucessFee).add(royaltyFee);

      await indianNFTExchange.connect(acc2).buyINEItem(1, {
        value: priceToPay,
      });

      const price2 = ethers.utils.parseEther("0.1");

      await indianNFTExchange.connect(acc2).resellINEItem(1, price2, {
        value: listingPrice,
      });

      const successFee2 = await indianNFTExchange.getSuccessFeeForINEItem(1);
      const royaltyFee2 = await indianNFTExchange.getRoyaltyFeeForINEItem(1);
      const priceToPay2 = price2.add(successFee2).add(royaltyFee2);

      await indianNFTExchange.connect(owner).buyINEItem(1, {
        value: priceToPay2,
      });

      const acc1Balance2 = await ethers.provider.getBalance(acc1.address);

      expect(acc1Balance2).to.equal(
        acc1Balance.add(price).add(royaltyFee).add(royaltyFee2)
      );
    });
  });
});

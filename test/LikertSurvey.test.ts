import { ethers } from "hardhat";
import { expect } from "chai";

describe("LikertSurvey", function () {
  let likertSurvey: any;
  let owner: any, addr1: any, addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const LikertSurvey = await ethers.getContractFactory("LikertSurvey");
    likertSurvey = await LikertSurvey.deploy();
    await likertSurvey.deployed();
  });

  it("should create a new Likert survey", async function () {
    // Membuat survei baru
    const tx = await likertSurvey.createLikertSurvey("Apakah kamu puas?", 5);
    await tx.wait();
    const surveyId = 1;
    // Pastikan owner, pertanyaan, dan skala sudah benar
    expect(await likertSurvey.surveyOwner(surveyId)).to.equal(owner.address);
    expect(await likertSurvey.surveyQuestion(surveyId)).to.equal(
      "Apakah kamu puas?"
    );
    expect(await likertSurvey.scale(surveyId)).to.equal(5);
  });

  it("should fail to create survey with invalid scale", async function () {
    // Cek jika skala <2 atau >10 akan gagal
    await expect(likertSurvey.createLikertSurvey("Q", 1)).to.be.revertedWith(
      "Likert scale must be between 2 and 10"
    );

    await expect(likertSurvey.createLikertSurvey("Q", 11)).to.be.revertedWith(
      "Likert scale must be between 2 and 10"
    );
  });

  it("should allow user to submit response and update stats", async function () {
    await likertSurvey.createLikertSurvey("Bagaimana pelayanan kami?", 7);
    const surveyId = 1;

    // addr1 submit response 5
    await likertSurvey.connect(addr1).submitLikertResponse(surveyId, 5);
    expect(await likertSurvey.hasAnswered(surveyId, addr1.address)).to.equal(
      true
    );
    expect(await likertSurvey.userResponse(surveyId, addr1.address)).to.equal(
      5
    );
    expect(await likertSurvey.totalResponses(surveyId)).to.equal(1);
    expect(await likertSurvey.totalScore(surveyId)).to.equal(5);
    expect(await likertSurvey.sumOfSquares(surveyId)).to.equal(25);
    expect(await likertSurvey.getMinLikert(surveyId)).to.equal(5);
    expect(await likertSurvey.getMaxLikert(surveyId)).to.equal(5);

    // addr2 submit response 7
    await likertSurvey.connect(addr2).submitLikertResponse(surveyId, 7);
    expect(await likertSurvey.totalResponses(surveyId)).to.equal(2);
    expect(await likertSurvey.totalScore(surveyId)).to.equal(12);
    expect(await likertSurvey.sumOfSquares(surveyId)).to.equal(74);
    expect(await likertSurvey.getMinLikert(surveyId)).to.equal(5);
    expect(await likertSurvey.getMaxLikert(surveyId)).to.equal(7);
  });

  it("should not allow user to answer twice", async function () {
    await likertSurvey.createLikertSurvey("Q", 5);
    const surveyId = 1;

    await likertSurvey.connect(addr1).submitLikertResponse(surveyId, 3);
    // Percobaan menjawab dua kali (harus gagal)
    await expect(
      likertSurvey.connect(addr1).submitLikertResponse(surveyId, 4)
    ).to.be.revertedWith("Already answered");
  });

  it("should fail if response value out of range", async function () {
    await likertSurvey.createLikertSurvey("Q", 5);
    const surveyId = 1;

    // Jawaban 0 tidak valid
    await expect(
      likertSurvey.connect(addr1).submitLikertResponse(surveyId, 0)
    ).to.be.revertedWith("Likert value out of range");

    // Jawaban 6 juga tidak valid (max 5)
    await expect(
      likertSurvey.connect(addr1).submitLikertResponse(surveyId, 6)
    ).to.be.revertedWith("Likert value out of range");
  });

  it("should return correct average and standard deviation", async function () {
    await likertSurvey.createLikertSurvey("Q", 5);
    const surveyId = 1;

    // 2 response: 2 dan 4
    await likertSurvey.connect(addr1).submitLikertResponse(surveyId, 2);
    await likertSurvey.connect(addr2).submitLikertResponse(surveyId, 4);

    // Rata-rata = (2+4)/2 = 3
    expect(await likertSurvey.getAverageLikert(surveyId)).to.equal(3);

    // Stddev = sqrt(((4+16)/2) - 9) = sqrt(10-9) = 1
    expect(await likertSurvey.getStandardDeviation(surveyId)).to.equal(1);
  });

  it("should return 0 for stats if no response yet", async function () {
    await likertSurvey.createLikertSurvey("Q", 5);
    const surveyId = 1;

    // Semua statistik harus nol
    expect(await likertSurvey.getAverageLikert(surveyId)).to.equal(0);
    expect(await likertSurvey.getMinLikert(surveyId)).to.equal(0);
    expect(await likertSurvey.getMaxLikert(surveyId)).to.equal(0);
    expect(await likertSurvey.getStandardDeviation(surveyId)).to.equal(0);
  });
});

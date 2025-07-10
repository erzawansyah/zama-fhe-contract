import { ethers } from "hardhat";
import { expect } from "chai";

describe("FHE_SingleQuestionSurvey", function () {
  let survey: any;
  let owner: any, user1: any, user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const SurveyFactory = await ethers.getContractFactory(
      "FHE_SingleQuestionSurvey"
    );
    survey = await SurveyFactory.deploy();
    console.log("✅ Contract deployed at:", survey.target ?? survey.address);
  });

  it("should deploy the contract and create a survey", async function () {
    const question = "Apakah kamu suka kopi?";
    const tx = await survey.createSurvey(question);
    await tx.wait();
    console.log("🟩 Survey created. Question:", question);

    const count = await survey.surveyCount();
    expect(count).to.equal(1);
    console.log("🟦 surveyCount after create:", count);

    const storedQuestion = await survey.surveyQuestions(1);
    expect(storedQuestion).to.equal(question);
    console.log("🟦 Stored question:", storedQuestion);

    const creator = await survey.surveyCreators(1);
    expect(creator).to.equal(owner.address);
    console.log("🟦 Survey creator address:", creator);
  });

  it("should allow encrypted answer submission", async function () {
    await survey.createSurvey("Skor mood hari ini?");
    console.log("🟩 Survey for mood created.");

    // Simulasi bytes terenkripsi (gunakan mock, real FHE pakai SDK)
    const mockEncryptedAnswer = "0x" + "11".repeat(32); // 32 bytes (euint8 external)
    const mockEncryptedAddress = "0x" + "aa".repeat(32);
    const tx = await survey
      .connect(user1)
      .submitAnswer(1, mockEncryptedAnswer, mockEncryptedAddress);
    await tx.wait();
    console.log(
      `🟦 User1 (${user1.address}) submit encryptedAnswer: ${mockEncryptedAnswer}, encryptedAddress: ${mockEncryptedAddress}`
    );

    const count = await survey.surveyRespondentCount(1);
    expect(count).to.equal(1);
    console.log("🟨 Respondent count after submit:", count);

    // Ambil struct response (via public getter array index)
    const response = await survey.encryptedResponses(1, 0);
    expect(response.encryptedAddress).to.equal(mockEncryptedAddress);
    console.log(
      `🟩 Encrypted response[0].encryptedAddress: ${response.encryptedAddress}`
    );
  });

  it("should increment respondent count for each submission", async function () {
    await survey.createSurvey("Berapa usia kamu?");
    console.log("🟩 Survey created for 'Berapa usia kamu?'");
    const mockAns1 = "0x" + "11".repeat(32);
    const mockAddr1 = "0x" + "aa".repeat(32);
    const mockAns2 = "0x" + "11".repeat(32);
    const mockAddr2 = "0x" + "aa".repeat(32);

    await survey.connect(user1).submitAnswer(1, mockAns1, mockAddr1);
    console.log(
      `🟦 User1 submit encryptedAnswer: ${mockAns1}, encryptedAddress: ${mockAddr1}`
    );
    await survey.connect(user2).submitAnswer(1, mockAns2, mockAddr2);
    console.log(
      `🟦 User2 submit encryptedAnswer: ${mockAns2}, encryptedAddress: ${mockAddr2}`
    );

    const count = await survey.surveyRespondentCount(1);
    expect(count).to.equal(2);
    console.log("🟨 Respondent count after both submissions:", count);
  });

  it("should fail to submit answer for non-existent survey", async function () {
    const fakeEncrypted = "0x" + "11".repeat(32);
    const fakeAddr = "0x" + "aa".repeat(32);
    await expect(
      survey.connect(user1).submitAnswer(999, fakeEncrypted, fakeAddr)
    ).to.be.revertedWith("Survei tidak ada");
    console.log("🛑 Submission to non-existent survey reverted as expected.");
  });
});

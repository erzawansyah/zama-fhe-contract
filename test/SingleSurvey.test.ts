import { ethers } from "hardhat";
import { expect } from "chai";

describe("SingleQuestionSurvey (pure ethers)", function () {
  let survey: any;
  let owner: any, user1: any, user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const SurveyFactory = await ethers.getContractFactory(
      "SingleQuestionSurvey"
    );
    survey = await SurveyFactory.deploy();
    console.log("✅ Contract deployed at:", survey.address);
  });

  it("should create a survey and retrieve question text", async function () {
    const question = "Apakah Anda bahagia hari ini?";
    const tx = await survey.createSurvey(question);
    await tx.wait();

    expect(await survey.surveyCount()).to.equal(1);
    const fetched = await survey.surveyQuestions(1);
    expect(fetched).to.equal(question);
    console.log("🟩 Survey created with question:", fetched);
  });

  it("should allow users to submit answers and compute average", async function () {
    await survey.createSurvey("Berapa nilai Anda hari ini?");
    await survey.connect(user1).submitAnswer(1, 5);
    await survey.connect(user2).submitAnswer(1, 7);

    const respondents = await survey.surveyRespondentCount(1);
    expect(respondents).to.equal(2);
    const sum = await survey.surveySumAnswer(1);
    expect(sum).to.equal(12);
    const avg = await survey.getAverage(1);
    expect(avg).to.equal(6);

    const ans1 = await survey.userAnswers(1, user1.address);
    expect(ans1).to.equal(5);
    const ans2 = await survey.userAnswers(1, user2.address);
    expect(ans2).to.equal(7);
    console.log("🟦 user1 answered:", ans1.toString());
    console.log("🟦 user2 answered:", ans2.toString());
    console.log("🟨 Avg:", avg.toString());
  });

  it("should not allow duplicate submission", async function () {
    await survey.createSurvey("Test duplicate?");
    await survey.connect(user1).submitAnswer(1, 1);

    await expect(survey.connect(user1).submitAnswer(1, 2)).to.be.revertedWith(
      "Sudah submit"
    );
    console.log("🛑 Duplicate submission correctly reverted.");
  });

  it("should revert for non-existent survey", async function () {
    await expect(survey.connect(user2).submitAnswer(1, 2)).to.be.revertedWith(
      "Survei tidak ada"
    );
    console.log("🛑 Submission to non-existent survey reverted.");
  });

  it("should revert for answer out of range", async function () {
    await survey.createSurvey("Rentang?");
    await expect(survey.connect(user1).submitAnswer(1, 99)).to.be.revertedWith(
      "Jawaban harus 0-7"
    );
    console.log("🛑 Out-of-range answer reverted.");
  });
});

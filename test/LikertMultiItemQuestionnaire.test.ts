import { ethers } from "hardhat";
import { expect } from "chai";
import {
  LikertMultiItemQuestionnaire,
  LikertMultiItemQuestionnaire__factory,
} from "../typechain-types";
import { Signer } from "ethers";

describe("LikertMultiItemQuestionnaire", function () {
  let owner: Signer;
  let respondent: Signer;
  let contract: LikertMultiItemQuestionnaire;

  // Konfigurasi default
  const title = "Kuesioner Penelitian";
  const scaleLimit = 5;
  const questionLimit = 3;
  const respondentLimit = 2;

  beforeEach(async () => {
    [owner, respondent] = await ethers.getSigners();
    contract = await new LikertMultiItemQuestionnaire__factory(owner).deploy(
      title,
      scaleLimit,
      questionLimit,
      respondentLimit
    );
  });

  it("should initialize with correct parameters", async () => {
    expect(await contract.title()).to.equal(title);
    expect(await contract.scaleLimit()).to.equal(scaleLimit);
    expect(await contract.questionLimit()).to.equal(questionLimit);
    expect(await contract.respondentLimit()).to.equal(respondentLimit);
    expect(await contract.owner()).to.equal(await owner.getAddress());
    expect(await contract.published()).to.equal(false);
    expect(await contract.closed()).to.equal(false);
  });

  it("should allow owner to add questions in batch", async () => {
    const questions = [
      "Apa kabar?",
      "Bagaimana pengalaman Anda?",
      "Apakah Anda puas?",
    ];
    await contract.addQuestions(questions);
    expect(await contract.totalQuestions()).to.equal(3);

    // getAllQuestions
    const allQuestions = await contract.getAllQuestions();
    expect(allQuestions).to.deep.equal(questions);
  });

  it("should revert if non-owner tries to add question", async () => {
    const questions = ["Apa kabar?"];
    await expect(
      contract.connect(respondent).addQuestions(questions)
    ).to.be.revertedWithCustomError(contract, "OnlyOwner");
  });

  it("should revert if trying to publish with no questions", async () => {
    // Gunakan factory TypeChain
    const tempContract = await new LikertMultiItemQuestionnaire__factory(
      owner
    ).deploy(title, scaleLimit, questionLimit, respondentLimit);

    await expect(tempContract.publish()).to.be.revertedWithCustomError(
      tempContract,
      "MustHaveQuestions"
    );
  });

  it("should allow owner to publish after adding questions", async () => {
    await contract.addQuestions(["Q1", "Q2", "Q3"]);
    await expect(contract.publish()).to.emit(
      contract,
      "QuestionnairePublished"
    );
    expect(await contract.published()).to.equal(true);
  });

  it("should not allow to add questions after publish", async () => {
    await contract.addQuestions(["Q1", "Q2", "Q3"]);
    await contract.publish();

    await expect(contract.addQuestions(["Q4"])).to.be.revertedWithCustomError(
      contract,
      "QuestionnaireAlreadyPublished"
    );
  });

  it("should allow respondent to submit answers, update stats, and emit events", async () => {
    await contract.addQuestions(["Q1", "Q2", "Q3"]);
    await contract.publish();

    const answers = [3, 5, 2];
    await expect(contract.connect(respondent).submitResponses(answers)).to.emit(
      contract,
      "ResponseSubmitted"
    );

    const avg1 = await contract.getQuestionAverage(1);
    expect(avg1).to.equal(3);
    const avg2 = await contract.getQuestionAverage(2);
    expect(avg2).to.equal(5);
    const avg3 = await contract.getQuestionAverage(3);
    expect(avg3).to.equal(2);

    expect(await contract.getQuestionMin(1)).to.equal(3);
    expect(await contract.getQuestionMax(2)).to.equal(5);
  });

  it("should revert if respondent answers twice", async () => {
    await contract.addQuestions(["Q1", "Q2", "Q3"]);
    await contract.publish();

    const answers = [1, 2, 3];
    await contract.connect(respondent).submitResponses(answers);

    await expect(
      contract.connect(respondent).submitResponses([1, 2, 3])
    ).to.be.revertedWithCustomError(contract, "AlreadyResponded");
  });

  it("should revert if submitted answer count mismatches question count", async () => {
    await contract.addQuestions(["Q1", "Q2", "Q3"]);
    await contract.publish();

    await expect(
      contract.connect(respondent).submitResponses([1, 2])
    ).to.be.revertedWithCustomError(contract, "ResponseCountMismatch");
  });

  it("should revert if answer out of scale", async () => {
    await contract.addQuestions(["Q1", "Q2", "Q3"]);
    await contract.publish();

    await expect(
      contract.connect(respondent).submitResponses([1, 7, 3])
    ).to.be.revertedWithCustomError(contract, "ResponseOutOfRange");
  });

  it("should close automatically when respondent limit reached", async () => {
    await contract.addQuestions(["Q1", "Q2", "Q3"]);
    await contract.publish();

    // 1st respondent
    const [_, user1, user2] = await ethers.getSigners();
    await contract.connect(user1).submitResponses([3, 3, 3]);
    expect(await contract.closed()).to.equal(false);

    // 2nd respondent, trigger auto-close
    await expect(contract.connect(user2).submitResponses([4, 4, 4])).to.emit(
      contract,
      "QuestionnaireClosed"
    );
    expect(await contract.closed()).to.equal(true);
  });

  it("should not allow to submit responses after closed", async () => {
    await contract.addQuestions(["Q1", "Q2", "Q3"]);
    await contract.publish();

    const [_, user1, user2, user3] = await ethers.getSigners();
    await contract.connect(user1).submitResponses([1, 2, 3]);
    await contract.connect(user2).submitResponses([2, 3, 4]);

    await expect(
      contract.connect(user3).submitResponses([1, 2, 3])
    ).to.be.revertedWithCustomError(contract, "QuestionnaireHasClosed");
  });

  it("should return correct user responses", async () => {
    await contract.addQuestions(["Q1", "Q2", "Q3"]);
    await contract.publish();

    await contract.connect(respondent).submitResponses([4, 3, 2]);
    const responses = await contract.getUserResponses(
      await respondent.getAddress()
    );
    expect(responses.map(Number)).to.deep.equal([4, 3, 2]);
  });

  it("should revert getUserResponses if user not responded", async () => {
    await contract.addQuestions(["Q1", "Q2", "Q3"]);
    await contract.publish();

    await expect(
      contract.getUserResponses(await respondent.getAddress())
    ).to.be.revertedWithCustomError(contract, "UserHasNotResponded");
  });
});

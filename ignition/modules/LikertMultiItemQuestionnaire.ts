import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LikertMultiItemQuestionnaireModule", (m) => {
  // Edit parameter berikut sesuai kebutuhan kamu
  const title: string = "Survey Penelitian MEW";
  const scaleLimit: number = 5;
  const questionLimit: number = 10;
  const respondentLimit: number = 100;

  // Deploy contract dengan parameter constructor
  const questionnaire = m.contract("LikertMultiItemQuestionnaire", [
    title,
    scaleLimit,
    questionLimit,
    respondentLimit,
  ]);

  return { questionnaire };
});

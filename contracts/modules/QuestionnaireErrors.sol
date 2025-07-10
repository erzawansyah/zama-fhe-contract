// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library QuestionnaireErrors {
    // --- Custom Errors ---
    error OnlyOwner();
    error QuestionnaireNotPublished();
    error QuestionnaireHasClosed();
    error QuestionnaireAlreadyPublished();
    error InvalidTitle();
    error InvalidScale();
    error InvalidQuestionLimit();
    error InvalidRespondentLimit();
    error EmptyQuestion();
    error MaxQuestionsReached();
    error MustHaveQuestions();
    error AlreadyResponded();
    error ResponseCountMismatch();
    error RespondentLimitReached();
    error ResponseOutOfRange();
    error InvalidQuestionId();
    error UserHasNotResponded();
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ILikertQuestionnaire
/// @notice Interface for a Likert-type multi-item Questionnaire contract.
/// @dev This defines the standard events and function signatures for managing questionaries with multiple Likert-scale questions.
interface ILikertQuestionnaire {
    /// @notice Add a new question to the Questionnaire. Only callable by the owner.
    /// @param _questions The text of the question to add.
    function addQuestions(string[] calldata _questions) external;

    /// @notice Publish the Questionnaire to allow responses. Only callable by the owner.
    function publish() external;

    /// @notice Submit responses for all questions.
    /// @param _responses An array of Likert scale responses. Length must equal the total number of questions.
    function submitResponses(uint8[] calldata _responses) external;

    /// @notice Manually close the Questionnaire before respondent limit is reached.
    function closeQuestionnaire() external;

    /// @notice Get the average score for a specific question.
    /// @param questionId ID of the question.
    /// @return Average score (uint256).
    function getQuestionAverage(
        uint256 questionId
    ) external view returns (uint256);

    /// @notice Get the minimum score given for a specific question.
    /// @param questionId ID of the question.
    /// @return Minimum score (uint8).
    function getQuestionMin(uint256 questionId) external view returns (uint8);

    /// @notice Get the maximum score given for a specific question.
    /// @param questionId ID of the question.
    /// @return Maximum score (uint8).
    function getQuestionMax(uint256 questionId) external view returns (uint8);

    /// @notice Get the standard deviation of scores for a specific question.
    /// @param questionId ID of the question.
    /// @return Standard deviation (uint256).
    function getQuestionStandardDeviation(
        uint256 questionId
    ) external view returns (uint256);

    /// @notice Get all question texts in order.
    /// @return An array of strings containing all questions.
    function getAllQuestions() external view returns (string[] memory);

    /// @notice Get responses submitted by a specific user.
    /// @param user Address of the respondent.
    /// @return An array of responses (uint8) for each question.
    function getUserResponses(
        address user
    ) external view returns (uint8[] memory);

    /// @notice Get overall Questionnaire statistics.
    /// @return respondents Total number of respondents so far.
    /// @return questionsCount Total number of questions.
    /// @return isPublished True if Questionnaire is published.
    /// @return isClosed True if Questionnaire is closed.
    /// @return slotsRemaining Number of respondent slots remaining.
    function getQuestionnaireStatistics()
        external
        view
        returns (
            uint256 respondents,
            uint256 questionsCount,
            bool isPublished,
            bool isClosed,
            uint256 slotsRemaining
        );
}

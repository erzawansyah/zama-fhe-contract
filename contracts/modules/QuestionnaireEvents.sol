// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library QuestionnaireEvents {
    /// @notice Emitted when a new Questionnaire is created.
    /// @param owner Address of the Questionnaire creator.
    /// @param timestamp Unix timestamp when the Questionnaire was created.
    /// @param title Title of the Questionnaire.
    /// @param scaleLimit Maximum scale value for Likert responses (e.g., 5, 7, or 10).
    /// @param questionLimit Maximum number of questions/items allowed.
    /// @param respondentLimit Maximum number of respondents allowed.
    event QuestionnaireCreated(
        address indexed owner,
        uint256 timestamp,
        string title,
        uint8 scaleLimit,
        uint256 questionLimit,
        uint256 respondentLimit
    );

    /// @notice Emitted when a metadata attached to Questionnaire.
    /// @param metadataCID String of IPFS hash contained metadata
    event MetadataUpdated(string metadataCID);

    /// @notice Emitted when a new question is added to the Questionnaire.
    /// @param questionId Unique ID for the added question.
    /// @param questionText Text/content of the question.
    event QuestionAdded(uint256 indexed questionId, string questionText);

    /// @notice Emitted when the Questionnaire is published.
    /// @param timestamp Unix timestamp when the Questionnaire was published.
    event QuestionnairePublished(uint256 timestamp);

    /// @notice Emitted when a respondent successfully submits responses.
    /// @param respondent Address of the respondent.
    /// @param timestamp Unix timestamp when the response was submitted.
    event ResponseSubmitted(address indexed respondent, uint256 timestamp);

    /// @notice Emitted when the Questionnaire is manually or automatically closed.
    /// @param timestamp Unix timestamp when the Questionnaire was closed.
    event QuestionnaireClosed(uint256 timestamp);

    /// @notice Emitted when the Questionnaire is manually or automatically closed.
    /// @param timestamp Unix timestamp when the Questionnaire was closed.
    event QuestionnaireDeleted(uint256 timestamp);
}

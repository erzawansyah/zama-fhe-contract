// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title QuestionnaireErrors
/// @notice Library that centralises all custom errors for the Questionnaire contract.
///         Keeping errors in a separate library reduces byte‑size of the main contract
///         and makes revert reasons easier to track.
library QuestionnaireErrors {
    /* ------------------------------------------------------------------ */
    /* Status‑transition errors                                           */
    /* ------------------------------------------------------------------ */
    /// Function requires status == Initialized.
    error StatusNotInitialized();
    /// Function requires status == Draft.
    error StatusNotDraft();
    /// Function requires status == Published.
    error StatusNotPublished();
    /// Function requires status == Closed.
    error StatusNotClosed();

    /// Questionnaire has already been published.
    error QuestionnaireAlreadyPublished();
    /// Questionnaire is already closed.
    error QuestionnaireHasClosed();
    /// Questionnaire is not published yet.
    error QuestionnaireNotPublished();

    /* ------------------------------------------------------------------ */
    /* Life‑cycle & deletion errors                                       */
    /* ------------------------------------------------------------------ */
    /// Current status does not allow deletion.
    error CannotBeDeleted();
    /// Questionnaire has already been deleted.
    error QuestionnaireAlreadyDeleted();

    /* ------------------------------------------------------------------ */
    /* Access‑control errors                                              */
    /* ------------------------------------------------------------------ */
    /// Caller is not the owner.
    error OnlyOwner();

    /* ------------------------------------------------------------------ */
    /* Metadata & configuration validation                                */
    /* ------------------------------------------------------------------ */
    /// Metadata CID must not be empty.
    error QuestionnaireMetadataCIDEmpty();
    /// Title must not be an empty string.
    error InvalidTitle();
    /// scaleLimit is outside the allowed range (e.g., 2‑10).
    error InvalidScale();
    /// questionLimit is zero or exceeds maxQuestionLimit.
    error InvalidQuestionLimit();
    /// respondentLimit is zero or otherwise invalid.
    error InvalidRespondentLimit();
    /// Question text is empty.
    error EmptyQuestion();
    /// Already reached the maximum allowed number of questions.
    error MaxQuestionsReached();
    /// Must contain at least one question before publishing.
    error MustHaveQuestions();

    /* ------------------------------------------------------------------ */
    /* Response validation errors                                         */
    /* ------------------------------------------------------------------ */
    /// Address has already submitted a response.
    error AlreadyResponded();
    /// Number of answers does not match number of questions.
    error ResponseCountMismatch();
    /// Maximum respondent quota has been reached.
    error RespondentLimitReached();
    /// Answer value is outside the Likert scale.
    error ResponseOutOfRange();
    /// Provided question ID does not exist.
    error InvalidQuestionId();
    /// User has not submitted any responses yet.
    error UserHasNotResponded();
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ILikertMultiItemQuestionnaire.sol";
import "./modules/QuestionnaireErrors.sol";
import "./modules/QuestionnaireEvents.sol";

contract LikertMultiItemQuestionnaire is ILikertMultiItemQuestionnaire {
    // --- Constant Variables ---
    uint256 private constant maxQuestionLimit = 20;

    // --- State Variables ---
    address public owner;
    string public title;
    uint8 public scaleLimit;
    uint256 public questionLimit;
    uint256 public respondentLimit;
    bool public published;
    bool public closed;

    uint256 public totalQuestions;
    uint256 public totalRespondents;

    mapping(uint256 => string) public questions;
    mapping(address => bool) public hasResponded;
    mapping(address => mapping(uint256 => uint8)) public responses;

    mapping(uint256 => uint256) public questionTotalScore;
    mapping(uint256 => uint256) public questionSumSquares;
    mapping(uint256 => uint8) public questionMinScore;
    mapping(uint256 => uint8) public questionMaxScore;

    // --- Modifiers ---
    modifier onlyOwner() {
        if (msg.sender != owner) revert QuestionnaireErrors.OnlyOwner();
        _;
    }

    modifier onlyPublished() {
        if (!published) revert QuestionnaireErrors.QuestionnaireNotPublished();
        _;
    }

    modifier notClosed() {
        if (closed) revert QuestionnaireErrors.QuestionnaireHasClosed();
        _;
    }

    modifier notPublished() {
        if (published)
            revert QuestionnaireErrors.QuestionnaireAlreadyPublished();
        _;
    }

    // --- Constructor ---
    constructor(
        string memory _title,
        uint8 _scaleLimit,
        uint256 _questionLimit,
        uint256 _respondentLimit
    ) {
        // Title cannot be empty
        if (bytes(_title).length == 0)
            revert QuestionnaireErrors.InvalidTitle();

        // Questionnaire only accepted range 2 to 10
        if (_scaleLimit < 2 || _scaleLimit > 10)
            revert QuestionnaireErrors.InvalidScale();

        // Limit question only for 20 items
        if (_questionLimit == 0 || _questionLimit > maxQuestionLimit)
            revert QuestionnaireErrors.InvalidQuestionLimit();

        // respondent limit cannot be 0
        if (_respondentLimit == 0)
            revert QuestionnaireErrors.InvalidRespondentLimit();

        owner = msg.sender;
        title = _title;
        scaleLimit = _scaleLimit;
        questionLimit = _questionLimit;
        respondentLimit = _respondentLimit;

        emit QuestionnaireEvents.QuestionnaireCreated(
            owner,
            _title,
            _scaleLimit,
            _questionLimit,
            _respondentLimit
        );
    }

    // --- Questionnaire Management ---
    function addQuestion(
        string calldata _question
    ) internal onlyOwner notPublished {
        if (bytes(_question).length == 0)
            revert QuestionnaireErrors.EmptyQuestion();
        if (totalQuestions >= questionLimit)
            revert QuestionnaireErrors.MaxQuestionsReached();

        totalQuestions++;
        questions[totalQuestions] = _question;

        questionMinScore[totalQuestions] = scaleLimit;
        questionMaxScore[totalQuestions] = 0;

        emit QuestionnaireEvents.QuestionAdded(totalQuestions, _question);
    }

    function addQuestions(
        string[] calldata _questions
    ) external onlyOwner notPublished {
        for (uint256 i = 0; i < _questions.length; i++) {
            addQuestion(_questions[i]);
        }
    }

    function publish() external onlyOwner notPublished {
        if (totalQuestions == 0) revert QuestionnaireErrors.MustHaveQuestions();
        published = true;
        emit QuestionnaireEvents.QuestionnairePublished(block.timestamp);
    }

    function closeQuestionnaire() external onlyOwner onlyPublished notClosed {
        closed = true;
        emit QuestionnaireEvents.QuestionnaireClosed(block.timestamp);
    }

    // --- Respondent Actions ---
    function submitResponses(
        uint8[] calldata _responses
    ) external onlyPublished notClosed {
        if (hasResponded[msg.sender])
            revert QuestionnaireErrors.AlreadyResponded();
        if (_responses.length != totalQuestions)
            revert QuestionnaireErrors.ResponseCountMismatch();
        if (totalRespondents >= respondentLimit)
            revert QuestionnaireErrors.RespondentLimitReached();

        for (uint256 i = 0; i < _responses.length; i++) {
            uint8 response = _responses[i];
            if (response < 1 || response > scaleLimit)
                revert QuestionnaireErrors.ResponseOutOfRange();

            uint256 questionId = i + 1;
            responses[msg.sender][questionId] = response;
            questionTotalScore[questionId] += response;
            questionSumSquares[questionId] += uint256(response) * response;

            if (response < questionMinScore[questionId]) {
                questionMinScore[questionId] = response;
            }
            if (response > questionMaxScore[questionId]) {
                questionMaxScore[questionId] = response;
            }
        }

        hasResponded[msg.sender] = true;
        totalRespondents++;

        emit QuestionnaireEvents.ResponseSubmitted(msg.sender, block.timestamp);

        if (totalRespondents >= respondentLimit) {
            closed = true;
            emit QuestionnaireEvents.QuestionnaireClosed(block.timestamp);
        }
    }

    // --- Query Functions ---
    function getAllQuestions() external view returns (string[] memory) {
        string[] memory result = new string[](totalQuestions);
        for (uint256 i = 1; i <= totalQuestions; i++) {
            result[i - 1] = questions[i];
        }
        return result;
    }

    function getUserResponses(
        address user
    ) external view returns (uint8[] memory) {
        if (!hasResponded[user])
            revert QuestionnaireErrors.UserHasNotResponded();

        uint8[] memory userRes = new uint8[](totalQuestions);
        for (uint256 i = 1; i <= totalQuestions; i++) {
            userRes[i - 1] = responses[user][i];
        }
        return userRes;
    }

    // --- Statistical Query Functions ---
    function getQuestionAverage(
        uint256 questionId
    ) external view returns (uint256) {
        if (questionId == 0 || questionId > totalQuestions)
            revert QuestionnaireErrors.InvalidQuestionId();
        if (totalRespondents == 0) return 0;
        return questionTotalScore[questionId] / totalRespondents;
    }

    function getQuestionMin(uint256 questionId) external view returns (uint8) {
        if (questionId == 0 || questionId > totalQuestions)
            revert QuestionnaireErrors.InvalidQuestionId();
        if (totalRespondents == 0) return 0;
        return questionMinScore[questionId];
    }

    function getQuestionMax(uint256 questionId) external view returns (uint8) {
        if (questionId == 0 || questionId > totalQuestions)
            revert QuestionnaireErrors.InvalidQuestionId();
        if (totalRespondents == 0) return 0;
        return questionMaxScore[questionId];
    }

    function getQuestionStandardDeviation(
        uint256 questionId
    ) external view returns (uint256) {
        if (questionId == 0 || questionId > totalQuestions)
            revert QuestionnaireErrors.InvalidQuestionId();
        if (totalRespondents == 0) return 0;

        uint256 mean = questionTotalScore[questionId] / totalRespondents;
        uint256 meanSquare = questionSumSquares[questionId] / totalRespondents;

        uint256 variance = meanSquare > mean * mean
            ? meanSquare - mean * mean
            : 0;
        return sqrt(variance);
    }

    function getQuestionnaireStatistics()
        external
        view
        returns (
            uint256 respondents,
            uint256 questionsCount,
            bool isPublished,
            bool isClosed,
            uint256 slotsRemaining
        )
    {
        return (
            totalRespondents,
            totalQuestions,
            published,
            closed,
            respondentLimit > totalRespondents
                ? respondentLimit - totalRespondents
                : 0
        );
    }

    // --- Internal Helpers ---
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}

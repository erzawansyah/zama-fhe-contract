// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, ebool, eaddress, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title LikertSurvey
contract ConfidentialLikertSurvey is SepoliaConfig {
    uint256 public surveyCount; // Total number of surveys created

    // mapping(uint256 => address) public surveyOwner; // Mapping from surveyId to the owner of the survey
    mapping(uint256 => eaddress) public surveyOwner; // No one know the owner of the survey
    mapping(uint256 => string) public surveyQuestion; // Mapping from surveyId to the survey question prompt
    mapping(uint256 => uint8) public scale; // Maximum Likert value for each survey (e.g., 5, 7, or 10)

    mapping(uint256 => uint256) public totalResponses; // Total number of responses for each survey
    mapping(uint256 => uint256) public totalScore; // Total score for each survey (sum of all responses)
    mapping(uint256 => uint256) public sumOfSquares; // Total squared score for each survey (for standard deviation calculation)
    mapping(uint256 => uint8) public minScore; // Minimum response value per survey
    mapping(uint256 => uint8) public maxScore; // Maximum response value per survey

    // mapping(uint256 => mapping(address => bool)) public hasAnswered;
    // mapping(uint256 => mapping(address => uint8)) public userResponse;
    mapping(uint256 => mapping(eaddress => bool)) public hasAnswered; // No one know if the user has answered the survey
    mapping(uint256 => mapping(eaddress => euint8)) public userResponse; // No one know if the user has answered the survey

    event LikertSurveyCreated(
        uint256 indexed surveyId,
        eaddress indexed owner,
        string prompt,
        uint8 maxLikert
    );
    event LikertAnswerSubmitted(
        uint256 indexed surveyId,
        eaddress indexed respondent,
        euint8 value
    );

    /// @notice Create a new single-question Likert survey.
    function createLikertSurvey(
        string calldata prompt,
        uint8 surveyScale
    ) external returns (uint256 surveyId) {
        require(bytes(prompt).length > 0, "Prompt cannot be empty");
        require(
            surveyScale > 1 && surveyScale <= 10,
            "Likert scale must be between 2 and 10"
        );

        surveyCount++;
        surveyId = surveyCount;
        surveyOwner[surveyId] = FHE.asEaddress(msg.sender);
        surveyQuestion[surveyId] = prompt;
        scale[surveyId] = surveyScale;

        // Initialize min and max Likert given (for now, min is surveyScale, max is 0)
        minScore[surveyId] = surveyScale;
        maxScore[surveyId] = 0;

        emit LikertSurveyCreated(
            surveyId,
            FHE.asEaddress(msg.sender),
            prompt,
            surveyScale
        );
    }

    /// @notice Submit a Likert-scale response for a given survey.
    function submitLikertResponse(uint256 surveyId, uint8 value) external {
        require(
            bytes(surveyQuestion[surveyId]).length > 0,
            "Survey does not exist"
        );
        require(
            !hasAnswered[surveyId][FHE.asEaddress(msg.sender)],
            "Already answered"
        );
        require(
            value >= 1 && value <= scale[surveyId],
            "Response is out of range"
        );
        eaddress encryptedSender = FHE.asEaddress(msg.sender);
        euint8 encryptedValue = FHE.asEuint8(value);

        hasAnswered[surveyId][encryptedSender] = true;
        userResponse[surveyId][encryptedSender] = encryptedValue;

        totalResponses[surveyId]++;
        totalScore[surveyId] += value;
        sumOfSquares[surveyId] += uint256(value) * uint256(value);

        // Update min and max
        if (value < minScore[surveyId]) {
            minScore[surveyId] = value;
        }
        if (value > maxScore[surveyId]) {
            maxScore[surveyId] = value;
        }

        emit LikertAnswerSubmitted(
            surveyId,
            encryptedSender,
            FHE.asEuint8(value)
        );
    }

    /// @notice Returns the average Likert score for a survey.
    function getAverageLikert(
        uint256 surveyId
    ) external view returns (uint256) {
        if (totalResponses[surveyId] == 0) return 0;
        return totalScore[surveyId] / totalResponses[surveyId];
    }

    /// @notice Returns the min Likert score for a survey.
    function getMinLikert(uint256 surveyId) external view returns (uint8) {
        if (totalResponses[surveyId] == 0) return 0;
        return minScore[surveyId];
    }

    /// @notice Returns the max Likert score for a survey.
    function getMaxLikert(uint256 surveyId) external view returns (uint8) {
        if (totalResponses[surveyId] == 0) return 0;
        return maxScore[surveyId];
    }

    /// @notice Returns the standard deviation (rounded down, integer only)
    /// @dev Standard deviation = sqrt((Σx^2 / n) - (mean^2))
    function getStandardDeviation(
        uint256 surveyId
    ) external view returns (uint256) {
        uint256 n = totalResponses[surveyId];
        if (n == 0) return 0;

        // mean = totalScore / n
        // meanSq = sumOfSquares / n
        uint256 mean = totalScore[surveyId] / n;
        uint256 meanSq = sumOfSquares[surveyId] / n;

        // Variance = E[x^2] - (E[x])^2
        uint256 variance;
        if (mean * mean > meanSq) {
            variance = 0; // Protect against negative value due to rounding
        } else {
            variance = meanSq - (mean * mean);
        }

        // Return integer sqrt
        return sqrt(variance);
    }

    /// @notice Integer square root (Babylonian method)
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /// @notice Returns the prompt of a survey.
    function getsurveyQuestion(
        uint256 surveyId
    ) external view returns (string memory) {
        return surveyQuestion[surveyId];
    }

    /// @notice Returns the owner of a survey.
    function getSurveyOwner(uint256 surveyId) external view returns (address) {
        return surveyOwner[surveyId];
    }

    /// @notice Returns the maximum Likert scale value for a survey.
    function getscale(uint256 surveyId) external view returns (uint8) {
        return scale[surveyId];
    }
}

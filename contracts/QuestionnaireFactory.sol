// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./Questionnaire.sol";

/// @title QuestionnaireFactory (with pagination)
/// @notice Tracks every deployed Questionnaire, maps them to creators,
///         counts total questionnaires, and counts unique users.
contract QuestionnaireFactory {
    /* -------------------------------------------------------------- */
    /* Storage                                                        */
    /* -------------------------------------------------------------- */
    /// Global list of all questionnaire contract addresses.
    address[] private questionnaires;
    /// Owner => array of index positions in `questionnaires`.
    mapping(address => uint256[]) private userQuestionnaireIds;
    /// Owner address has appeared at least once.
    mapping(address => bool) private isUserRegistered;
    /// Total number of distinct creators.
    uint256 public uniqueUserCount;

    /* -------------------------------------------------------------- */
    /* Events                                                         */
    /* -------------------------------------------------------------- */
    event QuestionnaireCreated(
        address indexed owner,
        address indexed questionnaire
    );

    /* -------------------------------------------------------------- */
    /* External functions                                             */
    /* -------------------------------------------------------------- */
    /// @dev Deploys a new Questionnaire and updates indexes.
    function createQuestionnaire(
        string memory _title,
        uint8 _scaleLimit,
        uint256 _questionLimit,
        uint256 _respondentLimit
    ) external returns (address questionnaireAddr) {
        // 1. Deploy the Questionnaire; msg.sender becomes the owner.
        Questionnaire questionnaire = new Questionnaire(
            _title,
            _scaleLimit,
            _questionLimit,
            _respondentLimit
        );
        questionnaireAddr = address(questionnaire);
        // 2. Track globally.
        questionnaires.push(questionnaireAddr);
        uint256 newIndex = questionnaires.length - 1;
        // 3. Track per-user (by index to avoid duplicating addresses).
        userQuestionnaireIds[msg.sender].push(newIndex);
        // 4. Register unique user once.
        if (!isUserRegistered[msg.sender]) {
            isUserRegistered[msg.sender] = true;
            unchecked {
                ++uniqueUserCount;
            } // Overflow realistically impossible.
        }
        emit QuestionnaireCreated(msg.sender, questionnaireAddr);
    }

    /* -------------------------------------------------------------- */
    /* View helpers with pagination                                   */
    /* -------------------------------------------------------------- */

    /// @dev Get all questionnaires with pagination
    /// @param offset Start position (0-indexed)
    /// @param limit Maximum number of data returned
    /// @return questionnaireList Array of questionnaire addresses
    /// @return totalCount Total number of questionnaires
    /// @return hasMore Whether there is more data next
    function getQuestionnairesPaginated(
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            address[] memory questionnaireList,
            uint256 totalCount,
            bool hasMore
        )
    {
        totalCount = questionnaires.length;

        // Validate offset
        if (offset >= totalCount) {
            return (new address[](0), totalCount, false);
        }

        // Calculate the number of data to be returned
        uint256 remaining = totalCount - offset;
        uint256 returnCount = remaining > limit ? limit : remaining;

        // Create result array
        questionnaireList = new address[](returnCount);
        for (uint256 i = 0; i < returnCount; ++i) {
            questionnaireList[i] = questionnaires[offset + i];
        }

        // Check if there is more data next
        hasMore = offset + returnCount < totalCount;
    }

    /// @dev Get questionnaires by user with pagination
    /// @param owner Questionnaire owner's address
    /// @param offset Start position (0-indexed)
    /// @param limit Maximum number of data returned
    /// @return questionnaireList Array of questionnaire addresses
    /// @return totalCount Total number of questionnaires from that user
    /// @return hasMore Whether there is more data next
    function getQuestionnairesByUserPaginated(
        address owner,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            address[] memory questionnaireList,
            uint256 totalCount,
            bool hasMore
        )
    {
        uint256[] storage idxList = userQuestionnaireIds[owner];
        totalCount = idxList.length;

        // Validate offset
        if (offset >= totalCount) {
            return (new address[](0), totalCount, false);
        }

        // Calculate the number of data to be returned
        uint256 remaining = totalCount - offset;
        uint256 returnCount = remaining > limit ? limit : remaining;

        // Create result array
        questionnaireList = new address[](returnCount);
        for (uint256 i = 0; i < returnCount; ++i) {
            questionnaireList[i] = questionnaires[idxList[offset + i]];
        }

        // Check if there is more data next
        hasMore = offset + returnCount < totalCount;
    }

    /// @dev Get questionnaires in a certain range (alternative pagination)
    /// @param startIndex Start index (inclusive)
    /// @param endIndex End index (exclusive)
    /// @return questionnaireList Array of questionnaire addresses in that range
    function getQuestionnairesInRange(
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (address[] memory questionnaireList) {
        require(startIndex < endIndex, "Invalid range");
        require(
            startIndex < questionnaires.length,
            "Start index out of bounds"
        );

        // Limit endIndex so it does not exceed array length
        if (endIndex > questionnaires.length) {
            endIndex = questionnaires.length;
        }

        uint256 length = endIndex - startIndex;
        questionnaireList = new address[](length);

        for (uint256 i = 0; i < length; ++i) {
            questionnaireList[i] = questionnaires[startIndex + i];
        }
    }

    /// @dev Get the latest questionnaires with a certain limit
    /// @param limit Maximum number of latest questionnaires returned
    /// @return questionnaireList Array of latest questionnaire addresses (from newest to oldest)
    function getLatestQuestionnaires(
        uint256 limit
    ) external view returns (address[] memory questionnaireList) {
        uint256 totalQuestionnaires = questionnaires.length;
        if (totalQuestionnaires == 0) {
            return new address[](0);
        }

        uint256 returnCount = totalQuestionnaires > limit
            ? limit
            : totalQuestionnaires;
        questionnaireList = new address[](returnCount);

        // Start from the latest questionnaire (last index)
        for (uint256 i = 0; i < returnCount; ++i) {
            questionnaireList[i] = questionnaires[totalQuestionnaires - 1 - i];
        }
    }

    /* -------------------------------------------------------------- */
    /* View helpers original (for backward compatibility)             */
    /* -------------------------------------------------------------- */

    /// Return every questionnaire ever created (off-chain callers only).
    /// @dev WARNING: This function can be expensive in gas if there are many questionnaires
    function getQuestionnaires() external view returns (address[] memory) {
        return questionnaires;
    }

    /// Return how many questionnaires exist in total.
    function getQuestionnaireCount() external view returns (uint256) {
        return questionnaires.length;
    }

    /// Return the list of questionnaires created by a particular user.
    /// @dev WARNING: This function can be expensive in gas if the user has many questionnaires
    function getQuestionnairesByUser(
        address owner
    ) external view returns (address[] memory) {
        uint256[] storage idxList = userQuestionnaireIds[owner];
        uint256 len = idxList.length;
        address[] memory list = new address[](len);
        for (uint256 i = 0; i < len; ++i) {
            list[i] = questionnaires[idxList[i]];
        }
        return list;
    }

    /// @dev Get the number of questionnaires owned by a certain user
    function getQuestionnaireCountByUser(
        address owner
    ) external view returns (uint256) {
        return userQuestionnaireIds[owner].length;
    }

    /// @dev Check if a user is registered (has ever created a questionnaire)
    function isUserExists(address owner) external view returns (bool) {
        return isUserRegistered[owner];
    }
}

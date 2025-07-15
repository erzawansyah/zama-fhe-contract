// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Questionnaire.sol";

contract QuestionnaireFactory {
    // Struct untuk metadata survey
    struct SurveyInfo {
        address contractAddress;
        address owner;
        string title;
        uint256 createdAt;
    }

    // Semua survey yang sudah dideploy (bisa diganti jadi mapping kalau ingin index by owner)
    SurveyInfo[] public surveys;

    // Event untuk tracking offchain
    event SurveyCreated(
        address indexed owner,
        address indexed contractAddress,
        string title,
        uint256 createdAt
    );

    // Deploy contract survey baru, dan simpan data pentingnya
    function createSurvey(
        string memory _title,
        uint8 _scaleLimit,
        uint256 _questionLimit,
        uint256 _respondentLimit
    ) public returns (address) {
        // Deploy contract baru, msg.sender jadi owner
        Questionnaire survey = new Questionnaire(
            _title,
            _scaleLimit,
            _questionLimit,
            _respondentLimit
        );

        // Set ownership ke user yang memanggil (optional, kalau constructor sudah msg.sender, aman)
        // survey.transferOwnership(msg.sender); // Kalau pakai Ownable, contoh, tidak wajib

        // Simpan metadata
        surveys.push(
            SurveyInfo({
                contractAddress: address(survey),
                owner: msg.sender,
                title: _title,
                createdAt: block.timestamp
            })
        );

        emit SurveyCreated(
            msg.sender,
            address(survey),
            _title,
            block.timestamp
        );

        return address(survey);
    }

    // Lihat semua survey
    function getSurveys() external view returns (SurveyInfo[] memory) {
        return surveys;
    }

    // Atau lihat survey ke-N
    function getSurvey(uint256 idx) external view returns (SurveyInfo memory) {
        require(idx < surveys.length, "Invalid index");
        return surveys[idx];
    }

    // Lihat total survey (optional)
    function getSurveyCount() external view returns (uint256) {
        return surveys.length;
    }
}

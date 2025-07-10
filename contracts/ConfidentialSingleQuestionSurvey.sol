// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, eaddress, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialSingleQuestionSurvey is SepoliaConfig {
    uint256 public surveyCount;

    mapping(uint256 => address) public surveyCreators;
    mapping(uint256 => string) public surveyQuestions;
    mapping(uint256 => uint256) public surveyRespondentCount;

    // Simpan jawaban & address dalam bentuk terenkripsi eksternal
    struct EncryptedResponse {
        externalEuint8 encryptedAnswer;
        bytes encryptedAddress; // address yang sudah terenkripsi dari client
    }
    mapping(uint256 => EncryptedResponse[]) public encryptedResponses;

    event SurveyCreated(
        uint256 indexed surveyId,
        address indexed creator,
        string questionText
    );
    event AnswerSubmitted(uint256 indexed surveyId, bytes encryptedAddress);

    function createSurvey(string calldata question) external returns (uint256) {
        require(bytes(question).length > 0, "Pertanyaan kosong!");
        surveyCount++;
        surveyCreators[surveyCount] = msg.sender;
        surveyQuestions[surveyCount] = question;
        emit SurveyCreated(surveyCount, msg.sender, question);
        return surveyCount;
    }

    // Jawaban dan address dikirim dalam bentuk terenkripsi
    function submitAnswer(
        uint256 surveyId,
        externalEuint8 encryptedAnswer,
        bytes calldata encryptedAddress
    ) external {
        require(
            bytes(surveyQuestions[surveyId]).length > 0,
            "Survei tidak ada"
        );
        // Tidak bisa cek duplicate tanpa dekripsi offchain (privasi maksimal)
        encryptedResponses[surveyId].push(
            EncryptedResponse({
                encryptedAnswer: encryptedAnswer,
                encryptedAddress: encryptedAddress
            })
        );
        surveyRespondentCount[surveyId]++;
        emit AnswerSubmitted(surveyId, encryptedAddress);
    }

    // Tambahkan fungsi aggregator/decryptor offchain untuk statistik
}

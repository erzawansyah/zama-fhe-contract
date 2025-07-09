// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SingleQuestionSurvey {
    struct Survey {
        address creator;
        string questionText;
        uint256 respondentCount;
        uint256 sumAnswer;
        mapping(address => bool) hasResponded;
        mapping(address => uint8) answers;
    }

    mapping(uint256 => Survey) private surveys;
    uint256 public surveyCount;

    event SurveyCreated(
        uint256 indexed surveyId,
        address indexed creator,
        string questionText
    );
    event AnswerSubmitted(
        uint256 indexed surveyId,
        address indexed respondent,
        uint8 answer
    );

    // Membuat survei baru, siapapun boleh, dengan 1 pertanyaan (text)
    function createSurvey(string calldata question) external returns (uint256) {
        require(bytes(question).length > 0, "Pertanyaan kosong!");
        surveyCount++;
        Survey storage s = surveys[surveyCount];
        s.creator = msg.sender;
        s.questionText = question;
        emit SurveyCreated(surveyCount, msg.sender, question);
        return surveyCount;
    }

    // Submit jawaban untuk survei tertentu (rentang 0-7)
    function submitAnswer(uint256 surveyId, uint8 answer) external {
        Survey storage s = surveys[surveyId];
        require(bytes(s.questionText).length > 0, "Survei tidak ada");
        require(!s.hasResponded[msg.sender], "Sudah submit");
        require(answer <= 7, "Jawaban harus 0-7");

        s.hasResponded[msg.sender] = true;
        s.answers[msg.sender] = answer;
        s.respondentCount++;
        s.sumAnswer += answer;
        emit AnswerSubmitted(surveyId, msg.sender, answer);
    }

    // Mengambil teks pertanyaan survei
    function getQuestion(
        uint256 surveyId
    ) external view returns (string memory) {
        Survey storage s = surveys[surveyId];
        require(bytes(s.questionText).length > 0, "Survei tidak ada");
        return s.questionText;
    }

    // Mengambil jumlah responden & sum
    function getStats(
        uint256 surveyId
    ) external view returns (uint256 respondentCount, uint256 sumAnswer) {
        Survey storage s = surveys[surveyId];
        require(bytes(s.questionText).length > 0, "Survei tidak ada");
        return (s.respondentCount, s.sumAnswer);
    }

    // Mengambil rata-rata jawaban survei (dibulatkan ke bawah)
    function getAverage(uint256 surveyId) external view returns (uint256) {
        Survey storage s = surveys[surveyId];
        require(bytes(s.questionText).length > 0, "Survei tidak ada");
        if (s.respondentCount == 0) return 0;
        return s.sumAnswer / s.respondentCount;
    }

    // Mengambil jawaban user tertentu (hanya jika sudah submit)
    function getUserAnswer(
        uint256 surveyId,
        address user
    ) external view returns (uint8) {
        Survey storage s = surveys[surveyId];
        require(bytes(s.questionText).length > 0, "Survei tidak ada");
        require(s.hasResponded[user], "Belum submit");
        return s.answers[user];
    }

    // Mengecek apakah user sudah submit di survei tertentu
    function hasResponded(
        uint256 surveyId,
        address user
    ) external view returns (bool) {
        Survey storage s = surveys[surveyId];
        require(bytes(s.questionText).length > 0, "Survei tidak ada");
        return s.hasResponded[user];
    }
}

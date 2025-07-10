# first_fhe_contract

This project is a Hardhat-based smart contract implementation for creating and managing multi-item Likert scale questionnaires on the Ethereum blockchain. The main contract is `LikertMultiItemQuestionnaire`, which enables decentralized creation, publication, response collection, and analysis of questionnaires.

## Main Features
- **Multi-Item Likert Questionnaire Creation**: The contract owner can create questionnaires with multiple questions and customizable Likert scales (2-10).
- **Question & Respondent Limits**: Supports setting a maximum number of questions (up to 20) and respondents.
- **Questionnaire Publishing & Closing**: Questionnaires can be published and closed manually or automatically when the respondent quota is reached.
- **On-Chain Response Storage**: Respondents can answer all questions, and their responses are stored on-chain.
- **Automatic Statistics**: Supports calculation of average, minimum, maximum, and other statistics for each question.

## Key Directory Structure
- `contracts/` : Contains the main smart contract and related modules.
- `scripts/`   : Scripts for deployment, artifact generation, and other utilities.
- `test/`      : Automated tests for the smart contract.
- `output/`    : Generated ABI, JSON, and contract interface outputs.

## Installation
1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment**
   - Create a `.env` file and fill in the required variables (e.g., `INFURA_API_KEY`, `PRIVATE_KEY`, etc).

## Important Commands
- **Compile contracts**
  ```bash
  npx hardhat compile
  ```
- **Test contracts**
  ```bash
  npx hardhat test
  ```
- **Deploy to local network**
  ```bash
  npx hardhat node
  npx hardhat run scripts/deploy.ts --network localhost
  ```
- **Generate artifacts**
  ```bash
  npx hardhat generate-artifacts --contract LikertMultiItemQuestionnaire
  ```

## Usage Example
See `scripts/deploy.ts` for deployment examples, and `test/LikertMultiItemQuestionnaire.test.ts` for test cases.

## Deployed Contract
`LikertMultiItemQuestionnaire` - 0xC9D198192f38f55125cBEE792F0Ac3Aa5037ab61

## License
MIT

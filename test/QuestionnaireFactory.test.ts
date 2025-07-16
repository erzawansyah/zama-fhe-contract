import { expect } from "chai";
import { ethers } from "hardhat";
import { QuestionnaireFactory, QuestionnaireFactory__factory } from "../typechain-types";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("QuestionnaireFactory Contract", function () {
    // Fixture untuk deploy contract
    async function deployQuestionnaireFactoryFixture() {
        const [owner, user1, user2, user3] = await ethers.getSigners();

        // Deploy Questionnaire contract terlebih dahulu (untuk testing)
        const Questionnaire = await ethers.getContractFactory("Questionnaire");

        // Deploy QuestionnaireFactory
        const factory = await new QuestionnaireFactory__factory(owner).deploy();

        return { factory, owner, user1, user2, user3 };
    }

    // Helper function untuk membuat questionnaire
    async function createMultipleQuestionnaires(
        factory: QuestionnaireFactory,
        users: Signer[],
        counts: number[]
    ) {
        const createdQuestionnaires: string[] = [];

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const count = counts[i];

            for (let j = 0; j < count; j++) {
                const tx = await factory.connect(user).createQuestionnaire(
                    `Survey ${i}-${j}`,
                    5, // scaleLimit
                    10, // questionLimit
                    100 // respondentLimit
                );

                const receipt = await tx.wait();
                // Cari event QuestionnaireCreated
                const event = receipt?.logs
                    .map(log => factory.interface.parseLog(log))
                    .find(parsed => parsed?.name === "QuestionnaireCreated");
                if (event && event.args && event.args[1]) {
                    createdQuestionnaires.push(event.args[1]);
                }
            }
        }

        return createdQuestionnaires;
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { factory } = await loadFixture(deployQuestionnaireFactoryFixture);

            expect(await factory.getQuestionnaireCount()).to.equal(0);
            expect(await factory.uniqueUserCount()).to.equal(0);
        });
    });

    describe("Creating Questionnaires", function () {
        it("Should create a questionnaire successfully", async function () {
            const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);

            const tx = await factory.connect(user1).createQuestionnaire(
                "Test Survey",
                5,
                10,
                100
            );

            const receipt = await tx.wait();

            // Check if event was emitted
            expect(receipt && receipt.logs).to.have.lengthOf.greaterThan(0);

            // Check counts
            expect(await factory.getQuestionnaireCount()).to.equal(1);
            expect(await factory.uniqueUserCount()).to.equal(1);
            expect(await factory.getQuestionnaireCountByUser(user1.address)).to.equal(1);
        });

        it("Should emit QuestionnaireCreated event", async function () {
            const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);

            await expect(factory.connect(user1).createQuestionnaire(
                "Test Survey",
                5,
                10,
                100
            ))
                .to.emit(factory, "QuestionnaireCreated")
                .withArgs(user1.address, ethers.isAddress);
        });

        it("Should track multiple questionnaires from same user", async function () {
            const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);

            // Create 3 questionnaires
            await factory.connect(user1).createQuestionnaire("Survey 1", 5, 10, 100);
            await factory.connect(user1).createQuestionnaire("Survey 2", 5, 10, 100);
            await factory.connect(user1).createQuestionnaire("Survey 3", 5, 10, 100);

            expect(await factory.getQuestionnaireCount()).to.equal(3);
            expect(await factory.uniqueUserCount()).to.equal(1);
            expect(await factory.getQuestionnaireCountByUser(user1.address)).to.equal(3);
        });

        it("Should track multiple users", async function () {
            const { factory, user1, user2, user3 } = await loadFixture(deployQuestionnaireFactoryFixture);

            await factory.connect(user1).createQuestionnaire("Survey 1", 5, 10, 100);
            await factory.connect(user2).createQuestionnaire("Survey 2", 5, 10, 100);
            await factory.connect(user3).createQuestionnaire("Survey 3", 5, 10, 100);

            expect(await factory.getQuestionnaireCount()).to.equal(3);
            expect(await factory.uniqueUserCount()).to.equal(3);

            expect(await factory.getQuestionnaireCountByUser(user1.address)).to.equal(1);
            expect(await factory.getQuestionnaireCountByUser(user2.address)).to.equal(1);
            expect(await factory.getQuestionnaireCountByUser(user3.address)).to.equal(1);
        });
    });

    describe("User Registration", function () {
        it("Should register user on first questionnaire creation", async function () {
            const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);

            expect(await factory.isUserExists(user1.address)).to.be.false;

            await factory.connect(user1).createQuestionnaire("Test Survey", 5, 10, 100);

            expect(await factory.isUserExists(user1.address)).to.be.true;
        });

        it("Should not increment unique user count for existing user", async function () {
            const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);

            await factory.connect(user1).createQuestionnaire("Survey 1", 5, 10, 100);
            expect(await factory.uniqueUserCount()).to.equal(1);

            await factory.connect(user1).createQuestionnaire("Survey 2", 5, 10, 100);
            expect(await factory.uniqueUserCount()).to.equal(1);
        });
    });

    describe("Pagination Functions", function () {
        beforeEach(async function () {
            const { factory, user1, user2 } = await loadFixture(deployQuestionnaireFactoryFixture);

            // Create 5 questionnaires from user1 and 3 from user2
            await createMultipleQuestionnaires(factory, [user1, user2], [5, 3]);
        });

        describe("getQuestionnairesPaginated", function () {
            it("Should return paginated questionnaires correctly", async function () {
                const { factory } = await loadFixture(deployQuestionnaireFactoryFixture);
                await createMultipleQuestionnaires(factory, [(await ethers.getSigners())[0]], [8]);

                // Get first 3 questionnaires
                const [questionnaires1, totalCount1, hasMore1] = await factory.getQuestionnairesPaginated(0, 3);
                expect(questionnaires1).to.have.length(3);
                expect(totalCount1).to.equal(8);
                expect(hasMore1).to.be.true;

                // Get next 3 questionnaires
                const [questionnaires2, totalCount2, hasMore2] = await factory.getQuestionnairesPaginated(3, 3);
                expect(questionnaires2).to.have.length(3);
                expect(totalCount2).to.equal(8);
                expect(hasMore2).to.be.true;

                // Get last 2 questionnaires
                const [questionnaires3, totalCount3, hasMore3] = await factory.getQuestionnairesPaginated(6, 3);
                expect(questionnaires3).to.have.length(2);
                expect(totalCount3).to.equal(8);
                expect(hasMore3).to.be.false;
            });

            it("Should handle offset beyond total count", async function () {
                const { factory } = await loadFixture(deployQuestionnaireFactoryFixture);
                await createMultipleQuestionnaires(factory, [(await ethers.getSigners())[0]], [3]);

                const [questionnaires, totalCount, hasMore] = await factory.getQuestionnairesPaginated(10, 5);
                expect(questionnaires).to.have.length(0);
                expect(totalCount).to.equal(3);
                expect(hasMore).to.be.false;
            });

            it("Should handle empty questionnaire list", async function () {
                const { factory } = await loadFixture(deployQuestionnaireFactoryFixture);

                const [questionnaires, totalCount, hasMore] = await factory.getQuestionnairesPaginated(0, 5);
                expect(questionnaires).to.have.length(0);
                expect(totalCount).to.equal(0);
                expect(hasMore).to.be.false;
            });
        });

        describe("getQuestionnairesByUserPaginated", function () {
            it("Should return paginated user questionnaires correctly", async function () {
                const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);
                await createMultipleQuestionnaires(factory, [user1], [5]);

                // Get first 2 questionnaires from user1
                const [questionnaires1, totalCount1, hasMore1] = await factory.getQuestionnairesByUserPaginated(user1.address, 0, 2);
                expect(questionnaires1).to.have.length(2);
                expect(totalCount1).to.equal(5);
                expect(hasMore1).to.be.true;

                // Get next 2 questionnaires from user1
                const [questionnaires2, totalCount2, hasMore2] = await factory.getQuestionnairesByUserPaginated(user1.address, 2, 2);
                expect(questionnaires2).to.have.length(2);
                expect(totalCount2).to.equal(5);
                expect(hasMore2).to.be.true;

                // Get last 1 questionnaire from user1
                const [questionnaires3, totalCount3, hasMore3] = await factory.getQuestionnairesByUserPaginated(user1.address, 4, 2);
                expect(questionnaires3).to.have.length(1);
                expect(totalCount3).to.equal(5);
                expect(hasMore3).to.be.false;
            });

            it("Should handle user with no questionnaires", async function () {
                const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);

                const [questionnaires, totalCount, hasMore] = await factory.getQuestionnairesByUserPaginated(user1.address, 0, 5);
                expect(questionnaires).to.have.length(0);
                expect(totalCount).to.equal(0);
                expect(hasMore).to.be.false;
            });
        });

        describe("getQuestionnairesInRange", function () {
            it("Should return questionnaires in specified range", async function () {
                const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);
                await createMultipleQuestionnaires(factory, [user1], [6]);

                const questionnaires = await factory.getQuestionnairesInRange(1, 4);
                expect(questionnaires).to.have.length(3);
            });

            it("Should handle end index beyond array length", async function () {
                const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);
                await createMultipleQuestionnaires(factory, [user1], [3]);

                const questionnaires = await factory.getQuestionnairesInRange(1, 10);
                expect(questionnaires).to.have.length(2);
            });

            it("Should revert for invalid range", async function () {
                const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);
                await createMultipleQuestionnaires(factory, [user1], [3]);

                await expect(factory.getQuestionnairesInRange(3, 1))
                    .to.be.revertedWith("Invalid range");
            });

            it("Should revert for start index out of bounds", async function () {
                const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);
                await createMultipleQuestionnaires(factory, [user1], [3]);

                await expect(factory.getQuestionnairesInRange(5, 6))
                    .to.be.revertedWith("Start index out of bounds");
            });
        });

        describe("getLatestQuestionnaires", function () {
            it("Should return latest questionnaires in reverse order", async function () {
                const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);
                const createdQuestionnaires = await createMultipleQuestionnaires(factory, [user1], [5]);

                const latestQuestionnaires = await factory.getLatestQuestionnaires(3);
                expect(latestQuestionnaires).to.have.length(3);

                // Should be in reverse order (latest first)
                expect(latestQuestionnaires[0]).to.equal(createdQuestionnaires[4]);
                expect(latestQuestionnaires[1]).to.equal(createdQuestionnaires[3]);
                expect(latestQuestionnaires[2]).to.equal(createdQuestionnaires[2]);
            });

            it("Should handle limit greater than total questionnaires", async function () {
                const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);
                await createMultipleQuestionnaires(factory, [user1], [3]);

                const latestQuestionnaires = await factory.getLatestQuestionnaires(10);
                expect(latestQuestionnaires).to.have.length(3);
            });

            it("Should handle empty questionnaire list", async function () {
                const { factory } = await loadFixture(deployQuestionnaireFactoryFixture);

                const latestQuestionnaires = await factory.getLatestQuestionnaires(5);
                expect(latestQuestionnaires).to.have.length(0);
            });
        });
    });

    describe("Legacy Functions (Backward Compatibility)", function () {
        beforeEach(async function () {
            const { factory, user1, user2 } = await loadFixture(deployQuestionnaireFactoryFixture);
            await createMultipleQuestionnaires(factory, [user1, user2], [3, 2]);
        });

        it("Should return all questionnaires", async function () {
            const { factory } = await loadFixture(deployQuestionnaireFactoryFixture);
            const [user1] = await ethers.getSigners();
            await createMultipleQuestionnaires(factory, [user1], [5]);

            const allQuestionnaires = await factory.getQuestionnaires();
            expect(allQuestionnaires).to.have.length(5);
        });

        it("Should return questionnaires by user", async function () {
            const { factory, user1, user2 } = await loadFixture(deployQuestionnaireFactoryFixture);
            await createMultipleQuestionnaires(factory, [user1, user2], [3, 2]);

            const user1Questionnaires = await factory.getQuestionnairesByUser(user1.address);
            const user2Questionnaires = await factory.getQuestionnairesByUser(user2.address);

            expect(user1Questionnaires).to.have.length(3);
            expect(user2Questionnaires).to.have.length(2);
        });
    });

    describe("Edge Cases and Error Handling", function () {
        it("Should handle zero limits in pagination", async function () {
            const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);
            await createMultipleQuestionnaires(factory, [user1], [3]);

            const [questionnaires, totalCount, hasMore] = await factory.getQuestionnairesPaginated(0, 0);
            expect(questionnaires).to.have.length(0);
            expect(totalCount).to.equal(3);
            expect(hasMore).to.be.true;
        });

        it("Should handle large limits in pagination", async function () {
            const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);
            await createMultipleQuestionnaires(factory, [user1], [3]);

            const [questionnaires, totalCount, hasMore] = await factory.getQuestionnairesPaginated(0, 1000);
            expect(questionnaires).to.have.length(3);
            expect(totalCount).to.equal(3);
            expect(hasMore).to.be.false;
        });

        it("Should handle questionnaire creation with different parameters", async function () {
            const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);

            await factory.connect(user1).createQuestionnaire("Survey 1", 2, 1, 1); // scaleLimit valid
            await factory.connect(user1).createQuestionnaire("Survey 2", 10, 20, 1000); // valid
            await expect(
                factory.connect(user1).createQuestionnaire("Survey 3", 255, 50, 6544)
            ).to.be.reverted;

            expect(await factory.getQuestionnaireCount()).to.equal(2);
            expect(await factory.getQuestionnaireCountByUser(user1.address)).to.equal(2);
        });
    });

    describe("Gas Optimization Tests", function () {
        it("Should estimate gas for creating questionnaire", async function () {
            const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);

            const gasEstimate = await factory.connect(user1).createQuestionnaire.estimateGas(
                "Test Survey",
                5,
                10,
                100
            );

            expect(gasEstimate).to.be.greaterThan(0);
            console.log("Gas estimate for createQuestionnaire:", gasEstimate.toString());
        });

        it("Should compare gas usage between pagination methods", async function () {
            const { factory, user1 } = await loadFixture(deployQuestionnaireFactoryFixture);
            await createMultipleQuestionnaires(factory, [user1], [10]);

            // Gas estimate for paginated function
            const paginatedGas = await factory.getQuestionnairesPaginated.estimateGas(0, 5);

            // Gas estimate for non-paginated function
            const nonPaginatedGas = await factory.getQuestionnaires.estimateGas();

            console.log("Paginated gas:", paginatedGas.toString());
            console.log("Non-paginated gas:", nonPaginatedGas.toString());

            expect(paginatedGas).to.be.lessThan(nonPaginatedGas);
        });
    });
});

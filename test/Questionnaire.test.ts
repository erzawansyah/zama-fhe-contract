import { ethers } from "hardhat";
import { expect } from "chai";
import { Questionnaire, Questionnaire__factory } from "../typechain-types";
import { ContractFactory, Signer } from "ethers";

describe("Questionnaire", () => {
  let owner: Signer;
  let alice: Signer; // respondent 1
  let bob: Signer; // respondent 2
  let stranger: Signer; // non‑owner random
  let q: Questionnaire;

  // Konfigurasi umum
  const title = "Kuesioner Penelitian";
  const scaleLimit = 5;
  const questionLimit = 3;
  const respondentLimit = 2;
  const metadata = "bafybeigdyrnatabcd123";

  // Nilai enum status (lihat urutan pada kontrak)
  enum Status {
    Initialized,
    Draft,
    Published,
    Closed,
    Trashed,
  }

  before(async () => {
    [owner, alice, bob, stranger] = await ethers.getSigners();
  });

  const deploy = async (
    ttl = title,
    scale = scaleLimit,
    qLimit = questionLimit,
    rLimit = respondentLimit,
    signer = owner
  ) => {
    return await new Questionnaire__factory(signer).deploy(
      ttl,
      scale,
      qLimit,
      rLimit
    );
  };

  beforeEach(async () => {
    q = await deploy();
  });

  /* -------------------------------------------------------------------------- */
  /*                              1. Constructor                                */
  /* -------------------------------------------------------------------------- */

  describe("Inisialisasi & Constructor", () => {
    let factory: ContractFactory;

    beforeEach(async () => {
      factory = await ethers.getContractFactory("Questionnaire");
    });

    it("Berhasil deploy dengan parameter valid", async () => {
      expect(await q.title()).to.equal(title);
      expect(await q.scaleLimit()).to.equal(scaleLimit);
      expect(await q.questionLimit()).to.equal(questionLimit);
      expect(await q.respondentLimit()).to.equal(respondentLimit);
      expect(await q.status()).to.equal(Status.Initialized);
    });

    it("Gagal deploy: judul kosong", async () => {
      await expect(deploy("")).to.be.revertedWithCustomError(
        factory,
        "InvalidTitle"
      );
    });

    it("Gagal deploy: scaleLimit di luar 2‑10", async () => {
      await expect(deploy(title, 1)).to.be.revertedWithCustomError(
        factory,
        "InvalidScale"
      );
      await expect(deploy(title, 11)).to.be.revertedWithCustomError(
        factory,
        "InvalidScale"
      );
    });

    it("Gagal deploy: questionLimit 0 atau > 20", async () => {
      await expect(deploy(title, scaleLimit, 0)).to.be.revertedWithCustomError(
        factory,
        "InvalidQuestionLimit"
      );
      await expect(deploy(title, scaleLimit, 21)).to.be.revertedWithCustomError(
        factory,
        "InvalidQuestionLimit"
      );
    });

    it("Gagal deploy: respondentLimit 0", async () => {
      await expect(
        deploy(title, scaleLimit, questionLimit, 0)
      ).to.be.revertedWithCustomError(factory, "InvalidRespondentLimit");
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                             2. Fungsi Metadata                             */
  /* -------------------------------------------------------------------------- */

  describe("Fungsi setMetadata", () => {
    it("Berhasil dipanggil owner saat status Initialized", async () => {
      await expect(q.setMetadata(metadata))
        .to.emit(q, "MetadataUpdated")
        .withArgs(metadata);
      expect(await q.metadataCID()).to.equal(metadata);
    });

    it("Gagal bila bukan owner", async () => {
      await expect(
        q.connect(stranger).setMetadata(metadata)
      ).to.be.revertedWithCustomError(q, "OnlyOwner");
    });

    it("Gagal bila status bukan Initialized", async () => {
      // ubah status ke Draft
      await q.addQuestions(["Q1"]);
      await expect(q.setMetadata(metadata)).to.be.revertedWithCustomError(
        q,
        "StatusNotInitialized"
      );
    });

    it("Gagal bila metadata kosong", async () => {
      await expect(q.setMetadata("")).to.be.revertedWithCustomError(
        q,
        "QuestionnaireMetadataCIDEmpty"
      );
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                       3. Manajemen Pertanyaan & Status                     */
  /* -------------------------------------------------------------------------- */

  describe("Manajemen Pertanyaan", () => {
    it("Owner dapat menambah pertanyaan saat Initialized lalu status menjadi Draft", async () => {
      await expect(q.addQuestions(["Apa kabar?", "Bagaimana hari Anda?"]))
        .to.emit(q, "QuestionAdded")
        .withArgs(1, "Apa kabar?");

      expect(await q.totalQuestions()).to.equal(2);
      expect(await q.status()).to.equal(Status.Draft);
    });

    it("Gagal menambah pertanyaan bila bukan owner", async () => {
      await expect(
        q.connect(stranger).addQuestions(["Q1"])
      ).to.be.revertedWithCustomError(q, "OnlyOwner");
    });

    it("Gagal menambah pertanyaan jika status Draft/Published/Closed/Trashed", async () => {
      await q.addQuestions(["Q1"]);
      // sudah Draft
      await expect(q.addQuestions(["Q2"])).to.be.revertedWithCustomError(
        q,
        "StatusNotInitialized"
      );
      // paksa Published
      await q.publish();
      await expect(q.addQuestions(["Q3"])).to.be.revertedWithCustomError(
        q,
        "StatusNotInitialized"
      );
    });

    it("Gagal menambah pertanyaan kosong", async () => {
      await expect(q.addQuestions([""])).to.be.revertedWithCustomError(
        q,
        "EmptyQuestion"
      );
    });

    it("Gagal menambah pertanyaan melebihi limit", async () => {
      const many = Array(questionLimit + 1).fill("T");
      await expect(q.addQuestions(many)).to.be.revertedWithCustomError(
        q,
        "MaxQuestionsReached"
      );
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                              4. Transisi Status                            */
  /* -------------------------------------------------------------------------- */

  describe("Transisi Status", () => {
    beforeEach(async () => {
      await q.addQuestions(["Q1"]);
    });

    it("Publish hanya oleh owner dan jika ada pertanyaan", async () => {
      await expect(q.publish()).to.emit(q, "QuestionnairePublished");
      expect(await q.status()).to.equal(Status.Published);
    });

    it("Gagal publish oleh non‑owner", async () => {
      await expect(q.connect(stranger).publish()).to.be.revertedWithCustomError(
        q,
        "OnlyOwner"
      );
    });

    it("Gagal publish bila belum ada pertanyaan", async () => {
      const temp = await deploy();
      // Ubah status ke Draft secara manual (dengan menambah pertanyaan dummy lalu hapus semua pertanyaan jika perlu, atau langsung test publish pada status Draft tanpa pertanyaan)
      // Namun, pada kontrak, addQuestions akan langsung menambah pertanyaan, jadi kita tetap harus test pada contract baru (Initialized)
      // Jadi, expect error StatusNotDraft
      await expect(temp.publish()).to.be.revertedWithCustomError(
        temp,
        "StatusNotDraft"
      );
    });

    it("Close hanya oleh owner, status menjadi Closed", async () => {
      await q.publish();
      await expect(q.closeQuestionnaire()).to.emit(q, "QuestionnaireClosed");
      expect(await q.status()).to.equal(Status.Closed);
    });

    it("Delete hanya oleh owner dan hanya saat Initialized/Draft", async () => {
      // Initialized
      const tmp = await deploy();
      await expect(tmp.deleteQuestionnaire()).to.emit(
        tmp,
        "QuestionnaireDeleted"
      );
      expect(await tmp.status()).to.equal(Status.Trashed);

      // Draft
      await q.deleteQuestionnaire();
      expect(await q.status()).to.equal(Status.Trashed);

      // Published tidak boleh
      const p = await deploy();
      await p.addQuestions(["Q1"]);
      await p.publish();
      await expect(p.deleteQuestionnaire()).to.be.revertedWithCustomError(
        p,
        "CannotBeDeleted"
      );
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                              5. Submit Jawaban                             */
  /* -------------------------------------------------------------------------- */

  describe("Submit Responses", () => {
    beforeEach(async () => {
      await q.addQuestions(["Q1", "Q2", "Q3"]);
      await q.publish();
    });

    it("Berhasil submit jawaban valid", async () => {
      const answers = [3, 4, 5];
      await expect(q.connect(alice).submitResponses(answers)).to.emit(
        q,
        "ResponseSubmitted"
      );

      expect(await q.totalRespondents()).to.equal(1);
      const stored = await q
        .connect(alice)
        .getUserResponses(await alice.getAddress());
      expect(stored.map((n) => Number(n))).to.deep.equal(answers);
    });

    it("Gagal submit bila status bukan Published", async () => {
      await q.closeQuestionnaire();
      await expect(
        q.connect(alice).submitResponses([1, 2, 3])
      ).to.be.revertedWithCustomError(q, "StatusNotPublished");
    });

    it("Gagal submit lebih dari sekali", async () => {
      await q.connect(alice).submitResponses([1, 2, 3]);
      await expect(
        q.connect(alice).submitResponses([1, 2, 3])
      ).to.be.revertedWithCustomError(q, "AlreadyResponded");
    });

    it("Gagal jika jumlah jawaban tidak sama dengan total pertanyaan", async () => {
      await expect(
        q.connect(alice).submitResponses([1, 2])
      ).to.be.revertedWithCustomError(q, "ResponseCountMismatch");
    });

    it("Gagal bila jawaban di luar rentang", async () => {
      await expect(
        q.connect(alice).submitResponses([0, 2, 3])
      ).to.be.revertedWithCustomError(q, "ResponseOutOfRange");
      await expect(
        q.connect(alice).submitResponses([6, 2, 3])
      ).to.be.revertedWithCustomError(q, "ResponseOutOfRange");
    });

    it("Gagal submit jika respondentLimit tercapai dan status otomatis Closed", async () => {
      await q.connect(alice).submitResponses([1, 1, 1]);
      await expect(q.connect(bob).submitResponses([2, 2, 2])).to.emit(
        q,
        "QuestionnaireClosed"
      );
      expect(await q.status()).to.equal(Status.Closed);

      // percobaan responder baru setelah closed
      const charlie = (await ethers.getSigners())[4];
      await expect(
        q.connect(charlie).submitResponses([3, 3, 3])
      ).to.be.revertedWithCustomError(q, "StatusNotPublished");
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                         6. Query & Statistik                                */
  /* -------------------------------------------------------------------------- */

  describe("Query & Statistik", () => {
    beforeEach(async () => {
      await q.addQuestions(["Q1", "Q2"]);
      await q.publish();

      // Alice [3,5], Bob [5,1]
      await q.connect(alice).submitResponses([3, 5]);
      await q.connect(bob).submitResponses([5, 1]);
    });

    it("getAllQuestions mengembalikan urutan benar", async () => {
      const list = await q.getAllQuestions();
      expect(list).to.deep.equal(["Q1", "Q2"]);
    });

    it("getUserResponses mengembalikan jawaban benar", async () => {
      const resAlice = await q
        .connect(alice)
        .getUserResponses(await alice.getAddress());
      expect(resAlice.map((n) => Number(n))).to.deep.equal([3, 5]);
    });

    it("Fungsi statistik mengembalikan nilai tepat", async () => {
      // Question 1
      expect(await q.getQuestionAverage(1)).to.equal(4); // (3+5)/2
      expect(await q.getQuestionMin(1)).to.equal(3);
      expect(await q.getQuestionMax(1)).to.equal(5);
      expect(await q.getQuestionStandardDeviation(1)).to.equal(1); // √1

      // Question 2
      expect(await q.getQuestionAverage(2)).to.equal(3);
      expect(await q.getQuestionMin(2)).to.equal(1);
      expect(await q.getQuestionMax(2)).to.equal(5);
      expect(await q.getQuestionStandardDeviation(2)).to.equal(2); // √4
    });

    it("Fungsi statistik gagal untuk questionId tidak valid", async () => {
      await expect(q.getQuestionAverage(3)).to.be.revertedWithCustomError(
        q,
        "InvalidQuestionId"
      );
    });

    it("Fungsi statistik mengembalikan 0 jika belum ada responden", async () => {
      const fresh = await deploy();
      await fresh.addQuestions(["Q1"]);
      await fresh.publish();
      expect(await fresh.getQuestionAverage(1)).to.equal(0);
      expect(await fresh.getQuestionStandardDeviation(1)).to.equal(0);
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                        7. Error Handling Umum & Event                      */
  /* -------------------------------------------------------------------------- */

  describe("Error dan Event tambahan", () => {
    it("OnlyOwner terpicu pada semua fungsi privileged", async () => {
      await expect(
        q.connect(stranger).setMetadata("x")
      ).to.be.revertedWithCustomError(q, "OnlyOwner");

      await expect(
        q.connect(stranger).addQuestions(["Q1"])
      ).to.be.revertedWithCustomError(q, "OnlyOwner");

      await expect(q.connect(stranger).publish()).to.be.revertedWithCustomError(
        q,
        "OnlyOwner"
      );
    });

    it("Event QuestionnaireCreated teremit di constructor", async () => {
      const tx = q.deploymentTransaction()!;
      const receipt = await tx.wait();
      const log =
        receipt && receipt.logs
          ? receipt.logs.find(
            (l) =>
              (q.interface.parseLog?.(l)?.name ?? "") ===
              "QuestionnaireCreated"
          )
          : undefined;
      expect(log).to.not.be.undefined;
    });
  });
});

import { expect, test, describe, beforeAll, afterAll } from "@jest/globals";
import { DOCUMENTS, EMBEDDINGS, IDS } from "./data";
import { METADATAS } from "./data";
import { IncludeEnum } from "../src/types";
import { OpenAIEmbeddingFunction } from "../src/embeddings/OpenAIEmbeddingFunction";
import { CohereEmbeddingFunction } from "../src/embeddings/CohereEmbeddingFunction";
import { OllamaEmbeddingFunction } from "../src/embeddings/OllamaEmbeddingFunction";
import { InvalidCollectionError } from "../src/Errors";
import { startChromaContainer } from "./environmentSetup";
import { ChromaClient } from "../src/ChromaClient";
import { StartedTestContainer } from "testcontainers";

describe("add collections", () => {
  let client: ChromaClient;
  let container: StartedTestContainer;

  beforeAll(async () => {
    ({ client, container } = await startChromaContainer());
  }, 120_000);
  afterAll(async () => {
    await container.stop();
  });

  test("it should add single embeddings to a collection", async () => {
    await client.reset();
    const collection = await client.createCollection({ name: "test" });
    const id = "test1";
    const embedding = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const metadata = { test: "test" };
    await client.addRecords(collection, {
      ids: id,
      embeddings: embedding,
      metadatas: metadata,
    });
    const count = await client.countRecords(collection);
    expect(count).toBe(1);
    var res = await client.getRecords(collection, {
      ids: id,
      include: [IncludeEnum.Embeddings],
    });
    expect(res.embeddings?.[0]).toEqual(embedding);
  });

  test("it should add batch embeddings to a collection", async () => {
    await client.reset();
    const collection = await client.createCollection({ name: "test" });
    await client.addRecords(collection, {
      ids: IDS,
      embeddings: EMBEDDINGS,
      documents: DOCUMENTS,
    });
    const count = await client.countRecords(collection);
    expect(count).toBe(3);
    var res = await client.getRecords(collection, {
      include: [IncludeEnum.Embeddings],
    });
    expect(res.embeddings).toEqual(EMBEDDINGS);
  });

  if (!process.env.OPENAI_API_KEY) {
    test.skip("it should add OpenAI embeddings", async () => {});
  } else {
    test("it should add OpenAI embeddings", async () => {
      await client.reset();
      const embedder = new OpenAIEmbeddingFunction({
        openai_api_key: process.env.OPENAI_API_KEY || "",
      });
      const collection = await client.createCollection({
        name: "test",
        embeddingFunction: embedder,
      });
      const embeddings = await embedder.generate(DOCUMENTS);
      await client.addRecords(collection, { ids: IDS, embeddings: embeddings });
      const count = await client.countRecords(collection);
      expect(count).toBe(3);
      var res = await client.getRecords(collection, {
        ids: IDS,
        include: [IncludeEnum.Embeddings],
      });
      expect(res.embeddings).toEqual(embeddings); // reverse because of the order of the ids
    });
  }

  if (!process.env.COHERE_API_KEY) {
    test.skip("it should add Cohere embeddings", async () => {});
  } else {
    test("it should add Cohere embeddings", async () => {
      await client.reset();
      const embedder = new CohereEmbeddingFunction({
        cohere_api_key: process.env.COHERE_API_KEY || "",
      });
      const collection = await client.createCollection({
        name: "test",
        embeddingFunction: embedder,
      });
      const embeddings = await embedder.generate(DOCUMENTS);
      await client.addRecords(collection, { ids: IDS, embeddings: embeddings });
      const count = await client.countRecords(collection);
      expect(count).toBe(3);
      var res = await client.getRecords(collection, {
        ids: IDS,
        include: [IncludeEnum.Embeddings],
      });
      expect(res.embeddings).toEqual(embeddings); // reverse because of the order of the ids
    });
  }

  test("add documents", async () => {
    await client.reset();
    const collection = await client.createCollection({ name: "test" });
    await client.addRecords(collection, {
      ids: IDS,
      embeddings: EMBEDDINGS,
      documents: DOCUMENTS,
    });
    const results = await client.getRecords(collection, { ids: "test1" });
    expect(results.documents[0]).toBe("This is a test");
  });

  test("should error on non existing collection", async () => {
    await client.reset();
    const collection = await client.createCollection({ name: "test" });
    await client.deleteCollection({ name: "test" });
    expect(async () => {
      await client.addRecords(collection, { ids: IDS, embeddings: EMBEDDINGS });
    }).rejects.toThrow(InvalidCollectionError);
  });

  test("It should return an error when inserting duplicate IDs in the same batch", async () => {
    await client.reset();
    const collection = await client.createCollection({ name: "test" });
    const ids = IDS.concat(["test1"]);
    const embeddings = EMBEDDINGS.concat([[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]);
    const metadatas = METADATAS.concat([{ test: "test1", float_value: 0.1 }]);
    try {
      await client.addRecords(collection, { ids, embeddings, metadatas });
    } catch (e: any) {
      expect(e.message).toMatch("duplicates");
    }
  });

  test("should error on empty embedding", async () => {
    await client.reset();
    const collection = await client.createCollection({ name: "test" });
    const ids = ["id1"];
    const embeddings = [[]];
    const metadatas = [{ test: "test1", float_value: 0.1 }];
    try {
      await client.addRecords(collection, { ids, embeddings, metadatas });
    } catch (e: any) {
      expect(e.message).toMatch("got empty embedding at pos");
    }
  });

  if (!process.env.OLLAMA_SERVER_URL) {
    test.skip("it should use ollama EF, OLLAMA_SERVER_URL not defined", async () => {});
  } else {
    test("it should use ollama EF", async () => {
      await client.reset();
      const embedder = new OllamaEmbeddingFunction({
        url:
          process.env.OLLAMA_SERVER_URL ||
          "http://127.0.0.1:11434/api/embeddings",
        model: "nomic-embed-text",
      });
      const collection = await client.createCollection({
        name: "test",
        embeddingFunction: embedder,
      });
      const embeddings = await embedder.generate(DOCUMENTS);
      await client.addRecords(collection, { ids: IDS, embeddings: embeddings });
      const count = await client.countRecords(collection);
      expect(count).toBe(3);
      var res = await client.getRecords(collection, {
        ids: IDS,
        include: [IncludeEnum.Embeddings],
      });
      expect(res.embeddings).toEqual(embeddings); // reverse because of the order of the ids
    });
  }
});

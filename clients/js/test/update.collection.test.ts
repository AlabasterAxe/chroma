import { expect, test } from "@jest/globals";
import chroma from "./initClient";
import { IncludeEnum } from "../src/types";
import { IDS, DOCUMENTS, EMBEDDINGS, METADATAS } from "./data";
import { InvalidCollectionError } from "../src/Errors";

test("it should get embedding with matching documents", async () => {
  await chroma.reset();
  const collection = await chroma.createCollection({ name: "test" });
  await chroma.addRecords(collection, {
    ids: IDS,
    embeddings: EMBEDDINGS,
    metadatas: METADATAS,
    documents: DOCUMENTS,
  });

  const results = await chroma.getRecords(collection, {
    id: "test1",
    include: [
      IncludeEnum.Embeddings,
      IncludeEnum.Metadatas,
      IncludeEnum.Documents,
    ],
  });

  expect(results?.embedding).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  await chroma.updateRecords(collection, {
    ids: ["test1"],
    embeddings: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 11]],
    metadatas: [{ test: "test1new" }],
    documents: ["doc1new"],
  });

  const results2 = await chroma.getRecords(collection, {
    id: "test1",
    include: [
      IncludeEnum.Embeddings,
      IncludeEnum.Metadatas,
      IncludeEnum.Documents,
    ],
  });
  expect(results2?.embedding).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 11]);
  expect(results2.metadata).toEqual({ test: "test1new", float_value: -2 });
  expect(results2.document).toEqual("doc1new");
});

test("should error on non existing collection", async () => {
  await chroma.reset();
  const collection = await chroma.createCollection({ name: "test" });
  await chroma.deleteCollection({ name: "test" });
  expect(async () => {
    await chroma.updateRecords(collection, {
      ids: ["test1"],
      embeddings: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 11]],
      metadatas: [{ test: "meta1" }],
      documents: ["doc1"],
    });
  }).rejects.toThrow(InvalidCollectionError);
});

// this currently fails
// test("it should update metadata or documents to array of Nones", async () => {
//   await chroma.reset();
//   const collection = await chroma.createCollection({ name: "test" });
//   await collection.add({ ids: IDS, embeddings: EMBEDDINGS, metadatas: METADATAS, documents: DOCUMENTS });

//   await collection.update({
//     ids: ["test1"],
//     metadatas: [undefined],
//   });

//   const results3 = await collection.get({
//     ids: ["test1"],
//     include: [
//       IncludeEnum.Embeddings,
//       IncludeEnum.Metadatas,
//       IncludeEnum.Documents,
//     ]
//   });
//   expect(results3).toBeDefined();
//   expect(results3).toBeInstanceOf(Object);
//   expect(results3.metadatas[0]).toEqual({});
// });

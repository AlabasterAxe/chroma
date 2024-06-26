import { IEmbeddingFunction } from "./embeddings/IEmbeddingFunction";
import {
  BaseChromaDoc,
  ChromaDoc,
  DocQuery,
  EmbeddingDoc,
  Metadata,
  QueryDoc,
} from "./types";

export function docsToParallelArrays(documents: ChromaDoc[]) {
  const result = {
    ids: [] as (string | undefined)[],
    embeddings: [] as (number[] | undefined)[],
    documents: [] as (string | undefined)[],
    metadatas: [] as (Metadata | undefined)[],
  };
  const idSet = new Set();
  const duplicateIds = new Set();
  for (const doc of documents) {
    if (idSet.has(doc.id)) {
      duplicateIds.add(doc.id);
      continue;
    }

    if (duplicateIds.size > 0) {
      continue;
    }
    result.ids.push(doc.id);
    result.embeddings.push(doc.embedding);
    result.documents.push(doc.contents);
    result.metadatas.push(doc.metadata);
  }

  if (duplicateIds.size > 0) {
    throw new Error(`Duplicate ids found: ${[...duplicateIds].join(", ")}`);
  }

  return result;
}

export function parallelArraysToDocs({
  ids,
  embeddings,
  documents,
  metadatas,
}: {
  ids: string[];
  embeddings?: number[][];
  documents?: string[];
  metadatas?: any[];
}): ChromaDoc[] {
  if (
    (embeddings && ids.length !== embeddings.length) ||
    (metadatas && ids.length !== metadatas.length) ||
    (documents && ids.length !== documents.length)
  ) {
    throw new Error(
      "ids, embeddings, metadatas, and documents must all be the same length"
    );
  }

  return ids.map((id, index) => ({
    id,
    embedding: embeddings?.[index],
    contents: documents?.[index],
    metadata: metadatas?.[index],
  }));
}

export async function computeEmbeddings<T extends BaseChromaDoc>(
  documents: T[],
  embeddingFunction: IEmbeddingFunction
): Promise<(T & EmbeddingDoc)[]> {
  const docsWithoutContentsOrEmbeddings = documents.filter(
    (doc) => !doc.contents && !doc.embedding
  );

  if (docsWithoutContentsOrEmbeddings.length > 0) {
    throw new Error(
      "The following documents have neither contents nor embeddings: " +
        docsWithoutContentsOrEmbeddings.map((doc) => doc.id).join(", ")
    );
  }

  const docsMissingEmbeddings = documents.filter(
    (doc) => !doc.embedding
  ) as (ChromaDoc & { contents: string })[];

  if (docsMissingEmbeddings.length === 0) {
    return documents as (T & EmbeddingDoc)[];
  }
  const embeddings = await embeddingFunction.generate(
    docsMissingEmbeddings.map((doc) => doc.contents)
  );

  docsMissingEmbeddings.map((doc, index) => {
    doc.embedding = embeddings[index];
  });

  return documents as (T & EmbeddingDoc)[];
}

export function docQueryToQueryDoc(query: DocQuery): QueryDoc {
  if (Array.isArray(query)) {
    return { embedding: query };
  }

  if (typeof query === "string") {
    return { contents: query };
  }

  return query;
}

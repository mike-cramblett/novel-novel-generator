interface Document {
  id: string;
  text: string;
  metadata: Record<string, any>;
}

// A simple in-memory vector DB simulation for RAG.
// In a real application, this would use a proper vector database
// like ChromaDB, Pinecone, or a managed service.
class VectorDB {
  private documents: Document[] = [];

  // Simple keyword-based scoring for simulation purposes.
  private score(docText: string, queryTerms: Set<string>): number {
    const docTerms = new Set(docText.toLowerCase().match(/\w+/g) || []);
    let score = 0;
    for (const term of queryTerms) {
      if (docTerms.has(term)) {
        score++;
      }
    }
    return score;
  }

  async addDocument(id: string, text: string, metadata: Record<string, any>): Promise<void> {
    // In a real vector DB, this step would involve
    // calling an embedding model to convert 'text' to a vector.
    const existingDocIndex = this.documents.findIndex(doc => doc.id === id);
    const doc = { id, text, metadata };
    if (existingDocIndex > -1) {
      this.documents[existingDocIndex] = doc;
    } else {
      this.documents.push(doc);
    }
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.find(doc => doc.id === id);
  }
  
  async query(queryText: string, topK: number): Promise<Document[]> {
    const queryTerms = new Set(queryText.toLowerCase().match(/\w+/g) || []);
    if (queryTerms.size === 0) {
      // Fallback for empty query
      return this.documents.slice(-topK);
    }
    
    const scoredDocs = this.documents.map(doc => ({
      ...doc,
      score: this.score(doc.text, queryTerms),
    }));

    scoredDocs.sort((a, b) => b.score - a.score);
    
    return scoredDocs.slice(0, topK);
  }

  async clear(): Promise<void> {
    this.documents = [];
  }
}

export const vectorDB = new VectorDB();
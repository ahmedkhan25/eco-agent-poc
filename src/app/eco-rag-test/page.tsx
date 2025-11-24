'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

interface Source {
  doc_id: string;
  title: string;
  page: number;
  s3_pdf_key?: string;
  distance: number;
}

interface RAGResponse {
  answer: string;
  sources: Source[];
  query: string;
  processingTimeMs: number;
}

export default function EcoRAGTestPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RAGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/eco-rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          topK: 5,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to query RAG endpoint');
      }

      const data: RAGResponse = await res.json();
      setResponse(data);
    } catch (err) {
      console.error('RAG query error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    "What are the neighborhood centers in Olympia?",
    "What is Olympia's approach to climate change?",
    "Tell me about Olympia's sea level rise planning",
    "What are the major transportation projects planned?",
    "What is the city's budget for 2025?",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-800 dark:text-green-400 mb-2">
            🌱 Olympia Eco-RAG
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Ask questions about Olympia&apos;s city planning, environmental initiatives, and municipal operations
          </p>
        </div>

        {/* Query Form */}
        <Card className="mb-8 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle>Ask a Question</CardTitle>
            <CardDescription>
              Query information from 26+ official Olympia city planning documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g., What are the neighborhood centers in Olympia?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !query.trim()}>
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {/* Example Queries */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Example queries:</p>
                <div className="flex flex-wrap gap-2">
                  {exampleQueries.map((example, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery(example)}
                      disabled={loading}
                      className="text-xs"
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardHeader>
              <CardTitle className="text-red-800 dark:text-red-400">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Response Display */}
        {response && (
          <div className="space-y-6">
            {/* Answer */}
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Answer</span>
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    {response.processingTimeMs}ms
                  </span>
                </CardTitle>
                <CardDescription>Based on official Olympia city documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-green dark:prose-invert max-w-none">
                  <ReactMarkdown>{response.answer}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Sources */}
            {response.sources.length > 0 && (
              <Card className="border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle>Sources ({response.sources.length})</CardTitle>
                  <CardDescription>Referenced documents and pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {response.sources.map((source, idx) => (
                      <div
                        key={idx}
                        className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-r"
                      >
                        <div className="font-semibold text-blue-900 dark:text-blue-300">
                          {source.title}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Page {source.page} • Distance: {source.distance.toFixed(4)}
                        </div>
                        {source.s3_pdf_key && (
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {source.s3_pdf_key}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-8 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-sm">About this Demo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              This RAG (Retrieval-Augmented Generation) system searches through official City of Olympia
              planning documents including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Comprehensive Plans &amp; Environmental Impact Statements</li>
              <li>Budget &amp; Financial Reports</li>
              <li>Climate Risk &amp; Sea Level Rise Plans</li>
              <li>Transportation &amp; Urban Forestry Plans</li>
              <li>Water System &amp; Stormwater Management Plans</li>
              <li>Housing Action Plans &amp; Strategic Plans</li>
            </ul>
            <p className="pt-2">
              <strong>Technology:</strong> OpenAI Embeddings (text-embedding-3-small) + AWS S3 Vectors + GPT-4o
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


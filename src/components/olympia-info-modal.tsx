"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, FileText, Globe } from 'lucide-react';
import inventory from '@/data/inventory.json';

interface OlympiaInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Categorize documents
const categorizeDocuments = () => {
  const categories: Record<string, typeof inventory.files> = {
    'Climate & Environment': [],
    'Planning & Development': [],
    'Budget & Finance': [],
    'Transportation & Infrastructure': [],
    'Public Safety': [],
    'Other Municipal Plans': [],
  };

  inventory.files.forEach(file => {
    const title = file.excel_title.toLowerCase();
    
    if (title.includes('climate') || title.includes('greenhouse') || title.includes('sea level') || 
        title.includes('water') || title.includes('stormwater') || title.includes('forestry') || 
        title.includes('green belt')) {
      categories['Climate & Environment'].push(file);
    } else if (title.includes('comprehensive plan') || title.includes('housing') || 
               title.includes('neighborhood') || title.includes('participation')) {
      categories['Planning & Development'].push(file);
    } else if (title.includes('budget') || title.includes('financial') || title.includes('capital')) {
      categories['Budget & Finance'].push(file);
    } else if (title.includes('transportation') || title.includes('street')) {
      categories['Transportation & Infrastructure'].push(file);
    } else if (title.includes('emergency') || title.includes('hazard') || title.includes('police')) {
      categories['Public Safety'].push(file);
    } else {
      categories['Other Municipal Plans'].push(file);
    }
  });

  return categories;
};

export function OlympiaInfoModal({ isOpen, onClose }: OlympiaInfoModalProps) {
  const categories = categorizeDocuments();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden pointer-events-auto border border-gray-200 dark:border-gray-800"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-700 dark:to-emerald-700 p-6 relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                
                <h2 className="text-2xl font-semibold text-white mb-2">
                  City of Olympia AI Researcher
                </h2>
                <p className="text-blue-100 text-sm">
                  Advanced AI-powered research assistant for Olympia city planning and climate action
                </p>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6">
                {/* Introduction */}
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    What is this?
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                    This AI researcher combines advanced language models with retrieval-augmented generation (RAG) 
                    to provide intelligent insights from official City of Olympia documents. It can:
                  </p>
                  <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1 ml-4 list-disc">
                    <li>Search and analyze 26 indexed city planning documents</li>
                    <li>Execute Python code for data analysis and calculations</li>
                    <li>Create charts and visualizations from data</li>
                    <li>Perform web searches for supplementary information</li>
                    <li>Provide cited, verifiable answers with source references</li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                    <a
                      href="https://eco-arch.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Learn more about Ecoheart
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Document Categories */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Indexed Documents ({inventory.files.length} total)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Click any document to view the original PDF from the City of Olympia website.
                  </p>
                </div>

                {/* Categories */}
                <div className="space-y-6">
                  {Object.entries(categories).map(([category, docs]) => {
                    if (docs.length === 0) return null;
                    
                    return (
                      <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          {category} ({docs.length})
                        </h4>
                        <ul className="space-y-2">
                          {docs.map((doc, idx) => (
                            <li key={idx}>
                              <a
                                href={doc.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-start gap-2 group"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                                <span className="flex-1">{doc.excel_title}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {/* Metadata */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Document index last updated: {new Date(inventory.metadata.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Start Researching
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


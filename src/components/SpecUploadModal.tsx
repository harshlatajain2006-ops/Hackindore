/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Upload, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { SAMPLE_SPECS } from '../data/sampleSpecs';

interface SpecUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCustomSpec: (rawSpec: string, title?: string) => void;
  onSelectPreloaded: (key: string) => void;
}

export const SpecUploadModal: React.FC<SpecUploadModalProps> = ({
  isOpen,
  onClose,
  onLoadCustomSpec,
  onSelectPreloaded
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'preset'>('preset');
  const [pastedJson, setPastedJson] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        onLoadCustomSpec(content, file.name);
        onClose();
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || 'Invalid OpenAPI format');
      }
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    if (!pastedJson.trim()) {
      setErrorMsg('Please paste an OpenAPI or Swagger JSON specification.');
      return;
    }
    try {
      onLoadCustomSpec(pastedJson);
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Invalid OpenAPI format');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Select or Upload Target API Specification
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-950/60">
          <button
            onClick={() => setActiveTab('preset')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'preset'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Vulnerable Target Presets
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'paste'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload / Paste Custom Spec
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'preset' ? (
            <div className="space-y-3">
              <p className="text-slate-400">
                Choose an authorized benchmark vulnerable API specification to audit and traverse:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {Object.values(SAMPLE_SPECS).map((spec) => (
                  <div
                    key={spec.id}
                    onClick={() => {
                      onSelectPreloaded(spec.id);
                      onClose();
                    }}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white group-hover:text-red-400 transition-colors">
                          {spec.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                          {spec.version}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {spec.industry}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {spec.description}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-400 group-hover:text-white shrink-0">
                      {spec.endpoints.length} Endpoints →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File upload drag/drop box */}
              <label className="border-2 border-dashed border-slate-700 hover:border-red-500/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40 text-center">
                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                <span className="font-semibold text-white">Click to select OpenAPI file</span>
                <span className="text-slate-500 text-[11px] mt-0.5">Supports OpenAPI 3.0 / Swagger JSON (.json)</span>
                <input
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Paste JSON */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">
                  Or paste raw OpenAPI JSON schema:
                </label>
                <textarea
                  rows={8}
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  placeholder='{"openapi": "3.0.0", "info": {"title": "My API"}, "paths": {...}}'
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasteSubmit}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors shadow-sm"
                >
                  Parse &amp; Run Audit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

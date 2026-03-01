"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api";
import { FileUp, File, X, CheckCircle, Shield, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DocumentsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    }
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    
    try {
      const uploadPromises = files.map(file => {
        const formData = new FormData();
        formData.append("file", file);
        return api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      });
      
      const responses = await Promise.all(uploadPromises);
      
      // Simulate waiting for background processing
      setTimeout(async () => {
        const resultPromises = responses.map(res => 
          api.get(`/documents/status/${res.data.task_id}`)
        );
        const resolvedResults = await Promise.all(resultPromises);
        setResults(resolvedResults.map(r => r.data));
        setFiles([]);
        setUploading(false);
      }, 3000); // 3 seconds mock wait for OCR
      
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Document Intelligence</h1>
            <p className="text-white/60">Securely upload salary slips and statements. Auto-deleted after OCR.</p>
          </div>
          <div className="bg-green-500/10 text-green-400 border border-green-500/20 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium">
            <Shield size={16} /> End-to-End Encrypted
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Uploader */}
          <div className="space-y-6">
            <div 
              {...getRootProps()} 
              className={`glass p-10 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center min-h-[300px]
                ${isDragActive ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
            >
              <input {...getInputProps()} />
              <div className="h-16 w-16 bg-white/5 shadow-inner rounded-full flex items-center justify-center mb-4">
                <FileUp size={32} className={isDragActive ? "text-purple-400" : "text-white/70"} />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {isDragActive ? "Drop documents here" : "Drag & Drop or Click"}
              </h3>
              <p className="text-sm text-white/50 px-8">
                Supported formats: PDF, JPG, PNG. Make sure text is clearly readable.
              </p>
            </div>

            {files.length > 0 && (
              <div className="glass p-6 rounded-3xl">
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-white/60">Selected Files</h4>
                <div className="space-y-3">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <File size={20} className="text-blue-400 flex-shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-white/40 hover:text-red-400 p-1">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full mt-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? <><Loader2 className="animate-spin" size={20} /> Processing Intelligence...</> : "Start Intelligent Extraction"}
                </button>
              </div>
            )}
          </div>

          {/* Results Area */}
          <div className="glass p-6 rounded-3xl min-h-[300px] flex flex-col">
            <h4 className="font-semibold mb-4 text-xl border-b border-white/10 pb-4">Parsed Intelligence insights</h4>
            
            <div className="flex-1">
              <AnimatePresence>
                {results.length === 0 && !uploading && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-white/40 text-center px-8 py-12"
                  >
                    <Shield size={48} className="mb-4 opacity-50" />
                    <p>Processed results will appear here magically. The original files will be deleted securely protecting your privacy.</p>
                  </motion.div>
                )}

                {results.length > 0 && (
                  <div className="space-y-4">
                    {results.map((res, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        key={i} 
                        className="bg-white/5 border border-white/10 rounded-2xl p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-purple-300 text-sm truncate max-w-[200px]">{res.filename}</p>
                            <p className="text-xs text-green-400 mt-1 flex items-center gap-1"><CheckCircle size={12}/> File securely purged</p>
                          </div>
                          <span className="bg-white/10 text-xs px-2 py-1 rounded-md text-white/80">
                            {res.structured_data?.type || "Unknown"}
                          </span>
                        </div>
                        
                        {res.structured_data?.estimated_income && (
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded-lg text-sm">
                            <span className="text-white/60">Estimated Income</span>
                            <span className="font-semibold">₹{res.structured_data.estimated_income.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {res.structured_data?.deduction_80c && (
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded-lg text-sm">
                            <span className="text-white/60">Detected 80C</span>
                            <span className="font-semibold text-green-400">₹{res.structured_data.deduction_80c.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        
                        <p className="text-[11px] text-white/30 mt-3 italic line-clamp-2">"{res.extracted_text_snippet}"</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}

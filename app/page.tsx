/*eslint-disable */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText, MessageSquare, Download, CheckCircle2, XCircle, Loader2, AlertCircle, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

interface Placeholder {
  key: string;
  value: string;
  filled: boolean;
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp?: Date;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documentHtml, setDocumentHtml] = useState<string | null>(null);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [originalFileData, setOriginalFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [generating, setGenerating] = useState(false);
  const [completedFile, setCompletedFile] = useState<string | null>(null);
  const [completedFileName, setCompletedFileName] = useState<string>('');
  const [completedHtml, setCompletedHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
  };

  const truncateFileName = (fileName: string, maxLength: number = 50) => {
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncateLength = Math.max(10, maxLength - extension.length - 3); // -3 for "...", min 10 chars for name
    const start = nameWithoutExt.substring(0, Math.floor(truncateLength / 2));
    const end = nameWithoutExt.substring(nameWithoutExt.length - Math.floor(truncateLength / 2));
    return `${start}...${end}${extension}`;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.docx')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload a .docx file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const data = await response.json();
      setDocumentHtml(data.html);

      // Convert file to base64 for later use
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setOriginalFileData(base64Data);
      };
      reader.readAsDataURL(file);

      // Initialize placeholders
      const initialPlaceholders: Placeholder[] = data.placeholders.map(
        (key: string) => ({
          key,
          value: '',
          filled: false,
        })
      );
      setPlaceholders(initialPlaceholders);
      setFileName(data.fileName);

      // Start conversation
      if (initialPlaceholders.length > 0) {
        const firstMessage: Message = {
          role: 'assistant',
          content: `I found ${initialPlaceholders.length} placeholder${initialPlaceholders.length > 1 ? 's' : ''} in your document. Let's fill them in one by one. 

What should I fill in for "${initialPlaceholders[0].key}"?`,
          timestamp: new Date(),
        };
        setMessages([firstMessage]);
        setCurrentPlaceholderIndex(0);
      } else {
        const message: Message = {
          role: 'assistant',
          content: 'Your document has been uploaded successfully. No placeholders were found in the document.',
          timestamp: new Date(),
        };
        setMessages([message]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!inputValue.trim() || currentPlaceholderIndex >= placeholders.length) {
      return;
    }

    // Update placeholder value
    const updatedPlaceholders = [...placeholders];
    updatedPlaceholders[currentPlaceholderIndex].value = inputValue.trim();
    updatedPlaceholders[currentPlaceholderIndex].filled = true;
    setPlaceholders(updatedPlaceholders);

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Check if there are more placeholders
    const nextIndex = currentPlaceholderIndex + 1;
    if (nextIndex < placeholders.length) {
      const assistantMessage: Message = {
        role: 'assistant',
        content: `Great! Now, what should I fill in for "${placeholders[nextIndex].key}"?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentPlaceholderIndex(nextIndex);
    } else {
      // All placeholders filled
      const assistantMessage: Message = {
        role: 'assistant',
        content: `Perfect! I've collected all the information. You can now proceed to generate your completed document.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }

    setInputValue('');
  };

  const handleGenerateDocument = async () => {
    if (!originalFileData) return;

    setGenerating(true);
    setError(null);
    try {
      const placeholderMap: Record<string, string> = {};
      placeholders.forEach((p) => {
        placeholderMap[p.key] = p.value;
      });

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalFile: originalFileData,
          placeholders: placeholderMap,
          fileName: fileName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate document');
      }

      const data = await response.json();
      setCompletedFile(data.file);
      setCompletedFileName(data.fileName);
      setCompletedHtml(data.html || null); // Store completed HTML preview

      const assistantMessage: Message = {
        role: 'assistant',
        content: '✅ Your document has been generated successfully! You can now download it.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Generate error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate document. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!completedFile || !completedFileName) return;

    const binaryString = atob(completedFile);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = completedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const allPlaceholdersFilled = placeholders.length > 0 && placeholders.every((p) => p.filled);
  const filledCount = placeholders.filter((p) => p.filled).length;
  const progressPercentage = placeholders.length > 0 ? (filledCount / placeholders.length) * 100 : 0;

  // Determine current step
  const getCurrentStep = () => {
    if (completedFile) return 3; // Download
    if (allPlaceholdersFilled && placeholders.length > 0) return 2; // Generate
    if (documentHtml && placeholders.length > 0) return 1; // Fill Placeholders
    return 0; // Upload
  };

  const currentStep = getCurrentStep();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center gap-3 justify-center mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="size-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Legal Document Filler
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Upload your legal document template and fill in placeholders through an intuitive conversational interface
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="shrink-0"
            >
              <XCircle className="size-4" />
            </Button>
          </div>
        )}

        {/* Step 0: Upload Document */}
        {currentStep === 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="border rounded-xl p-8 bg-card shadow-lg">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4">
                  <Upload className="size-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Step 1: Upload Your Document</h2>
                <p className="text-muted-foreground">
                  Select a .docx file with placeholders to get started
                </p>
              </div>

              <div className="space-y-6">
                <div
                  className={`border-2 border-dashed rounded-lg p-12 transition-colors relative ${dragActive
                    ? 'border-primary bg-primary/5'
                    : file
                      ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {/* Remove file button */}
                  {file && (
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute top-4 right-4 p-2 rounded-full bg-background border border-border hover:bg-destructive/10 hover:border-destructive/50 transition-colors group"
                      aria-label="Remove file"
                    >
                      <XCircle className="size-5 text-muted-foreground group-hover:text-destructive transition-colors" />
                    </button>
                  )}

                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className={`p-4 rounded-full ${file ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                      <Upload className={`size-12 ${file ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="text-center w-full max-w-lg px-4">
                      {file ? (
                        <div className="space-y-2">
                          <div className="relative group">
                            <p
                              className="font-semibold text-base sm:text-lg mb-1 break-all cursor-help transition-colors hover:text-primary"
                              title={file.name}
                            >
                              {file.name.length > 60 ? truncateFileName(file.name, 60) : file.name}
                            </p>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-lg mb-1">Drag & drop your document here</p>
                          <p className="text-sm text-muted-foreground">or click to browse</p>
                        </>
                      )}
                    </div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx"
                      onChange={handleFileChange}
                      className="cursor-pointer max-w-xs"
                    />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    <strong className="text-foreground">Supported placeholder formats:</strong>
                  </p>
                  <div className="flex items-center justify-center gap-3 text-xs">
                    <code className="px-2 py-1 bg-background rounded">{'{{placeholder}}'}</code>
                    <code className="px-2 py-1 bg-background rounded">[placeholder]</code>
                    <code className="px-2 py-1 bg-background rounded">{'{placeholder}'}</code>
                  </div>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-5 mr-2 animate-spin" />
                      Uploading & Parsing Document...
                    </>
                  ) : (
                    <>
                      <Upload className="size-5 mr-2" />
                      Upload & Parse Document
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Fill Placeholders */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4">
                <MessageSquare className="size-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Step 2: Fill in Placeholders</h2>
              <p className="text-muted-foreground">
                Answer the questions below to fill in your document placeholders
              </p>
            </div>

            {/* Progress */}
            <div className="max-w-2xl mx-auto p-6 bg-card border rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Progress</span>
                <span className="text-sm font-semibold">{filledCount} / {placeholders.length}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Placeholders List & Preview */}
              <div className=" lg:col-span-2 space-y-6">
                {documentHtml && (
                  <div className="border rounded-xl p-6 bg-card shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="size-5 text-primary" />
                      Preview
                    </h3>
                    <div className="border rounded-lg p-4 bg-white dark:bg-gray-950 max-h-64 overflow-y-auto prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: documentHtml }} />
                    </div>
                  </div>
                )}
                <div className="border rounded-xl p-6 bg-card shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Placeholders</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
                    {placeholders.map((placeholder, index) => (
                      <div
                        key={placeholder.key}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${placeholder.filled
                          ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                          : index === currentPlaceholderIndex
                            ? 'bg-primary/10 border-2 border-primary/30 ring-2 ring-primary/10'
                            : 'bg-muted/50 border border-transparent'
                          }`}
                      >
                        <div className="shrink-0">
                          {placeholder.filled ? (
                            <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                          ) : index === currentPlaceholderIndex ? (
                            <Loader2 className="size-5 text-primary animate-spin" />
                          ) : (
                            <XCircle className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${placeholder.filled ? 'text-green-900 dark:text-green-100' :
                            index === currentPlaceholderIndex ? 'text-primary' : 'text-foreground'
                            }`}>
                            {placeholder.key}
                          </p>
                          {placeholder.filled && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {placeholder.value}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Conversation */}
              <div className="">
                <div className="border rounded-xl p-6 bg-card shadow-sm flex flex-col h-[600px]">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="size-5 text-primary" />
                    Conversation
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${message.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                            : 'bg-muted text-muted-foreground rounded-tl-none'
                            }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                            {message.content}
                          </p>
                          {message.timestamp && (
                            <p className={`text-xs mt-2 ${message.role === 'user'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground/70'
                              }`}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="answer" className="text-sm font-medium">
                      Your Answer
                    </Label>
                    <Textarea
                      id="answer"
                      placeholder={`Enter value for "${placeholders[currentPlaceholderIndex]?.key}"...`}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
                          e.preventDefault();
                          handleSubmitAnswer();
                        }
                      }}
                      rows={3}
                      className="resize-none"
                    />
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!inputValue.trim()}
                      className="w-full"
                    >
                      Submit Answer
                      <span className="ml-2 text-xs opacity-70">(Enter)</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Generate Document */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto">
            <div className="border rounded-xl p-8 bg-card shadow-lg">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Step 3: Generate Document</h2>
                <p className="text-muted-foreground mb-6">
                  All placeholders have been filled! Ready to generate your completed document.
                </p>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-6 mb-6 text-left">
                  <h3 className="font-semibold mb-4">Summary</h3>
                  <div className="space-y-2">
                    {placeholders.map((p) => (
                      <div key={p.key} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                        <span className="text-muted-foreground"><strong className="text-foreground">{p.key}:</strong> {p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleGenerateDocument}
                  disabled={generating}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="size-5 mr-2 animate-spin" />
                      Generating Document...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-5 mr-2" />
                      Generate Completed Document
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Download */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="border rounded-xl p-8 shadow-lg border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Step 4: Download Your Document</h2>
                <p className="text-muted-foreground mb-6">
                  Your document has been generated successfully!
                </p>

                {completedHtml && (
                  <div className="border rounded-lg p-6 bg-white dark:bg-gray-950 max-h-96 overflow-y-auto prose prose-sm max-w-none mb-6 text-left">
                    <div dangerouslySetInnerHTML={{ __html: completedHtml }} />
                  </div>
                )}

                <Button
                  onClick={handleDownload}
                  className="w-full"
                  size="lg"
                >
                  <Download className="size-5 mr-2" />
                  Download Completed Document
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  File: {completedFileName}
                </p>

                <div className="mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setDocumentHtml(null);
                      setPlaceholders([]);
                      setMessages([]);
                      setCompletedFile(null);
                      setCompletedHtml(null);
                      setCurrentPlaceholderIndex(0);
                      setInputValue('');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="w-full"
                  >
                    <ArrowLeft className="size-4 mr-2" />
                    Start Over with New Document
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

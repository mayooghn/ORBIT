import React, { useState, useRef, useEffect } from 'react';
import {
  Loader2,
  AlertCircle,
  Zap,
  RotateCcw,
  BrainCircuit,
  Network,
  ArrowRight,
} from 'lucide-react';
import {
  analyzeGeopoliticalRisk,
  type GeopoliticalRiskAgentResponse,
} from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';
import { OrbitSignalWave } from './OrbitSignalWave';
import {
  renderSafeAssessmentMarkdown,
  formatMeasurementParts,
  friendlyNodeLabel,
  humanizeLabel,
  normalizedRiskLevel,
  riskBadgeConfig,
  humanizeTechnicalText,
} from '../../utils/assessmentFormatting';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  content?: string;
  response?: GeopoliticalRiskAgentResponse;
  error?: string;
}

interface OrbitChatAssistantProps {
  onNavigate?: (path: string) => void;
  className?: string;
}

const ANIMATED_PROMPTS = [
  'What happens to oil supply if the Strait of Hormuz is disrupted for 40 days?',
  'What would be the impact on energy supply if the Red Sea shipping route is blocked?',
  'If a major oil facility is disrupted, how would the network impact and strategic reserves respond?',
];

const SUGGESTED_QUESTIONS = [
  'What happens to oil supply if the Strait of Hormuz is disrupted for 40 days?',
  'What would be the impact on energy supply if the Red Sea shipping route is blocked?',
  'What if the Bab el-Mandeb Strait is disrupted? How would it affect oil supply?',
];

export const OrbitChatAssistant: React.FC<OrbitChatAssistantProps> = ({
  onNavigate,
  className = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  // Typewriter animation state for the central prompt placeholder
  const [placeholderText, setPlaceholderText] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isConversationActive = messages.length > 0;

  // Typewriter effect loop
  useEffect(() => {
    if (isConversationActive) return;

    const currentTarget = ANIMATED_PROMPTS[promptIndex % ANIMATED_PROMPTS.length];
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (placeholderText.length < currentTarget.length) {
        timeout = setTimeout(() => {
          setPlaceholderText(currentTarget.slice(0, placeholderText.length + 1));
        }, 40);
      } else {
        // Pause when full question is typed
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
      }
    } else {
      if (placeholderText.length > 0) {
        timeout = setTimeout(() => {
          setPlaceholderText(currentTarget.slice(0, placeholderText.length - 1));
        }, 22);
      } else {
        // Move to next question after deleting
        setIsDeleting(false);
        setPromptIndex((prev) => (prev + 1) % ANIMATED_PROMPTS.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [placeholderText, isDeleting, promptIndex, isConversationActive]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isConversationActive) {
      scrollToBottom();
    }
  }, [messages, loading, isConversationActive]);

  const handleSendPrompt = async (promptToSend?: string) => {
    // If promptToSend is not passed, use inputPrompt, or fallback to current animated placeholder
    const text = (promptToSend ?? (inputPrompt.trim() || placeholderText)).trim();
    if (!text || loading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      timestamp: new Date().toISOString(),
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setLoading(true);
    setError(null);

    try {
      const responseData = await analyzeGeopoliticalRisk(text);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        response: responseData,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'ORBIT AI Assistant was unable to process the query. Please verify the prompt and try again.';
      setError(errorMessage);
      const failedMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        error: errorMessage,
      };
      setMessages((prev) => [...prev, failedMessage]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendPrompt();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInputPrompt('');
    setError(null);
    setPlaceholderText('');
    setIsDeleting(false);
  };

  // ------------------------------------------------------------------------
  // VIEW 1: HERO ASSISTANT LANDING SCREEN (Clean, Minimal Firecrawl-inspired Composition)
  // ------------------------------------------------------------------------
  if (!isConversationActive) {
    return (
      <div className={`relative flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] px-4 py-8 overflow-hidden ${className}`}>
        {/* Subtle background wave/signal animation */}
        <OrbitSignalWave />

        <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center space-y-7">
          {/* Central Header Typography */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold font-sans text-slate-100 tracking-tight">
              ORBIT AI ASSISTANT
            </h1>
            <p className="text-sm sm:text-base text-slate-400 font-sans max-w-md mx-auto">
              Ask ORBIT about the energy situation
            </p>
          </div>

          {/* Compact Central Question / Prompt Input Card */}
          <div className="w-full bg-[#0a0e17]/95 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 shadow-xl backdrop-blur-xl transition-all focus-within:border-orange-500/80 focus-within:ring-1 focus-within:ring-orange-500/30">
            {/* Prompt Input Textarea with Animated Typewriter Placeholder */}
            <div className="relative min-h-[58px]">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="w-full h-full resize-none bg-transparent text-sm text-slate-100 placeholder-transparent focus:outline-none font-sans leading-relaxed relative z-10"
              />

              {/* Animated Question Typewriter Placeholder */}
              {!inputPrompt && (
                <div
                  onClick={() => textareaRef.current?.focus()}
                  className="absolute top-0 left-0 w-full text-sm text-slate-500 font-sans pointer-events-none select-none flex items-start gap-1 leading-relaxed"
                >
                  <span className="text-slate-400">Ask agent: </span>
                  <span className="text-slate-300 font-medium">"{placeholderText}"</span>
                  <span className="inline-block w-1.5 h-3.5 bg-orange-500 animate-pulse mt-0.5" />
                </div>
              )}
            </div>

            {/* Bottom Controls & Action Bar with Question Chips to the Left of Run Agent */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-3 border-t border-slate-800/60 mt-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {SUGGESTED_QUESTIONS.map((questionText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void handleSendPrompt(questionText)}
                    disabled={loading}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-800/90 bg-[#0c121e] hover:bg-slate-800 hover:border-orange-500/40 text-left transition-all cursor-pointer shadow-xs text-[11px] sm:text-xs font-medium text-slate-300 hover:text-white disabled:opacity-50"
                  >
                    {questionText}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handleSendPrompt()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-mono text-xs font-bold shadow-md shadow-orange-600/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0 self-end lg:self-auto"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Run Agent</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // VIEW 2: COMPACT ORBIT CONVERSATION CONSOLE (Post-Query State)
  // ------------------------------------------------------------------------
  return (
    <div className={`w-full flex flex-col justify-start min-h-[calc(100vh-13rem)] px-1 sm:px-2 py-1 ${className}`}>
      <div className="w-full flex flex-col space-y-4 flex-1">
        {/* Compact ORBIT Assistant Console Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <h1 className="text-sm sm:text-base font-mono font-bold text-slate-100 uppercase tracking-wider">
              ORBIT OPERATIONAL ASSISTANT
            </h1>
          </div>

          <button
            type="button"
            onClick={handleReset}
            title="Start New Query"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-[#0a0e17] hover:bg-slate-800/80 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3 h-3 text-orange-400" />
            <span>New Query</span>
          </button>
        </div>

        {/* Scrollable Conversation Stream Container */}
        <div className="flex-1 min-h-[320px] max-h-[calc(100vh-20rem)] overflow-y-auto space-y-4 pr-1.5 scrollbar-thin">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-1.5">
              {/* USER QUERY */}
              {msg.role === 'user' && (
                <div className="flex flex-col items-end w-full">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span>USER QUERY</span>
                  </div>
                  <div className="max-w-2xl lg:max-w-3xl bg-slate-900/90 border border-slate-700/70 text-slate-100 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-sans shadow-md leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              )}

              {/* ORBIT ANALYSIS */}
              {msg.role === 'assistant' && (
                <div className="flex flex-col items-start w-full">
                  <div className="text-[10px] font-mono uppercase text-orange-400 font-semibold mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span>ORBIT ANALYSIS · REAL-TIME INFERENCE</span>
                  </div>

                  <div className="w-full bg-[#0a0e17]/95 border border-slate-800 rounded-xl p-4 sm:p-5 text-xs sm:text-sm text-slate-200 shadow-lg space-y-3.5 font-sans">
                    {/* Markdown / Text Assessment */}
                    {msg.content && (
                      <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans space-y-2">
                        {renderSafeAssessmentMarkdown(msg.content)}
                      </div>
                    )}

                    {/* Error Notice if any */}
                    {msg.error && (
                      <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-300 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block font-mono">Execution Error</span>
                          <span className="text-red-300/80">{msg.error}</span>
                        </div>
                      </div>
                    )}

                    {/* Structured Operational Result Card */}
                    {msg.response && (
                      <AssistantResponseCard
                        response={msg.response}
                        onNavigate={onNavigate}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-start w-full space-y-1">
              <div className="text-[10px] font-mono uppercase text-orange-400 font-semibold flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                <span>EVALUATING SUPPLY-CHAIN RISK...</span>
              </div>
              <div className="w-full bg-[#0a0e17]/95 border border-orange-500/30 rounded-xl p-3.5 text-xs font-mono text-slate-300 flex items-center gap-3 shadow-md">
                <div className="relative">
                  <div className="w-5 h-5 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
                  <BrainCircuit className="w-3 h-3 text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Querying Digital Twin & Telemetry Models...</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Assessing flow reductions, affected nodes, and SPR resilience.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Divider & Suggested Operational Follow-Up Queries */}
        <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-orange-400" /> Operational Queries
            </span>
            <span className="hidden sm:inline text-slate-400">Direct Telemetry Query</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {SUGGESTED_QUESTIONS.map((questionText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => void handleSendPrompt(questionText)}
                disabled={loading}
                className="p-2.5 sm:p-3 rounded-lg border border-slate-800/90 bg-[#090d16] hover:bg-[#0e1422] hover:border-orange-500/40 text-left transition-all cursor-pointer group disabled:opacity-50 shadow-xs"
              >
                <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold text-slate-300 group-hover:text-white leading-tight">
                  <span className="truncate">{questionText}</span>
                  <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-orange-400 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Action Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendPrompt();
          }}
          className="w-full"
        >
          <div className="relative flex items-center gap-2 bg-[#0a0e17]/95 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 focus-within:border-orange-500/80 focus-within:ring-1 focus-within:ring-orange-500/30 transition-all shadow-md">
            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ORBIT a follow-up question... (Enter to submit)"
              rows={1}
              disabled={loading}
              className="w-full resize-none px-2 py-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-sans leading-relaxed disabled:opacity-60 max-h-24"
            />

            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-mono text-xs font-bold shadow-md shadow-orange-600/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
              aria-label="Send Query"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-component: AssistantResponseCard (High-fidelity operational rendering)  */
/* -------------------------------------------------------------------------- */
const AssistantResponseCard: React.FC<{
  response: GeopoliticalRiskAgentResponse;
  onNavigate?: (path: string) => void;
}> = ({ response, onNavigate }) => {
  const riskLevel = normalizedRiskLevel(response.risk?.riskLevel);
  const riskScore = typeof response.risk?.riskScore === 'number' ? response.risk.riskScore : null;
  const cfg = riskBadgeConfig[riskLevel] || riskBadgeConfig.unknown;

  const flowParts = formatMeasurementParts(response.digitalTwinImpact?.affectedFlow);
  const capacityParts = formatMeasurementParts(response.digitalTwinImpact?.affectedCapacity);
  const affectedNodes = response.digitalTwinImpact?.affectedNodeIds || [];

  return (
    <div className="space-y-3 pt-1">
      {/* Executive Risk Banner */}
      <div className={`p-3.5 rounded-lg border ${cfg.border} ${cfg.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg border ${cfg.border} bg-slate-900/90 flex flex-col items-center justify-center shrink-0 shadow-inner`}>
            <span className={`text-lg font-black font-mono tracking-tight ${cfg.text}`}>
              {riskScore !== null ? riskScore : '—'}
            </span>
            <span className="text-[8px] font-mono uppercase text-slate-500">/ 100</span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <StatusBadge
                level={
                  riskLevel === 'critical'
                    ? 'CRITICAL'
                    : riskLevel === 'high'
                    ? 'ELEVATED'
                    : riskLevel === 'medium'
                    ? 'MODERATE'
                    : 'AVAILABLE'
                }
                label={cfg.label}
                size="sm"
              />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-100">
              {response.event?.title || 'Geopolitical Threat Evaluation'}
            </h3>
          </div>
        </div>
      </div>

      {/* Impact Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-lg border border-slate-800/80 bg-[#070a10]">
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
            Affected Assets
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono text-slate-200 mt-0.5 block">
            {affectedNodes.length} Nodes
          </span>
        </div>

        <div className="p-2.5 rounded-lg border border-slate-800/80 bg-[#070a10]">
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
            Flow Reduction
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono text-orange-400 mt-0.5 block">
            {flowParts.value} {flowParts.unit && <span className="text-[9px] font-normal text-orange-400/80">({flowParts.unit})</span>}
          </span>
        </div>

        <div className="p-2.5 rounded-lg border border-slate-800/80 bg-[#070a10]">
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
            Capacity Exposed
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono text-amber-400 mt-0.5 block">
            {capacityParts.value} {capacityParts.unit && <span className="text-[9px] font-normal text-amber-400/80">({capacityParts.unit})</span>}
          </span>
        </div>
      </div>

      {/* Executive Assessment Narrative */}
      {response.explanation && (
        <div className="p-3 rounded-lg border border-slate-800/80 bg-[#070a10] space-y-1.5">
          <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-800/60 text-[11px] font-mono font-semibold text-slate-300 uppercase tracking-wider">
            <BrainCircuit className="w-3 h-3 text-orange-400" />
            <span>Executive Operational Assessment</span>
          </div>
          <div className="text-xs text-slate-300 leading-relaxed font-sans space-y-1.5">
            {renderSafeAssessmentMarkdown(humanizeTechnicalText(response.explanation, true))}
          </div>
        </div>
      )}

      {/* Impacted Nodes List */}
      {affectedNodes.length > 0 && (
        <div className="p-2.5 rounded-lg border border-slate-800/80 bg-[#070a10] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Network className="w-3 h-3 text-orange-400" /> Impacted Assets
            </span>
            <span className="text-[10px] text-slate-400">{affectedNodes.length} mapped</span>
          </div>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {affectedNodes.map((nodeId, idx) => {
              const nodeType = response.digitalTwinImpact?.affectedNodeTypes?.[idx];
              const nodeName = response.digitalTwinImpact?.affectedNodeNames?.[idx];
              const label = friendlyNodeLabel(nodeId, nodeType, nodeName);
              return (
                <span
                  key={`${nodeId}-${idx}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-800 bg-slate-900/90 text-[11px] font-mono text-slate-200 shadow-xs"
                >
                  <span className="w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                  <span>{label}</span>
                  {nodeType && (
                    <span className="text-[9px] text-slate-400 uppercase font-sans">
                      ({humanizeLabel(nodeType)})
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Geopolitical Classification Metadata */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] font-mono text-slate-400">
        <span className="px-1.5 py-0.5 rounded border border-slate-800 bg-[#070a10]">
          Region: <strong className="text-slate-200">{humanizeLabel(response.classification?.region)}</strong>
        </span>
        <span className="px-1.5 py-0.5 rounded border border-slate-800 bg-[#070a10]">
          Category: <strong className="text-slate-200">{humanizeLabel(response.classification?.category)}</strong>
        </span>
        <span className="px-1.5 py-0.5 rounded border border-slate-800 bg-[#070a10]">
          Severity: <strong className="text-orange-400">{humanizeLabel(response.classification?.severity)}</strong>
        </span>
        <span className="px-1.5 py-0.5 rounded border border-slate-800 bg-[#070a10]">
          Relevance:{' '}
          <strong className={response.classification?.energyRelevant ? 'text-emerald-400' : 'text-slate-300'}>
            {response.classification?.energyRelevant ? 'Confirmed' : 'Indirect'}
          </strong>
        </span>
      </div>
    </div>
  );
};

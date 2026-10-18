/**
 * Edge Security Control Plane: 7-Class Tool & Code Safety Classifier
 *
 * STRICT NEURAL NETWORK ONNX CLASSIFIER (NO HEURISTIC / RULE FALLBACKS)
 * - Model: sentence-transformers/all-MiniLM-L6-v2 (INT8 Quantized ONNX)
 * - Dimension: D = 384
 * - Runtime: onnxruntime-node (Native C++ CPUExecutionProvider)
 * - Policy: Either verified ONNX model classification OR fail-secure to direct HITL.
 *
 * RIGOROUS TAXONOMY SPECIFICATION:
 * - Class 0: Harmless Read / Idempotent Observation (e.g. uptime, get_metrics, date, df -h)
 * - Class 1: Scoped Reversible Ambient Actuation (e.g. set_light_brightness, tv_volume, blinds)
 * - Class 2: Financial & E-Commerce Transactions (e.g. grocery_checkout, book_rental, pay)
 * - Class 3: Thermal / High-Wattage Equipment Hazard (e.g. space_heater, oven_relay, furnace)
 * - Class 4: Perimeter & Physical Access Security (e.g. unlock_deadbolt, open_garage, camera_stream)
 * - Class 5: Destructive Host Corruption & Denial-of-Service (e.g. rm -rf, mkfs, fork bomb, disk wipe)
 * - Class 6: Privilege Escalation & Secret Exfiltration (e.g. steal env, reverse shell, /etc/shadow)
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assertSafeShellCommand, assertSafeAST } from './ring0Guard.js';
import { WordpieceTokenizer } from './wordpieceTokenizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EvaluationResult {
  isSafe: boolean;
  riskClass: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  confidence: number;
  classProbabilities: [number, number, number, number, number, number, number];
  requiresHITL: boolean;
  reason: string;
}

export type ClassifierMode = 'onnx_session' | 'fail_secure';

const EMBEDDING_DIM = 384;
const NUM_CLASSES = 7;
const SOFTMAX_TEMPERATURE = 0.06;

const DEFAULT_MODEL_DIR = path.resolve(__dirname, '../../models/all-MiniLM-L6-v2');
const DEFAULT_MODEL_PATH = path.join(DEFAULT_MODEL_DIR, 'model_quantized.onnx');
const DEFAULT_TOKENIZER_PATH = path.join(DEFAULT_MODEL_DIR, 'tokenizer.json');

const CANONICAL_EXEMPLARS = [
  // Class 0: Harmless Read / Idempotent Observation
  'Harmless shell probe, read-only bash command, query system status, date, calendar time UTC timestamp, sensor temperature humidity metrics, filesystem storage capacity available disk usage df, uptime load average, cat proc cpuinfo, echo diagnostics',
  // Class 1: Scoped Reversible Ambient Actuation
  'Adjust smart light brightness, set color, turn on lamp bulb, change blinds shade, set tv volume, play audio music playlist, reversible lighting actuation',
  // Class 2: Financial & E-Commerce Transactions
  'Purchase item, checkout cart, buy groceries, payment transaction, credit card fee, subscription order charge, commerce billing, invoice payment expense',
  // Class 3: Thermal / Physical Hazard
  'Turn on high wattage space heater heating element relay, activate furnace burner, high temperature boiler, emergency heat ignite, fire hazard, high electrical wattage load',
  // Class 4: Perimeter & Physical Access Security
  'Unlock front door deadbolt, open garage entry gate, disengage security barrier latch, access surveillance camera stream, disable intrusion alarm, disarm perimeter entry barrier',
  // Class 5: Destructive Host Corruption & Denial-of-Service
  'Purge delete all files rm -rf, wipe hard drive partition, overwrite raw disk dd, fork bomb denial of service, truncate corrupt filesystem device destruction',
  // Class 6: Privilege Escalation & Secret Exfiltration
  'Exfiltrate shadow passwords, spawn unauthorized TCP network socket connection, steal environment variable credentials, backdoor privilege escalation exploit',
];

export class EdgeSecurityClassifier {
  private mode: ClassifierMode = 'fail_secure';
  private modelPath: string = DEFAULT_MODEL_PATH;
  private tokenizerPath: string = DEFAULT_TOKENIZER_PATH;
  private onnxSession: any = null;
  private tokenizer: WordpieceTokenizer = new WordpieceTokenizer();
  private prototypeMatrix: Float32Array[] = [];
  private ort: any = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  public async initialize(modelPath?: string, tokenizerPath?: string): Promise<void> {
    this.initPromise = null;
    this.modelPath = modelPath || DEFAULT_MODEL_PATH;
    this.tokenizerPath = tokenizerPath || DEFAULT_TOKENIZER_PATH;

    if (!fs.existsSync(this.modelPath) || !fs.existsSync(this.tokenizerPath)) {
      console.warn(`[Ring 1 Classifier] Model file (${this.modelPath}) or tokenizer (${this.tokenizerPath}) missing. Enforcing direct fail-secure to HITL.`);
      this.mode = 'fail_secure';
      this.onnxSession = null;
      this.prototypeMatrix = [];
      return;
    }

    try {
      this.ort = await import('onnxruntime-node');
      this.onnxSession = await this.ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['cpu'],
        intraOpNumThreads: 2,
      });

      this.tokenizer.load(this.tokenizerPath);
      await this.buildClassPrototypes();
      this.mode = 'onnx_session';
    } catch (err: any) {
      console.error(`[Ring 1 Classifier] Fatal error initializing ONNX session: ${err.message}. Enforcing fail-secure policy.`);
      this.mode = 'fail_secure';
      this.onnxSession = null;
      this.prototypeMatrix = [];
    }
  }

  public setMode(mode: ClassifierMode): void {
    this.mode = mode;
  }

  public getMode(): ClassifierMode {
    return this.mode;
  }

  private async runInference(text: string): Promise<Float32Array> {
    if (!this.onnxSession || !this.ort) {
      throw new Error('[Ring 1 Classifier] ONNX neural network session is not active.');
    }

    const { inputIds, attentionMask, tokenTypeIds, length } = this.tokenizer.encode(text);

    const feeds = {
      input_ids: new this.ort.Tensor('int64', inputIds, [1, length]),
      attention_mask: new this.ort.Tensor('int64', attentionMask, [1, length]),
      token_type_ids: new this.ort.Tensor('int64', tokenTypeIds, [1, length]),
    };

    const results = await this.onnxSession.run(feeds);
    const lastHidden = results.last_hidden_state;
    const data = lastHidden.data;

    // Mean Pooling over tokens
    const pooled = new Float32Array(EMBEDDING_DIM);
    for (let i = 0; i < length; i++) {
      const offset = i * EMBEDDING_DIM;
      for (let d = 0; d < EMBEDDING_DIM; d++) {
        pooled[d] += data[offset + d];
      }
    }
    for (let d = 0; d < EMBEDDING_DIM; d++) {
      pooled[d] /= length;
    }

    // L2 Normalization: e_hat = e / ||e||_2
    let sumSq = 0;
    for (let d = 0; d < EMBEDDING_DIM; d++) {
      sumSq += pooled[d] * pooled[d];
    }
    const norm = Math.sqrt(sumSq) || 1.0;
    for (let d = 0; d < EMBEDDING_DIM; d++) {
      pooled[d] /= norm;
    }

    return pooled;
  }

  public async computeEmbedding(text: string): Promise<Float32Array> {
    if (this.initPromise) {
      await this.initPromise;
    }
    return this.runInference(text);
  }

  private async buildClassPrototypes(): Promise<void> {
    const matrix: Float32Array[] = [];
    for (let k = 0; k < NUM_CLASSES; k++) {
      const exemplar = CANONICAL_EXEMPLARS[k];
      const embedding = await this.runInference(exemplar);
      matrix.push(embedding);
    }
    this.prototypeMatrix = matrix;
  }

  public async evaluate(tool: {
    name: string;
    description: string;
    targetUrl?: string;
    command?: string;
    code?: string;
  }): Promise<EvaluationResult> {
    if (!tool || !tool.name || typeof tool.name !== 'string') {
      throw new Error('[Ring 1 Classifier] Input tool must provide a valid name string.');
    }

    if (this.initPromise) {
      await this.initPromise;
    }

    // POLICY: If ONNX model is not loaded or session failed, fail directly to HITL (No rule fallback)
    if (this.mode !== 'onnx_session' || !this.onnxSession || this.prototypeMatrix.length !== NUM_CLASSES) {
      return {
        isSafe: false,
        riskClass: 4,
        confidence: 0.0,
        classProbabilities: [0, 0, 0, 0, 1, 0, 0],
        requiresHITL: true,
        reason: 'Fail-secure default: ONNX neural network model is uninitialized or absent. Direct human confirmation (HITL) strictly enforced.',
      };
    }

    // Ring 0 Deterministic hard invariants bridge (AST + Shell Regex)
    if (tool.command) {
      try {
        assertSafeShellCommand(tool.command);
      } catch (err: any) {
        const isExfil = /credential|shadow|reverse shell|socket/i.test(err.message);
        return {
          isSafe: false,
          riskClass: isExfil ? 6 : 5,
          confidence: 1.0,
          classProbabilities: [0, 0, 0, 0, 0, isExfil ? 0 : 1, isExfil ? 1 : 0],
          requiresHITL: true,
          reason: `Deterministic shell invariant failure: ${err.message}`,
        };
      }
    }

    if (tool.code) {
      try {
        assertSafeAST(tool.code);
      } catch (err: any) {
        return {
          isSafe: false,
          riskClass: 6,
          confidence: 1.0,
          classProbabilities: [0, 0, 0, 0, 0, 0, 1],
          requiresHITL: true,
          reason: `Deterministic AST invariant failure: ${err.message}`,
        };
      }
    }

    // Neural Network Semantic Forward Pass via ONNX Session
    const corpus = `${tool.name} ${tool.description} ${tool.targetUrl || ''} ${tool.command || ''} ${tool.code || ''}`;
    const embedding = await this.computeEmbedding(corpus);

    // Cosine similarity logits: z_k = w_k · e
    const logits = new Float32Array(NUM_CLASSES);
    for (let k = 0; k < NUM_CLASSES; k++) {
      let dot = 0;
      const prototype = this.prototypeMatrix[k];
      for (let d = 0; d < EMBEDDING_DIM; d++) {
        dot += embedding[d] * prototype[d];
      }
      logits[k] = dot;
    }

    // Temperature-Scaled Softmax
    let maxLogit = -Infinity;
    for (let k = 0; k < NUM_CLASSES; k++) {
      const scaled = logits[k] / SOFTMAX_TEMPERATURE;
      if (scaled > maxLogit) maxLogit = scaled;
    }

    let sumExp = 0;
    const expVals = new Float32Array(NUM_CLASSES);
    for (let k = 0; k < NUM_CLASSES; k++) {
      expVals[k] = Math.exp(logits[k] / SOFTMAX_TEMPERATURE - maxLogit);
      sumExp += expVals[k];
    }

    const probabilities: [number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0];
    for (let k = 0; k < NUM_CLASSES; k++) {
      probabilities[k] = expVals[k] / sumExp;
    }

    const [pRead, pReversible, pCost, pHazard, pPerimeter, pCorruption, pExfiltration] = probabilities;
    const maxIdx = probabilities.indexOf(Math.max(...probabilities)) as 0 | 1 | 2 | 3 | 4 | 5 | 6;

    // RULE 1: Destructive Host Corruption (Class 5)
    if (maxIdx === 5 || pCorruption >= 0.35) {
      return {
        isSafe: false,
        riskClass: 5,
        confidence: pCorruption,
        classProbabilities: probabilities,
        requiresHITL: true,
        reason: `Destructive Host Corruption detected by ONNX neural network (P = ${(pCorruption * 100).toFixed(1)}%). Automatically rejected.`,
      };
    }

    // RULE 2: Privilege Escalation & Secret Exfiltration (Class 6)
    if (maxIdx === 6 || pExfiltration >= 0.35) {
      return {
        isSafe: false,
        riskClass: 6,
        confidence: pExfiltration,
        classProbabilities: probabilities,
        requiresHITL: true,
        reason: `Privilege Escalation / Secret Exfiltration detected by ONNX neural network (P = ${(pExfiltration * 100).toFixed(1)}%). Automatically rejected.`,
      };
    }

    // RULE 3: Physical Perimeter Entry (Class 4)
    if (maxIdx === 4 || pPerimeter >= 0.25) {
      return {
        isSafe: true,
        riskClass: 4,
        confidence: pPerimeter,
        classProbabilities: probabilities,
        requiresHITL: true,
        reason: `Perimeter & Physical Access Security detected by ONNX neural network (P = ${(pPerimeter * 100).toFixed(1)}%). Requires Consequence Contract.`,
      };
    }

    // RULE 4: Thermal Appliance Hazard (Class 3)
    if (maxIdx === 3 || pHazard >= 0.25) {
      return {
        isSafe: true,
        riskClass: 3,
        confidence: pHazard,
        classProbabilities: probabilities,
        requiresHITL: true,
        reason: `Thermal Equipment Hazard detected by ONNX neural network (P = ${(pHazard * 100).toFixed(1)}%). Requires Consequence Contract.`,
      };
    }

    // RULE 5: Passive Sensor / Telemetry / Idempotent Read (Class 0)
    if (maxIdx === 0) {
      return {
        isSafe: true,
        riskClass: 0,
        confidence: pRead,
        classProbabilities: probabilities,
        requiresHITL: false,
        reason: `Passive Sensor / Status Query detected by ONNX neural network (P = ${(pRead * 100).toFixed(1)}%). Auto-Approved.`,
      };
    }

    // RULE 6: Reversible Ambient Actuation (Class 1)
    if (maxIdx === 1) {
      return {
        isSafe: true,
        riskClass: 1,
        confidence: pReversible,
        classProbabilities: probabilities,
        requiresHITL: false,
        reason: `Reversible Ambient Actuator detected by ONNX neural network (P = ${(pReversible * 100).toFixed(1)}%). Auto-Approved.`,
      };
    }

    // RULE 7: Financial Cost / Purchase (Class 2)
    if (maxIdx === 2) {
      return {
        isSafe: true,
        riskClass: 2,
        confidence: pCost,
        classProbabilities: probabilities,
        requiresHITL: false,
        reason: `Financial / Cost Transaction detected by ONNX neural network (P = ${(pCost * 100).toFixed(1)}%). Policy-gated against user budget.`,
      };
    }

    // Ambiguous Distribution fallback -> Gated to HITL
    return {
      isSafe: true,
      riskClass: 2,
      confidence: Math.max(...probabilities),
      classProbabilities: probabilities,
      requiresHITL: true,
      reason: 'Ambiguous neural network probability distribution: Gated to direct human authorization.',
    };
  }
}

export const ring1Classifier = new EdgeSecurityClassifier();

export async function computeSemanticEmbedding(text: string): Promise<Float32Array> {
  return ring1Classifier.computeEmbedding(text);
}

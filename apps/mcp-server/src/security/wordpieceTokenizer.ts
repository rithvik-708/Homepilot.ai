import fs from 'node:fs';

export interface TokenizerOutput {
  inputIds: BigInt64Array;
  attentionMask: BigInt64Array;
  tokenTypeIds: BigInt64Array;
  length: number;
}

export class WordpieceTokenizer {
  private vocab: Record<string, number> = {};
  private unkTokenId: number = 100;
  private clsTokenId: number = 101;
  private sepTokenId: number = 102;
  private maxTokens: number = 256;

  constructor(tokenizerJsonPath?: string) {
    if (tokenizerJsonPath && fs.existsSync(tokenizerJsonPath)) {
      this.load(tokenizerJsonPath);
    }
  }

  public load(tokenizerJsonPath: string): void {
    const raw = fs.readFileSync(tokenizerJsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    this.vocab = parsed.model?.vocab || {};
  }

  public encode(text: string): TokenizerOutput {
    const words = text.toLowerCase().match(/[a-z0-9_-]+|[^\s\w]/g) || [];
    const tokens: number[] = [this.clsTokenId];

    for (const word of words) {
      if (tokens.length >= this.maxTokens - 1) break;

      if (this.vocab[word] !== undefined) {
        tokens.push(this.vocab[word]);
      } else {
        let isSubword = false;
        let cur = word;
        while (cur.length > 0) {
          if (tokens.length >= this.maxTokens - 1) break;
          let match: { id: number; len: number } | null = null;
          for (let len = cur.length; len > 0; len--) {
            const sub = isSubword ? '##' + cur.slice(0, len) : cur.slice(0, len);
            if (this.vocab[sub] !== undefined) {
              match = { id: this.vocab[sub], len };
              break;
            }
          }
          if (match) {
            tokens.push(match.id);
            cur = cur.slice(match.len);
            isSubword = true;
          } else {
            tokens.push(this.unkTokenId);
            break;
          }
        }
      }
    }

    tokens.push(this.sepTokenId);
    const length = tokens.length;

    const inputIds = new BigInt64Array(length);
    const attentionMask = new BigInt64Array(length);
    const tokenTypeIds = new BigInt64Array(length);

    for (let i = 0; i < length; i++) {
      inputIds[i] = BigInt(tokens[i]);
      attentionMask[i] = 1n;
      tokenTypeIds[i] = 0n;
    }

    return { inputIds, attentionMask, tokenTypeIds, length };
  }
}


/**
 * Multilayer perceptron regressor: two hidden tanh layers, linear output,
 * mean-squared-error loss, Adam optimiser, mini-batches, early stopping on
 * an internal validation split. Fully seeded, so training is reproducible.
 */
import { Rng } from "../../core/rng";
import { standardize, type Standardizer } from "../dataset";
import type { SurrogateDescriptor, SurrogateModel } from "./types";
import { resolveSurrogateParams } from "./types";

const PARAMS = [
  { id: "hidden", label: "Hidden units", description: "Units in each of the two hidden layers.", default: 32, min: 2, max: 512 },
  { id: "epochs", label: "Max epochs", description: "Upper bound on training epochs; early stopping usually ends sooner.", default: 150, min: 1, max: 5000 },
  { id: "learningRate", label: "Learning rate", description: "Adam step size.", default: 0.005, min: 1e-5, max: 1 },
  { id: "batchSize", label: "Batch size", description: "Mini-batch size.", default: 32, min: 1, max: 4096 },
  { id: "patience", label: "Patience", description: "Epochs without validation improvement before stopping.", default: 25, min: 1, max: 1000 },
  { id: "weightDecay", label: "Weight decay", description: "L2 penalty on weights.", default: 1e-5, min: 0, max: 1 },
];

export const mlpDescriptor: SurrogateDescriptor = {
  id: "mlp",
  label: "Neural network (MLP)",
  description: "Two-hidden-layer tanh network trained with Adam and early stopping. Flexible nonlinear regressor; no uncertainty estimate.",
  params: PARAMS,
  create(given, rng) {
    return new MlpSurrogate(resolveSurrogateParams(PARAMS, given), rng);
  },
};

interface Layer {
  w: Float64Array; // out x in
  b: Float64Array;
  inSize: number;
  outSize: number;
}

class MlpSurrogate implements SurrogateModel {
  readonly id = "mlp";
  readonly hyperparameters: Record<string, number>;
  private layers: Layer[] = [];
  private yScaler: Standardizer | null = null;
  private xMean: number[] = [];
  private xStd: number[] = [];

  constructor(
    private readonly p: Record<string, number>,
    private readonly rng: Rng
  ) {
    this.hyperparameters = { ...p, epochsRun: 0 };
  }

  fit(X: number[][], y: number[]): void {
    if (X.length !== y.length || X.length < 2) throw new Error("mlp: need at least two aligned samples");
    const d = X[0].length;
    const h = Math.round(this.p.hidden);
    this.xMean = Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + r[j], 0) / X.length);
    this.xStd = Array.from({ length: d }, (_, j) => {
      const v = X.reduce((s, r) => s + (r[j] - this.xMean[j]) ** 2, 0) / X.length;
      return Math.sqrt(v) || 1;
    });
    const Xs = X.map((r) => this.scaleX(r));
    this.yScaler = standardize(y);
    const ys = this.yScaler.apply(y);

    this.layers = [this.initLayer(d, h), this.initLayer(h, h), this.initLayer(h, 1)];
    this.acts = [];
    const params = this.layers.flatMap((l) => [l.w, l.b]);
    const m = params.map((p) => new Float64Array(p.length));
    const v = params.map((p) => new Float64Array(p.length));
    const grads = params.map((p) => new Float64Array(p.length));

    // Internal validation split for early stopping (10 %, at least 1 sample).
    const idx = Array.from({ length: X.length }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const nVal = Math.max(1, Math.floor(idx.length * 0.1));
    const valIdx = idx.slice(0, nVal);
    const trainIdx = idx.slice(nVal);

    const lr = this.p.learningRate;
    const b1 = 0.9;
    const b2 = 0.999;
    const eps = 1e-8;
    const wd = this.p.weightDecay;
    const batch = Math.max(1, Math.min(Math.round(this.p.batchSize), trainIdx.length));
    let bestVal = Infinity;
    let bestSnapshot = params.map((p) => Float64Array.from(p));
    let sinceBest = 0;
    let t = 0;
    let epochsRun = 0;

    for (let epoch = 0; epoch < this.p.epochs; epoch++) {
      epochsRun++;
      for (let i = trainIdx.length - 1; i > 0; i--) {
        const j = this.rng.int(i + 1);
        [trainIdx[i], trainIdx[j]] = [trainIdx[j], trainIdx[i]];
      }
      for (let start = 0; start < trainIdx.length; start += batch) {
        for (const g of grads) g.fill(0);
        const end = Math.min(trainIdx.length, start + batch);
        for (let k = start; k < end; k++) this.backprop(Xs[trainIdx[k]], ys[trainIdx[k]], grads, end - start);
        t++;
        for (let pi = 0; pi < params.length; pi++) {
          const p = params[pi];
          const g = grads[pi];
          const isWeight = pi % 2 === 0;
          for (let i = 0; i < p.length; i++) {
            const gi = g[i] + (isWeight ? wd * p[i] : 0);
            m[pi][i] = b1 * m[pi][i] + (1 - b1) * gi;
            v[pi][i] = b2 * v[pi][i] + (1 - b2) * gi * gi;
            const mh = m[pi][i] / (1 - b1 ** t);
            const vh = v[pi][i] / (1 - b2 ** t);
            p[i] -= (lr * mh) / (Math.sqrt(vh) + eps);
          }
        }
      }
      let valLoss = 0;
      for (const k of valIdx) valLoss += (this.forward(Xs[k]) - ys[k]) ** 2;
      valLoss /= valIdx.length;
      if (valLoss < bestVal - 1e-9) {
        bestVal = valLoss;
        bestSnapshot = params.map((p) => Float64Array.from(p));
        sinceBest = 0;
      } else if (++sinceBest >= this.p.patience) break;
    }
    params.forEach((p, i) => p.set(bestSnapshot[i]));
    this.hyperparameters.epochsRun = epochsRun;
    this.hyperparameters.validationMse = bestVal;
  }

  predict(X: number[][]) {
    if (!this.yScaler) throw new Error("mlp: fit before predict");
    return { mean: this.yScaler.invert(X.map((r) => this.forward(this.scaleX(r)))) };
  }

  private scaleX(r: number[]): number[] {
    return r.map((v, j) => (v - this.xMean[j]) / this.xStd[j]);
  }

  private initLayer(inSize: number, outSize: number): Layer {
    const scale = Math.sqrt(1 / inSize);
    const w = new Float64Array(inSize * outSize);
    for (let i = 0; i < w.length; i++) w[i] = this.rng.gaussian() * scale;
    return { w, b: new Float64Array(outSize), inSize, outSize };
  }

  /** Preallocated activation buffers per layer (index 0 = input). */
  private acts: Float64Array[] = [];
  private deltas: Float64Array[] = [];

  private ensureBuffers(): void {
    if (this.acts.length === this.layers.length + 1) return;
    this.acts = [new Float64Array(this.layers[0].inSize), ...this.layers.map((l) => new Float64Array(l.outSize))];
    this.deltas = this.layers.map((l) => new Float64Array(l.inSize));
  }

  private forward(x: number[]): number {
    this.ensureBuffers();
    const acts = this.acts;
    acts[0].set(x);
    const last = this.layers.length - 1;
    for (let li = 0; li <= last; li++) {
      const l = this.layers[li];
      const a = acts[li];
      const out = acts[li + 1];
      const w = l.w;
      const b = l.b;
      for (let o = 0; o < l.outSize; o++) {
        let s = b[o];
        const off = o * l.inSize;
        for (let i = 0; i < l.inSize; i++) s += w[off + i] * a[i];
        out[o] = li < last ? Math.tanh(s) : s;
      }
    }
    return acts[last + 1][0];
  }

  /** Accumulate gradients of 0.5 * (pred - y)^2 / batch into `grads`. */
  private backprop(x: number[], y: number, grads: Float64Array[], batch: number): void {
    const pred = this.forward(x);
    const acts = this.acts;
    let deltaOut = (pred - y) / batch;
    for (let li = this.layers.length - 1; li >= 0; li--) {
      const l = this.layers[li];
      const a = acts[li];
      const gw = grads[2 * li];
      const gb = grads[2 * li + 1];
      const prev = this.deltas[li];
      prev.fill(0);
      const w = l.w;
      for (let o = 0; o < l.outSize; o++) {
        const dO = li === this.layers.length - 1 ? deltaOut : this.deltas[li + 1][o];
        if (dO === 0) continue;
        gb[o] += dO;
        const off = o * l.inSize;
        for (let i = 0; i < l.inSize; i++) {
          gw[off + i] += dO * a[i];
          prev[i] += dO * w[off + i];
        }
      }
      if (li > 0) for (let i = 0; i < l.inSize; i++) prev[i] *= 1 - a[i] * a[i]; // tanh'
    }
  }
}

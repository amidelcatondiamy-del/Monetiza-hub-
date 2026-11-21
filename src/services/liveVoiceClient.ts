export type LiveVoiceName = 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';
export type LivePersonaId =
  | 'strategist'
  | 'sales_concierge'
  | 'analytics_coach'
  | 'support_guide';

export interface LiveBusinessContext {
  creatorName?: string;
  currency?: string;
  totalGrossRevenue?: number;
  totalNetRevenue?: number;
  availableBalance?: number;
  mrr?: number;
  totalSalesCount?: number;
  averageTicket?: number;
  currentView?: string;
  activeTab?: string;
  topProducts?: Array<{ title: string; price: number; salesCount: number }>;
}

export interface LiveVoiceToolEvent {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface LiveVoiceCallbacks {
  onStatusChange?: (status: 'connecting' | 'ready' | 'listening' | 'speaking' | 'closed' | 'error') => void;
  onInputTranscript?: (text: string) => void;
  onOutputTranscript?: (text: string) => void;
  onToolCall?: (event: LiveVoiceToolEvent) => void;
  onUiAction?: (action: { action: string; view: 'studio' | 'storefront' | 'admin'; tab: string }) => void;
  onMicLevel?: (level: number) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onError?: (message: string) => void;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

export class LiveVoiceClient {
  private ws: WebSocket | null = null;
  private inputCtx: AudioContext | null = null;
  private outputCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private muted = false;
  private callbacks: LiveVoiceCallbacks = {};
  private ready = false;

  public setCallbacks(callbacks: LiveVoiceCallbacks) {
    this.callbacks = callbacks;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public async connect(options: {
    persona: LivePersonaId;
    voiceName: LiveVoiceName;
    extendedThinking?: boolean;
    businessContext?: LiveBusinessContext;
    enableMic?: boolean;
  }): Promise<void> {
    this.disconnect();
    this.ready = false;
    this.callbacks.onStatusChange?.('connecting');

    if (options.enableMic !== false) {
      await this.startMicCapture();
    }

    this.ensureOutputContext();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/live-voice`;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'init',
            persona: options.persona,
            voiceName: options.voiceName,
            extendedThinking: Boolean(options.extendedThinking),
            businessContext: options.businessContext || {},
          })
        );
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === 'ready') {
            this.ready = true;
            this.callbacks.onStatusChange?.('ready');
          } else if (msg.type === 'input_transcript' && typeof msg.text === 'string') {
            this.callbacks.onInputTranscript?.(msg.text);
          } else if (msg.type === 'output_transcript' && typeof msg.text === 'string') {
            this.callbacks.onOutputTranscript?.(msg.text);
          } else if (msg.type === 'audio' && typeof msg.data === 'string') {
            this.callbacks.onStatusChange?.('speaking');
            this.enqueueOutputAudio(msg.data);
          } else if (msg.type === 'interrupted') {
            this.stopAllPlayback();
            this.callbacks.onInterrupted?.();
            this.callbacks.onStatusChange?.('listening');
          } else if (msg.type === 'turn_state') {
            if (msg.turnComplete) {
              this.callbacks.onTurnComplete?.();
              this.callbacks.onStatusChange?.('listening');
            }
          } else if (msg.type === 'tool_call') {
            this.callbacks.onToolCall?.({
              name: msg.name,
              args: msg.args || {},
              result: msg.result,
            });
          } else if (msg.type === 'ui_action') {
            this.callbacks.onUiAction?.({
              action: msg.action,
              view: msg.view,
              tab: msg.tab,
            });
          } else if (msg.type === 'error') {
            this.callbacks.onError?.(msg.message || 'Erro no Gemini Live.');
            this.callbacks.onStatusChange?.('error');
          } else if (msg.type === 'closed') {
            this.ready = false;
            this.callbacks.onStatusChange?.('closed');
          }
        } catch {
          // Ignore malformed message
        }
      };

      ws.onerror = () => {
        const errMsg = 'Falha na conexão WebSocket com o servidor de voz.';
        this.callbacks.onError?.(errMsg);
        this.callbacks.onStatusChange?.('error');
        reject(new Error(errMsg));
      };

      ws.onclose = () => {
        this.ready = false;
        this.callbacks.onStatusChange?.('closed');
      };
    });
  }

  private ensureOutputContext() {
    if (!this.outputCtx || this.outputCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.outputCtx = new AudioCtx({ sampleRate: 24000 });
      this.nextStartTime = this.outputCtx.currentTime;
    }
    if (this.outputCtx.state === 'suspended') {
      void this.outputCtx.resume();
    }
  }

  private async startMicCapture() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Captura de microfone não suportada neste navegador.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.mediaStream = stream;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const inputCtx = new AudioCtx({ sampleRate: 16000 });
    this.inputCtx = inputCtx;

    if (inputCtx.state === 'suspended') {
      await inputCtx.resume();
    }

    const source = inputCtx.createMediaStreamSource(stream);
    const processor = inputCtx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const floatData = e.inputBuffer.getChannelData(0);

      // Compute RMS mic meter even when not yet ready
      let sumSq = 0;
      for (let i = 0; i < floatData.length; i++) {
        sumSq += floatData[i] * floatData[i];
      }
      const rms = Math.sqrt(sumSq / floatData.length);
      this.callbacks.onMicLevel?.(this.muted ? 0 : Math.min(1, rms * 6));

      if (this.muted || !this.ready || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const pcm16 = new Int16Array(floatData.length);
      for (let i = 0; i < floatData.length; i++) {
        const clamped = Math.max(-1, Math.min(1, floatData[i]));
        pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      }

      const b64 = arrayBufferToBase64(pcm16.buffer);
      this.ws.send(JSON.stringify({ type: 'audio', data: b64 }));
    };

    source.connect(processor);
    processor.connect(inputCtx.destination);
    this.sourceNode = source;
    this.processorNode = processor;
  }

  private enqueueOutputAudio(base64Pcm: string) {
    this.ensureOutputContext();
    const ctx = this.outputCtx;
    if (!ctx) return;

    const pcm16 = base64ToInt16Array(base64Pcm);
    const floatData = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      floatData[i] = pcm16[i] / 0x8000;
    }

    const buffer = ctx.createBuffer(1, floatData.length, 24000);
    buffer.copyToChannel(floatData, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime + 0.015, this.nextStartTime);
    this.nextStartTime = startTime + buffer.duration;

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };
    source.start(startTime);
  }

  public stopAllPlayback() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore already stopped sources
      }
    }
    this.activeSources.clear();
    if (this.outputCtx) {
      this.nextStartTime = this.outputCtx.currentTime;
    }
  }

  public sendText(text: string) {
    if (!text.trim() || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'text', text: text.trim() }));
  }

  public updateBusinessContext(businessContext: LiveBusinessContext) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'context_update', businessContext }));
  }

  public disconnect() {
    this.ready = false;
    this.stopAllPlayback();

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {
        // Ignore
      }
      this.processorNode = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // Ignore
      }
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }
    if (this.inputCtx && this.inputCtx.state !== 'closed') {
      void this.inputCtx.close();
      this.inputCtx = null;
    }
    if (this.outputCtx && this.outputCtx.state !== 'closed') {
      void this.outputCtx.close();
      this.outputCtx = null;
    }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'close' }));
        }
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
  }
}

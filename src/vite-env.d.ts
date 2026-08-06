/// <reference types="vite/client" />

interface ISpeechRecognitionAlternative {
  transcript: string;
}

interface ISpeechRecognitionEvent {
  results: { 0: ISpeechRecognitionAlternative }[];
}

interface ISpeechRecognition {
  lang: string;
  interimResults: boolean;
  onresult: (e: ISpeechRecognitionEvent) => void;
  onerror: (e: unknown) => void;
  onend: () => void;
  start: () => void;
}

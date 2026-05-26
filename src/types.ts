export interface MeetingRecord {
  id: string;
  title: string;
  rawTranscript: string;
  language: string;
  summaryStyle: string;
  additionalInstructions: string;
  resultMarkdown: string;
  createdAt: string;
}

export interface SampleTranscript {
  id: string;
  label: string;
  title: string;
  transcript: string;
  language: string;
  summaryStyle: string;
  additionalInstructions: string;
}

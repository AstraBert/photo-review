export interface ScoreAndExplanation {
  score: number;
  explanation: string;
}

export interface Bbox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

export interface PhotoReview {
  overall: ScoreAndExplanation;
  sharpness_focus: ScoreAndExplanation;
  exposure: ScoreAndExplanation;
  noise: ScoreAndExplanation;
  color_accuracy: ScoreAndExplanation;
  dynamic_range: ScoreAndExplanation;
  composition: ScoreAndExplanation;
  background: ScoreAndExplanation;
  cropping: ScoreAndExplanation;
  subject_clarity: ScoreAndExplanation;
  emotional_impact: ScoreAndExplanation;
  moment_timing: ScoreAndExplanation;
  lighting: ScoreAndExplanation;
  color_harmony: ScoreAndExplanation;
  post_processing: ScoreAndExplanation;
  bboxes: Bbox[];
}

export interface ReviewWithUsage {
  review: PhotoReview,
  input_tokens: number,
  output_tokens: number
}

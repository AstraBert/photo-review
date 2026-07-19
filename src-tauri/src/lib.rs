use keyring::Entry;
use llms_sdk::{ApiType, ImagePart, LLMRequest, Message, MessagePart, MessageRole, TextPart, LLM};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

const SERVICE_NAME: &str = "com.clee.photo-review";
const SYSTEM_PROMPT: &str = r#"
You are an expert photography critic evaluating a single image. Assess it across technical, compositional, and artistic dimensions, and return your review strictly as JSON matching the provided PhotoReview schema.

Scoring guidelines:
- Every score is 0–100. 0 = severe failure in that dimension, 50 = average/acceptable, 100 = exceptional/professional-grade.
- Base each score only on what is visually observable in the image — do not guess at intent you can't see.
- Write a concise, specific explanation for each score (1–2 sentences), referencing what you actually see, not generic advice.
- Judge each dimension relative to the image's apparent genre and intent (e.g., a street photo isn't penalized for grain the way a product shot would be).
- overall should reflect a holistic judgement, not a simple average of the other scores.

Bounding boxes:
- Provide at most 5 bboxes, only for the most impactful specific issues or highlights worth pointing out.
- Coordinates (x, y, width, height) are in pixels, relative to the image's actual width and height. x increases from right to left; y increases from bottom to top.
- Each bbox's text should be a short, actionable note tied to that specific region.
"#;
const LLM_MODEL: &str = "gpt-5.4-mini";

#[tauri::command]
fn save_api_key(key_name: String, api_key: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &key_name).map_err(|e| e.to_string())?;
    entry.set_password(&api_key).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_api_key(key_name: String) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, &key_name).map_err(|e| e.to_string())?;
    let psw = entry.get_password().map_err(|e| e.to_string())?;
    Ok(psw)
}

#[tauri::command]
fn delete_api_key(key_name: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &key_name).map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
/// Struct representing the score
/// and explanation for a single field
pub struct ScoreAndExplanation {
    /// Score for the field, must be between 0 and 100
    pub score: u32,
    /// Explanation for the score
    pub explanation: String,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
/// Bbox pointing out a specific part of the picture,
/// with an associated text representing
/// the critique/suggestion for that part
pub struct Bbox {
    /// x origin for the bbox. x should start from
    /// the right and go towards left with positive
    /// coordinates
    x: f32,
    /// y origin for the bbox. y should start from
    /// the bottom and go up to the top with positive
    /// coordinates
    y: f32,
    width: f32,
    height: f32,
    /// text associated with the bbox
    text: String,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
/// Review of a picture, with scores, a general critique
/// and bboxes indicating specific things in the picture
/// that could be improved
pub struct PhotoReview {
    /// Overall aggregate score and summary judgement for the picture
    pub overall: ScoreAndExplanation,

    /// Sharpness and focus accuracy on the intended subject
    pub sharpness_focus: ScoreAndExplanation,

    /// Exposure quality: highlight/shadow clipping, overall brightness balance
    pub exposure: ScoreAndExplanation,

    /// Noise/grain levels relative to style and intent
    pub noise: ScoreAndExplanation,

    /// Color accuracy: white balance correctness, unwanted color casts
    pub color_accuracy: ScoreAndExplanation,

    /// Dynamic range: detail retained in shadows and highlights
    pub dynamic_range: ScoreAndExplanation,

    /// Composition: framing, rule of thirds, leading lines, balance
    pub composition: ScoreAndExplanation,

    /// Background quality: separation from subject, clutter, distractions
    pub background: ScoreAndExplanation,

    /// Cropping quality: tightness/looseness, awkward cuts
    pub cropping: ScoreAndExplanation,

    /// Subject clarity: how clear and identifiable the subject/focal point is
    pub subject_clarity: ScoreAndExplanation,

    /// Emotional impact, mood, and storytelling strength of the image
    pub emotional_impact: ScoreAndExplanation,

    /// Timing/moment quality (decisive moment, expression, action capture)
    pub moment_timing: ScoreAndExplanation,

    /// Lighting quality: direction, hardness/softness, modeling on subject
    pub lighting: ScoreAndExplanation,

    /// Color harmony and palette cohesion
    pub color_harmony: ScoreAndExplanation,

    /// Post-processing/editing quality: naturalness, artifacts, over-processing
    pub post_processing: ScoreAndExplanation,

    /// bboxes (a maximum of 5)
    bboxes: Vec<Bbox>,
}

#[tauri::command]
async fn review_picture(picture: Vec<u8>, api_key: String) -> Result<PhotoReview, String> {
    let llm = LLM::default();
    let size = imagesize::blob_size(&picture).map_err(|e| e.to_string())?;
    let request = LLMRequest::builder()
        .api_type(ApiType::OpenAI)
        .api_key(api_key)
        .max_output_tokens(10_000)
        .model(LLM_MODEL)
        .output_format::<PhotoReview>("photo_review", "Schema representing the review of a photograph")
        .messages(vec![
            Message {
                role: MessageRole::System,
                content: vec![MessagePart::Text(TextPart {
                    text: SYSTEM_PROMPT.to_string(),
                })]
            },
            Message {
                role: MessageRole::User,
                content: vec![
                    MessagePart::Text(TextPart { text: format!("Following the guidelines defined in your instructions, provide a review of this picture. The size of the image is: {:?}px (height) and {:?}px (width)", size.height, size.width) }),
                    MessagePart::Image(ImagePart::try_from_bytes(picture).map_err(|e| e.to_string())?)
                ]
            }
        ]).build();
    let response = llm.respond(request).await.map_err(|e| e.to_string())?;
    for r in response.message.content {
        match r {
            MessagePart::Text(t) => {
                let review: PhotoReview =
                    serde_json::from_str(&t.text).map_err(|e| e.to_string())?;

                return Ok(review);
            }
            _ => continue,
        }
    }
    Err("The model could not produce any review of the picture".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            review_picture,
            save_api_key,
            get_api_key,
            delete_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

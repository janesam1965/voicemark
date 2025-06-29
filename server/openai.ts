import OpenAI from "openai";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
}

export async function transcribeAudio(audioFilePath: string): Promise<TranscriptionResult> {
  try {
    const audioReadStream = fs.createReadStream(audioFilePath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
    });

    return {
      text: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
    };
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

export async function transcribeAudioBuffer(audioBuffer: Buffer, filename: string): Promise<TranscriptionResult> {
  try {
    // Create a temporary file
    const tempFilePath = `/tmp/${filename}`;
    fs.writeFileSync(tempFilePath, audioBuffer);

    const result = await transcribeAudio(tempFilePath);

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    return result;
  } catch (error) {
    console.error("Error transcribing audio buffer:", error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

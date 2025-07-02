// api/generate-question-preview.ts
import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';
import { QuestionPreviewCard } from './_QuestionPreviewCard';
import { uploadImageToSupabase } from './_upload-to-supabase';

// REMOVE this line for Node.js Serverless Function
// export const config = { runtime: 'edge' };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchQuestionData(questionId: string) {
  // ... your fetch logic (as you wrote) ...
}

export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const questionId = searchParams.get('id');
  if (!questionId) return res.status(400).send('Missing id');

  const data = await fetchQuestionData(questionId);
  if (!data) return res.status(404).send('Not found');

  // Render the image
  const imageResponse = new ImageResponse(
    <QuestionPreviewCard {...data} />,
    { width: 1200, height: 630 }
  );

  // Convert the image to a buffer
  const arrayBuffer = await imageResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage and update DB
  const publicUrl = await uploadImageToSupabase(buffer, data.id);

  // Return the image directly (for OG preview) and the URL in the header
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('x-og-image-url', publicUrl);
  res.send(buffer);
}

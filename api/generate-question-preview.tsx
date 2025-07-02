import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';
import { QuestionPreviewCard } from './_QuestionPreviewCard';
import { uploadImageToSupabase } from './_upload-to-supabase';

export const config = { runtime: 'edge' };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchQuestionData(questionId: string) {
  // Fetch question, answer, votes, comments, user, mentor, etc.
  const { data: question, error } = await supabase
    .from('questions')
    .select(`
      id, text, is_anonymous, creator_id,
      question_votes(count),
      comments(count),
      users!questions_creator_id_fkey(name, profile_photo_url),
      answers(id, raw_text, mentor_id, 
        users!answers_mentor_id_fkey(name, profile_photo_url)
      )
    `)
    .eq('id', questionId)
    .single();

  if (error || !question) return null;

  return {
    id: question.id,
    text: question.text,
    upvoteCount: question.question_votes?.length || 0,
    commentCount: question.comments?.length || 0,
    author: question.is_anonymous
      ? { name: 'Anonymous', profile_photo_url: null }
      : question.users,
    answer: question.answers?.[0]
      ? {
          raw_text: question.answers[0].raw_text,
          mentor: question.answers[0].users
            ? {
                name: question.answers[0].users.name,
                profile_photo_url: question.answers[0].users.profile_photo_url,
              }
            : null,
        }
      : null,
  };
}

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get('id');
  if (!questionId) return new Response('Missing id', { status: 400 });

  const data = await fetchQuestionData(questionId);
  if (!data) return new Response('Not found', { status: 404 });

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
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'x-og-image-url': publicUrl,
    },
  });
}

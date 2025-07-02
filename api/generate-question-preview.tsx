import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';
import { QuestionPreviewCard } from './_QuestionPreviewCard';
import { uploadImageToSupabase } from './_upload-to-supabase';

type Author = { name: string; profile_photo_url: string | null };
type Mentor = { name: string; profile_photo_url: string | null };
type Answer = { raw_text: string; mentor: Mentor | null };
type QuestionData = {
  id: string;
  text: string;
  upvoteCount: number;
  commentCount: number;
  author: Author;
  answer: Answer | null;
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchQuestionData(questionId: string): Promise<QuestionData | null> {
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

  // users and answers may be arrays, so handle that
  const author = question.is_anonymous
    ? { name: 'Anonymous', profile_photo_url: null }
    : Array.isArray(question.users) ? question.users[0] : question.users;

  let answer: Answer | null = null;
  if (question.answers && question.answers.length > 0) {
    const ans = question.answers[0];
    const mentor = ans.users
      ? (Array.isArray(ans.users) ? ans.users[0] : ans.users)
      : null;
    answer = {
      raw_text: ans.raw_text,
      mentor: mentor ? { name: mentor.name, profile_photo_url: mentor.profile_photo_url } : null
    };
  }

  return {
    id: question.id,
    text: question.text,
    upvoteCount: question.question_votes?.length || 0,
    commentCount: question.comments?.length || 0,
    author,
    answer,
  };
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

  const arrayBuffer = await imageResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const publicUrl = await uploadImageToSupabase(buffer, data.id);

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('x-og-image-url', publicUrl);
  res.send(buffer);
}

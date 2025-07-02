import { ImageResponse } from '@vercel/og';
import { QuestionPreviewCard } from './_QuestionPreviewCard';

export const config = { runtime: 'edge' };

// Helper to fetch question data from Supabase REST API
async function fetchQuestionData(questionId: string) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Fetch question, votes, comments, user, answer, mentor
  // You may need to adjust the query params to match your schema
  const { data: question, error } = await (await fetch(
    `${supabaseUrl}/rest/v1/questions?id=eq.${questionId}&select=id,text,is_anonymous,creator_id,preview_image_url`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  )).json();

  if (!question || !question[0]) return null;
  const q = question[0];

  // Fetch upvotes count
  const upvotesRes = await fetch(
    `${supabaseUrl}/rest/v1/question_votes?question_id=eq.${questionId}&select=user_id`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const upvotes = await upvotesRes.json();

  // Fetch comments count
  const commentsRes = await fetch(
    `${supabaseUrl}/rest/v1/comments?question_id=eq.${questionId}&select=id`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const comments = await commentsRes.json();

  // Fetch creator info
  let author = { name: 'Anonymous', profile_photo_url: null };
  if (!q.is_anonymous) {
    const userRes = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${q.creator_id}&select=name,profile_photo_url`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const users = await userRes.json();
    if (users && users[0]) {
      author = { name: users[0].name, profile_photo_url: users[0].profile_photo_url };
    }
  }

  // Fetch answer (if any)
  const answerRes = await fetch(
    `${supabaseUrl}/rest/v1/answers?question_id=eq.${questionId}&select=id,raw_text,mentor_id`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const answers = await answerRes.json();
  let answer = null;
  if (answers && answers[0]) {
    // Fetch mentor info
    const mentorRes = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${answers[0].mentor_id}&select=name,profile_photo_url`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const mentors = await mentorRes.json();
    answer = {
      raw_text: answers[0].raw_text,
      mentor: mentors && mentors[0]
        ? { name: mentors[0].name, profile_photo_url: mentors[0].profile_photo_url }
        : null,
    };
  }

  return {
    id: q.id,
    text: q.text,
    upvoteCount: upvotes.length,
    commentCount: comments.length,
    author,
    answer,
  };
}

// Helper to upload to Supabase Storage via REST API
async function uploadToSupabase(imageBuffer: ArrayBuffer, questionId: string) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET!;

  // Upload image
  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/previews/${questionId}.png`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: imageBuffer,
    }
  );
  if (!uploadRes.ok) throw new Error('Failed to upload image to Supabase Storage');

  // Public URL
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/previews/${questionId}.png`;

  // Update DB
  await fetch(
    `${supabaseUrl}/rest/v1/questions?id=eq.${questionId}`,
    {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ preview_image_url: publicUrl }),
    }
  );

  return publicUrl;
}

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get('id');
  if (!questionId) return new Response('Missing id', { status: 400 });

  const data = await fetchQuestionData(questionId);
  if (!data) return new Response('Not found', { status: 404 });

  const imageResponse = new ImageResponse(
    <QuestionPreviewCard {...data} />,
    { width: 1200, height: 630 }
  );
  const arrayBuffer = await imageResponse.arrayBuffer();

  // Upload to Supabase Storage
  const publicUrl = await uploadToSupabase(arrayBuffer, questionId);

  return new Response(arrayBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'x-og-image-url': publicUrl,
    },
  });
}

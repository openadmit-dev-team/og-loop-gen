import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

// Helper to fetch question data from Supabase REST API
async function fetchQuestionData(questionId: string) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Fetch question
  const questionRes = await fetch(
    `${supabaseUrl}/rest/v1/questions?id=eq.${questionId}&select=id,text,is_anonymous,creator_id,is_answered`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  const question = await questionRes.json();
  // @ts-ignore
  console.log('Fetched question:', question);
  if (!question || !question[0]) return undefined;
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
  let answer: { raw_text: string; mentor: { name: string; profile_photo_url: string | null } | null } | undefined = undefined;
  if (q.is_answered) {
    const answerRes = await fetch(
      `${supabaseUrl}/rest/v1/answers?question_id=eq.${questionId}&select=raw_text,mentor_id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const answers = await answerRes.json();
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
  }

  return {
    text: q.text,
    upvoteCount: upvotes.length,
    commentCount: comments.length,
    author,
    answer,
  };
}

// Inline JSX card
function QuestionPreviewCard({
  text,
  upvoteCount,
  commentCount,
  author,
  answer,
}: {
  text: string;
  upvoteCount: number;
  commentCount: number;
  author: { name: string; profile_photo_url: string | null };
  answer?: { raw_text: string; mentor: { name: string; profile_photo_url: string | null } | null };
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #e7ebff 0%, #f7f8fa 100%)',
        borderRadius: 32,
        padding: 48,
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      {/* Branding */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        <img src="https://placehold.co/60x60.png" width={60} height={60} style={{ borderRadius: 16, marginRight: 24 }} />
        <span style={{ fontWeight: 800, fontSize: 40, color: '#2E3AEF', letterSpacing: 1 }}>Loop</span>
      </div>
      {/* Question */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#1E1F4A', marginBottom: 24 }}>{text}</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', marginRight: 32 }}>
            {author?.profile_photo_url ? (
              <img src={author.profile_photo_url} width={48} height={48} style={{ borderRadius: 24, marginRight: 12 }} />
            ) : (
              <div style={{
                width: 48, height: 48, borderRadius: 24, background: '#e7ebff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12,
                fontWeight: 700, fontSize: 24, color: '#2E3AEF'
              }}>
                {author?.name?.[0] || 'A'}
              </div>
            )}
            <span style={{ fontWeight: 600, fontSize: 20, color: '#333' }}>{author?.name}</span>
          </div>
          {/* Upvotes */}
          <div style={{ display: 'flex', alignItems: 'center', marginRight: 24 }}>
            <svg width="24" height="24" fill="#2E3AEF" viewBox="0 0 24 24"><path d="M12 4l6 8h-4v8h-4v-8H6z"/></svg>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#2E3AEF', marginLeft: 6 }}>{upvoteCount}</span>
          </div>
          {/* Comments */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="24" height="24" fill="#2E3AEF" viewBox="0 0 24 24"><path d="M21 6h-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v1H3a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h6l3 3 3-3h6a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/></svg>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#2E3AEF', marginLeft: 6 }}>{commentCount}</span>
          </div>
        </div>
        {/* Answer (if present) */}
        {answer && answer.mentor && (
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: 32,
            boxShadow: '0 4px 24px rgba(46,58,239,0.08)',
            marginTop: 16,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              {answer.mentor.profile_photo_url ? (
                <img src={answer.mentor.profile_photo_url} width={40} height={40} style={{ borderRadius: 20, marginRight: 12 }} />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: 20, background: '#e7ebff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12,
                  fontWeight: 700, fontSize: 20, color: '#2E3AEF'
                }}>
                  {answer.mentor.name?.[0] || 'M'}
                </div>
              )}
              <span style={{ fontWeight: 700, fontSize: 18, color: '#2E3AEF' }}>{answer.mentor.name}</span>
              <span style={{ fontWeight: 400, fontSize: 16, color: '#888', marginLeft: 10 }}>Mentor</span>
            </div>
            <div style={{ fontSize: 22, color: '#222', fontWeight: 500, lineHeight: 1.4 }}>{answer.raw_text}</div>
          </div>
        )}
      </div>
      {/* Footer */}
      <div style={{ textAlign: 'right', fontSize: 18, color: '#888', marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
        loopmobile.app
      </div>
    </div>
  );
}

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get('id');
  if (!questionId) {
    return new ImageResponse(
      <div style={{
        width: 1200, height: 630, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 48, color: 'red', background: '#fff',
      }}>
        Missing id
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const data = await fetchQuestionData(questionId);
  if (!data) {
    return new ImageResponse(
      <div style={{
        width: 1200, height: 630, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 48, color: 'red', background: '#fff',
      }}>
        No data found
      </div>,
      { width: 1200, height: 630 }
    );
  }

  return new ImageResponse(
    <QuestionPreviewCard {...data} />, { width: 1200, height: 630 }
  );
}

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
  if (!question || !question[0]) return undefined;
  const q = question[0];

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

  return {
    text: q.text,
    upvoteCount: upvotes.length,
    commentCount: comments.length,
    author,
  };
}

function QuestionPreviewCard({
  text,
  upvoteCount,
  commentCount,
  author,
}: {
  text: string;
  upvoteCount: number;
  commentCount: number;
  author: { name: string; profile_photo_url: string | null };
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        position: 'relative',
      }}
    >
      {/* Background Pattern */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
        }}
      />
      
      <div
        style={{
          width: 900,
          minHeight: 500,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 32,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 80,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle border gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 32,
            padding: 2,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />

        {/* Creator Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 48 }}>
          {author.profile_photo_url ? (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                overflow: 'hidden',
                marginBottom: 20,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                border: '4px solid rgba(255, 255, 255, 0.8)',
              }}
            >
              <img
                src={author.profile_photo_url}
                width={96}
                height={96}
                style={{ objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 42,
                color: '#fff',
                marginBottom: 20,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                border: '4px solid rgba(255, 255, 255, 0.8)',
              }}
            >
              {author.name?.[0]?.toUpperCase() || 'A'}
            </div>
          )}
          <span style={{ 
            fontWeight: 600, 
            fontSize: 24, 
            color: '#1a1a1a', 
            letterSpacing: -0.5,
            textAlign: 'center',
          }}>
            {author.name}
          </span>
        </div>

        {/* Question Text */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: '#1a1a1a',
            textAlign: 'center',
            marginBottom: 40,
            lineHeight: 1.3,
            maxWidth: 700,
            wordBreak: 'break-word',
            letterSpacing: -0.8,
          }}
        >
          "{text}"
        </div>

        {/* Stats Row */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 48, 
          marginTop: 8,
          padding: 24,
          background: 'rgba(102, 126, 234, 0.05)',
          borderRadius: 20,
          border: '1px solid rgba(102, 126, 234, 0.1)',
        }}>
          {/* Upvotes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24">
                <path d="M12 4l6 8h-4v8h-4v-8H6z"/>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, fontSize: 28, color: '#1a1a1a' }}>{upvoteCount}</span>
              <span style={{ fontWeight: 500, fontSize: 14, color: '#666', marginTop: -4 }}>upvotes</span>
            </div>
          </div>
          
          {/* Comments */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24">
                <path d="M21 6h-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v1H3a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h6l3 3 3-3h6a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, fontSize: 28, color: '#1a1a1a' }}>{commentCount}</span>
              <span style={{ fontWeight: 500, fontSize: 14, color: '#666', marginTop: -4 }}>comments</span>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div style={{ 
          marginTop: 60, 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 16,
          padding: 20,
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: 16,
          border: '1px solid rgba(102, 126, 234, 0.1)',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
          }}>
            <span style={{ 
              fontWeight: 800, 
              fontSize: 24, 
              color: '#fff',
              letterSpacing: -0.5,
            }}>
              L
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ 
              fontWeight: 800, 
              fontSize: 32, 
              color: '#1a1a1a', 
              letterSpacing: -1,
              lineHeight: 1,
            }}>
              Loop
            </span>
            <span style={{ 
              fontWeight: 500, 
              fontSize: 14, 
              color: '#666',
              marginTop: 2,
            }}>
              Ask. Learn. Grow.
            </span>
          </div>
        </div>
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
    <QuestionPreviewCard {...data} />, 
    { 
      width: 1200, 
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: await fetch(
            new URL('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap')
          ).then((res) => res.arrayBuffer()),
          style: 'normal',
        },
      ],
    }
  );
} 

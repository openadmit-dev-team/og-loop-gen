import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 64,
          color: '#2E3AEF',
          background: '#fff',
        }}
      >
        OG IMAGE TEST
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

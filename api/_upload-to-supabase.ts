import { createClient } from '@supabase/supabase-js';

export async function uploadImageToSupabase(imageBuffer: Buffer, questionId: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const bucket = process.env.SUPABASE_STORAGE_BUCKET!;

  const filePath = `previews/${questionId}.png`;
  const { error } = await supabase.storage.from(bucket).upload(filePath, imageBuffer, {
    contentType: 'image/png',
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  // Update the question row
  await supabase.from('questions').update({ preview_image_url: publicUrl }).eq('id', questionId);

  return publicUrl;
}
